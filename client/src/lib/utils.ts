import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatStock(stock: number | string, allowDecimals: boolean): string {
  // Convert to number if it's a string
  const numStock = typeof stock === 'string' ? parseFloat(stock) : stock;
  
  // Handle invalid numbers
  if (isNaN(numStock)) {
    return '0';
  }
  
  // UNIVERSAL DECIMAL DISPLAY: Always show decimals if the actual stock has decimal values
  // This ensures accurate stock representation regardless of product configuration
  const hasDecimals = numStock % 1 !== 0;
  
  if (allowDecimals || hasDecimals) {
    // For decimals, always show appropriate precision
    return hasDecimals ? numStock.toFixed(2) : numStock.toString();
  }
  
  // For non-decimal products, use Math.trunc instead of Math.floor to handle negatives correctly
  // Math.trunc(-0.5) = -0, Math.floor(-0.5) = -1
  return Math.trunc(numStock).toString();
}
