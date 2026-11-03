const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name?.trim() || name.trim().length > 100 || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 8) return res.status(400).json({ success: false, message: 'Enter a valid name and email, and a password of at least 8 characters.' });
    const normalizedEmail = email.trim().toLowerCase();

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      phone
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        savedTravellers: user.savedTravellers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: String(email || '').trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        savedTravellers: user.savedTravellers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot Password (Generate OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: String(email || '').trim().toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    let emailSent = false;

    // Send OTP via email if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        await transporter.sendMail({
          from: `"PayanamX Support" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: 'Password Reset OTP - Online Train Booking',
          text: `Your OTP for resetting password is: ${otp}. It is valid for 10 minutes.`,
          html: `<p>Your OTP for resetting password is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`
        });
        emailSent = true;
      } catch (err) {
        console.error('Error sending reset password OTP email:', err);
      }
    }

    // For developer testing comfort, return OTP in response if SMTP fails/not set
    res.json({
      success: true,
      message: emailSent ? 'OTP sent to email successfully' : 'OTP generated (SMTP disabled)',
      otp: emailSent ? undefined : otp // Expose OTP only if email isn't configured, for testing convenience
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset Password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!/^\S+@\S+\.\S+$/.test(email || '') || !/^\d{6}$/.test(otp || '') || (newPassword || '').length < 8) return res.status(400).json({ success: false, message: 'Enter a valid email, six-digit code, and password of at least 8 characters.' });

    const user = await User.findOne({
      email: String(email || '').trim().toLowerCase(),
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Set new password (will be auto-hashed by pre-save hook)
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update User Profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, savedTravellers, profilePicture } = req.body;
    if (name !== undefined && (!name.trim() || name.trim().length > 100)) return res.status(400).json({ success: false, message: 'Name must be between 1 and 100 characters.' });
    if (phone !== undefined && phone !== '' && !/^[+\d\s()-]{7,20}$/.test(phone)) return res.status(400).json({ success: false, message: 'Enter a valid phone number.' });
    if (savedTravellers !== undefined && (!Array.isArray(savedTravellers) || savedTravellers.length > 20 || savedTravellers.some(p => !p.name?.trim() || !Number.isInteger(Number(p.age)) || Number(p.age) < 1 || Number(p.age) > 120 || !['Male', 'Female', 'Other'].includes(p.gender)))) return res.status(400).json({ success: false, message: 'Saved passenger details are invalid.' });
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (savedTravellers !== undefined) user.savedTravellers = savedTravellers;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        savedTravellers: user.savedTravellers,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change Password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || (newPassword || '').length < 8) return res.status(400).json({ success: false, message: 'Enter the current password and a new password of at least 8 characters.' });
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { read: true } }, { new: true });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('favoriteTrains favoriteRoutes');
    return res.json({ success: true, favoriteTrains: user?.favoriteTrains || [], favoriteRoutes: user?.favoriteRoutes || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load favorites.' });
  }
};

exports.updateFavorites = async (req, res) => {
  try {
    const { kind, favorite } = req.body;
    if (typeof favorite !== 'boolean') return res.status(400).json({ success: false, message: 'Favorite state must be true or false.' });
    const user = await User.findById(req.user._id).select('favoriteTrains favoriteRoutes');
    if (!user) return res.status(404).json({ success: false, message: 'Account not found.' });
    if (kind === 'train') {
      const { id } = req.body;
      if (typeof id !== 'string' || !/^[\w-]{2,80}$/.test(id)) return res.status(400).json({ success: false, message: 'Train reference is invalid.' });
      user.favoriteTrains = user.favoriteTrains || [];
      user.favoriteTrains = favorite ? [...new Set([...user.favoriteTrains, id])] : user.favoriteTrains.filter(value => value !== id);
    } else if (kind === 'route') {
      const { from, fromName, to, toName } = req.body;
      if (![from, to].every(value => typeof value === 'string' && /^[A-Za-z0-9]{2,8}$/.test(value)) || ![fromName, toName].every(value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 120) || from.toUpperCase() === to.toUpperCase()) {
        return res.status(400).json({ success: false, message: 'Route favorite is invalid.' });
      }
      const key = route => route.from.toUpperCase() === from.toUpperCase() && route.to.toUpperCase() === to.toUpperCase();
      user.favoriteRoutes = (user.favoriteRoutes || []).filter(route => !key(route));
      if (favorite) user.favoriteRoutes.push({ from, fromName: fromName.trim(), to, toName: toName.trim() });
    } else {
      return res.status(400).json({ success: false, message: 'Favorite type is invalid.' });
    }
    await user.save();
    return res.json({ success: true, favoriteTrains: user.favoriteTrains || [], favoriteRoutes: user.favoriteRoutes || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not save favorite.' });
  }
};

