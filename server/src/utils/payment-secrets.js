const crypto = require("crypto");

const encryptionKey = () => {
  const value = process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY || "";
  if (!/^[a-f\d]{64}$/i.test(value)) {
    const error = new Error("PAYMENT_SETTINGS_ENCRYPTION_KEY must be a 32-byte hex value");
    error.status = 503;
    throw error;
  }
  return Buffer.from(value, "hex");
};

const encryptSecret = (value) => {
  if (!value) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1:${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted.toString("hex")}`;
};

const decryptSecret = (value) => {
  if (!value) return "";
  const [version, ivHex, tagHex, encryptedHex] = value.split(":");
  if (version !== "v1" || !ivHex || !tagHex || !encryptedHex) {
    throw new Error("Stored payment secret has an unsupported format");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
};

const maskSecret = (value) => {
  if (!value) return "";
  const prefix = value.match(/^[a-z]{2,8}_[a-z]{2,8}_/i)?.[0]
    || value.match(/^[a-z]{2,8}_/i)?.[0]
    || "";
  return `${prefix}****${value.slice(-4)}`;
};

module.exports = { encryptSecret, decryptSecret, maskSecret };