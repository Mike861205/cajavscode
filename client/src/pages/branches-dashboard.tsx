import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart,
  Package,
  Calendar,
  Filter,
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

interface BranchesStatistics {
  globalStats: {
    totalSales: number;
    totalPurchases: number;
    totalProfit: number;
    totalTransactions: number;
  };
  warehouseStats: Array<{
    warehouseId: number;
    warehouseName: string;
    totalSales: number;
    totalPurchases: number;
    totalProfit: number;
    totalTransactions: number;
    profitability: number;
    rank: number;
  }>;
  salesChart: Array<{
    date: string;
    warehouses: Array<{
      warehouseId: number;
      warehouseName: string;
      amount: number;
    }>;
  }>;
  topProducts: Array<{
    productId: number;
    productName: string;
    totalSold: number;
    totalRevenue: number;
    warehouseBreakdown: Array<{
      warehouseId: number;
      warehouseName: string;
      quantity: number;
      revenue: number;
    }>;
  }>;
}

interface Warehouse {
  id: number;
  name: string;
  tenantId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function BranchesDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");

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

  // Fetch warehouses for filter
  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ['/api/warehouses'],
  });

  // Fetch branches statistics
  const { data: statistics, isLoading } = useQuery<BranchesStatistics>({
    queryKey: [
      '/api/branches/statistics',
      selectedPeriod,
      selectedWarehouse !== "all" ? selectedWarehouse : undefined,
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString()
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      });
      
      if (selectedWarehouse !== "all") {
        params.append('warehouseId', selectedWarehouse);
      }
      
      const response = await fetch(`/api/branches/statistics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch branches statistics');
      }
      return response.json();
    }
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare chart data
  const salesChartData = useMemo(() => {
    if (!statistics?.salesChart) return [];
    
    return statistics.salesChart.map(day => {
      const dataPoint: any = { date: new Date(day.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) };
      
      day.warehouses.forEach(warehouse => {
        dataPoint[warehouse.warehouseName] = warehouse.amount;
      });
      
      return dataPoint;
    });
  }, [statistics?.salesChart]);

  // Prepare warehouse comparison data
  const warehouseComparisonData = useMemo(() => {
    if (!statistics?.warehouseStats) return [];
    
    return statistics.warehouseStats.map(warehouse => ({
      name: warehouse.warehouseName,
      ventas: warehouse.totalSales,
      compras: warehouse.totalPurchases,
      ganancia: warehouse.totalProfit,
      rentabilidad: warehouse.profitability
    }));
  }, [statistics?.warehouseStats]);

  // Prepare profitability pie chart data
  const profitabilityData = useMemo(() => {
    if (!statistics?.warehouseStats) return [];
    
    return statistics.warehouseStats
      .filter(warehouse => warehouse.totalSales > 0)
      .map(warehouse => ({
        name: warehouse.warehouseName,
        value: warehouse.totalSales,
        profitability: warehouse.profitability
      }));
  }, [statistics?.warehouseStats]);

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
      <div className="bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-700 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-4xl font-bold tracking-tight mb-2">Dashboard de Sucursales</h2>
            <p className="text-lg opacity-90">
              Análisis estadístico y rendimiento de almacenes
            </p>
          </div>
          <div className="flex gap-3">
            <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 backdrop-blur-sm px-6 py-3 text-lg">
              <Calendar className="h-5 w-5 mr-2" />
              {selectedPeriod === "week" && "Esta Semana"}
              {selectedPeriod === "month" && "Este Mes"}
              {selectedPeriod === "quarter" && "Este Trimestre"}
              {selectedPeriod === "year" && "Este Año"}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mes</SelectItem>
                  <SelectItem value="quarter">Este Trimestre</SelectItem>
                  <SelectItem value="year">Este Año</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Almacén</label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Almacenes</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modern Statistics Cards with Gradients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 border-0 shadow-2xl text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Ventas Totales</CardTitle>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              ${(statistics?.globalStats.totalSales || 0).toLocaleString()}
            </div>
            <p className="text-sm opacity-80">
              +12% desde el período anterior
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <DollarSign className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-2xl text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Compras Totales</CardTitle>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              ${(statistics?.globalStats.totalPurchases || 0).toLocaleString()}
            </div>
            <p className="text-sm opacity-80">
              +8% desde el período anterior
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <ShoppingCart className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-0 shadow-2xl text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Utilidad Total</CardTitle>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              ${(statistics?.globalStats.totalProfit || 0).toLocaleString()}
            </div>
            <p className="text-sm opacity-80">
              +15% desde el período anterior
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <TrendingUp className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 border-0 shadow-2xl text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Transacciones</CardTitle>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Package className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              {statistics?.globalStats.totalTransactions || 0}
            </div>
            <p className="text-sm opacity-80">
              +5% desde el período anterior
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <Package className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Charts and Analytics with Colorful Tabs */}
      <Tabs defaultValue="comparison" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-2 rounded-xl shadow-lg">
          <TabsTrigger value="comparison" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:scale-105 rounded-lg px-4 py-3">
            <BarChart3 className="h-5 w-5 mr-2" />
            <span className="font-medium">Comparativo por Almacén</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:scale-105 rounded-lg px-4 py-3">
            <TrendingUp className="h-5 w-5 mr-2" />
            <span className="font-medium">Tendencias de Ventas</span>
          </TabsTrigger>
          <TabsTrigger value="profitability" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:scale-105 rounded-lg px-4 py-3">
            <PieChart className="h-5 w-5 mr-2" />
            <span className="font-medium">Rentabilidad</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:scale-105 rounded-lg px-4 py-3">
            <Trophy className="h-5 w-5 mr-2" />
            <span className="font-medium">Top Productos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comparison">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Comparativo por Almacén
              </CardTitle>
              <CardDescription className="text-white/90">
                Rendimiento de ventas, compras y ganancias por almacén
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={warehouseComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="ventas" fill="url(#ventasGradient)" name="Ventas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="compras" fill="url(#comprasGradient)" name="Compras" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ganancia" fill="url(#gananciaGradient)" name="Ganancia" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.7}/>
                    </linearGradient>
                    <linearGradient id="comprasGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.7}/>
                    </linearGradient>
                    <linearGradient id="gananciaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0.7}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-t-lg">
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Tendencias de Ventas por Almacén
              </CardTitle>
              <CardDescription className="text-white/90">
                Evolución de las ventas en el tiempo por almacén
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Legend />
                  {warehouses.map((warehouse, index) => (
                    <Line
                      key={warehouse.id}
                      type="monotone"
                      dataKey={warehouse.name}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={4}
                      dot={{ r: 6, strokeWidth: 2 }}
                      activeDot={{ r: 8, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profitability">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-t-lg">
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChart className="h-6 w-6" />
                  Distribución de Ventas
                </CardTitle>
                <CardDescription className="text-white/90">
                  Participación de cada almacén en las ventas totales
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={profitabilityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {profitabilityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ventas']}
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

            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="h-6 w-6" />
                  Ranking de Rentabilidad
                </CardTitle>
                <CardDescription className="text-white/90">
                  Almacenes ordenados por rentabilidad
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {statistics?.warehouseStats
                    .sort((a, b) => b.profitability - a.profitability)
                    .map((warehouse, index) => (
                      <div key={warehouse.warehouseId} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 border-l-4"
                           style={{ borderLeftColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32' }}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg
                            ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 
                              index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' : 
                              'bg-gradient-to-br from-orange-400 to-orange-600'}`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-bold text-lg">{warehouse.warehouseName}</p>
                            <p className="text-sm text-muted-foreground">
                              ${warehouse.totalSales.toLocaleString()} en ventas
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`px-4 py-2 rounded-full text-white font-bold text-lg ${
                            warehouse.profitability > 20 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                            warehouse.profitability > 10 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            warehouse.profitability > 0 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                            'bg-gradient-to-r from-red-500 to-red-700'
                          }`}>
                            {warehouse.profitability.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-6 w-6" />
                Top Productos por Almacén
              </CardTitle>
              <CardDescription className="text-white/90">
                Productos más vendidos y su distribución por almacén
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {statistics?.topProducts.map((product, index) => (
                  <div key={product.productId} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border-l-4 overflow-hidden"
                       style={{ borderLeftColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#64748B' }}>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg
                            ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 
                              index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' : 
                              index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                              'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-xl">{product.productName}</h4>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold">{product.totalSold} unidades vendidas</span> • <span className="text-green-600 font-bold">${product.totalRevenue.toLocaleString()}</span> en ingresos
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {product.warehouseBreakdown.map((warehouse) => (
                          <div key={warehouse.warehouseId} className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 p-4 rounded-lg shadow-md">
                            <p className="font-bold text-lg">{warehouse.warehouseName}</p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-semibold">{warehouse.quantity} unidades</span> • <span className="text-green-600 font-bold">${warehouse.revenue.toLocaleString()}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}