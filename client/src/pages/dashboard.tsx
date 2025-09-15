import { useState, useEffect } from "react";
import { useParams, useRoute } from "wouter";
import Sidebar from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import StatsCards from "@/components/dashboard/stats-cards";
import Charts from "@/components/dashboard/charts";
import ProductGrid from "@/components/pos/product-grid";
import ShoppingCart from "@/components/pos/shopping-cart";
import ProductTable from "@/components/products/product-table";
import ProductsDashboard from "@/components/products/products-dashboard";
import Categories from "@/pages/categories-simple";
import SalesList from "@/components/sales/sales-list";
import ProductSales from "@/components/sales/product-sales";
import SalesDashboard from "@/components/sales/sales-dashboard";
import AddPurchase from "@/components/purchases/add-purchase";
import PurchasesList from "@/components/purchases/purchases-list";
import PurchasesDashboard from "@/components/purchases/purchases-dashboard";
import CashClosures from "@/components/reports/cash-closures";
import PhysicalInventory from "@/pages/physical-inventory";
import InventoryRegistry from "@/pages/inventory-registry";
import InventoryPage from "@/pages/inventory-page";
import SuppliersRegister from "@/pages/suppliers-register";
import SuppliersList from "@/pages/suppliers-list";
import SuppliersDashboard from "@/pages/suppliers-dashboard";
import SalesReports from "@/pages/sales-reports";
import Warehouses from "@/pages/warehouses";
import WarehousesTest from "@/pages/warehouses-test";
import BranchesDashboard from "@/pages/branches-dashboard";
import SuppliersStatistics from "@/pages/suppliers-statistics";
import UsersDashboard from "@/pages/users-dashboard";
import UserRegistration from "@/pages/user-registration";
import UserRoles from "@/pages/user-roles";
import Operations from "@/pages/operations";
import EmployeeFormSimple from "@/components/payroll/employee-form-simple";
import EmployeeList from "@/components/payroll/employee-list";
import PayrollStats from "@/components/payroll/payroll-stats";
import PayrollDashboard from "@/components/payroll/payroll-dashboard";
import PayrollHistory from "@/components/payroll/payroll-history";
import OrganizationalCatalog from "@/pages/organizational-catalog";
import AppointmentsCalendar from "@/components/appointments/appointments-calendar";
import AppointmentsRegistry from "@/components/appointments/appointments-registry";
import { SalesRegistry } from "@/components/appointments/sales-registry";
import CustomerRegistration from "@/pages/customers/customer-registration";
import CustomersList from "@/pages/customers/customers-list";
import CustomersMainDashboard from "@/components/customers/customers-main-dashboard";
import LoanClientRegistration from "@/pages/loans/loan-client-registration";
import LoanClientsList from "@/pages/loans/loan-clients-list";
import { CashRegisterStats } from "@/components/reports/cash-register-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TopProducts from "@/components/dashboard/top-products";
import PromotionsPage from "@/pages/promotions";
import ProductCosts from "@/pages/product-costs";
import SettingsPage from "@/pages/settings";
import StoreSettingsPage from "@/pages/store-settings";
import WebSales from "@/pages/web-sales";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
// import { Role } from "@shared/schema"; // Removed unused import
import { Menu } from "lucide-react";
import { AIChatWidget } from "@/components/ai-chat/ai-chat-widget";
import { Header } from "@/components/layout/header";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  unitType?: string;
  allowDecimals?: boolean;
  saleUnitPrice?: number;
  saleUnit?: string;
  saleUnitName?: string;
}

export default function Dashboard() {
  const [match, params] = useRoute("/dashboard/:section?/:subsection?");
  const section = params?.section || "dashboard";
  const subsection = params?.subsection;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Extract URL parameters for customer info (used by POS from sales registry)
  const urlParams = new URLSearchParams(window.location.search);
  const customerInfoParam = urlParams.get('customer');
  const productsParam = urlParams.get('products');
  
  let customerInfo = null;
  let preselectedProducts = [];
  
  try {
    if (customerInfoParam) {
      customerInfo = JSON.parse(customerInfoParam);
    }
    if (productsParam) {
      preselectedProducts = JSON.parse(productsParam);
    }
  } catch (error) {
    console.error("Error parsing URL parameters:", error);
  }
  const [cart, setCart] = useState<CartItem[]>([]);
  const { user } = useAuth();

  // Debug logging
  console.log("Dashboard - section:", section, "subsection:", subsection, "match:", match);

  // Map URL sections to sidebar section IDs
  const getSidebarSection = (urlSection: string, urlSubsection?: string) => {
    if (urlSection === "sales") {
      if (urlSubsection === "list") {
        return "sales-list";
      }
      if (urlSubsection === "web") {
        return "ventas-web";
      }
      return "sales"; // Main sales dashboard
    }
    if (urlSection === "products") {
      if (urlSubsection === "list") {
        return "products-list";
      }
      if (urlSubsection === "costs") {
        return "costos";
      }
      return "products";
    }
    if (urlSection === "categories") {
      return "categories";
    }
    if (urlSection === "purchases") {
      if (urlSubsection === "add") {
        return "add-purchase";
      }
      if (urlSubsection === "list") {
        return "purchases-list";
      }
      return "purchases"; // Main purchases dashboard
    }
    if (urlSection === "reports") {
      if (urlSubsection === "cortes") {
        return "reports-cortes";
      }
      if (urlSubsection === "ventas") {
        return "reports-ventas";
      }
      return "reports"; // Main reports dashboard
    }
    if (urlSection === "inventory") {
      if (urlSubsection === "physical") {
        return "physical-inventory";
      }
      if (urlSubsection === "registry") {
        return "inventory-registry";
      }
      return "inventory"; // Main inventory dashboard
    }
    if (urlSection === "suppliers") {
      if (urlSubsection === "register") {
        return "alta-proveedores";
      }
      if (urlSubsection === "list") {
        return "suppliers-list";
      }
      return "suppliers"; // Main suppliers dashboard
    }
    if (urlSection === "branches") {
      if (urlSubsection === "warehouses") {
        return "warehouses";
      }
      return "branches-dashboard"; // Main branches dashboard
    }
    if (urlSection === "users") {
      if (urlSubsection === "registration") {
        return "user-registration";
      }
      if (urlSubsection === "roles") {
        return "user-roles";
      }
      return "users"; // Main users dashboard
    }
    if (urlSection === "nominas") {
      if (urlSubsection === "alta") {
        return "alta-nominas";
      }
      if (urlSubsection === "registro") {
        return "registro-empleados";
      }
      return "nominas"; // Main nominas dashboard
    }
    if (urlSection === "agendas") {
      if (urlSubsection === "citas") {
        return "citas";
      }
      if (urlSubsection === "registro") {
        return "registro-citas";
      }
      if (urlSubsection === "registro-venta") {
        return "registro-venta";
      }
      return "agendas"; // Main agendas dashboard
    }
    if (urlSection === "clientes") {
      if (urlSubsection === "alta") {
        return "alta-clientes";
      }
      if (urlSubsection === "lista") {
        return "clientes-lista";
      }
      return "clientes"; // Main clientes dashboard
    }
    return urlSection;
  };

  const addToCart = (product: { id: number; name: string; price: number; unitType?: string; allowDecimals?: boolean; saleUnit?: string; saleUnitName?: string; saleUnitPrice?: number }) => {
    setCart(currentCart => {
      // For weight variants (conjunto products), create unique identifier using name
      // This ensures each variant is treated as a separate item
      const isWeightVariant = product.name.includes(" - ") && product.saleUnit && product.saleUnitName;
      const itemIdentifier = isWeightVariant ? product.name : product.id.toString();
      
      const existingItem = currentCart.find(item => 
        isWeightVariant ? item.name === product.name : item.id === product.id
      );
      
      if (existingItem) {
        // For conjunto weight variants, increment by the weight amount (add another portion)
        // For regular products with decimals, use saleUnit increment
        // For regular products without decimals, increment by 1
        const increment = isWeightVariant && product.saleUnitPrice ? parseFloat(product.saleUnit || "1") :
                          product.allowDecimals ? parseFloat(product.saleUnit || "0.1") : 1;
        return currentCart.map(item =>
          (isWeightVariant ? item.name === product.name : item.id === product.id)
            ? { ...item, quantity: item.quantity + increment }
            : item
        );
      }
      
      // For conjunto weight variants, treat each variant as a complete unit with its configured price
      // For regular decimal products, use saleUnit as quantity
      // For regular products, quantity is 1
      let cartQuantity: number;
      let cartPrice: number;
      
      if (isWeightVariant && product.saleUnitPrice) {
        // For conjunto weight variants: use the actual weight as quantity
        // Calculate the unit price: variant price / variant weight = price per unit
        const variantWeight = parseFloat(product.saleUnit || "1");
        const variantPrice = product.saleUnitPrice;
        cartQuantity = variantWeight;
        cartPrice = variantPrice / variantWeight; // Unit price for consistent calculations
      } else if (product.allowDecimals) {
        // For regular decimal products
        cartQuantity = parseFloat(product.saleUnit || "0.1");
        cartPrice = product.price;
      } else {
        // For regular products
        cartQuantity = 1;
        cartPrice = product.price;
      }
      
      return [...currentCart, { 
        ...product, 
        price: cartPrice,
        quantity: cartQuantity,
        unitType: product.unitType || "piece",
        allowDecimals: product.allowDecimals || false,
        saleUnitPrice: product.saleUnitPrice,
        saleUnit: product.saleUnit,
        saleUnitName: product.saleUnitName
      }];
    });
  };

  const updateCartItem = (id: number, quantity: number, variantName?: string) => {
    if (quantity <= 0) {
      setCart(currentCart => currentCart.filter(item => 
        variantName && item.name.includes(" - ") ? item.name !== variantName : item.id !== id
      ));
    } else {
      setCart(currentCart =>
        currentCart.map(item =>
          (variantName && item.name.includes(" - ") ? item.name === variantName : item.id === id) 
            ? { ...item, quantity } 
            : item
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  // Fetch products for preloading from appointments
  const { data: availableProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
    enabled: section === "pos" && preselectedProducts.length > 0,
  });

  // Effect to preload products when coming from sales registry
  useEffect(() => {
    if (section === "pos" && preselectedProducts.length > 0 && availableProducts.length > 0) {
      // Clear existing cart first
      setCart([]);
      
      // Add preselected products to cart
      preselectedProducts.forEach((preselected: any) => {
        const product = availableProducts.find((p: any) => p.name === preselected.productName);
        if (product) {
          console.log("Adding product to cart:", product, "Price:", product.price, "Type:", typeof product.price);
          setCart(currentCart => {
            const existingItem = currentCart.find(item => item.id === product.id);
            if (existingItem) {
              return currentCart.map(item =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + preselected.quantity }
                  : item
              );
            }
            return [...currentCart, {
              id: product.id,
              name: product.name,
              price: typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0,
              quantity: preselected.quantity,
              unitType: product.unitType || "piece",
              allowDecimals: product.allowDecimals || false
            }];
          });
        }
      });
    }
  }, [section, preselectedProducts, availableProducts]);

  const renderContent = () => {
    console.log("renderContent - switching on section:", section);
    switch (section) {
      case "dashboard":
        return (
          <DateRangeProvider>
            <div className="space-y-6">
              <StatsCards />
              <Charts />
              
              {/* Top 10 Best Selling Products */}
              <TopProducts />
            </div>
          </DateRangeProvider>
        );

      case "pos":
        return (
          <div className="h-screen flex flex-col overflow-hidden">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-2 lg:gap-4 min-h-0 p-2 lg:p-4">
              <div className="lg:col-span-2 xl:col-span-3 flex flex-col min-h-0">
                <ProductGrid onAddToCart={addToCart} />
              </div>
              <div className="lg:col-span-1 xl:col-span-2 flex flex-col min-h-0">
                <ShoppingCart 
                  items={cart}
                  onUpdateItem={updateCartItem}
                  onClear={clearCart}
                  customerInfo={customerInfo}
                  preselectedProducts={preselectedProducts}
                />
              </div>
            </div>
          </div>
        );

      case "products":
        if (subsection === "list") {
          return <ProductTable />;
        }
        if (subsection === "costs") {
          return <ProductCosts />;
        }
        return <ProductsDashboard />;
      case "configuracion":
        return <SettingsPage />;
      case "settings":
        return <SettingsPage />;

      case "store":
        return <StoreSettingsPage />;
      case "products-list":
        return <ProductTable />;
      case "categories":
        return <Categories />;
      case "promotions":
        return <PromotionsPage />;

      case "sales":
        if (subsection === "list") {
          return <SalesList />;
        }
        if (subsection === "product-sales") {
          return <ProductSales />;
        }
        if (subsection === "web") {
          return <WebSales />;
        }
        return <SalesDashboard />;

      case "purchases":
        if (subsection === "add") {
          return <AddPurchase />;
        }
        if (subsection === "list") {
          return <PurchasesList />;
        }
        return <PurchasesDashboard />;

      case "reports":
        if (subsection === "cortes") {
          return <CashClosures />;
        }
        if (subsection === "ventas") {
          return <SalesReports />;
        }
        if (subsection === "cajas") {
          return <CashRegisterStats />;
        }
        return <CashRegisterStats />;

      case "inventory":
        if (subsection === "physical") {
          return <PhysicalInventory />;
        }
        if (subsection === "registry") {
          return <InventoryRegistry />;
        }
        return <InventoryPage />;

      case "suppliers":
        if (subsection === "register") {
          return <SuppliersRegister />;
        }
        if (subsection === "list") {
          return <SuppliersList />;
        }
        return <SuppliersDashboard />;

      case "branches":
        if (subsection === "warehouses") {
          return <WarehousesTest />;
        }
        return <BranchesDashboard />;

      case "users":
        if (subsection === "registration") {
          return <UserRegistration />;
        }
        if (subsection === "roles") {
          return <UserRoles />;
        }
        return <UsersDashboard />;

      case "operations":
        return <Operations />;

      case "nominas":
        if (subsection === "alta") {
          return <EmployeeFormSimple />;
        } else if (subsection === "registro") {
          return <EmployeeList onAddEmployee={() => window.location.href = "/dashboard/nominas/alta"} />;
        } else if (subsection === "estadisticas") {
          return <PayrollStats />;
        } else if (subsection === "historial") {
          return <PayrollHistory />;
        }
        return <PayrollDashboard />;
      case "alta-nominas":
        return <EmployeeFormSimple />;

      case "catalogos-organizacionales":
        return <OrganizationalCatalog />;

      case "agendas":
        console.log("Rendering agendas section, subsection:", subsection);
        if (subsection === "citas") {
          console.log("Rendering AppointmentsCalendar component");
          return <AppointmentsCalendar />;
        } else if (subsection === "registro") {
          console.log("Rendering AppointmentsRegistry component");
          return <AppointmentsRegistry />;
        } else if (subsection === "registro-venta") {
          console.log("Rendering SalesRegistry component");
          return <SalesRegistry />;
        }
        return <AppointmentsCalendar />;

      case "citas":
        console.log("Rendering AppointmentsCalendar component");
        return <AppointmentsCalendar />;
      case "registro-citas":
        console.log("Rendering AppointmentsRegistry component");
        return <AppointmentsRegistry />;

      case "clientes":
        if (subsection === "alta") {
          return <CustomerRegistration />;
        } else if (subsection === "lista") {
          return <CustomersList />;
        }
        // Default to dashboard when no subsection or accessing /dashboard/clientes directly
        return <CustomersMainDashboard />;
      case "alta-clientes":
        return <CustomerRegistration />;
      case "clientes-lista":
        return <CustomersList />;

      case "prestamos":
        if (subsection === "alta") {
          return <LoanClientRegistration />;
        } else if (subsection === "lista") {
          return <LoanClientsList />;
        }
        // Default to lista when no subsection or accessing /dashboard/prestamos directly
        return <LoanClientsList />;
      case "alta-prestamos":
        return <LoanClientRegistration />;
      case "prestamos-lista":
        return <LoanClientsList />;

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Sucursales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Selecciona una opción del menú lateral para gestionar tus sucursales.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        currentSection={getSidebarSection(section, subsection)}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white shadow-lg border-gray-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </Button>
      </div>
      
      <div className="lg:pl-64">
        {/* Header moderno con usuario, fecha y hora - Solo mostrar si no es POS */}
        {section !== "pos" && (
          <div className="p-3 lg:p-6 pb-0">
            <Header />
          </div>
        )}
        
        <div className={section === "pos" ? "" : "p-3 lg:p-6"}>
          {renderContent()}
        </div>
      </div>
      
      {/* AI Chat Widget - Solo mostrar en dashboard (no en landing page) */}
      <AIChatWidget />
    </div>
  );
}
