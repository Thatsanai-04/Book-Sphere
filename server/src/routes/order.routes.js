const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const { createOrder, validateCoupon, verifyPayment } = require("../controllers/order.controller");

const router = express.Router();
router.use(requireAuth);
router.post("/create", createOrder);
router.post("/coupons/validate", validateCoupon);
router.post("/verify-payment", verifyPayment);

module.exports = router;