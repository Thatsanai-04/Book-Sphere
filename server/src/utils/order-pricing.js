const quoteOrder = (subtotal, submittedCode, { code = "PLOT10", percent = 10 } = {}) => {
  if (!submittedCode) return { subtotal, discount: 0, total: subtotal, code: null };

  const normalizedCode = String(submittedCode).trim().toUpperCase();
  if (!normalizedCode || normalizedCode !== String(code).trim().toUpperCase()) {
    const error = new Error("โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุ");
    error.status = 400;
    throw error;
  }

  const safePercent = Number.isFinite(Number(percent)) ? Math.min(100, Math.max(1, Number(percent))) : 10;
  const discount = Math.min(subtotal, Math.round(subtotal * safePercent / 100));
  return { subtotal, discount, total: subtotal - discount, code: normalizedCode };
};

const sandboxPaymentsEnabled = (env = process.env) =>
  env.PAYMENT_MODE === "sandbox" && env.NODE_ENV !== "production";

module.exports = { quoteOrder, sandboxPaymentsEnabled };