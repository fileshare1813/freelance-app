const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const upload = require('../middleware/upload');
const User = require('../models/User');
const Project = require('../models/Project');

router.get('/', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    let projects = [];
    if (user.role === 'client') projects = await Project.find({ client: user._id }).sort({ createdAt: -1 }).limit(5).lean();
    if (user.role === 'freelancer') projects = await Project.find({ hiredFreelancer: user._id }).sort({ createdAt: -1 }).limit(5).lean();
    res.render('shared/profile', { title: 'My Profile - FreelanceHub', profileUser: user, projects });
  } catch (err) {
    req.flash('error', 'Failed to load profile');
    res.redirect('/');
  }
});

router.get('/:id', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) { req.flash('error', 'User not found'); return res.redirect('/'); }
    let projects = [];
    if (user.role === 'client') projects = await Project.find({ client: user._id, status: 'completed' }).limit(5).lean();
    if (user.role === 'freelancer') projects = await Project.find({ hiredFreelancer: user._id, status: 'completed' }).limit(5).lean();
    res.render('shared/profile', { title: `${user.name}'s Profile - FreelanceHub`, profileUser: user, projects });
  } catch (err) {
    req.flash('error', 'Failed to load profile');
    res.redirect('/');
  }
});

module.exports = router;