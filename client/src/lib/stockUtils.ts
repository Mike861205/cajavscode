export function formatStock(stock: string | number, allowDecimals: boolean = false): string {
  const numericStock = typeof stock === 'string' ? parseFloat(stock) : stock;
  
  if (isNaN(numericStock)) {
    return "0";
  }
  
  // UNIVERSAL DECIMAL DISPLAY: Always show decimals if the actual stock has decimal values
  // This ensures accurate stock representation regardless of product configuration
  const hasDecimals = numericStock % 1 !== 0;
  
  if (allowDecimals || hasDecimals) {
    // For decimals, always show appropriate precision
    return hasDecimals ? numericStock.toFixed(2) : numericStock.toString();
  }
  
  // For non-decimal products, use Math.trunc instead of Math.floor to handle negatives correctly
  // Math.trunc(-0.5) = -0, Math.floor(-0.5) = -1
  return Math.trunc(numericStock).toString();
}