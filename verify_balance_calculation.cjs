// Verificar el cálculo del balance de caja correctamente

// Datos de transacciones para cash register #55
const transactions = [
  { type: 'sale', amount: 350.00, reference: 'VENTA-403' },
  { type: 'sale', amount: 299.00, reference: 'VENTA-404' },
  { type: 'sale_cancellation', amount: -299.00, reference: 'CANCEL-404' }
];

// Datos de sale_payments para cash register #55
const salePayments = [
  { method: 'cash', amount: 350.00, saleId: 403 },
  { method: 'cash', amount: 299.00, saleId: 404 } // Nota: sale #404 fue cancelada
];

const openingAmount = 1000.00;

// Cálculo ANTERIOR (incorrecto)
const oldTotalCashSales = salePayments.reduce((sum, payment) => {
  return payment.method === 'cash' ? sum + payment.amount : sum;
}, 0);

const oldTransactionCashSales = transactions.reduce((sum, transaction) => {
  if (transaction.type === 'sale') return sum + transaction.amount;
  if (transaction.type === 'sale_cancellation') return sum + transaction.amount;
  return sum;
}, 0);

const oldActualCashSales = oldTransactionCashSales > 0 ? oldTransactionCashSales : oldTotalCashSales;
const oldExpectedBalance = openingAmount + oldActualCashSales;

console.log('CÁLCULO ANTERIOR (INCORRECTO):');
console.log(`- Opening: $${openingAmount}`);
console.log(`- Total cash sales (payments): $${oldTotalCashSales}`);
console.log(`- Transaction cash sales: $${oldTransactionCashSales}`);
console.log(`- Actual cash sales usado: $${oldActualCashSales}`);
console.log(`- Expected balance: $${oldExpectedBalance}`);
console.log('');

// Cálculo NUEVO (correcto)
const newTotalCashSales = salePayments.reduce((sum, payment) => {
  return payment.method === 'cash' ? sum + payment.amount : sum;
}, 0);

const newTransactionAdjustments = transactions.filter(t => t.type === 'sale_cancellation').reduce((sum, t) => sum + t.amount, 0);
const newActualCashSales = newTotalCashSales;
const newExpectedBalance = openingAmount + newActualCashSales + newTransactionAdjustments;

console.log('CÁLCULO NUEVO (CORRECTO):');
console.log(`- Opening: $${openingAmount}`);
console.log(`- Total cash sales (payments): $${newTotalCashSales}`);
console.log(`- Transaction adjustments (cancellations): $${newTransactionAdjustments}`);
console.log(`- Actual cash sales usado: $${newActualCashSales}`);
console.log(`- Expected balance: $${newExpectedBalance}`);
console.log('');

console.log('RESUMEN:');
console.log(`- Balance anterior (incorrecto): $${oldExpectedBalance}`);
console.log(`- Balance nuevo (correcto): $${newExpectedBalance}`);
console.log(`- Diferencia: $${newExpectedBalance - oldExpectedBalance}`);