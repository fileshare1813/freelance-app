const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');
const { generateOTP, sendOTP } = require('../utils/sendOTP');

exports.getLogin = (req, res) => {
  res.render('auth/login', { title: 'Login - FreelanceHub' });
};

exports.getRegister = (req, res) => {
  res.render('auth/register', { title: 'Register - FreelanceHub' });
};

exports.postRegister = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!['client', 'freelancer'].includes(role)) {
      req.flash('error', 'Invalid role selected');
      return res.redirect('/auth/register');
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing && existing.isVerified) {
      req.flash('error', 'Email already registered. Please login.');
      return res.redirect('/auth/login');
    }
    const hashed = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    if (existing) {
      existing.name = name;
      existing.password = hashed;
      existing.role = role;
      existing.otp = otp;
      existing.otpExpiry = otpExpiry;
      await existing.save();
    } else {
      await User.create({ name, email, password: hashed, role, otp, otpExpiry });
    }

    await sendOTP(email, name, otp);
    req.session.pendingEmail = email;
    req.flash('success', 'OTP sent to your email. Please verify.');
    res.redirect('/auth/verify-otp');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Registration failed. Try again.');
    res.redirect('/auth/register');
  }
};

exports.getVerifyOTP = (req, res) => {
  if (!req.session.pendingEmail) return res.redirect('/auth/register');
  res.render('auth/verify-otp', { title: 'Verify Email - FreelanceHub', email: req.session.pendingEmail });
};

exports.postVerifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = req.session.pendingEmail;
    if (!email) return res.redirect('/auth/register');

    const user = await User.findOne({ email });
    if (!user) { req.flash('error', 'User not found'); return res.redirect('/auth/register'); }
    if (user.otp !== otp) { req.flash('error', 'Invalid OTP'); return res.redirect('/auth/verify-otp'); }
    if (new Date() > user.otpExpiry) { req.flash('error', 'OTP expired. Register again.'); return res.redirect('/auth/register'); }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    delete req.session.pendingEmail;
    req.flash('success', 'Email verified! Please login.');
    res.redirect('/auth/login');
  } catch (err) {
    req.flash('error', 'Verification failed');
    res.redirect('/auth/verify-otp');
  }
};

exports.postResendOTP = async (req, res) => {
  try {
    const email = req.session.pendingEmail;
    if (!email) return res.redirect('/auth/register');
    const user = await User.findOne({ email });
    if (!user) return res.redirect('/auth/register');
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendOTP(email, user.name, otp);
    req.flash('success', 'New OTP sent to your email');
    res.redirect('/auth/verify-otp');
  } catch (err) {
    req.flash('error', 'Failed to resend OTP');
    res.redirect('/auth/verify-otp');
  }
};

exports.postLogin = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) { req.flash('error', info.message); return res.redirect('/auth/login'); }
    if (user.isBanned) { req.flash('error', 'Account banned. Contact support.'); return res.redirect('/auth/login'); }
    req.logIn(user, async (err) => {
      if (err) return next(err);
      user.lastLogin = new Date();
      await user.save();
      req.flash('success', `Welcome back, ${user.name}!`);
      if (user.role === 'admin') return res.redirect('/admin/dashboard');
      if (user.role === 'client') return res.redirect('/client/dashboard');
      res.redirect('/freelancer/dashboard');
    });
  })(req, res, next);
};

exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) console.error(err);
    req.flash('success', 'Logged out successfully');
    res.redirect('/auth/login');
  });
};

exports.googleCallback = (req, res) => {
  const role = req.user.role;
  if (role === 'admin') return res.redirect('/admin/dashboard');
  if (role === 'client') return res.redirect('/client/dashboard');
  res.redirect('/freelancer/dashboard');
};