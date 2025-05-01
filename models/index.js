const Target = require('./Target');
const Transaction = require('./Transaction');

// Associations
Target.hasMany(Transaction, { foreignKey: 'targetId' });
Transaction.belongsTo(Target, { foreignKey: 'targetId' });

module.exports = { Target, Transaction };