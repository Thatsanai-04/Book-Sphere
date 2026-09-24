const Book = require("../models/book.model");
const Purchase = require("../models/purchase.model");

const libraryFields = "title slug synopsis coverUrl format contentType publisher contributors price isFree ebook.previewUrl";

const acquireBook = async (req, res, next) => {
  try {
    const book = await Book.findOne({ slug: req.params.slug, status: "published" }).select("+ebook.fileUrl +ebook.contentHtml");
    if (!book) return res.status(404).json({ message: "Book not found" });

    const existing = await Purchase.findOne({ reader: req.auth.sub, book: book.id, status: "paid" });
    if (existing) return res.json({ purchase: existing, alreadyOwned: true });

    if (book.isFree) {
      const purchase = await Purchase.create({
        reader: req.auth.sub, book: book.id, amount: 0, currency: book.price.currency,
        acquisitionType: "free_download", status: "paid", paidAt: new Date(),
      });
      return res.status(201).json({ purchase, downloadUrl: book.ebook?.fileUrl });
    }

    const purchase = await Purchase.create({
      reader: req.auth.sub, book: book.id, amount: book.price.amount, currency: book.price.currency,
      acquisitionType: "purchase", status: "pending",
    });
    res.status(201).json({ purchase, checkoutRequired: true });
  } catch (error) {
    next(error);
  }
};

const myLibrary = async (req, res, next) => {
  try {
    const purchases = await Purchase.find({ reader: req.auth.sub, status: "paid" })
      .populate({ path: "book", select: libraryFields })
      .sort({ paidAt: -1 })
      .lean();
    res.json({ books: purchases.filter((item) => item.book).map((item) => ({ ...item.book, acquiredAt: item.paidAt, acquisitionType: item.acquisitionType })) });
  } catch (error) {
    next(error);
  }
};

const downloadBook = async (req, res, next) => {
  try {
    const book = await Book.findOne({ slug: req.params.slug, status: "published" }).select("+ebook.fileUrl +ebook.contentHtml");
    if (!book) return res.status(404).json({ message: "Book not found" });
    const owned = await Purchase.exists({ reader: req.auth.sub, book: book.id, status: "paid" });
    const hasUnlimitedAccess = (book.buffetEligible || book.isFree) && req.subscription;
    if (!owned && !hasUnlimitedAccess) return res.status(403).json({ message: "Purchase or claim this book before downloading" });
    if (book.ebook?.contentHtml) return res.json({ contentHtml: book.ebook.contentHtml, title: book.title });
    if (!book.ebook?.fileUrl) return res.status(409).json({ message: "No downloadable e-book file is available" });
    res.json({ downloadUrl: book.ebook.fileUrl });
  } catch (error) {
    next(error);
  }
};

module.exports = { acquireBook, myLibrary, downloadBook };
