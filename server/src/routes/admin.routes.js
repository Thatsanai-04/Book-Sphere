const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const { listUsers, updateUser, listBooks, createBook, uploadEbook, uploadCover, seedBooks, updateBook, toggleRecommended, toggleHeroFeatured, deleteBook } = require("../controllers/admin.controller");
const { ebookUpload, coverUpload } = require("../middlewares/upload.middleware");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));
router.get("/users", listUsers);
router.patch("/users/:id", updateUser);
router.get("/books", listBooks);
router.get("/books/all", listBooks);
router.post("/uploads/ebook", ebookUpload.single("file"), uploadEbook);
router.post("/uploads/cover", coverUpload.single("file"), uploadCover);
router.post("/books/seed", seedBooks);
router.post("/books", ebookUpload.single("file"), createBook);
router.patch("/books/:id/recommend", toggleRecommended);
router.patch("/books/:id/hero", toggleHeroFeatured);
router.patch("/books/:id", updateBook);
router.delete("/books/:id", deleteBook);

module.exports = router;
