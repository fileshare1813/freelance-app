require('dotenv').config();
const express        = require('express');
const http           = require('http');
const path           = require('path');
const session        = require('express-session');
const MongoStore = require('connect-mongo').default;
const passport       = require('passport');
const flash          = require('connect-flash');
const methodOverride = require('method-override');
const dns            = require('dns');

const connectDB      = require('./config/db');
const { initSocket } = require('./config/socket');
require('./config/passport');

const authRoutes         = require('./routes/auth');
const adminRoutes        = require('./routes/admin');
const clientRoutes       = require('./routes/client');
const freelancerRoutes   = require('./routes/freelancer');
const projectRoutes      = require('./routes/projects');
const messageRoutes      = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const profileRoutes      = require('./routes/profile');
const reportRoutes       = require('./routes/reports');
const paymentRoutes      = require('./routes/payments');

dns.setServers(['1.1.1.1', '8.8.8.8']);

const app    = express();
const server = http.createServer(app);

connectDB();
initSocket(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use('/payments/webhook', express.raw({ type: '*/*' }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600}),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// ── Global locals ─────────────────────────────────────────────────────────────
app.use(async (req, res, next) => {
  res.locals.success     = req.flash('success');
  res.locals.error       = req.flash('error');
  res.locals.currentUser = req.user || null;

  if (req.user) {
    try {
      const Notification = require('./models/Notification');
      res.locals.unreadNotifications = await Notification.countDocuments({
        recipient: req.user._id, read: false
      });
    } catch (e) { res.locals.unreadNotifications = 0; }

    if (req.user.role === 'admin') {
      try {
        const User = require('./models/User');
        res.locals.unverifiedCount = await User.countDocuments({
          isVerified: false, isBanned: false, role: { $ne: 'admin' }
        });
      } catch (e) { res.locals.unverifiedCount = 0; }
    } else {
      res.locals.unverifiedCount = 0;
    }
  } else {
    res.locals.unreadNotifications = 0;
    res.locals.unverifiedCount     = 0;
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',          authRoutes);
app.use('/admin',         adminRoutes);
app.use('/client',        clientRoutes);
app.use('/freelancer',    freelancerRoutes);
app.use('/projects',      projectRoutes);
app.use('/messages',      messageRoutes);
app.use('/notifications', notificationRoutes);
app.use('/profile',       profileRoutes);
app.use('/reports',       reportRoutes);
app.use('/payments',      paymentRoutes);

// ── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.user) {
    const role = req.user.role;
    if (role === 'admin')      return res.redirect('/admin/dashboard');
    if (role === 'client')     return res.redirect('/client/dashboard');
    if (role === 'freelancer') return res.redirect('/freelancer/dashboard');
  }
  res.render('auth/login', { title: 'Welcome - FreelanceHub' });
});

// ── Avatar ────────────────────────────────────────────────────────────────────
app.get('/avatar/:userId', async (req, res) => {
  try {
    const User = require('./models/User');
    const user = await User.findById(req.params.userId).select('avatar avatarContentType');
    if (user && user.avatar) {
      res.set('Content-Type', user.avatarContentType || 'image/jpeg');
      return res.send(user.avatar);
    }
    res.redirect('/images/default-avatar.png');
  } catch (e) { res.redirect('/images/default-avatar.png'); }
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('shared/404', {
    title: '404 - Not Found', currentUser: req.user || null,
    success: [], error: [], unreadNotifications: 0, unverifiedCount: 0
  });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('shared/500', {
    title: 'Server Error', error: err.message,
    currentUser: req.user || null,
    success: [], error_msgs: [], unreadNotifications: 0, unverifiedCount: 0
  });
});

// ── Verification cron job (inline — no separate file needed) ──────────────────
async function runVerificationCron() {
  const User                        = require('./models/User');
  const Notification                = require('./models/Notification');
  const crypto                      = require('crypto');
  const { generateOTP,
          sendVerificationWarning } = require('./utils/sendOTP');

  const now     = new Date();
  const cut24   = new Date(now - 24 * 60 * 60 * 1000);
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';

  // TASK A: Warning emails
  const toWarn = await User.find({
    isVerified: false, isBanned: false,
    warningSentAt: null, createdAt: { $lte: cut24 }
  });

  console.log(`[Cron] TASK-A: ${toWarn.length} users ko warning bhejna hai`);

  for (const user of toWarn) {
    try {
      const otp       = generateOTP();
      const token     = crypto.randomBytes(32).toString('hex');
      const expiry    = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const verifyUrl = `${baseUrl}/auth/verify-account?token=${token}&email=${encodeURIComponent(user.email)}`;

      user.otp               = otp;
      user.otpExpiry         = expiry;
      user.verifyToken       = token;
      user.verifyTokenExpiry = expiry;
      user.warningSentAt     = now;
      await user.save();

      await sendVerificationWarning(user.email, user.name, otp, verifyUrl);
      console.log(`[Cron] Warning sent: ${user.email}`);
    } catch (err) {
      console.error(`[Cron] Warning FAILED ${user.email}:`, err.message);
    }
  }

  // TASK B: Auto-ban
  const toBan = await User.find({
    isVerified: false, isBanned: false,
    warningSentAt: { $ne: null, $lte: cut24 }
  });

  console.log(`[Cron] TASK-B: ${toBan.length} users ko ban karna hai`);

  for (const user of toBan) {
    try {
      user.isBanned          = true;
      user.verifyToken       = null;
      user.verifyTokenExpiry = null;
      user.otp               = null;
      user.otpExpiry         = null;
      await user.save();

      const admins = await User.find({ role: 'admin' }).select('_id').lean();
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id, type: 'system',
          message: `Auto-ban: "${user.name}" (${user.email}) — 48hrs me verify nahi kiya`,
          link: '/admin/unverified-users'
        });
      }
      console.log(`[Cron] Auto-banned: ${user.email}`);
    } catch (err) {
      console.error(`[Cron] Ban FAILED ${user.email}:`, err.message);
    }
  }

  return { warned: toWarn.length, banned: toBan.length };
}

// Expose for admin manual trigger
app.set('runVerificationCron', runVerificationCron);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`FreelanceHub running on http://localhost:${PORT}`);

  // ── Cron: try karo node-cron load karne ki — agar nahi mila to warn karo ──
  try {
    const cron = require('node-cron');

    // Roz midnight IST
    cron.schedule('0 0 * * *', async () => {
      console.log('[Cron] Midnight job start:', new Date().toISOString());
      try {
        const result = await runVerificationCron();
        console.log(`[Cron] Done — Warned: ${result.warned}, Banned: ${result.banned}`);
      } catch (err) {
        console.error('[Cron] Job error:', err.message);
      }
    }, { timezone: 'Asia/Kolkata' });

    console.log('[Cron] Verification cron scheduled — roz midnight IST');
  } catch (cronErr) {
    // node-cron nahi mila — server phir bhi chalega, sirf cron nahi chalega
    console.warn('[Cron] node-cron not found — cron disabled.');
    console.warn('[Cron] Fix: npm install node-cron');
  }
});