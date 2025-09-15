// Probar el cálculo de balance usando datos reales del cash register #55

// Datos reales del cash register #55
const cashRegister = {
  id: 55,
  openingAmount: 1000.00,
  status: 'open'
};

// Transacciones reales
const transactions = [
  { type: 'sale', amount: 350.00, reference: 'VENTA-403' },
  { type: 'sale', amount: 299.00, reference: 'VENTA-404' },
  { type: 'sale_cancellation', amount: -299.00, reference: 'CANCEL-404' }
];

// Pagos reales (sale_payments)
const salePayments = [
  { method: 'cash', amount: 350.00, saleId: 403 },
  { method: 'cash', amount: 299.00, saleId: 404 } // Venta cancelada
];

// Método getCashRegisterSummary (correcto)
console.log('=== MÉTODO getCashRegisterSummary ===');
const openingAmount = cashRegister.openingAmount;
let totalCashSales = 0;
let totalIncome = 0;
let totalExpenses = 0;
let totalWithdrawals = 0;

// Calcular totales de transacciones
transactions.forEach(transaction => {
  const amount = transaction.amount;
  switch (transaction.type) {
    case 'sale':
      totalCashSales += amount;
      break;
    case 'sale_cancellation':
      totalCashSales += amount; // Amount is already negative
      break;
    case 'income':
      totalIncome += amount;
      break;
    case 'expense':
      totalExpenses += amount;
      break;
    case 'withdrawal':
      totalWithdrawals += amount;
      break;
  }
});

const expectedBalance = openingAmount + totalCashSales + totalIncome - totalExpenses - totalWithdrawals;

console.log('Cálculo getCashRegisterSummary:');
console.log(`  Opening Amount: $${openingAmount}`);
console.log(`  Total Cash Sales: $${totalCashSales}`);
console.log(`  Total Income: $${totalIncome}`);
console.log(`  Total Expenses: $${totalExpenses}`);
console.log(`  Total Withdrawals: $${totalWithdrawals}`);
console.log(`  Expected Balance: $${expectedBalance}`);
console.log();

// Método getCashRegisterClosures (corregido)
console.log('=== MÉTODO getCashRegisterClosures (CORREGIDO) ===');
let totalCashSalesFromPayments = 0;
salePayments.forEach(payment => {
  if (payment.method === 'cash') {
    totalCashSalesFromPayments += payment.amount;
  }
});

const transactionAdjustments = transactions.filter(t => t.type === 'sale_cancellation').reduce((sum, t) => sum + t.amount, 0);
const actualCashSales = totalCashSalesFromPayments;
const expectedBalanceClosures = openingAmount + actualCashSales + transactionAdjustments + totalIncome - totalExpenses - totalWithdrawals;

console.log('Cálculo getCashRegisterClosures corregido:');
console.log(`  Opening Amount: $${openingAmount}`);
console.log(`  Total Cash Sales (from payments): $${totalCashSalesFromPayments}`);
console.log(`  Transaction Adjustments (cancellations): $${transactionAdjustments}`);
console.log(`  Total Income: $${totalIncome}`);
console.log(`  Total Expenses: $${totalExpenses}`);
console.log(`  Total Withdrawals: $${totalWithdrawals}`);
console.log(`  Expected Balance: $${expectedBalanceClosures}`);
console.log();

// Método getCashRegisterClosures (anterior - incorrecto)
console.log('=== MÉTODO getCashRegisterClosures (ANTERIOR) ===');
let transactionCashSales = 0;
transactions.forEach(transaction => {
  if (transaction.type === 'sale') transactionCashSales += transaction.amount;
  if (transaction.type === 'sale_cancellation') transactionCashSales += transaction.amount;
});

const oldActualCashSales = transactionCashSales > 0 ? transactionCashSales : totalCashSalesFromPayments;
const oldExpectedBalance = openingAmount + oldActualCashSales + totalIncome - totalExpenses - totalWithdrawals;

console.log('Cálculo getCashRegisterClosures anterior (incorrecto):');
console.log(`  Opening Amount: $${openingAmount}`);
console.log(`  Total Cash Sales (from payments): $${totalCashSalesFromPayments}`);
console.log(`  Transaction Cash Sales: $${transactionCashSales}`);
console.log(`  Actual Cash Sales usado: $${oldActualCashSales}`);
console.log(`  Expected Balance: $${oldExpectedBalance}`);
console.log();

console.log('=== RESUMEN ===');
console.log(`getCashRegisterSummary: $${expectedBalance}`);
console.log(`getCashRegisterClosures (correcto): $${expectedBalanceClosures}`);
console.log(`getCashRegisterClosures (anterior): $${oldExpectedBalance}`);
console.log();

if (oldExpectedBalance === 1649) {
  console.log('🚨 PROBLEMA ENCONTRADO: El método anterior devuelve $1649 que es lo que ve el usuario');
} else {
  console.log('✅ El problema NO está en el cálculo del balance');
}