const User = require("../models/user.model");
const Book = require("../models/book.model");
const crypto = require("crypto");
const path = require("path");
const { put } = require("@vercel/blob");

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

const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("displayName email roles status avatarUrl createdAt").sort({ createdAt: -1 }).limit(100).lean();
    res.json({ users });
  } catch (error) { next(error); }
};

const updateUser = async (req, res, next) => {
  try {
    const allowed = ["displayName", "roles", "status"];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (req.params.id === req.auth.sub && (changes.status || changes.roles)) {
      return res.status(400).json({ message: "An admin cannot change their own role or status" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: user.toPublicJSON() });
  } catch (error) { next(error); }
};

const listBooks = async (req, res, next) => {
  try {
    const books = await Book.find().select("title slug contentType format sourceType publisher price isFree isRecommended isHeroFeatured status publishedAt seller updatedAt").populate("seller", "displayName email").sort({ updatedAt: -1 }).limit(100).lean();
    res.json({ books });
  } catch (error) { next(error); }
};

const createBook = async (req, res, next) => {
  try {
    const data = { ...req.body, seller: req.auth.sub, createdByAdminId: req.auth.sub };
    data.sourceType = data.sourceType || (req.file ? "upload" : "url");
    if (req.file) data.ebook = { ...(data.ebook || {}), fileUrl: await uploadToBlob(req.file, "ebooks") };
    if (typeof data.price === "string") data.price = { amount: Number(data.price), currency: "THB" };
    if (data.isFree === "true" || data.isFree === true) {
      data.isFree = true;
      data.price = { amount: 0, currency: "THB" };
    }
    if (!data.contributors && data.author) data.contributors = [{ name: data.author, role: "author" }];
    if (data.description && !data.synopsis) data.synopsis = data.description;
    if (data.isHeroFeatured === true && await Book.countDocuments({ isHeroFeatured: true }) >= 3) {
      return res.status(409).json({ code: "HERO_LIMIT_REACHED", message: "หนังสือหน้าแรกเต็มแล้ว (สูงสุด 3 เล่ม)" });
    }
    if (data.status === "published" && !data.publishedAt) data.publishedAt = new Date();
    const book = await Book.create(data);
    res.status(201).json({ book });
  } catch (error) { next(error); }
};

const uploadEbook = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: "Upload an .epub or .pdf file up to 50 MB" });
  try { res.status(201).json({ fileUrl: await uploadToBlob(req.file, "ebooks"), fileName: req.file.originalname }); } catch (error) { next(error); }
};

const uploadCover = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ message: "Upload a JPG, PNG, or WebP cover image up to 5 MB" });
  try { res.status(201).json({ coverUrl: await uploadToBlob(req.file, "covers"), fileName: req.file.originalname }); } catch (error) { next(error); }
};

const seedBooks = async (req, res, next) => {
  try {
    const samples = [
      ["the-rainy-season", "ฤดูฝนที่เราพบกัน", "Lalin", "novel", 189, "เรื่องราวของสองคนที่กลับมาพบกันในฤดูฝน"],
      ["midnight-in-kyoto", "Midnight in Kyoto", "Aki Tanaka", "novel", 229, "ค่ำคืนหนึ่งในเกียวโตที่เปลี่ยนทุกอย่าง"],
      ["skyline-comic", "Skyline", "Narin Studio", "comic", 99, "การ์ตูนผจญภัยเหนือเส้นขอบฟ้า"],
      ["weekend-magazine", "Weekend Magazine", "PLOT Editorial", "magazine", 0, "นิตยสารสุดสัปดาห์ฉบับอ่านฟรี"],
      ["daily-brief", "The Daily Brief", "Independent Press", "newspaper", 0, "สรุปข่าวเด่นประจำวัน"],
    ];
    const now = new Date();
    await Promise.all(samples.map(([slug, title, author, contentType, amount, synopsis]) => Book.updateOne(
      { slug },
      { $setOnInsert: {
        title, slug, synopsis, format: "ebook", contentType, language: "en", origin: "original",
        seller: req.auth.sub, contributors: [{ name: author, role: "author" }],
        publisher: { name: "PLOT", type: "publisher" }, price: { amount, currency: "THB" },
        isFree: amount === 0, ebook: { fileUrl: `inline://${slug}`, contentHtml: `<h1>${title}</h1><p>${synopsis}</p>` },
        status: "published", publishedAt: now,
      } },
      { upsert: true }
    )));
    const books = await Book.find({ slug: { $in: samples.map(([slug]) => slug) } }).select("title slug status").lean();
    res.status(201).json({ books });
  } catch (error) { next(error); }
};

const updateBook = async (req, res, next) => {
  try {
    const allowed = ["title", "synopsis", "coverUrl", "contentType", "publisher", "categories", "tags", "price", "isFree", "status", "publishedAt", "isRecommended", "isHeroFeatured"];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (changes.isHeroFeatured === true && await Book.countDocuments({ isHeroFeatured: true, _id: { $ne: req.params.id } }) >= 3) {
      return res.status(409).json({ code: "HERO_LIMIT_REACHED", message: "หนังสือหน้าแรกเต็มแล้ว (สูงสุด 3 เล่ม)" });
    }
    if (changes.status === "published" && !changes.publishedAt) changes.publishedAt = new Date();
    const book = await Book.findById(req.params.id).select("+ebook.fileUrl");
    if (!book) return res.status(404).json({ message: "Book not found" });
    Object.assign(book, changes);
    await book.save();
    res.json({ book });
  } catch (error) { next(error); }
};

const deleteBook = async (req, res, next) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json({ message: "Book deleted", id: book.id });
  } catch (error) { next(error); }
};

const toggleRecommended = async (req, res, next) => {
  try {
    const current = await Book.findById(req.params.id).select("isRecommended").lean();
    if (!current) return res.status(404).json({ message: "Book not found" });
    const nextValue = !current.isRecommended;
    if (nextValue && await Book.countDocuments({ isRecommended: true }) >= 8) {
      return res.status(409).json({ code: "RECOMMENDED_LIMIT_REACHED", message: "รายการหนังสือแนะนำเต็มแล้ว (สูงสุด 8 เล่ม)" });
    }
    const book = await Book.findOneAndUpdate({ _id: req.params.id, isRecommended: current.isRecommended }, { $set: { isRecommended: nextValue } }, { new: true, runValidators: true }).select("title slug contentType format sourceType publisher price isFree isRecommended status publishedAt seller updatedAt").populate("seller", "displayName email").lean();
    if (!book) return res.status(409).json({ message: "Book status changed. Refresh and try again" });
    res.json({ book, message: "อัปเดตสถานะหนังสือแนะนำเรียบร้อย" });
  } catch (error) { next(error); }
};

const toggleHeroFeatured = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).select("isHeroFeatured");
    if (!book) return res.status(404).json({ message: "Book not found" });
    const nextValue = !book.isHeroFeatured;
    if (nextValue && await Book.countDocuments({ isHeroFeatured: true }) >= 3) {
      return res.status(409).json({ code: "HERO_LIMIT_REACHED", message: "หนังสือหน้าแรกเต็มแล้ว (สูงสุด 3 เล่ม)" });
    }
    book.isHeroFeatured = nextValue;
    await book.save();
    res.json({ book, message: "อัปเดตหนังสือหน้าแรกเรียบร้อย" });
  } catch (error) { next(error); }
};

module.exports = { listUsers, updateUser, listBooks, createBook, uploadEbook, uploadCover, seedBooks, updateBook, toggleRecommended, toggleHeroFeatured, deleteBook };
