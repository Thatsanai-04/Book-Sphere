const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Cart = require("../src/models/cart.model");

test("a cart accepts one or more selected book references", async () => {
  const cart = new Cart({
    reader: new mongoose.Types.ObjectId(),
    items: [{ book: new mongoose.Types.ObjectId() }, { book: new mongoose.Types.ObjectId() }],
  });
  await assert.doesNotReject(cart.validate());
  assert.equal(cart.items.length, 2);
});

test("a cart item requires a book reference", async () => {
  const cart = new Cart({ reader: new mongoose.Types.ObjectId(), items: [{}] });
  await assert.rejects(cart.validate(), /book/);
});
