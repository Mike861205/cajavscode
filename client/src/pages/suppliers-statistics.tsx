import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  Trophy,
  BarChart3,
  PieChart
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";

interface Supplier {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface SuppliersStatistics {
  globalStats: {
    totalSuppliers: number;
    totalPurchases: number;
    totalAmount: number;
    totalProducts: number;
  };
  supplierStats: Array<{
    supplierId: number;
    supplierName: string;
    totalPurchases: number;
    totalAmount: number;
    totalProducts: number;
    averageOrderValue: number;
    rank: number;
  }>;
  purchasesChart: Array<{
    date: string;
    suppliers: Array<{
      supplierId: number;
      supplierName: string;
      amount: number;
    }>;
  }>;
  topProducts: Array<{
    productId: number;
    productName: string;
    totalQuantity: number;
    totalAmount: number;
    supplierBreakdown: Array<{
      supplierId: number;
      supplierName: string;
      quantity: number;
      amount: number;
    }>;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function SuppliersStatistics() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedSupplier, setSelectedSupplier] = useState("all");

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (selectedPeriod) {
      case "week":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 1);
    }
    
    return { startDate, endDate };
  }, [selectedPeriod]);

  // Fetch suppliers for filter
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  // Fetch suppliers statistics
  const { data: statistics, isLoading } = useQuery<SuppliersStatistics>({
    queryKey: ['/api/suppliers/statistics', selectedPeriod, selectedSupplier, dateRange.startDate, dateRange.endDate],
    queryFn: () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      });
      
      if (selectedSupplier !== "all") {
        params.append('supplierId', selectedSupplier);
      }
      
      return fetch(`/api/suppliers/statistics?${params}`).then(res => res.json());
    },
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!statistics?.purchasesChart) return [];
    
    return statistics.purchasesChart.map(day => {
      const result: any = { date: day.date };
      day.suppliers.forEach(supplier => {
        if (supplier.amount > 0) {
          result[supplier.supplierName] = supplier.amount;
        }
      });
      return result;
    }).filter(day => {
      // Only include days with actual purchases
      return Object.keys(day).length > 1;
    });
  }, [statistics]);

  // Prepare ranking data for chart
  const rankingData = useMemo(() => {
    if (!statistics?.supplierStats) return [];
    
    return statistics.supplierStats
      .slice(0, 5) // Top 5 suppliers
      .map(supplier => ({
        name: supplier.supplierName,
        amount: supplier.totalAmount,
        purchases: supplier.totalPurchases,
        avgOrder: supplier.averageOrderValue
      }));
  }, [statistics]);

  // Prepare profitability data for pie chart
  const profitabilityData = useMemo(() => {
    if (!statistics?.supplierStats) return [];
    
    return statistics.supplierStats
      .filter(supplier => supplier.totalAmount > 0)
      .slice(0, 6)
      .map((supplier, index) => ({
        name: supplier.supplierName,
        value: supplier.totalAmount,
        color: COLORS[index % COLORS.length],
        percentage: statistics.globalStats.totalAmount > 0 
          ? ((supplier.totalAmount / statistics.globalStats.totalAmount) * 100).toFixed(1)
          : '0'
      }));
  }, [statistics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard de Proveedores</h2>
          <p className="text-muted-foreground">
            Análisis completo de compras y proveedores
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            {selectedPeriod === "week" && "Esta Semana"}
            {selectedPeriod === "month" && "Este Mes"}
            {selectedPeriod === "quarter" && "Este Trimestre"}
            {selectedPeriod === "year" && "Este Año"}
          </Button>
        </div>
      </div>

      {/* Period and Supplier Filters */}
      <div className="flex gap-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mes</SelectItem>
            <SelectItem value="quarter">Este Trimestre</SelectItem>
            <SelectItem value="year">Este Año</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los proveedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proveedores</SelectItem>
            {suppliers.map(supplier => (
              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Global Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statistics?.globalStats.totalSuppliers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Proveedores registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${statistics?.globalStats.totalAmount.toLocaleString() || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Monto total invertido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Totales</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {statistics?.globalStats.totalPurchases || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Compras realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Compra</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${statistics?.globalStats.totalPurchases > 0 
                ? (statistics.globalStats.totalAmount / statistics.globalStats.totalPurchases).toLocaleString('en-US', { maximumFractionDigits: 2 })
                : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Ticket promedio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Suppliers by Purchases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Proveedores por Compras
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Mayor a Menor
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {statistics?.supplierStats && statistics.supplierStats.length > 0 ? (
              <div className="space-y-4">
                {statistics.supplierStats.slice(0, 5).map((supplier, index) => (
                  <div key={supplier.supplierId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{supplier.supplierName}</p>
                        <p className="text-sm text-muted-foreground">
                          {supplier.totalPurchases} órdenes • ${supplier.averageOrderValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} promedio
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${supplier.totalAmount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{supplier.totalProducts} productos</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No hay datos de proveedores disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Products Most Purchased */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Productos Más Comprados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statistics?.topProducts && statistics.topProducts.length > 0 ? (
              <div className="space-y-3">
                {statistics.topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.productId} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                    <div className="flex-1">
                      <p className="font-medium truncate">{product.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.totalQuantity} unidades • {product.supplierBreakdown.length} proveedores
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-green-600">${product.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No hay datos de productos disponibles</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Supplier Ranking Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Ranking de Proveedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rankingData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'amount' ? `$${value.toLocaleString()}` : value,
                    name === 'amount' ? 'Monto Total' : 
                    name === 'purchases' ? 'Compras' : 'Promedio por Orden'
                  ]}
                />
                <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Supplier Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-500" />
              Distribución de Compras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={profitabilityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  labelLine={false}
                >
                  {profitabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, 'Monto']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Tendencia de Compras por Proveedor
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Evolución de compras en el período seleccionado
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
              />
              <YAxis fontSize={12} tickFormatter={(value) => `$${value.toLocaleString()}`} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                formatter={(value: any, name: string) => [`$${value.toLocaleString()}`, name]}
              />
              <Legend />
              {statistics?.supplierStats.slice(0, 5).map((supplier, index) => (
                <Line
                  key={supplier.supplierId}
                  type="monotone"
                  dataKey={supplier.supplierName}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}