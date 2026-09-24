const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/,
    },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String, trim: true },
    roles: {
      type: [{ type: String, enum: ["reader", "author", "admin"] }],
      default: ["reader"],
    },
    authorProfile: {
      penName: { type: String, trim: true, maxlength: 100 },
      bio: { type: String, trim: true, maxlength: 2_000 },
      payoutAccountId: { type: String, trim: true, select: false },
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    subscriptionStatus: {
      type: String,
      enum: ["none", "trialing", "active", "expired"],
      default: "none",
    },
    trialStartDate: { type: Date },
    trialEndDate: { type: Date },
    hasUsedTrial: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ roles: 1, status: 1 });
userSchema.index({ subscriptionStatus: 1, trialEndDate: 1 });

userSchema.methods.startTrial = function startTrial(startDate = new Date()) {
  if (this.hasUsedTrial || this.subscriptionStatus !== "none") {
    throw new Error("This user is not eligible for a trial");
  }

  const trialEndDate = new Date(startDate);
  trialEndDate.setDate(trialEndDate.getDate() + 7);
  this.subscriptionStatus = "trialing";
  this.trialStartDate = startDate;
  this.trialEndDate = trialEndDate;
  this.hasUsedTrial = true;
  return this;
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    displayName: this.displayName,
    email: this.email,
    avatarUrl: this.avatarUrl,
    roles: this.roles,
    authorProfile: this.authorProfile,
    status: this.status,
    subscriptionStatus: this.subscriptionStatus,
    trialStartDate: this.trialStartDate,
    trialEndDate: this.trialEndDate,
    hasUsedTrial: this.hasUsedTrial,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
