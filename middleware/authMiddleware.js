const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  console.log('Auth middleware - Headers:', req.headers);

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    console.log('Token received:', token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', decoded);

    req.user = await User.findByPk(decoded.id);
    if (!req.user) {
      console.log('User not found for decoded ID:', decoded.id);
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    console.log('User authorized:', { id: req.user.id, email: req.user.email });
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired, please refresh or log in again' });
    }
    return res.status(401).json({ message: 'Not Authorized, token failed' });
  }
};

module.exports = { protect };