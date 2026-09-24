const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Book = require("../src/models/book.model");
const Purchase = require("../src/models/purchase.model");
const { recommendedBookResponse } = require("../src/controllers/book.controller");

const validBook = (overrides = {}) => new Book({
  title: "A valid story",
  slug: `story-${new mongoose.Types.ObjectId().toString()}`,
  synopsis: "A complete synopsis for this e-book.",
  format: "ebook",
  contentType: "novel",
  ebook: { fileUrl: "https://files.example.test/story.epub", pageCount: 20 },
  language: "th",
  origin: "original",
  seller: new mongoose.Types.ObjectId(),
  contributors: [{ name: "An Independent Writer", role: "author" }],
  price: { amount: 99, currency: "THB" },
  ...overrides,
});

test("accepts a sellable e-book in each supported catalogue type", async () => {
  for (const contentType of ["novel", "comic", "magazine", "newspaper"]) {
    await assert.doesNotReject(validBook({ contentType }).validate());
  }
});

test("recommended book fields default safely and map to the public response", () => {
  const book = validBook({
    title: "Recommended Story",
    coverUrl: "https://files.example.test/cover.jpg",
    contributors: [{ name: "An Author", role: "author" }],
    buffetEligible: true,
    isRecommended: true,
    readCount: 42,
    salesCount: 12,
    rating: { average: 4.8, count: 10 },
  });
  const response = recommendedBookResponse(book.toObject());

  assert.equal(book.isRecommended, true);
  assert.equal(book.readCount, 42);
  assert.deepEqual(response, {
    id: book._id,
    title: "Recommended Story",
    coverUrl: "https://files.example.test/cover.jpg",
    author: "An Author",
    rating: 4.8,
    price: { amount: 99, currency: "THB" },
    isUnlimited: true,
    category: "novel",
  });
});

test("rejects a free book that has a non-zero price", async () => {
  await assert.rejects(validBook({ isFree: true }).validate(), /Free books must have a zero price/);
});

test("rejects an e-book without a protected source file", async () => {
  await assert.rejects(validBook({ ebook: {} }).validate(), /e-book file is required/);
});

test("accepts an e-book written directly in the browser", async () => {
  const book = validBook({
    ebook: { fileUrl: "inline://browser-story", contentHtml: "<h1>Chapter one</h1><p>Content</p>" },
  });
  await assert.doesNotReject(book.validate());
});

test("requires the acquisition type for a library record", async () => {
  const purchase = new Purchase({
    reader: new mongoose.Types.ObjectId(), book: new mongoose.Types.ObjectId(),
    amount: 0, currency: "THB", status: "paid",
  });
  await assert.rejects(purchase.validate(), /acquisitionType/);
});
