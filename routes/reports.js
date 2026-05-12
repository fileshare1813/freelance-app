const express = require('express');
const router = express.Router();
const { isLoggedIn, isClient, isFreelancer } = require('../middleware/auth');
const Report = require('../models/Report');
const Project = require('../models/Project');

router.get('/project/:projectId', isLoggedIn, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('client hiredFreelancer', 'name');
    if (!project) { req.flash('error', 'Project not found'); return res.redirect('/'); }
    const canView = req.user.role === 'admin' || 
      project.client._id.toString() === req.user._id.toString() || 
      (project.hiredFreelancer && project.hiredFreelancer._id.toString() === req.user._id.toString());
    if (!canView) { req.flash('error', 'Access denied'); return res.redirect('/'); }
    
    const reports = await Report.find({ project: req.params.projectId })
      .populate('freelancer', 'name').sort({ createdAt: -1 });
    res.render('shared/reports', { title: `Reports - ${project.title}`, reports, project });
  } catch (err) {
    req.flash('error', 'Failed to load reports');
    res.redirect('/');
  }
});

module.exports = router;