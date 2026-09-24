const path = require("path");
const multer = require("multer");

const allowedExtensions = new Set([".epub", ".pdf"]);
const allowedCoverExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const storage = multer.memoryStorage();

const ebookUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, allowedExtensions.has(path.extname(file.originalname).toLowerCase())),
});

const coverUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, allowedCoverExtensions.has(path.extname(file.originalname).toLowerCase())),
});

module.exports = { ebookUpload, coverUpload };
