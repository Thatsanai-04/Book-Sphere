const User = require("../models/user.model");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const daysRemainingFor = (trialEndDate, now = new Date()) => {
  if (!trialEndDate) return 0;
  return Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - now.getTime()) / MS_PER_DAY));
};

const subscriptionResponse = (user, now = new Date()) => ({
  subscriptionStatus: user.subscriptionStatus,
  trialStartDate: user.trialStartDate || null,
  trialEndDate: user.trialEndDate || null,
  hasUsedTrial: user.hasUsedTrial,
  daysRemaining: user.subscriptionStatus === "trialing" ? daysRemainingFor(user.trialEndDate, now) : 0,
});

const startTrial = async (req, res, next) => {
  try {
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const user = await User.findOneAndUpdate(
      {
        _id: req.auth.sub,
        hasUsedTrial: { $ne: true },
        subscriptionStatus: { $in: ["none", null] },
      },
      {
        $set: {
          subscriptionStatus: "trialing",
          trialStartDate: now,
          trialEndDate,
          hasUsedTrial: true,
        },
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      const existingUser = await User.exists({ _id: req.auth.sub });
      if (!existingUser) return res.status(404).json({ message: "User not found" });
      return res.status(409).json({ message: "Your free trial has already been used or is unavailable" });
    }

    res.status(201).json({ message: "Free trial started", subscription: subscriptionResponse(user, now) });
  } catch (error) {
    next(error);
  }
};

const getSubscriptionStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    if (user.subscriptionStatus === "trialing" && user.trialEndDate && user.trialEndDate <= now) {
      user.subscriptionStatus = "expired";
      await user.save();
    }

    res.json({ subscription: subscriptionResponse(user, now) });
  } catch (error) {
    next(error);
  }
};

module.exports = { startTrial, getSubscriptionStatus, daysRemainingFor };
