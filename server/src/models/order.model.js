const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  title: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  reader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  items: { type: [orderItemSchema], required: true, validate: [(items) => items.length > 0, "An order must contain at least one book"] },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, required: true, min: 0, default: 0 },
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true, default: "THB", minlength: 3, maxlength: 3 },
  promoCode: { type: String, trim: true, uppercase: true },
  paymentMethod: { type: String, enum: ["promptpay", "card", "manual_slip"], required: true },
  paymentProvider: { type: String, enum: ["sandbox", "omise", "stripe", "2c2p"] },
  providerPaymentId: { type: String, trim: true, unique: true, sparse: true },
  status: { type: String, enum: ["PENDING", "COMPLETED", "EXPIRED", "FAILED", "REFUNDED"], default: "PENDING", index: true },
  expiresAt: { type: Date, required: true },
  paidAt: { type: Date },
  refundedAt: { type: Date },
  refundReason: { type: String, trim: true, maxlength: 500 },
  slipUrl: { type: String, trim: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

orderSchema.index({ reader: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);