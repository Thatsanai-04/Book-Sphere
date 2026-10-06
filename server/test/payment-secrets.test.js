const test = require("node:test");
const assert = require("node:assert/strict");
const { encryptSecret, decryptSecret, maskSecret } = require("../src/utils/payment-secrets");

test("encrypts secrets at rest and decrypts them with the configured key", () => {
  const previousKey = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY;
  process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY = "a".repeat(64);
  try {
    const secret = "sk_test_livevalue1234";
    const encrypted = encryptSecret(secret);
    assert.notEqual(encrypted, secret);
    assert.equal(encrypted.includes(secret), false);
    assert.equal(decryptSecret(encrypted), secret);
  } finally {
    if (previousKey === undefined) delete process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY;
    else process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY = previousKey;
  }
});

test("masks payment secrets while retaining their recognizable prefix and suffix", () => {
  assert.equal(maskSecret("sk_test_livevalue1234"), "sk_test_****1234");
  assert.equal(maskSecret("whsec_987654321"), "whsec_****4321");
  assert.equal(maskSecret(""), "");
});