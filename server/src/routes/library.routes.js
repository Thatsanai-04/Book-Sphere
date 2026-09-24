const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireUnlimitedAccess } = require("../middlewares/subscription.middleware");
const { acquireBook, myLibrary, downloadBook } = require("../controllers/library.controller");

const router = express.Router();
router.get("/me", requireAuth, myLibrary);
router.post("/:slug/acquire", requireAuth, acquireBook);
router.get("/:slug/download", requireAuth, requireUnlimitedAccess, downloadBook);

module.exports = router;
