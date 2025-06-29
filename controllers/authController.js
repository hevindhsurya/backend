const axios = require('axios');
const User = require('../models/User');
const Contact = require('../models/Contact');
const Blog = require('../models/Blog.js')
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/token');
const validator = require('validator');
const fs = require('fs');

// REGISTER
exports.register = async (req, res) => {
  const { name, email, phone, password, role, recaptchaToken } = req.body;
  if (!recaptchaToken) {
    return res.status(400).json({ message: 'reCAPTCHA token is missing' });
  }
  const secretKey = '6LeEgWErAAAAABYtD3HwTQONKw2gdMKhNWA1aLis';
  const verificationURL = `https://www.google.com/recaptcha/api/siteverify`;
  try {
    const response = await axios.post(verificationURL, null, {
      params: {
        secret: secretKey,
        response: recaptchaToken
      }
    });
    const data = response.data;
    if (!data.success) {
      return res.status(400).json({ message: 'Failed CAPTCHA verification' });
    }
    if (!validator.isStrongPassword(password)) {
      return res.status(400).json({ message: 'Weak password' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });
    const user = await User.create({ name, email, phone, password, role });
    res.status(201).json({ message: 'User registered. Please verify email.' });
  } catch (error) {
    console.error('reCAPTCHA or registration error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { identifier, password } = req.body;
  const user = await User.findOne({
    $or: [{ email: identifier }, { name: identifier }]
  });
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = generateToken(user);
  res
    .cookie('token', token, { httpOnly: true, secure: false })
    .json({
      message: 'Logged in',
      user: {
        name: user.name,
        role: user.role
      }
    });
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.resetToken = Math.random().toString(36).substring(2);
  user.resetTokenExpiry = Date.now() + 10 * 60 * 1000;
  await user.save();
  res.json({ message: 'Reset token generated', token: user.resetToken });
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

  user.password = newPassword;
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await user.save();

  res.json({ message: 'Password reset successful' });
};

// CONTACT 
exports.submitContactForm = async (req, res) => {
  const { name, email, phone, topic, message, recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({ message: 'reCAPTCHA token is missing' });
  }

  const secretKey = '6LeEgWErAAAAABYtD3HwTQONKw2gdMKhNWA1aLis';
  const verificationURL = `https://www.google.com/recaptcha/api/siteverify`;
  
  try {  
    const response = await axios.post(verificationURL, null, {
      params: {
        secret: secretKey,
        response: recaptchaToken
      }
    });
    console.log(response);
    const data = response.data;

    if (!data.success) {
      return res.status(400).json({ message: 'Failed CAPTCHA verification' });
    }
    console.log(response);

    const contact = new Contact({ name, email, phone, topic, message });
    await contact.save();
    console.log(contact);

    res.status(200).json({ message: 'Form submitted successfully' });
  } catch (error) {
    console.error('reCAPTCHA error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ADDBLOG
exports.addBlog = async (req, res) => {
  try {
    const { title, author, content, recaptchaToken } = req.body;
    const file = req.file;

    if (!title || !author || !content || !file || !recaptchaToken) {
      return res.status(400).json({ message: 'All fields including reCAPTCHA are required.' });
    }

    //Verify reCAPTCHA with Google
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;

    const response = await axios.post(verifyUrl, null, {
      params: {
        secret: secretKey,
        response: recaptchaToken,
      },
    });

    const { success, score } = response.data;

    if (!success || score < 0.5) {
      return res.status(403).json({ message: 'reCAPTCHA verification failed.' });
    }

    // Save blog to DB
    const newBlog = new Blog({
      title,
      author,
      content,
      image: {
        data: file.buffer,
        contentType: file.mimetype
      }
    });

    await newBlog.save();

    res.status(201).json({ message: 'Blog added successfully', blog: newBlog });

  } catch (err) {
    console.error('Error in addBlog:', err.message);
    res.status(500).json({ message: 'Server error while adding blog' });
  }
};

// GETBLOG
exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    const formattedBlogs = blogs.map((blog) => ({
      _id: blog._id,
      title: blog.title,
      author: blog.author,
      content: blog.content,
      image: {
        contentType: blog.image.contentType,
        data: blog.image.data.toString('base64'),
      },
      createdAt: blog.createdAt,
      likesCount: blog.likes ? blog.likes.length : 0,
      watchlistCount: blog.watchlistedBy ? blog.watchlistedBy.length : 0,
    }));
    res.status(200).json({ blogs: formattedBlogs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch blogs' });
  }
};

// TOGGLE LIKE
exports.toggleLike = async (req, res) => {
  const userId = req.user.id;
  const blogId = req.params.blogId;

  const user = await User.findById(userId);
  const blog = await Blog.findById(blogId);

  const alreadyLiked = user.likedBlogs.includes(blogId);

  if (alreadyLiked) {
    user.likedBlogs.pull(blogId);
    blog.likes.pull(userId);
  } else {
    user.likedBlogs.push(blogId);
    blog.likes.push(userId);
  }

  await user.save();
  await blog.save();

  res.status(200).json({ liked: !alreadyLiked });
};

// GET BLOG STATUS
exports.getBlogStatus = async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  
  const status = {};
  const blogs = await Blog.find();

  blogs.forEach(blog => {
    status[blog._id] = {
      liked: user.likedBlogs.includes(blog._id),
      watchlisted: user.watchlist.includes(blog._id)
    };
  });

  res.json({ status });
};

//TOGGLE WATCHLIST
exports.toggleWatchlist = async (req, res) => {
  try {
    const blogId = req.params.blogId;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const blog = await Blog.findById(blogId);
    if (!user || !blog) return res.status(404).json({ message: 'User or Blog not found' });

    const alreadyWatchlisted = user.watchlist.includes(blogId);

    if (alreadyWatchlisted) {
      user.watchlist.pull(blogId);
      blog.watchlistedBy.pull(userId);
    } else {
      user.watchlist.push(blogId);
      blog.watchlistedBy.push(userId);
    }

    await user.save();
    await blog.save();

    res.status(200).json({
      message: alreadyWatchlisted ? 'Removed from watchlist' : 'Added to watchlist',
      watchlisted: !alreadyWatchlisted
    });
  } catch (err) {
    console.error('Watchlist error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET CURRENT USER
exports.getCurrentUser = async (req, res) => {
  if (!req.user) return res.status(401).json({ message: "Not logged in" });
  res.json({ user: req.user });
};

// GET SINGLEBLOGS
exports.getSingleBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    const formatted = {
      _id: blog._id,
      title: blog.title,
      author: blog.author,
      content: blog.content,
      image: {
        contentType: blog.image.contentType,
        data: blog.image.data.toString('base64'),
      },
      createdAt: blog.createdAt,
      likesCount: blog.likes?.length || 0,
      watchlistCount: blog.watchlistedBy?.length || 0,
    };

    res.status(200).json({ blog: formatted });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch blog' });
  }
};


// LOGOUT
exports.logout = (req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: false });
  res.json({ message: "Logged out" });
};

