const test = require("node:test");
const assert = require("node:assert/strict");
const { quoteOrder, sandboxPaymentsEnabled } = require("../src/utils/order-pricing");

test("applies a case-insensitive coupon and rounds the discount to baht", () => {
  assert.deepEqual(quoteOrder(199, " plot10 "), {
    subtotal: 199,
    discount: 20,
    total: 179,
    code: "PLOT10",
  });
});

test("rejects unknown coupons and never discounts below zero", () => {
  assert.throws(() => quoteOrder(100, "INVALID"), { status: 400 });
  assert.deepEqual(quoteOrder(5, "SAVE", { code: "SAVE", percent: 100 }), {
    subtotal: 5,
    discount: 5,
    total: 0,
    code: "SAVE",
  });
});

test("allows payment simulation only outside production with explicit sandbox mode", () => {
  assert.equal(sandboxPaymentsEnabled({ PAYMENT_MODE: "sandbox", NODE_ENV: "development" }), true);
  assert.equal(sandboxPaymentsEnabled({ PAYMENT_MODE: "sandbox", NODE_ENV: "production" }), false);
  assert.equal(sandboxPaymentsEnabled({ NODE_ENV: "development" }), false);
});