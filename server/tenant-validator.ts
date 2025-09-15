/**
 * Multi-Tenant Data Isolation Validator
 * Ensures strict tenant isolation across all data operations
 */

export class TenantValidator {
  private static readonly TENANT_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /**
   * Validates tenant ID format
   */
  static validateTenantId(tenantId: string): boolean {
    return this.TENANT_ID_REGEX.test(tenantId);
  }

  /**
   * Ensures data object includes valid tenant ID
   */
  static validateTenantData(data: any, requiredTenantId: string): void {
    if (!data.tenantId) {
      throw new Error("Data must include tenantId for multi-tenant isolation");
    }

    if (data.tenantId !== requiredTenantId) {
      throw new Error(`Tenant ID mismatch: expected ${requiredTenantId}, got ${data.tenantId}`);
    }

    if (!this.validateTenantId(data.tenantId)) {
      throw new Error("Invalid tenant ID format");
    }
  }

  /**
   * Creates tenant-safe data object
   */
  static createTenantData<T>(data: Omit<T, 'tenantId'>, tenantId: string): T & { tenantId: string } {
    if (!this.validateTenantId(tenantId)) {
      throw new Error("Invalid tenant ID format");
    }

    return {
      ...data,
      tenantId
    } as T & { tenantId: string };
  }

  /**
   * Validates that query results belong to correct tenant
   */
  static validateQueryResults(results: any[], expectedTenantId: string): void {
    const invalidResults = results.filter(item => 
      item.tenantId && item.tenantId !== expectedTenantId
    );

    if (invalidResults.length > 0) {
      console.error(`Data leak detected! Found ${invalidResults.length} records from other tenants`);
      throw new Error("Data isolation violation detected");
    }
  }

  /**
   * Logs tenant operation for audit trail
   */
  static logTenantOperation(operation: string, tenantId: string, details?: any): void {
    console.log(`[TENANT-${tenantId}] ${operation}`, details ? JSON.stringify(details) : '');
  }
}