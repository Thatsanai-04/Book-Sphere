const express = require("express");
const { listBooks, listRecommendedBooks, getBookBySlug, createBook } = require("../controllers/book.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();
router.get("/", listBooks);
router.get("/recommended", listRecommendedBooks);
router.post("/", requireAuth, requireRole("author", "admin"), createBook);
router.get("/:slug", getBookBySlug);

module.exports = router;
