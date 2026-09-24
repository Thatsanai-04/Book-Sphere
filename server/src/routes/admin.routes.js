const express = require("express");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const { listUsers, updateUser, listBooks, createBook, uploadEbook, uploadCover, seedBooks, updateBook } = require("../controllers/admin.controller");
const { ebookUpload, coverUpload } = require("../middlewares/upload.middleware");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));
router.get("/users", listUsers);
router.patch("/users/:id", updateUser);
router.get("/books", listBooks);
router.post("/uploads/ebook", ebookUpload.single("file"), uploadEbook);
router.post("/uploads/cover", coverUpload.single("file"), uploadCover);
router.post("/books/seed", seedBooks);
router.post("/books", createBook);
router.patch("/books/:id", updateBook);

module.exports = router;
