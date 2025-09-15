import { queryClient } from './queryClient';

/**
 * Cache management helpers for real-time data updates
 * Centralizes cache invalidation to ensure UI updates quickly without F5
 */

export interface CacheInvalidationConfig {
  // Core business entities that need immediate updates
  sales?: boolean;
  cashRegister?: boolean;
  inventory?: boolean;
  dashboard?: boolean;
  products?: boolean;
  // Specific IDs for targeted invalidation
  cashRegisterId?: number;
  saleId?: number;
  productId?: number;
}

/**
 * Smart cache invalidation based on business operations
 * Prevents the need for manual F5 refresh
 */
export async function invalidateCache(config: CacheInvalidationConfig) {
  const promises: Promise<void>[] = [];

  if (config.sales) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/sales", { status: 'credit' }] }),
    );
  }

  if (config.cashRegister || config.cashRegisterId) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] }),
    );
    
    if (config.cashRegisterId) {
      promises.push(
        queryClient.invalidateQueries({ queryKey: ["/api/cash-register", config.cashRegisterId, "summary"] }),
      );
    }
  }

  if (config.inventory) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/unified-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/history"] }),
    );
  }

  if (config.dashboard) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/top-products"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/chart"] }),
    );
  }

  if (config.products) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
    );
  }

  if (config.saleId) {
    promises.push(
      queryClient.invalidateQueries({ queryKey: ["/api/sale-payments", config.saleId] }),
    );
  }

  await Promise.all(promises);
}

/**
 * Optimistic cache update for immediate UI feedback
 * Updates UI immediately while waiting for server confirmation
 */
export function updateCacheOptimistically<T>(
  queryKey: (string | number | object)[],
  updater: (oldData: T) => T
) {
  const oldData = queryClient.getQueryData<T>(queryKey);
  if (oldData) {
    queryClient.setQueryData(queryKey, updater(oldData));
  }
  return oldData; // Return for potential rollback
}

/**
 * Specific invalidation patterns for common operations
 */
export const CachePatterns = {
  /**
   * After payment method change on credit sale
   * Invalidates: sales, cash register, dashboard
   */
  onPaymentMethodChange: (cashRegisterId: number, saleId?: number) =>
    invalidateCache({
      sales: true,
      cashRegister: true,
      dashboard: true,
      cashRegisterId,
      saleId
    }),

  /**
   * After new sale creation
   * Invalidates: sales, cash register, inventory, dashboard, products
   */
  onSaleCreated: (cashRegisterId: number) =>
    invalidateCache({
      sales: true,
      cashRegister: true,
      inventory: true,
      dashboard: true,
      products: true,
      cashRegisterId
    }),

  /**
   * After inventory/stock changes
   * Invalidates: inventory, products, dashboard
   */
  onInventoryChange: () =>
    invalidateCache({
      inventory: true,
      products: true,
      dashboard: true
    }),

  /**
   * After cash register operations (open, close, transactions)
   * Invalidates: cash register, dashboard
   */
  onCashRegisterChange: (cashRegisterId: number) =>
    invalidateCache({
      cashRegister: true,
      dashboard: true,
      cashRegisterId
    })
};

/**
 * Real-time cache configuration for critical screens
 * Use these configurations for components that need instant updates
 */
export const RealTimeConfig = {
  // For POS screen - needs instant updates
  immediate: {
    staleTime: 1000, // 1 second
    refetchInterval: 2000, // Every 2 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false
  },

  // For cash register detail - needs quick updates
  quick: {
    staleTime: 2000, // 2 seconds  
    refetchInterval: 5000, // Every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false
  },

  // For inventory screens - moderate updates
  moderate: {
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false
  }
};