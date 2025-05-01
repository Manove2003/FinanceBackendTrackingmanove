const express = require('express');
const router = express.Router();
const targetController = require('../controllers/targetController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware.protect);

router.post('/', targetController.createTarget);
router.get('/', targetController.getAllTargets);
router.get('/:id', targetController.getTarget);
router.put('/:id', targetController.updateTarget);
router.delete('/:id', targetController.deleteTarget);

module.exports = router;