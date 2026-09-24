const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const { getCart, addItem, removeItem } = require("../controllers/cart.controller");

const router = express.Router();
router.use(requireAuth);
router.get("/", getCart);
router.post("/items", addItem);
router.delete("/items/:slug", removeItem);

module.exports = router;
