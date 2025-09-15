import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SubscriptionTimer } from "@/components/subscription/subscription-timer";
import { 
  LayoutDashboard, 
  ScanBarcode, 
  Package, 
  TrendingUp, 
  ShoppingCart, 
  FileText, 
  Warehouse, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  List,
  Plus,
  Calculator,
  Archive,
  Truck,
  Building2,
  Users,
  UserPlus,
  Shield,
  DollarSign,
  Tag,
  Receipt,
  Calendar,
  CalendarDays,
  Bot,
  Gift,
  Globe
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  currentSection: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ currentSection, sidebarOpen, setSidebarOpen }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const { canAccessModule } = usePermissions();
  const [, setLocation] = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({
    // Auto-expand menus when on their respective pages
    sales: currentSection === "sales-list" || currentSection === "sales" || currentSection === "ventas-web",
    products: currentSection === "products-list" || currentSection === "products" || currentSection === "promotions",
    inventory: currentSection === "physical-inventory" || currentSection === "inventory",
    suppliers: currentSection === "alta-proveedores" || currentSection === "suppliers" || currentSection === "suppliers-list",
    branches: currentSection === "warehouses" || currentSection === "branches" || currentSection === "branches-dashboard",
    agendas: currentSection === "citas" || currentSection === "registro-citas" || currentSection === "agendas"
  });

  const menuItems = [
    { 
      id: "dashboard", 
      label: "Dashboard", 
      icon: LayoutDashboard, 
      path: "/dashboard" 
    },
    { 
      id: "pos", 
      label: "Punto de Venta", 
      icon: ScanBarcode, 
      path: "/dashboard/pos" 
    },
    { 
      id: "products", 
      label: "Productos", 
      icon: Package, 
      hasChildren: true,
      path: "/dashboard/products",
      children: [
        {
          id: "products-list",
          label: "Lista de Productos",
          icon: List,
          path: "/dashboard/products/list"
        },
        {
          id: "categories",
          label: "Categorías",
          icon: Tag,
          path: "/dashboard/categories"
        },
        {
          id: "promotions",
          label: "Promociones",
          icon: Gift,
          path: "/dashboard/promotions"
        },
        {
          id: "costos",
          label: "Costos",
          icon: Calculator,
          path: "/dashboard/products/costs"
        }
      ]
    },
    { 
      id: "sales", 
      label: "Ventas", 
      icon: TrendingUp, 
      hasChildren: true,
      path: "/dashboard/sales",
      children: [
        {
          id: "sales-list",
          label: "Lista de Ventas",
          icon: List,
          path: "/dashboard/sales/list"
        },
        {
          id: "product-sales",
          label: "Venta Productos",
          icon: Package,
          path: "/dashboard/sales/product-sales"
        },
        {
          id: "ventas-web",
          label: "Ventas Web",
          icon: Globe,
          path: "/dashboard/sales/web"
        }
      ]
    },
    { 
      id: "purchases", 
      label: "Compras", 
      icon: ShoppingCart, 
      hasChildren: true,
      path: "/dashboard/purchases",
      children: [
        {
          id: "add-purchase",
          label: "Añadir Compra",
          icon: Plus,
          path: "/dashboard/purchases/add"
        },
        {
          id: "purchases-list",
          label: "Historial de Compras",
          icon: List,
          path: "/dashboard/purchases/list"
        }
      ]
    },
    { 
      id: "suppliers", 
      label: "Proveedores", 
      icon: Truck, 
      hasChildren: true,
      path: "/dashboard/suppliers",
      children: [
        {
          id: "alta-proveedores",
          label: "Alta Proveedores",
          icon: Plus,
          path: "/dashboard/suppliers/register"
        },
        {
          id: "suppliers-list",
          label: "Registro de Proveedores",
          icon: List,
          path: "/dashboard/suppliers/list"
        }
      ]
    },
    { 
      id: "branches", 
      label: "Sucursales", 
      icon: Building2, 
      hasChildren: true,
      path: "/dashboard/branches",
      children: [
        {
          id: "branches-dashboard",
          label: "Dashboard de Sucursales",
          icon: BarChart3,
          path: "/dashboard/branches"
        },
        {
          id: "warehouses",
          label: "Almacenes",
          icon: Warehouse,
          path: "/dashboard/branches/warehouses"
        }
      ]
    },
    { 
      id: "operations", 
      label: "Operaciones", 
      icon: DollarSign, 
      path: "/dashboard/operations" 
    },
    { 
      id: "nominas", 
      label: "Nóminas", 
      icon: Receipt, 
      hasChildren: true,
      path: "/dashboard/nominas",
      children: [
        {
          id: "alta-nominas",
          label: "Alta de Empleados",
          icon: UserPlus,
          path: "/dashboard/nominas/alta"
        },
        {
          id: "registro-empleados",
          label: "Registro de Empleados",
          icon: Users,
          path: "/dashboard/nominas/registro"
        },
        {
          id: "estadisticas-nominas",
          label: "Estadísticas",
          icon: BarChart3,
          path: "/dashboard/nominas/estadisticas"
        },
        {
          id: "historial-timbrado",
          label: "Historial de Timbrado",
          icon: FileText,
          path: "/dashboard/nominas/historial"
        },
        {
          id: "catalogos-organizacionales",
          label: "Catálogos Organizacionales",
          icon: Building2,
          path: "/dashboard/catalogos-organizacionales"
        }
      ]
    },
    { 
      id: "agendas", 
      label: "Agendas", 
      icon: Calendar, 
      hasChildren: true,
      path: "/dashboard/agendas",
      children: [
        {
          id: "citas",
          label: "Citas",
          icon: CalendarDays,
          path: "/dashboard/agendas/citas"
        },
        {
          id: "registro-citas",
          label: "Registro de Citas",
          icon: List,
          path: "/dashboard/agendas/registro"
        },
        {
          id: "registro-venta",
          label: "Registro Venta",
          icon: ShoppingCart,
          path: "/dashboard/agendas/registro-venta"
        }
      ]
    },
    { 
      id: "clientes", 
      label: "Clientes", 
      icon: Users, 
      hasChildren: true,
      path: "/dashboard/clientes",
      children: [
        {
          id: "alta-clientes",
          label: "Alta de Clientes",
          icon: UserPlus,
          path: "/dashboard/clientes/alta"
        },
        {
          id: "clientes-lista",
          label: "Clientes Registrados",
          icon: List,
          path: "/dashboard/clientes/lista"
        }
      ]
    },
    { 
      id: "prestamos", 
      label: "Préstamos", 
      icon: DollarSign, 
      hasChildren: true,
      path: "/dashboard/prestamos",
      children: [
        {
          id: "alta-prestamos",
          label: "Alta Cliente",
          icon: UserPlus,
          path: "/dashboard/prestamos/alta"
        },
        {
          id: "prestamos-lista",
          label: "Lista de Clientes",
          icon: List,
          path: "/dashboard/prestamos/lista"
        }
      ]
    },
    { 
      id: "billing", 
      label: "Facturación", 
      icon: FileText, 
      path: "/dashboard/billing" 
    },
    { 
      id: "inventory", 
      label: "Inventario", 
      icon: Warehouse, 
      hasChildren: true,
      path: "/dashboard/inventory",
      children: [
        {
          id: "physical-inventory",
          label: "Inventario Físico",
          icon: List,
          path: "/dashboard/inventory/physical"
        },
        {
          id: "inventory-registry",
          label: "Registro de Inventario",
          icon: Archive,
          path: "/dashboard/inventory/registry"
        }
      ]
    },
    { 
      id: "reports", 
      label: "Reportes", 
      icon: BarChart3, 
      hasChildren: true,
      path: "/dashboard/reports",
      children: [
        {
          id: "reports-cortes",
          label: "Cortes de Caja",
          icon: Calculator,
          path: "/dashboard/reports/cortes"
        },
        {
          id: "reports-ventas",
          label: "Reportes de Ventas",
          icon: BarChart3,
          path: "/dashboard/reports/ventas"
        }
      ]
    },
    { 
      id: "users", 
      label: "Usuarios", 
      icon: Users, 
      hasChildren: true,
      path: "/dashboard/users",
      children: [
        {
          id: "user-registration",
          label: "Alta de Usuarios",
          icon: UserPlus,
          path: "/dashboard/users/registration"
        },
        {
          id: "user-roles",
          label: "Roles",
          icon: Shield,
          path: "/dashboard/users/roles"
        }
      ]
    },
    { 
      id: "settings", 
      label: "Configuración", 
      icon: Settings, 
      path: "/dashboard/settings" 
    },
    { 
      id: "store", 
      label: "Tienda Online", 
      icon: Globe, 
      path: "/dashboard/store" 
    }
  ];

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setLocation("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const isChildActive = (children: any[]) => {
    return children.some(child => currentSection === child.id);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Header */}
        <div className="flex items-center justify-center h-16 px-4 bg-primary text-white flex-shrink-0">
          <h1 className="text-xl font-bold">Caja Sas Enterprise</h1>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto">
          <div className="mt-5 px-2 pb-4 space-y-1">
            {menuItems.map((item) => (
              <div key={item.id}>
                {/* Parent menu item */}
                <Button
                  variant={
                    currentSection === item.id || (item.children && isChildActive(item.children))
                      ? "secondary" 
                      : "ghost"
                  }
                  className={`w-full justify-start ${
                    currentSection === item.id || (item.children && isChildActive(item.children))
                      ? "bg-primary/10 text-primary hover:bg-primary/20" 
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    if (item.hasChildren) {
                      if (item.path) {
                        setLocation(item.path);
                        setSidebarOpen(false);
                      }
                      toggleMenu(item.id);
                    } else {
                      if (item.path) {
                        setLocation(item.path);
                      }
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                  {item.hasChildren && (
                    <div className="ml-auto">
                      {expandedMenus[item.id] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  )}
                </Button>

                {/* Child menu items */}
                {item.hasChildren && expandedMenus[item.id] && (
                  <div className="ml-6 mt-1 space-y-1">
                    {item.children?.map((child) => (
                      <Button
                        key={child.id}
                        variant={currentSection === child.id ? "secondary" : "ghost"}
                        className={`w-full justify-start text-sm ${
                          currentSection === child.id
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          setLocation(child.path);
                          setSidebarOpen(false);
                        }}
                      >
                        <child.icon className="mr-3 h-4 w-4" />
                        {child.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Bottom section - Fixed */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white">
          <div className="space-y-3">


            {/* User info with subscription timer */}
            {user && (
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-white text-sm">
                      {getInitials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                
                {/* Subscription Timer */}
                <div className="px-2">
                  <SubscriptionTimer />
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="mr-3 h-5 w-5" />
              {logoutMutation.isPending ? "Cerrando..." : "Cerrar Sesión"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
