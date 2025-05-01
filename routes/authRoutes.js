const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../utils/multerConfig');

router.post('/signup', upload.single('avatar'), authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authMiddleware.protect, authController.logout);
router.get('/protected', authMiddleware.protect, authController.profile);
router.post('/upload-avatar', authMiddleware.protect, upload.single('avatar'), authController.uploadAvatar);
router.get('/avatar/:id', authController.getAvatar);

module.exports = router;