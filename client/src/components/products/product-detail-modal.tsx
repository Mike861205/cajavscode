import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Layers, DollarSign, Archive } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatStock } from "@/lib/stockUtils";

interface Product {
  id: number;
  name: string;
  description?: string;
  sku: string;
  price: string;
  cost: string;
  stock: number;
  isComposite: boolean;
  categoryId?: number;
  imageUrl?: string;
  status: string;
  warehouseStocks?: Array<{
    warehouseId: number;
    warehouseName: string;
    stock: number;
  }>;
}

interface ProductComponent {
  id: number;
  parentProductId: number;
  componentProductId: number;
  quantity: number;
  cost: string;
  componentProduct: {
    id: number;
    name: string;
    sku: string;
    price: string;
    cost: string;
  };
}

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const { data: components = [] } = useQuery({
    queryKey: ["/api/products", product?.id, "components"],
    enabled: isOpen && product?.isComposite,
  });

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {product.isComposite ? (
              <Layers className="h-5 w-5 text-purple-600" />
            ) : (
              <Package className="h-5 w-5 text-blue-600" />
            )}
            {product.name}
            <Badge variant={product.isComposite ? "outline" : "secondary"} 
                   className={product.isComposite ? "border-purple-300 text-purple-700 bg-purple-50" : ""}>
              {product.isComposite ? "Compuesto" : "Simple"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">SKU</p>
              <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{product.sku}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Precio</p>
              <p className="text-lg font-bold text-green-600">${parseFloat(product.price).toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Costo</p>
              <p className="text-lg font-semibold text-gray-800">${parseFloat(product.cost || '0').toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">Stock Total</p>
              <p className="text-lg font-bold text-blue-600">{product.stock}</p>
            </div>
          </div>

          {product.description && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Descripción</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{product.description}</p>
            </div>
          )}

          {/* Stock por almacén */}
          {product.warehouseStocks && product.warehouseStocks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-gray-600" />
                <p className="font-medium text-gray-800">Stock por Almacén</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {product.warehouseStocks.map((ws) => (
                  <div key={ws.warehouseId} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium text-blue-800">{ws.warehouseName}</span>
                    <span className="font-bold text-blue-600">{formatStock(ws.stock, (product as any).allowDecimals)} unidades</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Componentes para productos compuestos */}
          {product.isComposite && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-600" />
                <p className="font-medium text-gray-800">Componentes del Producto</p>
              </div>
              
              {Array.isArray(components) && components.length > 0 ? (
                <div className="space-y-3">
                  {components.map((component: ProductComponent) => (
                    <div key={component.id} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-purple-800">
                            {component?.componentProduct?.name || 'Componente sin nombre'}
                          </h4>
                          <p className="text-sm text-purple-600 font-mono">
                            SKU: {component?.componentProduct?.sku || 'N/A'}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm text-gray-600">Cantidad</p>
                          <p className="font-bold text-purple-700">{component?.quantity || 0} unidades</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Precio unitario: </span>
                          <span className="font-semibold text-green-600">
                            ${parseFloat(component?.componentProduct?.price || '0').toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Costo unitario: </span>
                          <span className="font-semibold text-gray-700">
                            ${parseFloat(component?.componentProduct?.cost || '0').toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-purple-200 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Costo total del componente:</span>
                          <span className="font-bold text-purple-800">
                            ${(parseFloat(component?.componentProduct?.cost || '0') * (component?.quantity || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Resumen de costos */}
                  <div className="p-4 bg-gray-100 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-3">Resumen de Costos</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Costo total de componentes:</span>
                        <span className="font-semibold">
                          ${Array.isArray(components) ? components.reduce((sum: number, comp: ProductComponent) => 
                            sum + (parseFloat(comp.componentProduct?.cost || '0') * (comp.quantity || 0)), 0
                          ).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Precio de venta del producto:</span>
                        <span className="font-semibold text-green-600">${parseFloat(product.price).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Margen de ganancia:</span>
                        <span className="text-green-600">
                          ${(parseFloat(product.price) - (Array.isArray(components) ? components.reduce((sum: number, comp: ProductComponent) => 
                            sum + (parseFloat(comp.componentProduct?.cost || '0') * (comp.quantity || 0)), 0
                          ) : 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Layers className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Este producto compuesto no tiene componentes configurados</p>
                  <p className="text-sm">Use el botón "Editar" para agregar componentes</p>
                </div>
              )}
            </div>
          )}

          {/* Información adicional */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Estado: </span>
                <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                  {product.status === 'active' ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              {product.categoryId && (
                <div>
                  <span className="font-medium">ID Categoría: </span>
                  <span>{product.categoryId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}