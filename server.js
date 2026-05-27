require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const dns = require('dns');

const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
require('./config/passport');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');
const freelancerRoutes = require('./routes/freelancer');
const projectRoutes = require('./routes/projects');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const profileRoutes = require('./routes/profile');
const reportRoutes = require('./routes/reports');
const paymentRoutes = require('./routes/payments');

dns.setServers(['1.1.1.1', '8.8.8.8']);

const app = express();
const server = http.createServer(app);

// ── Trust proxy (REQUIRED for Render / any reverse-proxy host) ──
app.set('trust proxy', 1);

// ── Connect DB & Sockets ─────────────────────────────────────────
connectDB();
initSocket(server);

// ── View engine ──────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Body parsers ─────────────────────────────────────────────────
app.use('/payments/webhook', express.raw({ type: '*/*' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(methodOverride('_method'));

// ── Static files ─────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
}));

// ── Session ───────────────────────────────────────────────────────
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // lazy session update (seconds)
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
};
app.use(session(sessionConfig));

// ── Passport & Flash ─────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// ── Global locals middleware ──────────────────────────────────────
app.use(async (req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.user || null;

  if (req.user) {
    try {
      const Notification = require('./models/Notification');
      res.locals.unreadNotifications = await Notification.countDocuments({
        recipient: req.user._id,
        read: false
      });
    } catch (e) {
      res.locals.unreadNotifications = 0;
    }
  } else {
    res.locals.unreadNotifications = 0;
  }
  next();
});

// ── Routes ───────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/client', clientRoutes);
app.use('/freelancer', freelancerRoutes);
app.use('/projects', projectRoutes);
app.use('/messages', messageRoutes);
app.use('/notifications', notificationRoutes);
app.use('/profile', profileRoutes);
app.use('/reports', reportRoutes);
app.use('/payments', paymentRoutes);

// ── Home redirect ────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.user) {
    const role = req.user.role;
    if (role === 'admin') return res.redirect('/admin/dashboard');
    if (role === 'client') return res.redirect('/client/dashboard');
    if (role === 'freelancer') return res.redirect('/freelancer/dashboard');
  }
  res.render('auth/login', { title: 'Welcome - FreelanceHub' });
});

// ── Avatar endpoint ───────────────────────────────────────────────
app.get('/avatar/:userId', async (req, res) => {
  try {
    const User = require('./models/User');
    const user = await User.findById(req.params.userId).select('avatar avatarContentType');
    if (user && user.avatar) {
      res.set('Content-Type', user.avatarContentType || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(user.avatar);
    }
    res.redirect('/images/default-avatar.png');
  } catch (e) {
    res.redirect('/images/default-avatar.png');
  }
});

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('shared/404', {
    title: '404 - Not Found',
    currentUser: req.user || null,
    success: [],
    error: [],
    unreadNotifications: 0
  });
});

// ── Global error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message);

  // Mongoose validation
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors).map(e => e.message).join(', ');
    if (req.accepts('html')) { req.flash('error', msg); return res.redirect('back'); }
    return res.status(400).json({ success: false, message: msg });
  }

  // Duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const msg = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    if (req.accepts('html')) { req.flash('error', msg); return res.redirect('back'); }
    return res.status(400).json({ success: false, message: msg });
  }

  // File size (multer)
  if (err.code === 'LIMIT_FILE_SIZE') {
    if (req.accepts('html')) { req.flash('error', 'File too large. Max 5MB.'); return res.redirect('back'); }
    return res.status(400).json({ success: false, message: 'File too large' });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Something went wrong' : (err.message || 'Server Error');

  if (!req.accepts('html') || req.path.startsWith('/api/')) {
    return res.status(status).json({ success: false, message });
  }

  res.status(status).render('shared/500', {
    title: 'Server Error - FreelanceHub',
    error: message,
    currentUser: req.user || null,
    success: [],
    error_msgs: [],
    unreadNotifications: 0
  });
});

// ── Start server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ FreelanceHub running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// ── Graceful shutdown ────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});