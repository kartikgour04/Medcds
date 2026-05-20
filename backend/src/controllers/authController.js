const User = require('../models/User');
const PatientProfile = require('../models/PatientProfile');
const { generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// ── Register ────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, dateOfBirth, gender, phoneNumber } = req.body;

    // Validate required fields explicitly (give clear errors)
    if (!email)     return res.status(400).json({ success: false, message: 'Email is required.' });
    if (!password)  return res.status(400).json({ success: false, message: 'Password is required.' });
    if (!firstName) return res.status(400).json({ success: false, message: 'First name is required.' });
    if (!lastName)  return res.status(400).json({ success: false, message: 'Last name is required.' });
    if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      email:       email.toLowerCase().trim(),
      password,
      firstName:   firstName.trim(),
      lastName:    lastName.trim(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender:      gender      || undefined,
      phoneNumber: phoneNumber || undefined,
    });

    // Create empty patient profile (non-fatal if this fails)
    try {
      await PatientProfile.create({ userId: user._id });
    } catch (profileErr) {
      logger.warn(`PatientProfile create failed for ${user._id}: ${profileErr.message}`);
    }

    const token = generateToken(user._id);
    logger.info(`New user registered: ${user.email}`);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id:              user._id,
        email:           user.email,
        firstName:       user.firstName,
        lastName:        user.lastName,
        fullName:        user.fullName,
        gender:          user.gender,
        age:             user.age,
        role:            user.role,
        profileComplete: user.profileComplete,
      },
    });
  } catch (err) {
    logger.error(`Register error: ${err.message}`);

    // Duplicate key (race condition)
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    // Mongoose validation
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map(e => e.message).join('. ');
      return res.status(400).json({ success: false, message: msg });
    }
    // MongoDB not connected
    if (err.name === 'MongoNotConnectedError' || err.message?.includes('ECONNREFUSED')) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please ensure MongoDB is running.' });
    }

    return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

// ── Login ───────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email)    return res.status(400).json({ success: false, message: 'Email is required.' });
    if (!password) return res.status(400).json({ success: false, message: 'Password is required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with this email.' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Contact support.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    logger.info(`User logged in: ${user.email}`);

    return res.json({
      success: true,
      token,
      user: {
        id:              user._id,
        email:           user.email,
        firstName:       user.firstName,
        lastName:        user.lastName,
        fullName:        user.fullName,
        gender:          user.gender,
        age:             user.age,
        role:            user.role,
        profileComplete: user.profileComplete,
      },
    });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);

    if (err.name === 'MongoNotConnectedError' || err.message?.includes('ECONNREFUSED')) {
      return res.status(503).json({ success: false, message: 'Database unavailable. Please ensure MongoDB is running.' });
    }

    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ── Get current user ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const profile = await PatientProfile.findOne({ userId: req.user._id });
    return res.json({
      success: true,
      user: {
        id:              req.user._id,
        email:           req.user.email,
        firstName:       req.user.firstName,
        lastName:        req.user.lastName,
        fullName:        req.user.fullName,
        gender:          req.user.gender,
        dateOfBirth:     req.user.dateOfBirth,
        age:             req.user.age,
        phoneNumber:     req.user.phoneNumber,
        role:            req.user.role,
        profileComplete: req.user.profileComplete,
        lastLogin:       req.user.lastLogin,
      },
      hasProfile:       !!profile,
      dataCompleteness: profile?.dataCompleteness,
    });
  } catch (err) {
    logger.error(`getMe error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch user data.' });
  }
};

// ── Change password ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    logger.error(`changePassword error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Password change failed.' });
  }
};
