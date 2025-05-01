const MonthlyData = require('../models/MonthlyData');
const { Op } = require('sequelize');

// Get all monthly data for current user
exports.getUserMonthlyData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const monthlyData = await MonthlyData.findAll({
      where: { userId },
      order: [['year', 'DESC'], ['month', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      count: monthlyData.length,
      data: monthlyData
    });
  } catch (error) {
    console.error('Error fetching monthly data:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get monthly data for specific month and year
exports.getMonthlyData = async (req, res) => {
  try {
    const { month, year } = req.params;
    const userId = req.user.id;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide month and year'
      });
    }
    
    const monthlyData = await MonthlyData.findOne({
      where: { 
        month: parseInt(month),
        year: parseInt(year),
        userId
      }
    });
    
    if (!monthlyData) {
      return res.status(200).json({
        success: true,
        data: {
          month: parseInt(month),
          year: parseInt(year),
          totalIncome: 0,
          totalExpenses: 0,
          availableBalance: 0,
          netWorth: 0
        }
      });
    }
    
    res.status(200).json({
      success: true,
      data: monthlyData
    });
  } catch (error) {
    console.error('Error fetching monthly data:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Create or update monthly data
exports.createOrUpdateMonthlyData = async (req, res) => {
  try {
    const {
      month,
      year,
      totalIncome,
      totalExpenses,
      availableBalance,
      netWorth
    } = req.body;
    
    const userId = req.user.id;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide month and year'
      });
    }
    
    // Check if monthly data for this month/year already exists
    let monthlyData = await MonthlyData.findOne({
      where: { 
        month: parseInt(month),
        year: parseInt(year),
        userId
      }
    });
    
    if (monthlyData) {
      // Update existing record
      monthlyData.totalIncome = totalIncome || monthlyData.totalIncome;
      monthlyData.totalExpenses = totalExpenses || monthlyData.totalExpenses;
      monthlyData.availableBalance = availableBalance || monthlyData.availableBalance;
      monthlyData.netWorth = netWorth || monthlyData.netWorth;
      
      await monthlyData.save();
      
      return res.status(200).json({
        success: true,
        data: monthlyData,
        message: 'Monthly data updated successfully'
      });
    }
    
    // Create new record
    monthlyData = await MonthlyData.create({
      month: parseInt(month),
      year: parseInt(year),
      totalIncome: totalIncome || 0,
      totalExpenses: totalExpenses || 0,
      availableBalance: availableBalance || 0,
      netWorth: netWorth || 0,
      userId
    });
    
    res.status(201).json({
      success: true,
      data: monthlyData,
      message: 'Monthly data created successfully'
    });
  } catch (error) {
    console.error('Error creating/updating monthly data:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get monthly summary data for dashboard
exports.getMonthlySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    const currentYear = currentDate.getFullYear();
    
    // Get current month's data
    const currentMonthData = await MonthlyData.findOne({
      where: {
        month: currentMonth,
        year: currentYear,
        userId
      }
    });
    
    // Get previous month's data
    let previousMonth = currentMonth - 1;
    let previousYear = currentYear;
    
    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear -= 1;
    }
    
    const previousMonthData = await MonthlyData.findOne({
      where: {
        month: previousMonth,
        year: previousYear,
        userId
      }
    });
    
    // Calculate changes
    const incomeChange = previousMonthData 
      ? ((currentMonthData?.totalIncome || 0) - previousMonthData.totalIncome) / previousMonthData.totalIncome * 100
      : 0;
      
    const expensesChange = previousMonthData
      ? ((currentMonthData?.totalExpenses || 0) - previousMonthData.totalExpenses) / previousMonthData.totalExpenses * 100
      : 0;
      
    const balanceChange = previousMonthData
      ? ((currentMonthData?.availableBalance || 0) - previousMonthData.availableBalance) / previousMonthData.availableBalance * 100
      : 0;
    
    res.status(200).json({
      success: true,
      data: {
        currentMonth: {
          month: currentMonth,
          year: currentYear,
          ...currentMonthData?.dataValues || {
            totalIncome: 0,
            totalExpenses: 0,
            availableBalance: 0,
            netWorth: 0
          }
        },
        previousMonth: previousMonthData?.dataValues || {
          month: previousMonth,
          year: previousYear,
          totalIncome: 0,
          totalExpenses: 0,
          availableBalance: 0,
          netWorth: 0
        },
        changes: {
          incomeChange: parseFloat(incomeChange.toFixed(2)) || 0,
          expensesChange: parseFloat(expensesChange.toFixed(2)) || 0,
          balanceChange: parseFloat(balanceChange.toFixed(2)) || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// Get year summary for charts
exports.getYearSummary = async (req, res) => {
  try {
    const { year } = req.params;
    const userId = req.user.id;
    
    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'Please provide year'
      });
    }
    
    const yearData = await MonthlyData.findAll({
      where: {
        year: parseInt(year),
        userId
      },
      order: [['month', 'ASC']]
    });
    
    // Create an array with all 12 months
    const fullYearData = Array.from({ length: 12 }, (_, i) => {
      const monthData = yearData.find(data => data.month === i + 1);
      
      return {
        month: i + 1,
        year: parseInt(year),
        totalIncome: monthData?.totalIncome || 0,
        totalExpenses: monthData?.totalExpenses || 0,
        availableBalance: monthData?.availableBalance || 0,
        netWorth: monthData?.netWorth || 0
      };
    });
    
    res.status(200).json({
      success: true,
      count: fullYearData.length,
      data: fullYearData
    });
  } catch (error) {
    console.error('Error fetching year summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};