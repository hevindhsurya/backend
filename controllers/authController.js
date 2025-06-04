const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/token');
const validator = require('validator');

// REGISTER
exports.register = async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!validator.isStrongPassword(password)) {
    return res.status(400).json({ message: 'Weak password' });
  }

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: 'User already exists' });

  const user = await User.create({ name, email, phone, password, role });
  res.status(201).json({ message: 'User registered. Please verify email.' });
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
