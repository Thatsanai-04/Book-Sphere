const express = require("express");
const { register, login, getMe, updateMe, becomeAuthor } = require("../controllers/user.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);
router.post("/me/become-author", requireAuth, becomeAuthor);

module.exports = router;
