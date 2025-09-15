import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Building2, GripVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import CashRegisterButtons from "./cash-register-buttons";
import { formatStock } from "@/lib/stockUtils";
import Sortable from "sortablejs";
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: number;
  name: string;
  price: string;
  imageUrl?: string;
  stock: number;
  unitType?: string;
  allowDecimals?: boolean;
  saleUnit?: string;
  saleUnitName?: string;
  sortOrder?: number;
}

interface ProductGridProps {
  onAddToCart: (product: { id: number; name: string; price: number; unitType?: string; allowDecimals?: boolean; saleUnit?: string; saleUnitName?: string }) => void;
}

export default function ProductGrid({ onAddToCart }: ProductGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();
  const sortableRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Check for active cash register
  const { data: activeCashRegister } = useQuery<any>({
    queryKey: ["/api/cash-register/active"],
  });

  // Get user's warehouse information  
  const { data: userWarehouse, isLoading: warehouseLoading, error: warehouseError } = useQuery<any>({
    queryKey: ["/api/user/warehouse"],
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user, // Only run if user is authenticated
  });

  // Mutación para actualizar el orden de productos
  const reorderMutation = useMutation({
    mutationFn: async (productOrders: { id: number; sortOrder: number }[]) => {
      return await apiRequest("PATCH", "/api/products/reorder", { productOrders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  // Inicializar SortableJS cuando no hay búsqueda activa
  useEffect(() => {
    if (!searchTerm && sortableRef.current && products.length > 0) {
      const sortable = Sortable.create(sortableRef.current, {
        animation: 200,
        delay: 0,
        delayOnTouchStart: true,
        touchStartThreshold: 5,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: (evt) => {
          if (evt.oldIndex !== evt.newIndex && evt.oldIndex !== undefined && evt.newIndex !== undefined) {
            const newProductOrders = products.map((product, index) => ({
              id: product.id,
              sortOrder: index === evt.newIndex ? evt.oldIndex : 
                        index === evt.oldIndex ? evt.newIndex :
                        index > Math.min(evt.oldIndex, evt.newIndex) && index <= Math.max(evt.oldIndex, evt.newIndex) ?
                          (evt.oldIndex < evt.newIndex ? index - 1 : index + 1) : index
            }));
            
            reorderMutation.mutate(newProductOrders);
          }
        }
      });

      return () => {
        if (sortable) {
          sortable.destroy();
        }
      };
    }
  }, [products, searchTerm, reorderMutation]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddToCart = (product: Product) => {
    if (!activeCashRegister) {
      alert("Debe abrir la caja registradora antes de realizar ventas");
      return;
    }
    onAddToCart({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      unitType: product.unitType || "piece",
      allowDecimals: product.allowDecimals || false,
      saleUnit: product.saleUnit || "1",
      saleUnitName: product.saleUnitName || "unidad"
    });
  };

  // STRICT TENANT ISOLATION: Only show real products, no mock data
  const displayProducts = filteredProducts;

  return (
    <div className="space-y-4">
      {/* Header with user and warehouse info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Top row: User info and Punto de Venta */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{user?.fullName || user?.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-green-600" />
                  <span className="font-medium">
                    {warehouseLoading ? 'Cargando...' : 
                     (userWarehouse?.name || 
                     (user?.username === 'MIGUELITO' ? 'Lomas del Sol' : 'Almacén Principal'))}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Punto de Venta
              </div>
            </div>
            
            {/* Middle row: Product search bar */}
            <div className="flex justify-center">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar producto..."
                  className="pl-10 w-full h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Bottom row: Cash register buttons - compact horizontal layout */}
            <div className="flex justify-center">
              <CashRegisterButtons />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Productos</CardTitle>
        </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-320px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 lg:gap-3 pb-4">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-2 lg:p-4 animate-pulse">
                  <div className="w-full h-20 lg:h-24 bg-gray-200 rounded-lg mb-2 lg:mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-3 lg:h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 lg:h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="flex justify-between items-center pt-1">
                      <div className="h-4 lg:h-5 bg-gray-200 rounded w-12 lg:w-16"></div>
                      <div className="h-5 lg:h-6 bg-gray-200 rounded-full w-10 lg:w-12"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative pb-4">
              {/* Cash Register Closed Overlay */}
              {!activeCashRegister && (
                <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                  <div className="bg-white rounded-lg p-8 shadow-xl max-w-lg mx-4 text-center border-2 border-orange-200">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Turno Cerrado</h3>
                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                      El turno anterior se ha cerrado correctamente. Para continuar con las ventas, debe abrir un nuevo turno de caja con el monto inicial.
                    </p>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                      <p className="text-orange-800 text-sm font-medium">
                        💡 Use el botón "Abrir Caja" en la barra superior para iniciar un nuevo turno
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Utilice el botón "Abrir Turno" en la parte superior.
                    </p>
                  </div>
                </div>
              )}

              <div 
                ref={searchTerm ? null : sortableRef}
                className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 ${!activeCashRegister ? 'opacity-30' : ''}`}
              >
                {displayProducts.map((product) => (
                  <div 
                    key={product.id}
                    data-id={product.id}
                    className={`bg-white border border-gray-200 rounded-xl p-4 transition-all duration-300 ${
                      activeCashRegister 
                        ? 'cursor-pointer hover:shadow-lg hover:border-blue-300 transform hover:scale-[1.02] hover:-translate-y-1 group' 
                        : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    {/* Handle de arrastre - solo visible cuando no hay búsqueda */}
                    {!searchTerm && activeCashRegister && (
                      <div className="drag-handle absolute top-2 right-2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </div>
                    )}
                    
                    <div className="relative mb-3">
                      <div className="w-full h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                        <img 
                          src={product.imageUrl || "/api/placeholder/120/90"} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `data:image/svg+xml;base64,${btoa(`
                              <svg width="120" height="90" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:#f1f5f9"/>
                                    <stop offset="100%" style="stop-color:#e2e8f0"/>
                                  </linearGradient>
                                </defs>
                                <rect width="100%" height="100%" fill="url(#grad)"/>
                                <circle cx="60" cy="35" r="12" fill="#cbd5e1" opacity="0.5"/>
                                <rect x="20" y="55" width="80" height="4" fill="#cbd5e1" opacity="0.3"/>
                                <rect x="35" y="65" width="50" height="3" fill="#cbd5e1" opacity="0.2"/>
                                <text x="50%" y="85%" font-family="Arial" font-size="8" fill="#64748b" text-anchor="middle">
                                  ${product.name.substring(0, 12)}
                                </text>
                              </svg>
                            `)}`;
                          }}
                        />
                      </div>
                      {product.stock <= 5 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full shadow-lg border-2 border-white">
                          {formatStock(product.stock, (product as any).allowDecimals)}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 min-h-[2.5rem] leading-tight group-hover:text-blue-600 transition-colors">{product.name}</h4>
                      <div className="flex items-center justify-between">
                        <p className="text-blue-600 font-bold text-lg">${product.price}</p>
                        <div className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Agregar
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {displayProducts.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron productos</p>
            </div>
          )}
        </div>
      </CardContent>
      </Card>
    </div>
  );
}