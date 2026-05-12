const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const Project = require('../models/Project');

router.get('/', isLoggedIn, async (req, res) => {
  try {
    const { status, category, search, sort = '-createdAt' } = req.query;
    let query = { isPublic: true };
    if (req.user.role === 'client') { query = { client: req.user._id }; delete query.isPublic; }
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) query.$text = { $search: search };
    const projects = await Project.find(query).populate('client', 'name').sort(sort).lean();
    const categories = await Project.distinct('category');
    res.render('shared/projects', { title: 'Projects - FreelanceHub', projects, categories, filters: req.query });
  } catch (err) {
    req.flash('error', 'Failed to load projects');
    res.redirect('/');
  }
});

router.get('/:id', isLoggedIn, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('client', 'name rating company').populate('hiredFreelancer', 'name rating').lean();
    if (!project) { req.flash('error', 'Project not found'); return res.redirect('/projects'); }
    res.render('shared/project-detail', { title: project.title + ' - FreelanceHub', project });
  } catch (err) {
    req.flash('error', 'Failed to load project');
    res.redirect('/projects');
  }
});

module.exports = router;