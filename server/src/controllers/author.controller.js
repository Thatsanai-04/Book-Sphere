const crypto = require("crypto");
const path = require("path");
const { put } = require("@vercel/blob");
const Book = require("../models/book.model");

const writerBookFields = "title slug synopsis coverUrl format contentType publisher contributors price isFree sourceType status rejectionReason createdAt updatedAt ebook.previewUrl +ebook.fileUrl +ebook.contentHtml";
const uploadToBlob = async (file, folder) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  const extension = path.extname(file.originalname).toLowerCase();
  const blob = await put(`${folder}/${crypto.randomUUID()}${extension}`, file.buffer, {
    access: "public",
    contentType: file.mimetype,
    addRandomSuffix: false,
  });
  return blob.url;
};

const listMyBooks = async (req, res, next) => {
  try {
    const books = await Book.find({
      $or: [{ authorId: req.auth.sub }, { sellerId: req.auth.sub }, { seller: req.auth.sub }],
    }).select(writerBookFields).sort({ updatedAt: -1 }).lean();
    res.json({ books });
  } catch (error) { next(error); }
};

const resubmitBook = async (req, res, next) => {
  try {
    const allowed = ["title", "slug", "synopsis", "coverUrl", "format", "contentType", "publisher", "contributors", "price", "isFree", "sourceType", "ebook"];
    const changes = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    const book = await Book.findOne({
      _id: req.params.id,
      status: "rejected",
      $or: [{ authorId: req.auth.sub }, { sellerId: req.auth.sub }, { seller: req.auth.sub }],
    });
    if (!book) return res.status(404).json({ message: "Rejected book not found in your submissions" });
    Object.assign(book, changes, {
      status: "pending_approval",
      rejectionReason: undefined,
      isRecommended: false,
      isHeroFeatured: false,
      publishedAt: undefined,
    });
    await book.save();
    res.json({ book: await Book.findById(book.id).select(writerBookFields).lean() });
  } catch (error) { next(error); }
};

const uploadEbook = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: "Upload an .epub or .pdf file up to 50 MB" });
  try {
    res.status(201).json({ fileUrl: await uploadToBlob(req.file, "ebooks"), fileName: req.file.originalname });
  } catch (error) { next(error); }
};

const uploadCover = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: "Upload a JPG, PNG, or WebP cover image up to 5 MB" });
  try {
    res.status(201).json({ coverUrl: await uploadToBlob(req.file, "covers"), fileName: req.file.originalname });
  } catch (error) { next(error); }
};

module.exports = { listMyBooks, resubmitBook, uploadEbook, uploadCover };