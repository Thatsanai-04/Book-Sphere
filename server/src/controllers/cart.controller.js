const Cart = require("../models/cart.model");
const Book = require("../models/book.model");

const fields = "title slug coverUrl format contentType contributors price isFree publisher";
const responseFor = async (reader) => {
  const cart = await Cart.findOne({ reader }).populate({ path: "items.book", select: fields }).lean();
  const items = (cart?.items || []).filter((item) => item.book);
  const total = items.reduce((sum, item) => sum + (item.book.isFree ? 0 : item.book.price?.amount || 0), 0);
  return { items, total, currency: "THB" };
};

const getCart = async (req, res, next) => {
  try { res.json(await responseFor(req.auth.sub)); } catch (error) { next(error); }
};

const addItem = async (req, res, next) => {
  try {
    const book = await Book.findOne({ slug: req.body.slug, status: "published" }).select("_id");
    if (!book) return res.status(404).json({ message: "Book not found" });
    let cart = await Cart.findOne({ reader: req.auth.sub });
    if (!cart) cart = new Cart({ reader: req.auth.sub });
    if (cart.items.some((item) => item.book.equals(book._id))) {
      return res.status(409).json({ message: "This book is already in your cart" });
    }
    cart.items.push({ book: book._id });
    await cart.save();
    res.status(201).json(await responseFor(req.auth.sub));
  } catch (error) { next(error); }
};

const removeItem = async (req, res, next) => {
  try {
    const book = await Book.findOne({ slug: req.params.slug }).select("_id");
    if (!book) return res.status(404).json({ message: "Book not found" });
    await Cart.findOneAndUpdate({ reader: req.auth.sub }, { $pull: { items: { book: book._id } } });
    res.json(await responseFor(req.auth.sub));
  } catch (error) { next(error); }
};

module.exports = { getCart, addItem, removeItem };
