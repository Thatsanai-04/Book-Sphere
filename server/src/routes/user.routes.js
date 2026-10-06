const express = require("express");
const { register, login, getMe, updateMe, becomeAuthor } = require("../controllers/user.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/auth.middleware");
const { listMyBooks, resubmitBook, uploadEbook, uploadCover } = require("../controllers/author.controller");
const { ebookUpload, coverUpload } = require("../middlewares/upload.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);
router.post("/me/become-author", requireAuth, becomeAuthor);
router.get("/me/books", requireAuth, listMyBooks);
router.put("/me/books/:id/resubmit", requireAuth, requireRole("author"), resubmitBook);
router.post("/me/books/uploads/ebook", requireAuth, requireRole("author"), ebookUpload.single("file"), uploadEbook);
router.post("/me/books/uploads/cover", requireAuth, requireRole("author"), coverUpload.single("file"), uploadCover);

module.exports = router;
