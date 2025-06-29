const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddlewares')
const auth = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/authMiddleware');


router.post('/contact', auth.submitContactForm);
router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/addblog', upload.single('image'), auth.addBlog);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.post('/like/:blogId', protect,auth.toggleLike);
router.post('/watchlist/:blogId', protect, auth.toggleWatchlist);
router.post("/logout", auth.logout);

router.get('/blogstatus', protect, auth.getBlogStatus);
router.get('/getblogs', auth.getBlogs);
router.get('/profile', protect, auth.getCurrentUser);
router.get('/blog/:id', auth.getSingleBlog);

module.exports = router;
