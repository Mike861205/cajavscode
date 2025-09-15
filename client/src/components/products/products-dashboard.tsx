import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, 
  TrendingUp, 
  DollarSign,
  ShoppingCart,
  Filter,
  Calendar,
  Store
} from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface InventoryMetrics {
  totalStock: number;
  totalCostValue: number;
  totalSaleValue: number;
  profitPercentage: number;
}

interface TopProduct {
  id: number;
  name: string;
  soldQuantity: number;
  revenue: number;
}

export default function ProductsDashboard() {
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<string>("");

  // Fetch unified inventory statistics (same as products list and inventory dashboard)
  const { data: unifiedStats, isLoading: unifiedLoading } = useQuery({
    queryKey: ['/api/inventory/unified-stats'],
    queryFn: async () => {
      const response = await fetch('/api/inventory/unified-stats');
      if (!response.ok) throw new Error('Failed to fetch unified stats');
      return response.json();
    }
  });

  // Fetch products data
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Fetch warehouses data
  const { data: warehouses = [] } = useQuery({
    queryKey: ["/api/warehouses"],
  });

  // Fetch real top products data
  const { data: topProductsData = [], isLoading: topProductsLoading } = useQuery({
    queryKey: ["/api/dashboard/top-products"],
  });

  // Use unified statistics for consistency across all modules
  const inventoryMetrics: InventoryMetrics = useMemo(() => {
    if (!unifiedStats) return {
      totalStock: 0,
      totalCostValue: 0,
      totalSaleValue: 0,
      profitPercentage: 0
    };

    return {
      totalStock: unifiedStats.stockTotal || 0,
      totalCostValue: unifiedStats.valueTotalCostos || 0,
      totalSaleValue: unifiedStats.valueTotalVenta || 0,
      profitPercentage: unifiedStats.utilidadTotal || 0
    };
  }, [unifiedStats]);

  // Transform API data to match component interface and sort by revenue
  const topProducts: TopProduct[] = useMemo(() => {
    if (!topProductsData || !Array.isArray(topProductsData)) return [];
    
    return topProductsData
      .map(product => ({
        id: product.productId,
        name: product.productName,
        soldQuantity: product.totalQuantity,
        revenue: product.totalRevenue
      }))
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 20);
  }, [topProductsData]);

  // Chart configuration for top products
  const chartData = {
    labels: topProducts.map(p => p.name),
    datasets: [
      {
        label: 'Cantidad Vendida',
        data: topProducts.map(p => p.soldQuantity),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Top 20 Productos Más Vendidos',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estadísticas de Inventario</h1>
          <p className="text-gray-600 mt-1">Análisis de stock, costos y ventas de productos</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Package className="mr-2 h-4 w-4" />
                Producto
              </label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los productos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los productos</SelectItem>
                  {Array.isArray(products) ? products.map((product: any) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Fecha Inicio
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                Fecha Fin
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Store className="mr-2 h-4 w-4" />
                Tienda
              </label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las tiendas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tiendas</SelectItem>
                  {Array.isArray(warehouses) ? warehouses.map((warehouse: any) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Total</p>
                {unifiedLoading ? (
                  <div className="animate-pulse h-8 bg-gray-200 rounded mt-2"></div>
                ) : (
                  <p className="text-3xl font-bold text-blue-600">{inventoryMetrics.totalStock.toLocaleString()}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">unidades</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total Costos</p>
                {unifiedLoading ? (
                  <div className="animate-pulse h-8 bg-gray-200 rounded mt-2"></div>
                ) : (
                  <p className="text-3xl font-bold text-red-600">${inventoryMetrics.totalCostValue.toFixed(2)}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">inversión en inventario</p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total Venta</p>
                {unifiedLoading ? (
                  <div className="animate-pulse h-8 bg-gray-200 rounded mt-2"></div>
                ) : (
                  <p className="text-3xl font-bold text-green-600">${inventoryMetrics.totalSaleValue.toFixed(2)}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">potencial de ventas</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">% Utilidad Total</p>
                {unifiedLoading ? (
                  <div className="animate-pulse h-8 bg-gray-200 rounded mt-2"></div>
                ) : (
                  <p className="text-3xl font-bold text-purple-600">{inventoryMetrics.profitPercentage.toFixed(1)}%</p>
                )}
                <p className="text-xs text-gray-500 mt-1">margen promedio</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 20 Products Modern List */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <TrendingUp className="h-7 w-7 text-blue-600" />
            Top 20 Productos Más Vendidos
          </CardTitle>
          <p className="text-gray-600 mt-2">Ranking por ingresos generados</p>
        </CardHeader>
        <CardContent>
          {topProductsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts
                .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
                .slice(0, 20)
                .map((product, index) => (
                <div
                  key={product.id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1"
                >
                  {/* Gradient accent line */}
                  <div className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${
                    index === 0 
                      ? 'from-yellow-400 to-orange-500' 
                      : index === 1 
                        ? 'from-gray-400 to-gray-600'
                        : index === 2
                          ? 'from-orange-400 to-red-500'
                          : 'from-blue-400 to-blue-600'
                  }`}></div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Ranking Badge */}
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-lg shadow-lg ${
                        index === 0 
                          ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                          : index === 1 
                            ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                            : index === 2
                              ? 'bg-gradient-to-br from-orange-400 to-red-500'
                              : 'bg-gradient-to-br from-blue-500 to-blue-600'
                      }`}>
                        #{index + 1}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-gray-600 flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {product.soldQuantity?.toLocaleString() || 0} vendidos
                          </span>
                          {product.revenue && (
                            <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                              Promedio: ${(product.revenue / (product.soldQuantity || 1)).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Revenue Display */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        ${(product.revenue || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-gray-500">en ingresos</div>
                    </div>
                  </div>

                  {/* Success indicators for top 3 */}
                  {index < 3 && (
                    <div className="absolute top-3 right-3">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                      } animate-pulse`}></div>
                    </div>
                  )}
                </div>
              ))}

              {/* Summary Section */}
              {topProducts.length > 0 && (
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Resumen del Top 20
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700">
                        {topProducts.reduce((sum, p) => sum + (p.soldQuantity || 0), 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-blue-600">Total Unidades</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700">
                        ${topProducts.reduce((sum, p) => sum + (p.revenue || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-green-600">Ingresos Totales</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-700">
                        ${(topProducts.reduce((sum, p) => sum + (p.revenue || 0), 0) / Math.max(topProducts.reduce((sum, p) => sum + (p.soldQuantity || 0), 0), 1)).toFixed(2)}
                      </div>
                      <div className="text-sm text-purple-600">Precio Promedio</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No hay datos de ventas para mostrar</p>
                <p className="text-sm mt-2">Ajusta los filtros o realiza algunas ventas primero</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Performance Table */}
      {topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Productos Top</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Producto</th>
                    <th className="text-right p-4">Cantidad Vendida</th>
                    <th className="text-right p-4">Ingresos</th>
                    <th className="text-right p-4">% del Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => {
                    const totalRevenue = topProducts.reduce((sum, p) => sum + p.revenue, 0);
                    const percentage = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
                    
                    return (
                      <tr key={product.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                              #{index + 1}
                            </span>
                            {product.name}
                          </div>
                        </td>
                        <td className="text-right p-4 font-medium">{product.soldQuantity.toLocaleString()}</td>
                        <td className="text-right p-4 font-medium text-green-600">${product.revenue.toFixed(2)}</td>
                        <td className="text-right p-4">{percentage.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}