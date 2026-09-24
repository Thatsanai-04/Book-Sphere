const Book = require("../models/book.model");

const publicBookFields = "title slug synopsis coverUrl format contentType publisher language origin contributors categories tags price isFree buffetEligible ebook.previewUrl publishedAt";
const recommendedFields = "_id title coverUrl contributors rating price buffetEligible isFree contentType categories isRecommended readCount salesCount";

const recommendedBookResponse = (book) => ({
  id: book._id,
  title: book.title,
  coverUrl: book.coverUrl || null,
  author: book.contributors?.find((item) => item.role === "author")?.name || "Unknown author",
  rating: book.rating?.average ?? 0,
  price: book.price,
  isUnlimited: Boolean(book.buffetEligible || book.isFree),
  category: book.contentType || book.categories?.[0] || null,
});

const listRecommendedBooks = async (req, res, next) => {
  try {
    const filter = { status: "published" };
    const category = req.query.category?.trim().toLowerCase();
    if (category) filter.$or = [{ contentType: category }, { categories: category }];

    const books = await Book.find(filter)
      .select(recommendedFields)
      .sort({ isRecommended: -1, readCount: -1, salesCount: -1, publishedAt: -1 })
      .limit(8)
      .lean();

    res.json({ books: books.map(recommendedBookResponse) });
  } catch (error) {
    next(error);
  }
};

const listBooks = async (req, res, next) => {
  try {
    const { q, format, category, type, free } = req.query;
    const filter = { status: "published" };
    if (format) filter.format = format;
    if (category) filter.categories = category.toLowerCase();
    if (type) filter.contentType = type;
    if (free === "true") filter.isFree = true;
    if (q?.trim()) filter.$text = { $search: q.trim() };

    const books = await Book.find(filter)
      .select(publicBookFields)
      .sort(q?.trim() ? { score: { $meta: "textScore" } } : { publishedAt: -1 })
      .limit(60)
      .lean();
    res.json({ books });
  } catch (error) {
    next(error);
  }
};

const createBook = async (req, res, next) => {
  try {
    const book = await Book.create({ ...req.body, seller: req.auth.sub });
    res.status(201).json({ book: await Book.findById(book.id).select(publicBookFields) });
  } catch (error) {
    next(error);
  }
};

const getBookBySlug = async (req, res, next) => {
  try {
    const book = await Book.findOne({ slug: req.params.slug, status: "published" }).select(publicBookFields).lean();
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json({ book });
  } catch (error) {
    next(error);
  }
};

module.exports = { listBooks, listRecommendedBooks, recommendedBookResponse, getBookBySlug, createBook };
