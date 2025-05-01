const Transaction = require('../models/Transaction');
const targetController = require('./targetController');

// Get all transactions for the current user
// Optional query parameters: month, year
exports.getAllTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;
    
    // Build where clause
    const whereClause = { userId };
    
    // Add month and year filters if they exist
    if (month !== undefined) {
      whereClause.month = parseInt(month);
    }
    
    if (year !== undefined) {
      whereClause.year = parseInt(year);
    }
    
    const transactions = await Transaction.findAll({
      where: whereClause,
      order: [['date', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get a specific transaction by ID
exports.getTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const transaction = await Transaction.findOne({
      where: {
        id,
        userId
      }
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const {
      type,
      amount,
      category,
      date,
      description,
      month,
      year
    } = req.body;
    
    if (!type || !amount || !category || !date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type, amount, category, and date'
      });
    }
    
    // Parse date to extract month and year if not provided
    let transactionMonth = month;
    let transactionYear = year;
    
    if (transactionMonth === undefined || transactionYear === undefined) {
      const transactionDate = new Date(date);
      transactionMonth = transactionDate.getMonth();
      transactionYear = transactionDate.getFullYear();
    }
    
    const transaction = await Transaction.create({
      type,
      amount: parseFloat(amount),
      category,
      date,
      description: description || '',
      month: transactionMonth,
      year: transactionYear,
      userId: req.user.id
    });
    
    // Update target progress
    await targetController.updateTargetProgress(transaction);
    
    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Update a transaction
exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const transaction = await Transaction.findOne({
      where: {
        id,
        userId
      }
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Store previous data for target progress update
    const previousData = {
      category: transaction.category,
      type: transaction.type,
      amount: transaction.amount
    };
    
    // Get fields to update
    const {
      type,
      amount,
      category,
      date,
      description,
      month,
      year
    } = req.body;
    
    // Update transaction
    if (type !== undefined) transaction.type = type;
    if (amount !== undefined) transaction.amount = parseFloat(amount);
    if (category !== undefined) transaction.category = category;
    if (date !== undefined) transaction.date = date;
    if (description !== undefined) transaction.description = description;
    
    // Parse date to extract month and year if date changed but month/year not specified
    if (date !== undefined && (month === undefined || year === undefined)) {
      const transactionDate = new Date(date);
      transaction.month = transactionDate.getMonth();
      transaction.year = transactionDate.getFullYear();
    } else {
      if (month !== undefined) transaction.month = month;
      if (year !== undefined) transaction.year = year;
    }
    
    await transaction.save();
    
    // Update target progress
    await targetController.updateTargetProgress(transaction, previousData);
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Delete a transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const transaction = await Transaction.findOne({
      where: {
        id,
        userId
      }
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Decrement target progress
    await targetController.decrementTargetProgress(transaction);
    
    await transaction.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};