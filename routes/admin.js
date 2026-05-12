const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const paymentCtrl = require('../controllers/paymentController');

router.use(isAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.post('/users/:id/ban', adminController.banUser);
router.post('/users/:id/delete', adminController.deleteUser);
router.get('/projects', adminController.getProjects);
router.get('/graph-data', adminController.getGraphDataAPI);



router.get('/settings', (req, res) => {
  res.render('admin/settings', { title: 'Platform Settings - FreelanceHub' });
});
router.get( '/payments',              paymentCtrl.getAdminPayments);
router.post('/payments/:id/release',  paymentCtrl.releasePayment);
router.post('/payments/:id/complete', paymentCtrl.completePayment);
// EOF

// # Add default-avatar.png placeholder (SVG as PNG)
// cat > /home/claude/freelance-platform/public/images/default-avatar.png << 'EOF'
// EOF

// # Create a proper SVG default avatar that works as fallback
// cat > /home/claude/freelance-platform/public/images/default-avatar.svg << 'EOF'
// <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
//   <circle cx="50" cy="50" r="50" fill="#ede9ff"/>
//   <circle cx="50" cy="38" r="18" fill="#6c63ff"/>
//   <ellipse cx="50" cy="85" rx="28" ry="22" fill="#6c63ff"/>
// </svg>

module.exports = router;