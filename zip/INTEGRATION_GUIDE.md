# FreelanceHub — Razorpay Payment Integration Guide
# ═══════════════════════════════════════════════════════════════════

## STEP 1 — Install dependency
```bash
npm install razorpay
```

## STEP 2 — Add to your .env file
```
# ── Razorpay Mode ──────────────────────────────────────
# Change RAZORPAY_MODE to 'live' when ready for production
RAZORPAY_MODE=test

# ── Test Keys (from https://dashboard.razorpay.com → Settings → API Keys) ──
RAZORPAY_TEST_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_TEST_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── Live Keys (generate from Razorpay dashboard in Live mode) ──
RAZORPAY_LIVE_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_LIVE_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── Webhook Secret (optional but recommended) ──
# Set this in Razorpay Dashboard → Settings → Webhooks
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

## STEP 3 — Copy new files into your project (exact paths)
```
pay/models/Payment.js                    → models/Payment.js
pay/utils/razorpayService.js             → utils/razorpayService.js
pay/controllers/paymentController.js    → controllers/paymentController.js
pay/routes/payments.js                  → routes/payments.js
pay/views/payment/checkout.ejs          → views/payment/checkout.ejs
pay/views/payment/freelancer-payments.ejs → views/payment/freelancer-payments.ejs
pay/views/payment/admin-payments.ejs    → views/payment/admin-payments.ejs
```
Also create the `views/payment/` folder if it doesn't exist.

## STEP 4 — Update models/User.js
Find the line:
```js
lastLogin: { type: Date }
```
Add a comma after it, then add:
```js
// Payout details (freelancer only)
payoutMethod: { type: String, enum: ['upi', 'bank'] },
payoutDetails: {
  method:        String,
  upiId:         String,
  accountName:   String,
  accountNumber: String,
  ifsc:          String,
  bankName:      String
}
```

## STEP 5 — Update server.js

### 5a. Add import (near other route imports, around line 16):
```js
const paymentRoutes = require('./routes/payments');
```

### 5b. CRITICAL — Webhook needs raw body BEFORE express.json()
Find this in server.js:
```js
app.use(express.json());
```
Replace with:
```js
// Razorpay webhook needs raw body — must be before express.json()
app.use('/payments/webhook', express.raw({ type: '*/*' }));
app.use(express.json());
```

### 5c. Register payment route (after other app.use routes):
```js
app.use('/payments', paymentRoutes);
```

## STEP 6 — Update routes/admin.js

At the top, add:
```js
const paymentCtrl = require('../controllers/paymentController');
```

Before `module.exports`, add:
```js
router.get( '/payments',                   paymentCtrl.getAdminPayments);
router.post('/payments/:id/release',       paymentCtrl.releasePayment);
router.post('/payments/:id/complete',      paymentCtrl.completePayment);
```

## STEP 7 — Add "Pay Now" button in views/client/my-projects.ejs

Inside the `.project-card-actions` div, find the `in_progress` block and add:
```ejs
<% if (p.status === 'in_progress' && p.hiredFreelancer) { %>
  <a href="/payments/project/<%= p._id %>" class="btn btn-sm btn-warning">
    <i class="fas fa-credit-card"></i> Pay Now
  </a>
<% } %>
```

## STEP 8 — Replace "Mark Complete" in views/client/my-projects.ejs

Find this existing form:
```ejs
<form action="/client/projects/<%= p._id %>/complete" method="POST" style="display:inline">
  <button type="submit" class="btn btn-sm btn-success" onclick="return confirm('Mark as completed?')">
    <i class="fas fa-check"></i> Complete
  </button>
</form>
```
Replace it with (routes through payment controller now):
```ejs
<form action="/payments/project/<%= p._id %>/complete" method="POST" style="display:inline">
  <button type="submit" class="btn btn-sm btn-success" onclick="return confirm('Mark project as complete and release payment to freelancer?')">
    <i class="fas fa-check"></i> Complete &amp; Release Payment
  </button>
</form>
```

## STEP 9 — Add sidebar links

### Freelancer sidebar (views/partials/sidebar.ejs)
Inside the `currentUser.role === 'freelancer'` block, add:
```ejs
<a href="/payments/freelancer" class="sidebar-link">
  <i class="fas fa-wallet"></i><span>My Payments</span>
</a>
```

### Admin sidebar
Inside the `currentUser.role === 'admin'` block, add:
```ejs
<a href="/admin/payments" class="sidebar-link">
  <i class="fas fa-money-bill-wave"></i><span>Payments</span>
</a>
```

## STEP 10 — Add navbar links

In views/partials/navbar.ejs, inside the freelancer nav section:
```ejs
<a href="/payments/freelancer" class="nav-link">Payments</a>
```

## STEP 11 — Add payout setup prompt when freelancer is hired

In controllers/clientController.js, inside `acceptProposal`, after the hired notification,
add this to also prompt the freelancer to set up payout if they haven't:
```js
// Check if freelancer has payout details
const fl = await User.findById(proposal.freelancer._id);
if (!fl.payoutDetails?.method) {
  const payoutNotif = await Notification.create({
    recipient: proposal.freelancer._id,
    sender:    req.user._id,
    type:      'payment',
    message:   `You've been hired for "${project.title}"! Please add your bank/UPI details to receive your payment.`,
    link:      '/payments/freelancer'
  });
  const payoutPop = await payoutNotif.populate('sender', 'name googleAvatar');
  getIO().to(`user_${proposal.freelancer._id}`).emit('newNotification', payoutPop);
}
```

## ═══════════════════════════════════════════════════════════════════
## PAYMENT FLOW (Full Summary)
## ═══════════════════════════════════════════════════════════════════

1.  Client posts project
2.  Freelancer submits proposal
3.  Client accepts → project 'in_progress'
4.  → Freelancer gets hired notification + payout setup prompt (if not already done)
5.  Freelancer adds bank/UPI at /payments/freelancer
6.  Client clicks "Pay Now" → /payments/project/:id → checkout.ejs
7.  Razorpay modal opens (UPI / Card / Netbanking)
8.  Client pays → /payments/verify → signature verified → status: 'paid'
9.  Both freelancer + admin notified of payment
10. Freelancer submits daily reports, completes work
11. Client clicks "Complete & Release Payment" → markProjectComplete
12. Project status → 'completed', payment stays 'paid'
13. Admin notified to process payout
14. Admin goes to /admin/payments → sees freelancer payout details
15. Admin transfers ₹ manually via Razorpay Dashboard → Payouts
16. Admin clicks "Release Payment" + adds UTR/note → status: 'released'
17. Freelancer notified payment is being transferred
18. Admin confirms transfer received → clicks "Mark as Sent" → status: 'completed'
19. Freelancer totalEarnings updated + completion notification

## ═══════════════════════════════════════════════════════════════════
## COMMISSION CALCULATION
## ═══════════════════════════════════════════════════════════════════

Project budget: ₹10,000
├── Platform fee (10%):  ₹1,000  → admin keeps this
└── Freelancer gets:     ₹9,000  → admin manually transfers this

Admin transfers only ₹9,000 to freelancer.
The ₹1,000 stays in Razorpay account as platform revenue.

## ═══════════════════════════════════════════════════════════════════
## TEST CREDENTIALS (Razorpay Test Mode)
## ═══════════════════════════════════════════════════════════════════

Card:     4111 1111 1111 1111 | Expiry: any future | CVV: any 3 digits
UPI:      success@razorpay    (instant success)
UPI:      failure@razorpay    (instant failure — to test error handling)
Netbank:  Use HDFC / SBI test bank in modal

## ═══════════════════════════════════════════════════════════════════
## SWITCHING TEST ↔ LIVE
## ═══════════════════════════════════════════════════════════════════

In .env, change:
  RAZORPAY_MODE=test   →   RAZORPAY_MODE=live

Then restart server. All keys auto-switch. No code change needed.

## ═══════════════════════════════════════════════════════════════════
## RAZORPAY DASHBOARD — How to do manual payout
## ═══════════════════════════════════════════════════════════════════

1. Login at dashboard.razorpay.com
2. Left menu → Payouts → Create Payout
3. Select account type: UPI or Bank
4. Enter freelancer details from admin panel (shown in Release modal)
5. Enter amount (the freelancerAmount shown — 90% of project budget)
6. Purpose: Freelance Payment
7. Submit → copy UTR number
8. Come back to FreelanceHub admin → paste UTR in note → Release
