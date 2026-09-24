const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../src/models/user.model");
const { requireRole } = require("../src/middlewares/auth.middleware");

const invoke = (middleware, req) => new Promise((resolve) => {
  const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; resolve({ next: false, res: this }); } };
  middleware(req, res, () => resolve({ next: true, res }));
});

test("a registered user model defaults to the reader role", () => {
  const user = new User({ displayName: "Reader", email: "reader@example.test", passwordHash: "safe-password-hash" });
  assert.deepEqual(user.roles, ["reader"]);
  assert.equal(user.subscriptionStatus, "none");
  assert.equal(user.hasUsedTrial, false);
  assert.equal(user.trialStartDate, undefined);
  assert.equal(user.trialEndDate, undefined);
});

test("starting a trial marks it used and sets a seven-day expiry", () => {
  const startDate = new Date("2026-09-17T10:00:00.000Z");
  const user = new User({ displayName: "Reader", email: "trial@example.test", passwordHash: "safe-password-hash" });

  user.startTrial(startDate);

  assert.equal(user.subscriptionStatus, "trialing");
  assert.equal(user.hasUsedTrial, true);
  assert.equal(user.trialStartDate.toISOString(), startDate.toISOString());
  assert.equal(user.trialEndDate.toISOString(), "2026-09-24T10:00:00.000Z");
  assert.throws(() => user.startTrial(startDate), /not eligible/);
});

test("admin middleware denies readers and permits admins", async () => {
  const denied = await invoke(requireRole("admin"), { auth: { roles: ["reader"] } });
  assert.equal(denied.next, false);
  assert.equal(denied.res.statusCode, 403);

  const allowed = await invoke(requireRole("admin"), { auth: { roles: ["reader", "admin"] } });
  assert.equal(allowed.next, true);
});
