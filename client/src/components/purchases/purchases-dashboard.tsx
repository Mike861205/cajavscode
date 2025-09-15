import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  DollarSign, 
  Package, 
  TrendingUp,
  Calendar,
  BarChart3,
  PieChart,
  Users,
  Activity,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface PurchaseStats {
  totalPurchases: number;
  totalAmount: number;
  averagePurchase: number;
  totalProducts: number;
}

interface ChartData {
  date: string;
  amount: number;
}

interface TopProduct {
  id: number;
  name: string;
  totalQuantity: number;
  totalAmount: number;
  averagePrice: number;
}

export default function PurchasesDashboard() {
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('month');

  // Fetch purchase statistics
  const { data: stats, isLoading: statsLoading } = useQuery<PurchaseStats>({
    queryKey: ["/api/purchases/stats"],
  });

  // Fetch chart data
  const { data: chartData, isLoading: chartLoading } = useQuery<ChartData[]>({
    queryKey: ["/api/purchases/chart", chartPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/purchases/chart?period=${chartPeriod}`);
      if (!res.ok) throw new Error("Failed to fetch chart data");
      return res.json();
    },
  });

  // Fetch top purchased products
  const { data: topProducts, isLoading: topProductsLoading } = useQuery<TopProduct[]>({
    queryKey: ["/api/purchases/top-products"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/top-products?limit=20");
      if (!res.ok) throw new Error("Failed to fetch top products");
      return res.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'day': return 'Últimos 7 días';
      case 'week': return 'Últimas 12 semanas';
      case 'month': return 'Últimos 12 meses';
      default: return 'Período';
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-slate-50 to-gray-100 min-h-screen">
      {/* Modern Header with Gradient Background */}
      <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-black opacity-10 rounded-2xl"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard de Compras</h1>
            <p className="text-blue-100 text-lg">Análisis avanzado de compras y productos</p>
          </div>
          <div className="flex items-center gap-3 bg-white/20 rounded-full px-6 py-3 backdrop-blur-sm">
            <Activity className="h-6 w-6 text-white" />
            <span className="text-white font-medium">
              Análisis en Tiempo Real
            </span>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold text-blue-800">Total Compras</CardTitle>
            <div className="bg-blue-600 p-2 rounded-full">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-1">{stats?.totalPurchases || 0}</div>
            <div className="flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-green-600" />
              <p className="text-xs text-blue-700 font-medium">
                Compras realizadas
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold text-green-800">Monto Total</CardTitle>
            <div className="bg-green-600 p-2 rounded-full">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-1">
              {formatCurrency(stats?.totalAmount || 0)}
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-700 font-medium">
                Invertido en compras
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold text-orange-800">Promedio Compra</CardTitle>
            <div className="bg-orange-600 p-2 rounded-full">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900 mb-1">
              {formatCurrency(stats?.averagePurchase || 0)}
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-orange-600" />
              <p className="text-xs text-orange-700 font-medium">
                Por compra realizada
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold text-purple-800">Productos Comprados</CardTitle>
            <div className="bg-purple-600 p-2 rounded-full">
              <Package className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-1">{stats?.totalProducts || 0}</div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-purple-600" />
              <p className="text-xs text-purple-700 font-medium">
                Unidades totales
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Chart Section */}
        <Card className="col-span-1 bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="bg-white/20 p-2 rounded-full">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                Tendencia de Compras
              </CardTitle>
              <Select value={chartPeriod} onValueChange={(value: 'day' | 'week' | 'month') => setChartPeriod(value)}>
                <SelectTrigger className="w-44 bg-white/20 border-white/30 text-white">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Últimos 7 días</SelectItem>
                  <SelectItem value="week">12 semanas</SelectItem>
                  <SelectItem value="month">12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-indigo-100 mt-2">{getPeriodLabel(chartPeriod)}</p>
          </CardHeader>
          <CardContent className="p-6">
            {chartLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip 
                    labelFormatter={(label) => `Fecha: ${label}`}
                    formatter={(value: any) => [formatCurrency(value), 'Monto']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      color: 'white'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#colorAmount)"
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Top Products Table */}
        <Card className="col-span-1 bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="bg-white/20 p-2 rounded-full">
                <PieChart className="h-6 w-6 text-white" />
              </div>
              Top 20 Productos Más Comprados
            </CardTitle>
            <p className="text-emerald-100 mt-2">Productos con mayor volumen de compra</p>
          </CardHeader>
          <CardContent className="p-0">
            {topProductsLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-800 py-4">Producto</TableHead>
                      <TableHead className="text-center font-semibold text-gray-800">Cantidad</TableHead>
                      <TableHead className="text-right font-semibold text-gray-800">Total Invertido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts?.slice(0, 20).map((product, index) => (
                      <TableRow key={product.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                              index < 3 
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                                : index < 10 
                                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                  : 'bg-gradient-to-r from-gray-400 to-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-900">{product.name}</span>
                              <p className="text-xs text-gray-500">
                                Precio promedio: {formatCurrency(product.averagePrice)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                            {product.totalQuantity} unidades
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="font-bold text-gray-900 text-lg">
                            {formatCurrency(product.totalAmount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {((product.totalAmount / (stats?.totalAmount || 1)) * 100).toFixed(1)}% del total
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
              Análisis Temporal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Compras este mes:</span>
              <span className="font-medium">
                {chartData?.reduce((sum, item) => sum + item.amount, 0)?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Promedio por período:</span>
              <span className="font-medium">
                {formatCurrency((chartData?.reduce((sum, item) => sum + item.amount, 0) || 0) / (chartData?.length || 1))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-green-600" />
              Eficiencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Productos únicos:</span>
              <span className="font-medium">{topProducts?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Precio promedio:</span>
              <span className="font-medium">
                {formatCurrency((topProducts?.reduce((sum, p) => sum + p.averagePrice, 0) || 0) / (topProducts?.length || 1))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Valor por producto:</span>
              <span className="font-medium">
                {formatCurrency((stats?.totalAmount || 0) / (stats?.totalProducts || 1))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ROI estimado:</span>
              <span className="font-medium text-green-600">+15%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}