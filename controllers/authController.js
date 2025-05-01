const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');

const authController = {
  async register(req, res) {
    try {
      console.log('Register attempt with payload:', req.body, 'File:', req.file);
      const { email, password, username } = req.body;

      // Validate required fields
      if (!email || !password || !username || !req.file) {
        console.error('Missing required fields:', {
          email: !!email,
          password: !!password,
          username: !!username,
          avatar: !!req.file,
        });
        return res.status(400).json({ message: 'Email, password, username, and avatar are required' });
      }

      // Validate email format and password length
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!isValidEmail) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }

      console.log(`Checking if user exists with email: ${email}`);
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        console.log(`User already exists with email: ${email}`);
        return res.status(400).json({ message: 'User already exists' });
      }

      console.log('Uploading avatar to Cloudinary');
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'avatars', resource_type: 'image' },
          (error, result) => (error ? reject(error) : resolve(result))
        ).end(req.file.buffer);
      });

      console.log('Creating new user with username:', username);
      const hashedPassword = await bcrypt.hash(password, 10);
      const avatarUrl = uploadResult.secure_url;

      const user = await User.create({
        email,
        password: hashedPassword,
        username,
        avatar: avatarUrl,
      });

      console.log('User created successfully, generating tokens');
      const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

      await user.update({ refreshToken });

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      console.log('Sending response with user data');
      res.status(201).json({
        accessToken,
        user: { id: user.id, email, username: user.username, avatar: user.avatar },
      });
    } catch (error) {
      console.error('Registration error details:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  async login(req, res) {
    try {
      console.log('Login attempt with payload:', req.body);
      const { email, password } = req.body;

      if (!email || !password) {
        console.error('Missing required fields:', { email: !!email, password: !!password });
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Validate email format and password length
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!isValidEmail) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }

      console.log(`Finding user with email: ${email}`);
      const user = await User.findOne({ where: { email } });
      if (!user) {
        console.log(`No user found with email: ${email}`);
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      console.log('User found, comparing password');
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Password does not match');
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      console.log('Password match, generating tokens');
      const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

      await user.update({ refreshToken });

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      console.log('Login successful, sending response');
      res.json({
        accessToken,
        user: { id: user.id, email, username: user.username, avatar: user.avatar },
      });
    } catch (error) {
      console.error('Login error details:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  async profile(req, res) {
    try {
      console.log('Profile request - User ID:', req.user.id);
      const user = await User.findByPk(req.user.id);
      if (!user) {
        console.log('User not found for ID:', req.user.id);
        return res.status(404).json({ message: 'User not found' });
      }
      console.log('Returning user profile:', {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
      });
      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  async uploadAvatar(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      console.log('Uploading new avatar to Cloudinary');
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'avatars', resource_type: 'image' },
          (error, result) => (error ? reject(error) : resolve(result))
        ).end(req.file.buffer);
      });

      const avatarUrl = uploadResult.secure_url;
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.avatar) {
        const publicId = user.avatar.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`avatars/${publicId}`);
      }

      await user.update({ avatar: avatarUrl });

      res.json({
        message: 'Avatar uploaded successfully',
        avatar: avatarUrl,
        user: { id: user.id, email: user.email, username: user.username, avatar: avatarUrl },
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  async getAvatar(req, res) {
    try {
      const userId = req.params.id;
      const user = await User.findByPk(userId);

      if (!user || !user.avatar) {
        return res.status(404).json({ message: 'Avatar not found' });
      }

      res.json({ avatar: user.avatar });
    } catch (error) {
      console.error('Get avatar error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },

  async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ message: 'No refresh token provided' });
      }

      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = await User.findByPk(decoded.id);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }

      const accessToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ accessToken });
    } catch (error) {
      console.error('Refresh token error:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(403).json({ message: 'Refresh token expired' });
      }
      res.status(403).json({ message: 'Invalid refresh token' });
    }
  },

  async logout(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      if (user) {
        await user.update({ refreshToken: null });
      }
      res.clearCookie('refreshToken');
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  },
};

module.exports = authController;