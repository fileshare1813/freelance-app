// ===== GLOBAL ERROR HANDLER MIDDLEWARE =====

// 404 Handler - place BEFORE errorHandler in server.js
const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.originalUrl}`);
  err.status = 404;
  next(err);
};

// Global Error Handler
const errorHandler = (err, req, res, next) => {
  // Log error
  if (process.env.NODE_ENV !== 'production') {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`❌ Error: ${err.message}`);
    console.error(`📍 Path: ${req.originalUrl}`);
    console.error(`👤 User: ${req.user?._id || 'Guest'}`);
    console.error(err.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Something went wrong';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message).join(', ');
    if (req.accepts('html')) {
      req.flash('error', messages);
      return res.redirect('back');
    }
    return res.status(400).json({ success: false, message: messages });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const msg = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    if (req.accepts('html')) {
      req.flash('error', msg);
      return res.redirect('back');
    }
    return res.status(400).json({ success: false, message: msg });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    if (req.accepts('html')) {
      req.flash('error', 'Invalid session. Please login again.');
      return res.redirect('/auth/login');
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    if (req.accepts('html')) {
      req.flash('error', 'Session expired. Please login again.');
      return res.redirect('/auth/login');
    }
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    if (req.accepts('html')) {
      req.flash('error', 'File too large. Maximum size is 5MB.');
      return res.redirect('back');
    }
    return res.status(400).json({ success: false, message: 'File too large' });
  }

  // API requests → JSON response
  if (!req.accepts('html') || req.path.startsWith('/api/')) {
    return res.status(statusCode).json({ success: false, message });
  }

  // HTML requests → render error page
  if (statusCode === 404) {
    return res.status(404).render('shared/404', {
      title: '404 - Page Not Found',
      currentUser: req.user || null,
      success: [],
      error: [],
      unreadNotifications: 0
    });
  }

  res.status(statusCode).render('shared/500', {
    title: 'Server Error - FreelanceHub',
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message,
    currentUser: req.user || null,
    success: [],
    error_msgs: [],
    unreadNotifications: 0
  });
};

module.exports = { notFound, errorHandler };