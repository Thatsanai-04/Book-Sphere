const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const { startTrial, getSubscriptionStatus } = require("../controllers/subscription.controller");

const router = express.Router();

router.use(requireAuth);
router.post("/start-trial", startTrial);
router.get("/status", getSubscriptionStatus);

module.exports = router;
