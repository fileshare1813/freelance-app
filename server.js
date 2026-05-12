require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');
const methodOverride = require('method-override');

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

const dns = require("dns");
const app = express();

dns.setServers([
  '1.1.1.1',
  '8.8.8.8'
]);

const server = http.createServer(app);



connectDB();
initSocket(server);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use('/payments/webhook', express.raw({ type: '*/*' }));  // webhook raw body
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // Purana syntax (v3 and below)
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(async (req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.user || null;
  if (req.user) {
    try {
      const Notification = require('./models/Notification');
      const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
      res.locals.unreadNotifications = count;
    } catch (e) { res.locals.unreadNotifications = 0; }
  } else { res.locals.unreadNotifications = 0; }
  next();
});

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

app.get('/', (req, res) => {
  if (req.user) {
    const role = req.user.role;
    if (role === 'admin') return res.redirect('/admin/dashboard');
    if (role === 'client') return res.redirect('/client/dashboard');
    if (role === 'freelancer') return res.redirect('/freelancer/dashboard');
  }
  res.render('auth/login', { title: 'Welcome - FreelanceHub' });
});

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

app.use((req, res) => res.status(404).render('shared/404', { title: '404 - Not Found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('shared/500', { title: 'Server Error', error: err.message });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`FreelanceHub running on http://localhost:${PORT}`));