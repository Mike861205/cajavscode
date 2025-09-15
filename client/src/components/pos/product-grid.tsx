import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, User, Building2, Package } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/contexts/SettingsContext";
import CashRegisterButtons from "./cash-register-buttons";
import { formatStock } from "@/lib/stockUtils";

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
  saleUnitPrice?: string;
  isConjunto?: boolean;
  weightVariants?: Array<{
    weight: string;
    label: string;
    price: string;
    cost: string;
    discount: string;
    unit: string;
    sortOrder: number;
  }>;
}

interface ProductGridProps {
  onAddToCart: (product: { id: number; name: string; price: number; unitType?: string; allowDecimals?: boolean; saleUnit?: string; saleUnitName?: string; saleUnitPrice?: number }) => void;
}

export default function ProductGrid({ onAddToCart }: ProductGridProps) {
  const { formatCurrency } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const { user } = useAuth();

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

  // Get cash register summary
  const { data: cashRegisterSummary } = useQuery<any>({
    queryKey: ["/api/cash-register", activeCashRegister?.id, "summary"],
    enabled: !!activeCashRegister?.id,
  });

  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // Memoized function to format stock
  const getFormattedStock = useCallback((stock: number, allowDecimals: boolean) => {
    return formatStock(stock, allowDecimals || false);
  }, []);

  const handleAddToCart = (product: Product) => {
    // Check if it's a conjunto product with weight variants
    if (product.isConjunto && product.weightVariants && product.weightVariants.length > 0) {
      setSelectedProduct(product);
      setIsVariantModalOpen(true);
      return;
    }

    // Use saleUnitPrice if available, otherwise use regular price
    const productPrice = product.saleUnitPrice ? parseFloat(product.saleUnitPrice) : parseFloat(product.price);
    
    onAddToCart({
      id: product.id,
      name: product.name,
      price: productPrice,
      unitType: product.unitType,
      allowDecimals: product.allowDecimals,
      saleUnit: product.saleUnit || "1",
      saleUnitName: product.saleUnitName || "unidad",
      saleUnitPrice: product.saleUnitPrice ? parseFloat(product.saleUnitPrice) : undefined
    });
  };

  const handleVariantSelection = (variant: any) => {
    if (!selectedProduct) return;

    console.log("DEBUG: Adding variant to cart:", {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      variantLabel: variant.label,
      variantWeight: variant.weight,
      variantUnit: variant.unit,
      variantPrice: variant.price,
      allowDecimals: true
    });

    onAddToCart({
      id: selectedProduct.id,
      name: `${selectedProduct.name} - ${variant.label}`,
      price: parseFloat(variant.price),
      unitType: variant.unit,
      allowDecimals: true,
      saleUnit: variant.weight,
      saleUnitName: variant.label,
      saleUnitPrice: parseFloat(variant.price)
    });

    setIsVariantModalOpen(false);
    setSelectedProduct(null);
  };

  if (warehouseError) {
    console.error("Warehouse error:", warehouseError);
  }

  if (isLoading || warehouseLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 lg:p-4">
        {/* Top row - Title, badges and search */}
        <div className="flex items-center justify-between gap-4 mb-3 lg:mb-4">
          <div className="flex items-center gap-2 lg:gap-4 min-w-0 flex-1">
            <h1 className="text-lg lg:text-2xl font-bold text-gray-800 truncate">Punto de Venta</h1>
            <div className="flex items-center gap-1 lg:gap-2 overflow-x-auto scrollbar-hide">
              {userWarehouse && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs whitespace-nowrap">
                  <Building2 className="w-3 h-3" />
                  <span className="font-medium">{userWarehouse.name}</span>
                </div>
              )}
              {user && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs whitespace-nowrap">
                  <User className="w-3 h-3" />
                  <span className="font-medium">{user.username}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Search moved to top row */}
          <div className="relative w-64 lg:w-80 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 lg:h-10 text-sm w-full"
            />
          </div>
        </div>
        
        {/* Bottom row - Only action buttons */}
        <div className="flex justify-center">
          <div className="overflow-x-auto max-w-full">
            <CashRegisterButtons />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {!activeCashRegister ? (
          <div className="h-full flex items-center justify-center">
            <Card className="w-96 text-center">
              <CardHeader>
                <CardTitle className="text-red-600">Caja Cerrada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Debe abrir una caja registradora antes de realizar ventas.
                </p>
                <CashRegisterButtons />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:scale-105 bg-white border border-gray-200"
                onClick={() => handleAddToCart(product)}
              >
                <CardContent className="p-3">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.parentElement!.innerHTML = `
                            <div class="w-full h-full bg-gray-300 flex items-center justify-center">
                              <span class="text-gray-600 font-bold text-lg">
                                ${product.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 font-bold text-lg">
                          {product.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {/* Product name */}
                    <h3 className="font-semibold text-sm text-gray-800 line-clamp-2 leading-tight text-center">
                      {product.name}
                      {product.isConjunto && product.weightVariants && product.weightVariants.length > 0 && (
                        <span className="ml-1 text-blue-600 font-bold">⚖️</span>
                      )}
                    </h3>
                    
                    {/* Stock information - between name and price */}
                    <div className="text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                        Stock: {getFormattedStock(product.stock, product.allowDecimals || false)}
                      </span>
                    </div>
                    
                    {/* Price */}
                    <div className="text-center">
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(product.saleUnitPrice ? parseFloat(product.saleUnitPrice) : parseFloat(product.price))}
                      </span>
                      {product.saleUnitPrice && (
                        <div className="text-xs text-gray-500 mt-1">
                          {product.saleUnitName || "por unidad"}
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      className="w-full h-8 text-sm bg-blue-600 hover:bg-blue-700 text-white mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      {product.isConjunto && product.weightVariants && product.weightVariants.length > 0 ? (
                        <>
                          <Package className="w-3 h-3 mr-1" />
                          Variantes
                        </>
                      ) : (
                        "Agregar"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeCashRegister && filteredProducts.length === 0 && (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No se encontraron productos</p>
              <p className="text-sm">Intenta con otro término de búsqueda</p>
            </div>
          </div>
        )}
      </div>

      {/* Weight Variants Selection Modal */}
      <Dialog open={isVariantModalOpen} onOpenChange={setIsVariantModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Package className="h-5 w-5" />
              Seleccionar Variante
            </DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedProduct.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Selecciona la variante que deseas agregar al carrito
                </p>
              </div>

              <div className="grid gap-3">
                {selectedProduct.weightVariants?.map((variant, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-4 text-left hover:bg-blue-50 border-2 hover:border-blue-300"
                    onClick={() => handleVariantSelection(variant)}
                  >
                    <div className="w-full flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {variant.label}
                        </div>
                        <div className="text-sm text-gray-600">
                          {variant.weight} {variant.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          ${parseFloat(variant.price).toFixed(2)}
                        </div>
                        {variant.discount && parseFloat(variant.discount) > 0 && (
                          <div className="text-xs text-orange-600">
                            {parseFloat(variant.discount).toFixed(1)}% desc.
                          </div>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsVariantModalOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}