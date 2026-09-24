const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    reader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true, minlength: 3, maxlength: 3 },
    acquisitionType: { type: String, enum: ["purchase", "free_download"], required: true },
    status: { type: String, enum: ["pending", "paid", "refunded", "failed"], default: "pending" },
    paymentProvider: { type: String, trim: true },
    providerPaymentId: { type: String, trim: true, unique: true, sparse: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

purchaseSchema.index(
  { reader: 1, book: 1 },
  { unique: true, partialFilterExpression: { status: "paid" } }
);

purchaseSchema.index({ reader: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Purchase", purchaseSchema);
