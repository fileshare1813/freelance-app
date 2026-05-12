const express = require('express');
const router  = express.Router();
const { isLoggedIn, isClient, isFreelancer } = require('../middleware/auth');
const ctrl = require('../controllers/paymentController');

// ── Webhook: must use raw body (before express.json in server.js) ──────────────
router.post('/webhook', express.raw({ type: '*/*' }), ctrl.handleWebhook);

// ── Client ────────────────────────────────────────────────────────────────────
router.get( '/project/:projectId',           isLoggedIn, isClient,     ctrl.getCheckout);
router.post('/create-order',                 isLoggedIn, isClient,     ctrl.createOrder);
router.post('/verify',                       isLoggedIn, isClient,     ctrl.verifyPayment);
router.post('/project/:projectId/complete',  isLoggedIn, isClient,     ctrl.markProjectComplete);

// ── Freelancer ────────────────────────────────────────────────────────────────
router.get( '/freelancer',                   isLoggedIn, isFreelancer, ctrl.getFreelancerPayments);
router.post('/save-payout-details',          isLoggedIn, isFreelancer, ctrl.savePayoutDetails);

module.exports = router;
