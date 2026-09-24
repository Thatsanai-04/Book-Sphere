const User = require("../models/user.model");

const requireUnlimitedAccess = async (req, res, next) => {
  try {
    if (req.auth?.roles?.some((role) => String(role).toLowerCase() === "admin")) {
      req.subscription = { subscriptionStatus: "admin_unlimited", isAdmin: true };
      return next();
    }
    const user = await User.findById(req.auth.sub).select("subscriptionStatus trialEndDate");
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    if (user.subscriptionStatus === "trialing" && user.trialEndDate && user.trialEndDate <= now) {
      user.subscriptionStatus = "expired";
      await user.save();
    }

    if (!["trialing", "active"].includes(user.subscriptionStatus)) {
      return res.status(403).json({
        code: "UNLIMITED_SUBSCRIPTION_REQUIRED",
        message: "An active Unlimited subscription or trial is required to read this book",
        subscriptionStatus: user.subscriptionStatus,
      });
    }

    req.subscription = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireUnlimitedAccess };
