import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Edit, Trash2, Plus, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { type Product, type ProductWeightVariant } from '@shared/schema';
import { formatCurrency } from '@/lib/utils';

interface ProductConjuntoDetailsProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  variant?: 'card' | 'modal';
}

export function ProductConjuntoDetails({
  product,
  onEdit,
  onDelete,
  variant = 'card'
}: ProductConjuntoDetailsProps) {
  const [showDetails, setShowDetails] = useState(false);

  const { data: variants = [], isLoading } = useQuery<ProductWeightVariant[]>({
    queryKey: [`/api/products/${product.id}/weight-variants`],
    enabled: product.isConjunto,
  });

  const formatStock = (stock: string | number) => {
    const value = typeof stock === 'string' ? parseFloat(stock) : stock;
    return isNaN(value) ? '0' : value.toFixed(3);
  };

  const calculateUtility = (price: number, cost: number) => {
    if (cost === 0) return 0;
    return ((price - cost) / cost) * 100;
  };

  if (variant === 'card') {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-semibold">{product.name}</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Conjunto
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                <Eye className="w-4 h-4" />
              </Button>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(product)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(product)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">SKU</p>
                <p className="font-medium">{product.sku}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Categoría</p>
                <p className="font-medium">{product.categoryName || 'Sin categoría'}</p>
              </div>
            </div>

            {product.description && (
              <div>
                <p className="text-sm text-gray-600">Descripción</p>
                <p className="text-sm">{product.description}</p>
              </div>
            )}

            {/* Variantes de peso */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Variantes de Peso</h4>
                <Badge variant="outline">{variants.length} variantes</Badge>
              </div>

              {showDetails && (
                <div className="space-y-2">
                  {isLoading ? (
                    <p className="text-sm text-gray-500">Cargando variantes...</p>
                  ) : variants.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay variantes configuradas</p>
                  ) : (
                    variants.map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">
                            {variant.weight} {variant.unit}
                          </Badge>
                          <span className="text-sm font-medium">{variant.label}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Precio: </span>
                            <span className="font-medium">{formatCurrency(parseFloat(variant.price))}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Costo: </span>
                            <span className="font-medium">{formatCurrency(parseFloat(variant.cost))}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Utilidad: </span>
                            <span className="font-medium text-green-600">
                              {calculateUtility(parseFloat(variant.price), parseFloat(variant.cost)).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {!showDetails && variants.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {variants.slice(0, 3).map((variant) => (
                    <Badge key={variant.id} variant="secondary" className="text-xs">
                      {variant.label}: {formatCurrency(parseFloat(variant.price))}
                    </Badge>
                  ))}
                  {variants.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{variants.length - 3} más
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Estado */}
            <div className="flex items-center justify-between">
              <Badge
                variant={product.status === 'active' ? 'default' : 'destructive'}
                className={product.status === 'active' ? 'bg-green-100 text-green-800' : ''}
              >
                {product.status === 'active' ? 'Activo' : 'Inactivo'}
              </Badge>
              <div className="text-sm text-gray-600">
                Stock total: {formatStock(product.stock)} {product.unitType}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Modal variant
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold">{product.name}</h2>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Producto Conjunto
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-2">Información General</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">SKU:</span>
              <span className="font-medium">{product.sku}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Categoría:</span>
              <span className="font-medium">{product.categoryName || 'Sin categoría'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unidad:</span>
              <span className="font-medium">{product.unitType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estado:</span>
              <Badge
                variant={product.status === 'active' ? 'default' : 'destructive'}
                className={product.status === 'active' ? 'bg-green-100 text-green-800' : ''}
              >
                {product.status === 'active' ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Stock y Inventario</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Stock total:</span>
              <span className="font-medium">{formatStock(product.stock)} {product.unitType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Stock mínimo:</span>
              <span className="font-medium">{formatStock(product.minStock)} {product.unitType}</span>
            </div>
          </div>
        </div>
      </div>

      {product.description && (
        <div>
          <h3 className="font-medium mb-2">Descripción</h3>
          <p className="text-gray-700">{product.description}</p>
        </div>
      )}

      <div>
        <h3 className="font-medium mb-4">Variantes de Peso</h3>
        {isLoading ? (
          <p className="text-gray-500">Cargando variantes...</p>
        ) : variants.length === 0 ? (
          <p className="text-gray-500">No hay variantes configuradas</p>
        ) : (
          <div className="space-y-3">
            {variants.map((variant) => (
              <Card key={variant.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-sm">
                      {variant.weight} {variant.unit}
                    </Badge>
                    <span className="font-medium">{variant.label}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-600">Precio: </span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(parseFloat(variant.price))}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Costo: </span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(parseFloat(variant.cost))}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Utilidad: </span>
                      <span className="font-medium text-blue-600">
                        {calculateUtility(parseFloat(variant.price), parseFloat(variant.cost)).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}