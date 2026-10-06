const mongoose = require("mongoose");
const Cart = require("../models/cart.model");
const Order = require("../models/order.model");
const Purchase = require("../models/purchase.model");
const { quoteOrder, sandboxPaymentsEnabled } = require("../utils/order-pricing");

const cartBookFields = "title slug status price isFree";
const httpError = (status, message) => Object.assign(new Error(message), { status });
const couponConfig = () => ({
  code: process.env.PROMO_CODE || "PLOT10",
  percent: process.env.PROMO_DISCOUNT_PERCENT || 10,
});

const getPricedCart = async (reader) => {
  const cart = await Cart.findOne({ reader })
    .populate({ path: "items.book", select: cartBookFields })
    .lean();
  const items = (cart?.items || []).filter((item) => item.book);
  if (!items.length) throw httpError(400, "ตะกร้าของคุณยังว่างอยู่");
  if (items.some(({ book }) => book.status !== "published")) {
    throw httpError(409, "มีหนังสือที่ไม่พร้อมจำหน่ายในตะกร้า กรุณาลบรายการนั้นก่อน");
  }
  const currencies = new Set(items.map(({ book }) => book.price.currency));
  if (currencies.size !== 1 || !currencies.has("THB")) {
    throw httpError(409, "ขณะนี้รองรับการชำระเงินด้วยสกุลเงินบาทเท่านั้น");
  }
  return {
    items: items.map(({ book }) => ({ book: book._id, title: book.title, amount: book.isFree ? 0 : book.price.amount })),
    subtotal: items.reduce((sum, { book }) => sum + (book.isFree ? 0 : book.price.amount), 0),
  };
};

const rejectOwnedBooks = async (reader, items) => {
  const owned = await Purchase.find({
    reader,
    book: { $in: items.map((item) => item.book) },
    status: "paid",
  }).populate({ path: "book", select: "slug" }).lean();
  if (owned.length) {
    const slugs = owned.map((purchase) => purchase.book?.slug).filter(Boolean);
    throw httpError(409, `คุณมีหนังสือเล่มนี้แล้ว: ${slugs.join(", ")}`);
  }
};

const createOrder = async (req, res, next) => {
  try {
    if (!sandboxPaymentsEnabled()) {
      return res.status(503).json({ message: "ยังไม่ได้ตั้งค่าผู้ให้บริการชำระเงินจริง กรุณาตั้งค่า payment gateway ก่อนเปิด checkout" });
    }
    const paymentMethod = req.body.paymentMethod;
    if (!["promptpay", "card"].includes(paymentMethod)) {
      return res.status(400).json({ message: "วิธีชำระเงินไม่ถูกต้อง" });
    }

    const { items, subtotal } = await getPricedCart(req.auth.sub);
    await rejectOwnedBooks(req.auth.sub, items);
    const pendingOrder = await Order.findOne({
      reader: req.auth.sub,
      status: "PENDING",
      expiresAt: { $gt: new Date() },
      "items.book": { $in: items.map((item) => item.book) },
    });
    if (pendingOrder) {
      return res.json({
        order: { id: pendingOrder.id, status: pendingOrder.status, subtotal: pendingOrder.subtotal, discount: pendingOrder.discount, total: pendingOrder.total },
        payment: { orderId: pendingOrder.id, expiresAt: pendingOrder.expiresAt, sandbox: pendingOrder.paymentProvider === "sandbox", qrCodeUrl: null, checkoutUrl: null },
      });
    }
    const quote = quoteOrder(subtotal, req.body.promoCode, couponConfig());
    const now = new Date();
    const order = await Order.create({
      reader: req.auth.sub,
      items,
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.total,
      promoCode: quote.code,
      currency: "THB",
      paymentMethod,
      paymentProvider: "sandbox",
      status: "PENDING",
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    });

    res.status(201).json({
      order: { id: order.id, status: order.status, subtotal: order.subtotal, discount: order.discount, total: order.total },
      payment: { orderId: order.id, expiresAt: order.expiresAt, sandbox: true, qrCodeUrl: null, checkoutUrl: null },
    });
  } catch (error) { next(error); }
};

const validateCoupon = async (req, res, next) => {
  try {
    const { subtotal } = await getPricedCart(req.auth.sub);
    const quote = quoteOrder(subtotal, req.body.code, couponConfig());
    res.json({ subtotal: quote.subtotal, discount: quote.discount, total: quote.total, code: quote.code, currency: "THB" });
  } catch (error) { next(error); }
};

const fulfillOrder = async (order) => {
  const paidAt = new Date();
  for (const item of order.items) {
    try {
      await Purchase.updateOne(
        { reader: order.reader, book: item.book, status: "paid" },
        { $setOnInsert: {
          reader: order.reader,
          book: item.book,
          amount: item.amount,
          currency: order.currency,
          acquisitionType: "purchase",
          status: "paid",
          paidAt,
        } },
        { upsert: true, runValidators: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      const purchaseExists = await Purchase.exists({ reader: order.reader, book: item.book, status: "paid" });
      if (!purchaseExists) throw error;
    }
  }

  await Cart.updateOne(
    { reader: order.reader },
    { $pull: { items: { book: { $in: order.items.map((item) => item.book) } } } },
  );
  return Order.findOneAndUpdate(
    { _id: order._id, status: "PENDING" },
    { $set: { status: "COMPLETED", paidAt } },
    { new: true },
  );
};

const verifyPayment = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.body.orderId)) {
      return res.status(400).json({ message: "หมายเลขคำสั่งซื้อไม่ถูกต้อง" });
    }
    const order = await Order.findOne({ _id: req.body.orderId, reader: req.auth.sub });
    if (!order) return res.status(404).json({ message: "ไม่พบคำสั่งซื้อ" });
    if (order.status !== "PENDING") return res.json({ status: order.status });
    if (order.expiresAt <= new Date()) {
      order.status = "EXPIRED";
      await order.save();
      return res.json({ status: order.status });
    }
    if (req.body.simulate !== true) return res.json({ status: "PENDING" });
    if (!sandboxPaymentsEnabled() || order.paymentProvider !== "sandbox") {
      return res.status(403).json({ message: "การจำลองชำระเงินใช้ได้เฉพาะใน sandbox" });
    }

    const completedOrder = await fulfillOrder(order);
    return res.json({ status: completedOrder?.status || "COMPLETED" });
  } catch (error) { next(error); }
};

module.exports = { createOrder, validateCoupon, verifyPayment, fulfillOrder };