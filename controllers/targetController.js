const Target = require('../models/Target');
const { Op } = require('sequelize');

exports.createTarget = async (req, res) => {
  try {
    const { category, type, targetAmount } = req.body;
    const userId = req.user.id;

    if (!category || !type || !targetAmount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category, type, and targetAmount'
      });
    }

    const target = await Target.create({
      userId,
      category,
      type,
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0
    });

    res.status(201).json({
      success: true,
      data: target
    });
  } catch (error) {
    console.error('Error creating target:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

exports.getAllTargets = async (req, res) => {
  try {
    const userId = req.user.id;
    const targets = await Target.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: targets
    });
  } catch (error) {
    console.error('Error fetching targets:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

exports.getTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const target = await Target.findOne({
      where: { id, userId }
    });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Target not found'
      });
    }

    res.status(200).json({
      success: true,
      data: target
    });
  } catch (error) {
    console.error('Error fetching target:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

exports.updateTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, type, targetAmount } = req.body;
    const userId = req.user.id;

    const target = await Target.findOne({
      where: { id, userId }
    });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Target not found'
      });
    }

    if (category) target.category = category;
    if (type) target.type = type;
    if (targetAmount) target.targetAmount = parseFloat(targetAmount);

    await target.save();

    res.status(200).json({
      success: true,
      data: target
    });
  } catch (error) {
    console.error('Error updating target:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

exports.deleteTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const target = await Target.findOne({
      where: { id, userId }
    });

    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Target not found'
      });
    }

    await target.destroy();

    res.status(200).json({
      success: true,
      message: 'Target deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting target:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

exports.updateTargetProgress = async (transaction, previousData = null) => {
  try {
    const { userId, category, type, amount } = transaction;
    
    const target = await Target.findOne({
      where: {
        userId,
        category,
        type
      }
    });

    if (target) {
      let newAmount = parseFloat(target.currentAmount);
      
      // If updating, subtract previous amount
      if (previousData && previousData.category === category && previousData.type === type) {
        newAmount -= parseFloat(previousData.amount);
      }
      
      // Add new amount
      newAmount += parseFloat(amount);

      // Cap at target amount
      await target.update({
        currentAmount: newAmount > target.targetAmount ? target.targetAmount : newAmount
      });
    }
  } catch (error) {
    console.error('Error updating target progress:', error);
  }
};

exports.decrementTargetProgress = async (transaction) => {
  try {
    const { userId, category, type, amount } = transaction;
    
    const target = await Target.findOne({
      where: {
        userId,
        category,
        type
      }
    });

    if (target) {
      const newAmount = parseFloat(target.currentAmount) - parseFloat(amount);
      await target.update({
        currentAmount: newAmount < 0 ? 0 : newAmount
      });
    }
  } catch (error) {
    console.error('Error decrementing target progress:', error);
  }
};