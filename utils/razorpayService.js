/**
 * utils/razorpayService.js
 * Auto-switches Test / Live keys based on RAZORPAY_MODE in .env
 *
 * .env setup:
 *   RAZORPAY_MODE=test                    ← 'test' or 'live'
 *   RAZORPAY_TEST_KEY_ID=rzp_test_xxx
 *   RAZORPAY_TEST_KEY_SECRET=xxx
 *   RAZORPAY_LIVE_KEY_ID=rzp_live_xxx
 *   RAZORPAY_LIVE_KEY_SECRET=xxx
 *   RAZORPAY_WEBHOOK_SECRET=xxx           ← optional but recommended
 */

const Razorpay = require('razorpay');
const crypto   = require('crypto');

// ── Resolve keys based on mode ────────────────────────────────────────────────
const getConfig = () => {
  const mode = (process.env.RAZORPAY_MODE || 'test').toLowerCase();
  const isLive = mode === 'live';
  return {
    key_id:     isLive ? process.env.RAZORPAY_LIVE_KEY_ID     : process.env.RAZORPAY_TEST_KEY_ID,
    key_secret: isLive ? process.env.RAZORPAY_LIVE_KEY_SECRET : process.env.RAZORPAY_TEST_KEY_SECRET,
    mode:       isLive ? 'live' : 'test'
  };
};

// ── Fresh Razorpay instance (reads .env each call so hot-switch works) ────────
const getInstance = () => {
  const { key_id, key_secret } = getConfig();
  if (!key_id || !key_secret) {
    throw new Error(`Razorpay ${getConfig().mode} keys not set in .env`);
  }
  return new Razorpay({ key_id, key_secret });
};

// ── ₹ → paise ─────────────────────────────────────────────────────────────────
const toPaise = (rupees) => Math.round(Number(rupees) * 100);

// ── Create order ───────────────────────────────────────────────────────────────
const createOrder = async ({ amountRupees, receipt, notes = {} }) => {
  const rzp = getInstance();
  return rzp.orders.create({
    amount:   toPaise(amountRupees),
    currency: 'INR',
    receipt:  receipt.substring(0, 40),   // Razorpay receipt max 40 chars
    notes
  });
};

// ── Verify payment signature ───────────────────────────────────────────────────
const verifySignature = (orderId, paymentId, signature) => {
  const { key_secret } = getConfig();
  const expected = crypto
    .createHmac('sha256', key_secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
};

// ── Verify webhook signature ───────────────────────────────────────────────────
const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return true; // Skip if not configured
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
};

// ── Fetch payment details from Razorpay ───────────────────────────────────────
const fetchPayment = async (paymentId) => {
  const rzp = getInstance();
  return rzp.payments.fetch(paymentId);
};

// ── Create refund ──────────────────────────────────────────────────────────────
const createRefund = async (paymentId, amountRupees, notes = {}) => {
  const rzp = getInstance();
  return rzp.payments.refund(paymentId, {
    amount: toPaise(amountRupees),
    notes
  });
};

module.exports = {
  getConfig,
  createOrder,
  verifySignature,
  verifyWebhookSignature,
  fetchPayment,
  createRefund,
  toPaise
};
