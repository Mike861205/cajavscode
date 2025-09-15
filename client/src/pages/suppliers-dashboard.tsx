import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Truck, 
  Users, 
  ShoppingCart, 
  DollarSign,
  TrendingUp,
  Package,
  Trophy,
  BarChart3,
  PieChart
} from "lucide-react";
import { Link } from "wouter";
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

export default function SuppliersDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("all");
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
      case "all":
        // Show all data - set a very early start date
        startDate.setFullYear(2020, 0, 1);
        break;
      default:
        // Default to "all" to ensure we see all data
        startDate.setFullYear(2020, 0, 1);
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
      
      return fetch(`/api/suppliers/statistics?${params}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        });
    },
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
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
      {/* Modern Header with Gradient Background */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-4xl font-bold tracking-tight mb-2">Dashboard de Proveedores</h2>
            <p className="text-lg opacity-90">
              Análisis completo de compras y proveedores
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/suppliers/register">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 backdrop-blur-sm px-6 py-3 text-lg">
                <Plus className="mr-2 h-5 w-5" />
                Nuevo Proveedor
              </Button>
            </Link>
          </div>
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

      {/* Modern Statistics Cards with Gradients */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-2xl text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Proveedores</CardTitle>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              {statistics?.globalStats.totalSuppliers || 0}
            </div>
            <p className="text-sm opacity-80">
              Proveedores registrados
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <Users className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 border-0 shadow-2xl text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Compras</CardTitle>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              ${statistics?.globalStats.totalAmount.toLocaleString() || '0.00'}
            </div>
            <p className="text-sm opacity-80">
              Monto total invertido
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <DollarSign className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 border-0 shadow-2xl text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Órdenes Totales</CardTitle>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Package className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              {statistics?.globalStats.totalPurchases || 0}
            </div>
            <p className="text-sm opacity-80">
              Compras realizadas
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <Package className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-0 shadow-2xl text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Promedio por Compra</CardTitle>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              ${statistics?.globalStats.totalPurchases > 0 
                ? (statistics.globalStats.totalAmount / statistics.globalStats.totalPurchases).toLocaleString('en-US', { maximumFractionDigits: 2 })
                : '0.00'}
            </div>
            <p className="text-sm opacity-80">
              Ticket promedio
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <TrendingUp className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Suppliers by Purchases */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-t-lg">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <Trophy className="h-6 w-6" />
                Top Proveedores por Compras
              </CardTitle>
              <p className="text-sm opacity-90 mt-1">
                Mayor a Menor
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {statistics?.supplierStats && statistics.supplierStats.length > 0 ? (
              <div className="space-y-4">
                {statistics.supplierStats.slice(0, 5).map((supplier, index) => (
                  <div key={supplier.supplierId} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border-l-4" 
                       style={{ borderLeftColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#6B7280' }}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg
                        ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 
                          index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' : 
                          index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 
                          'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{supplier.supplierName}</p>
                        <p className="text-sm text-muted-foreground">
                          {supplier.totalPurchases} órdenes • ${supplier.averageOrderValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} promedio
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-2xl text-green-600">${supplier.totalAmount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{supplier.totalProducts} productos</p>
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
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-white">
              <Package className="h-6 w-6" />
              Productos Más Comprados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {statistics?.topProducts && statistics.topProducts.length > 0 ? (
              <div className="space-y-4">
                {statistics.topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.productId} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg truncate">{product.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.totalQuantity} unidades • {product.supplierBreakdown.length} proveedores
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-2xl text-green-600">${product.totalAmount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground text-lg">No hay datos de productos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Supplier Ranking Chart */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="h-6 w-6" />
              Ranking de Proveedores
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
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
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Bar 
                  dataKey="amount" 
                  fill="url(#colorGradient)" 
                  radius={[8, 8, 0, 0]}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.7}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Supplier Distribution Pie Chart */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-white">
              <PieChart className="h-6 w-6" />
              Distribución de Compras
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={profitabilityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  labelLine={false}
                >
                  {profitabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'Monto']}
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
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

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <Link href="/dashboard/suppliers/register">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Registrar Proveedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Añade un nuevo proveedor a tu sistema
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <Link href="/dashboard/suppliers/list">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Ver Proveedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Consulta y gestiona tus proveedores
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <Link href="/dashboard/purchases/add">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Nueva Compra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Registra una nueva compra a proveedores
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}