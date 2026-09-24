const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    reader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
    status: {
      type: String,
      enum: ["active", "past_due", "cancelled", "expired"],
      required: true,
      default: "active",
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    paymentProvider: { type: String, trim: true },
    providerSubscriptionId: { type: String, trim: true, unique: true, sparse: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ reader: 1, status: 1, currentPeriodEnd: -1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
