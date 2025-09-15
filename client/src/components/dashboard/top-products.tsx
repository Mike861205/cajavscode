import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, DollarSign, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/contexts/DateRangeContext";

interface TopProduct {
  productId: number;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
  averagePrice: number;
}

export default function TopProducts() {
  const { 
    dateRangeType, 
    startDate, 
    endDate, 
    isCustomRange,
    getTimezoneAwareDates
  } = useDateRange();

  const buildTopProductsUrl = () => {
    const params = new URLSearchParams();
    params.append('dateRangeType', dateRangeType);
    
    // Use timezone-aware dates
    const { startDate: tzStartDate, endDate: tzEndDate } = getTimezoneAwareDates();
    params.append('startDate', tzStartDate);
    params.append('endDate', tzEndDate);
    
    return `/api/dashboard/top-products?${params.toString()}`;
  };

  const { data: topProducts = [], isLoading } = useQuery<TopProduct[]>({
    queryKey: [buildTopProductsUrl(), dateRangeType, startDate, endDate],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatQuantity = (quantity: number) => {
    return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(2);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Top 10 Productos Más Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (topProducts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Top 10 Productos Más Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No hay datos de ventas disponibles</p>
            <p className="text-sm">Las ventas aparecerán aquí una vez que proceses transacciones</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Top 10 Productos Más Vendidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div
              key={product.productId}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <Badge 
                    variant={index < 3 ? "default" : "secondary"}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${index === 0 ? 'bg-yellow-500 text-white' : ''}
                      ${index === 1 ? 'bg-gray-400 text-white' : ''}
                      ${index === 2 ? 'bg-orange-500 text-white' : ''}
                    `}
                  >
                    #{index + 1}
                  </Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {product.productName}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span>{formatQuantity(product.totalQuantity)} vendidos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>Promedio: {formatCurrency(product.averagePrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-bold text-green-600">
                      {formatCurrency(product.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-blue-600" />
                    <span className="text-sm text-blue-600 font-medium">
                      +{formatCurrency(product.totalProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {topProducts.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <div className="font-semibold mb-2">📊 Resumen de Ventas</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Total Vendido:</span>
                  <div className="text-lg font-bold text-blue-900">
                    {formatCurrency(topProducts.reduce((sum, p) => sum + p.totalRevenue, 0))}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Utilidad Total:</span>
                  <div className="text-lg font-bold text-green-700">
                    {formatCurrency(topProducts.reduce((sum, p) => sum + p.totalProfit, 0))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}