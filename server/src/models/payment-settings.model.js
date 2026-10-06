const mongoose = require("mongoose");

const paymentSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: "default" },
  mode: { type: String, enum: ["test", "live"], default: "test" },
  promptpay: {
    enabled: { type: Boolean, default: false },
    receiverId: { type: String, trim: true, maxlength: 20 },
  },
  card: {
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ["stripe", "omise"], default: "stripe" },
    publicKey: { type: String, trim: true, maxlength: 300 },
    secretKeyEncrypted: { type: String, select: false },
    webhookSecretEncrypted: { type: String, select: false },
  },
  bankTransfer: {
    enabled: { type: Boolean, default: false },
    bankName: { type: String, trim: true, maxlength: 100 },
    accountNumber: { type: String, trim: true, maxlength: 40 },
    accountName: { type: String, trim: true, maxlength: 150 },
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("PaymentSettings", paymentSettingsSchema);