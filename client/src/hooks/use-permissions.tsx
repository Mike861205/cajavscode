import { useAuth } from "./use-auth";
import { useQuery } from "@tanstack/react-query";

export interface UserRole {
  id: number;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  tenantId: string;
  isSystemRole: boolean;
}

export function usePermissions() {
  const { user } = useAuth();

  const { data: userRole } = useQuery({
    queryKey: ['/api/user-role', user?.id],
    enabled: !!user?.roleId,
  });

  const hasPermission = (permission: string): boolean => {
    // Tenant owner (license holder) always has all permissions
    if (user?.isOwner) return true;
    
    if (!userRole || !userRole.permissions) return false;
    
    // Super admin has all permissions
    if (userRole.name === 'super_admin') return true;
    
    return userRole.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const canAccessModule = (moduleId: string): boolean => {
    // Always allow dashboard access
    if (moduleId === 'dashboard') return true;
    
    // Always allow promotions access for now (debugging)
    if (moduleId === 'promotions') return true;
    
    // Tenant owner (license holder) always has access to all modules
    if (user?.isOwner) return true;
    
    // Map module IDs to the actual permissions used in the database
    const modulePermissions: Record<string, string[]> = {
      pos: ['sales'],
      products: ['products_view', 'products_manage'],
      promotions: ['products_view', 'products_manage'],
      sales: ['sales'],
      purchases: ['purchases_view', 'purchases_manage'],
      suppliers: ['suppliers_view', 'suppliers_manage'],
      branches: ['warehouses_view', 'warehouses_manage'],
      billing: ['billing_view', 'billing_manage'],
      inventory: ['inventory_view', 'inventory_manage'],
      reports: ['reports_view'],
      users: ['users_view', 'users_manage', 'roles_view', 'roles_manage'],
      settings: ['system_settings', 'system_admin']
    };

    const requiredPermissions = modulePermissions[moduleId];
    if (!requiredPermissions) return false; // Deny access if no specific permissions defined

    return hasAnyPermission(requiredPermissions);
  };

  return {
    userRole,
    hasPermission,
    hasAnyPermission,
    canAccessModule
  };
}