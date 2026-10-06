const mongoose = require("mongoose");
const PaymentSettings = require("../models/payment-settings.model");
const Order = require("../models/order.model");
const Purchase = require("../models/purchase.model");
const User = require("../models/user.model");
const { fulfillOrder } = require("./order.controller");
const { decryptSecret, encryptSecret, maskSecret } = require("../utils/payment-secrets");
const { sandboxPaymentsEnabled } = require("../utils/order-pricing");

const SETTINGS_KEY = "default";
const safeSettings = (settings) => {
  const card = settings?.card || {};
  const secretKey = decryptSecret(card.secretKeyEncrypted);
  const webhookSecret = decryptSecret(card.webhookSecretEncrypted);
  return {
    mode: settings?.mode || "test",
    promptpay: {
      enabled: settings?.promptpay?.enabled || false,
      receiverId: settings?.promptpay?.receiverId || "",
    },
    card: {
      enabled: card.enabled || false,
      provider: card.provider || "stripe",
      publicKey: card.publicKey || "",
      secretKeyMasked: maskSecret(secretKey),
      webhookSecretMasked: maskSecret(webhookSecret),
      hasSecret: Boolean(secretKey),
      hasWebhookSecret: Boolean(webhookSecret),
    },
    bankTransfer: {
      enabled: settings?.bankTransfer?.enabled || false,
      bankName: settings?.bankTransfer?.bankName || "",
      accountNumber: settings?.bankTransfer?.accountNumber || "",
      accountName: settings?.bankTransfer?.accountName || "",
    },
    updatedAt: settings?.updatedAt || null,
  };
};

const getPaymentSettings = async (req, res, next) => {
  try {
    const settings = await PaymentSettings.findOne({ key: SETTINGS_KEY })
      .select("+card.secretKeyEncrypted +card.webhookSecretEncrypted")
      .lean();
    res.json({ settings: safeSettings(settings) });
  } catch (error) { next(error); }
};

const updatePaymentSettings = async (req, res, next) => {
  try {
    const body = req.body || {};
    if (body.mode !== undefined && !["test", "live"].includes(body.mode)) {
      return res.status(400).json({ message: "Mode must be test or live" });
    }
    if (body.promptpay?.receiverId && !/^\d{10}$|^\d{13}$/.test(body.promptpay.receiverId)) {
      return res.status(400).json({ message: "PromptPay ID must be a 10-digit phone number or 13-digit national ID" });
    }
    if (body.card?.provider !== undefined && !["stripe", "omise"].includes(body.card.provider)) {
      return res.status(400).json({ message: "Card provider must be Stripe or Omise" });
    }

    const settings = await PaymentSettings.findOne({ key: SETTINGS_KEY })
      .select("+card.secretKeyEncrypted +card.webhookSecretEncrypted")
      || new PaymentSettings({ key: SETTINGS_KEY });
    if (body.mode !== undefined) settings.mode = body.mode;

    for (const [section, fields] of Object.entries({
      promptpay: ["enabled", "receiverId"],
      card: ["enabled", "provider", "publicKey"],
      bankTransfer: ["enabled", "bankName", "accountNumber", "accountName"],
    })) {
      for (const field of fields) {
        if (body[section]?.[field] !== undefined) settings.set(`${section}.${field}`, body[section][field]);
      }
    }

    const secretKey = typeof body.card?.secretKey === "string" ? body.card.secretKey.trim() : "";
    const webhookSecret = typeof body.card?.webhookSecret === "string" ? body.card.webhookSecret.trim() : "";
    if (secretKey) settings.card.secretKeyEncrypted = encryptSecret(secretKey);
    if (webhookSecret) settings.card.webhookSecretEncrypted = encryptSecret(webhookSecret);
    if (body.card?.clearSecretKey === true) settings.card.secretKeyEncrypted = undefined;
    if (body.card?.clearWebhookSecret === true) settings.card.webhookSecretEncrypted = undefined;
    if (settings.promptpay.enabled && !/^\d{10}$|^\d{13}$/.test(settings.promptpay.receiverId || "")) {
      return res.status(400).json({ message: "Enter a valid PromptPay phone number or 13-digit ID before enabling PromptPay" });
    }
    if (settings.card.enabled && (!settings.card.publicKey || !settings.card.secretKeyEncrypted || !settings.card.webhookSecretEncrypted)) {
      return res.status(400).json({ message: "Public key, secret key, and webhook secret are required before enabling card payments" });
    }
    if (settings.bankTransfer.enabled && (!settings.bankTransfer.bankName || !settings.bankTransfer.accountNumber || !settings.bankTransfer.accountName)) {
      return res.status(400).json({ message: "Bank, account number, and account name are required before enabling manual transfer" });
    }
    settings.updatedBy = req.auth.sub;
    await settings.save();
    res.json({ settings: safeSettings(settings) });
  } catch (error) { next(error); }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};
    const status = String(req.query.status || "").toUpperCase();
    if (status === "COMPLETED" || status === "PENDING" || status === "REFUNDED") filter.status = status;
    if (status === "FAILED") filter.status = { $in: ["FAILED", "EXPIRED"] };

    const method = String(req.query.method || "").toLowerCase();
    if (["promptpay", "card", "manual_slip"].includes(method)) filter.paymentMethod = method;

    const createdAt = {};
    if (req.query.from) {
      createdAt.$gte = new Date(req.query.from);
      if (Number.isNaN(createdAt.$gte.getTime())) return res.status(400).json({ message: "Invalid start date" });
    }
    if (req.query.to) {
      createdAt.$lte = new Date(req.query.to);
      if (Number.isNaN(createdAt.$lte.getTime())) return res.status(400).json({ message: "Invalid end date" });
      createdAt.$lte.setUTCHours(23, 59, 59, 999);
    }
    if (Object.keys(createdAt).length) filter.createdAt = createdAt;

    const search = String(req.query.search || "").trim().slice(0, 120);
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      const users = await User.find({ $or: [{ email: regex }, { displayName: regex }] }).select("_id").limit(100).lean();
      const alternatives = [{ reader: { $in: users.map((user) => user._id) } }];
      if (mongoose.isValidObjectId(search)) alternatives.push({ _id: new mongoose.Types.ObjectId(search) });
      filter.$or = alternatives;
    }

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [transactions, total, aggregates] = await Promise.all([
      Order.find(filter).populate("reader", "displayName email").sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
      Order.aggregate([
        { $match: { status: "COMPLETED" } },
        { $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          successfulOrders: { $sum: 1 },
          monthlyRevenue: { $sum: { $cond: [{ $gte: ["$paidAt", monthStart] }, "$total", 0] } },
        } },
      ]),
    ]);

    res.json({
      transactions,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
      summary: aggregates[0] || { totalRevenue: 0, monthlyRevenue: 0, successfulOrders: 0 },
    });
  } catch (error) { next(error); }
};

const refundTransaction = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "COMPLETED") return res.status(409).json({ message: "Only completed orders can be refunded" });
    if (order.paymentProvider !== "sandbox" || !sandboxPaymentsEnabled()) {
      return res.status(503).json({ message: "A live refund requires a configured payment-provider refund integration" });
    }

    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: "COMPLETED", paymentProvider: "sandbox" },
      { $set: { status: "REFUNDED", refundedAt: new Date(), refundReason: String(req.body?.reason || "").slice(0, 500) } },
      { new: true },
    );
    if (!updated) return res.status(409).json({ message: "Order status changed; refresh and try again" });
    await Purchase.updateMany(
      { reader: order.reader, book: { $in: order.items.map((item) => item.book) }, status: "paid" },
      { $set: { status: "refunded" } },
    );
    res.json({ order: updated, message: "Sandbox refund recorded; no money was transferred" });
  } catch (error) { next(error); }
};

const reviewSlip = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentMethod !== "manual_slip" || order.status !== "PENDING") {
      return res.status(409).json({ message: "This order is not waiting for slip review" });
    }
    if (!order.slipUrl) return res.status(409).json({ message: "No payment slip has been submitted" });
    if (req.body.action === "approve") {
      await Order.updateOne({ _id: order._id, status: "PENDING" }, { $set: { reviewedBy: req.auth.sub } });
      const completedOrder = await fulfillOrder(order);
      return res.json({ order: completedOrder, message: "Slip approved" });
    }
    if (req.body.action !== "reject") return res.status(400).json({ message: "Action must be approve or reject" });
    const rejectedOrder = await Order.findOneAndUpdate(
      { _id: order._id, status: "PENDING" },
      { $set: { status: "FAILED", reviewedBy: req.auth.sub } },
      { new: true },
    );
    return res.json({ order: rejectedOrder, message: "Slip rejected" });
  } catch (error) { next(error); }
};

module.exports = { getPaymentSettings, updatePaymentSettings, getTransactions, refundTransaction, reviewSlip };