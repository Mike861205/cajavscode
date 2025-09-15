import { SQL, and, inArray } from "drizzle-orm";

/**
 * Safe helper functions for Drizzle ORM operations
 * These functions prevent type errors and runtime issues with undefined/null values
 */

/**
 * Safe AND operation that filters out undefined conditions
 * @param conditions Array of SQL conditions that may include undefined
 * @returns Combined AND condition or undefined if no valid conditions
 */
export function safeAnd(...conditions: (SQL | undefined)[]): SQL | undefined {
  const validConditions = conditions.filter(Boolean) as SQL[];
  return validConditions.length ? and(...validConditions) : undefined;
}

/**
 * Safe inArray operation that handles empty or undefined arrays
 * @param column Database column
 * @param values Array of values that may be empty or undefined
 * @returns inArray condition or undefined if no valid values
 */
export function safeInArray<T>(column: any, values?: readonly T[]): SQL | undefined {
  return values && values.length ? inArray(column, values as any) : undefined;
}

/**
 * Convert number or string to decimal string for database operations
 * @param value Value to convert
 * @returns String representation or undefined for null/undefined
 */
export function toDecimalString(value: string | number | null | undefined): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}

/**
 * Pick only defined (non-null, non-undefined) properties from an object
 * Useful for building update payloads that don't include undefined fields
 * @param obj Object to filter
 * @returns Object with only defined properties
 */
export function pickDefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null)
  ) as Partial<T>;
}

/**
 * Safe date conversion for database operations
 * @param dateValue Date string, Date object, or undefined
 * @returns Date object or undefined
 */
export function safeDate(dateValue: string | Date | undefined): Date | undefined {
  if (!dateValue) return undefined;
  return dateValue instanceof Date ? dateValue : new Date(dateValue);
}