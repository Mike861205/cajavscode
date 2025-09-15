import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  CheckCircle,
  MinusCircle,
  PlusCircle,
  Calendar,
  Users,
  Building,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Zap
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface InventoryStats {
  totalInventories: number;
  totalVariances: number;
  totalProducts: number;
  totalShrinkage: number;
  variancesByType: {
    exacto: number;
    faltante: number;
    sobrante: number;
  };
  financialImpact: {
    faltanteCost: number;
    sobranteCost: number;
    mermaCost: number;
    netBalance: number;
  };
  topVarianceProducts: Array<{
    productId: number;
    productName: string;
    totalVariances: number;
    totalFaltantes: number;
    totalSobrantes: number;
    averageVariance: number;
    costImpact: number;
  }>;
  inventoryTrend: Array<{
    date: string;
    inventories: number;
    variances: number;
    shrinkage: number;
    costImpact: number;
  }>;
  userPerformance: Array<{
    userId: number;
    userName: string;
    inventories: number;
    accuracy: number;
    totalVariances: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function InventoryDashboard() {
  const [dateFilter, setDateFilter] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [userFilter, setUserFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  // Fetch unified inventory statistics (same as products list)
  const { data: unifiedStats, isLoading: unifiedLoading } = useQuery({
    queryKey: ['/api/inventory/unified-stats'],
    queryFn: async () => {
      const response = await fetch('/api/inventory/unified-stats');
      if (!response.ok) throw new Error('Failed to fetch unified stats');
      return response.json();
    }
  });

  // Fetch inventory statistics (for physical inventory records)
  const { data: stats, isLoading } = useQuery<InventoryStats>({
    queryKey: ['/api/inventory/stats', dateFilter, userFilter, branchFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        ...(userFilter !== 'all' && { userId: userFilter }),
        ...(branchFilter !== 'all' && { branchId: branchFilter })
      });
      
      const response = await fetch(`/api/inventory/stats?${params}`);
      if (!response.ok) throw new Error('Failed to fetch inventory stats');
      return response.json();
    }
  });

  // Quick date filters
  const setQuickFilter = (days: number) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    setDateFilter({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="container mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-16 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg">
              <BarChart3 className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Análisis de Inventario
              </h1>
              <p className="text-xl text-slate-600 mt-2">
                Dashboard inteligente de estadísticas, varianzas y tendencias
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8 bg-white/70 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Filter className="h-5 w-5 text-white" />
              </div>
              Filtros y Configuración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Fecha Inicio</Label>
                <Input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="border-slate-200 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Fecha Fin</Label>
                <Input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="border-slate-200 focus:border-blue-500"
                />
              </div>

              {/* Quick Filters */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Período Rápido</Label>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setQuickFilter(7)} className="text-xs">7d</Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickFilter(30)} className="text-xs">30d</Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickFilter(90)} className="text-xs">90d</Button>
                </div>
              </div>

              {/* User Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Usuario</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="border-slate-200 focus:border-blue-500">
                    <SelectValue placeholder="Todos los usuarios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Branch Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Sucursal</Label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="border-slate-200 focus:border-blue-500">
                    <SelectValue placeholder="Todas las sucursales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    <SelectItem value="principal">Sucursal Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Unified Statistics - Same as Products List */}
        {unifiedStats && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-blue-800 flex items-center gap-2">
                  <Package className="h-6 w-6" />
                  Estadísticas de Inventario
                  <Badge className="bg-blue-100 text-blue-800">Datos Unificados</Badge>
                </CardTitle>
                <p className="text-blue-600">Análisis de stock, costos y ventas de productos</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Stock Total */}
                  <Card className="bg-white border-blue-100 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        Stock Total
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-3xl font-bold text-blue-600">
                        {unifiedStats.stockTotal?.toLocaleString() || 0}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">unidades</p>
                    </CardContent>
                  </Card>

                  {/* Valor Total Costos */}
                  <Card className="bg-white border-red-100 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        Valor Total Costos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-3xl font-bold text-red-600">
                        ${unifiedStats.valueTotalCostos?.toFixed(2) || '0.00'}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">inversión en inventario</p>
                    </CardContent>
                  </Card>

                  {/* Valor Total Venta */}
                  <Card className="bg-white border-green-100 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        Valor Total Venta
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-3xl font-bold text-green-600">
                        ${unifiedStats.valueTotalVenta?.toFixed(2) || '0.00'}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">potencial de ventas</p>
                    </CardContent>
                  </Card>

                  {/* Utilidad Total */}
                  <Card className="bg-white border-purple-100 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        % Utilidad Total
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-3xl font-bold text-purple-600">
                        {unifiedStats.utilidadTotal?.toFixed(1) || 0}%
                      </div>
                      <p className="text-sm text-gray-500 mt-1">margen promedio</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Summary */}
                <div className="mt-6 pt-4 border-t border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <span className="text-sm text-gray-600">Total de Productos:</span>
                      <p className="text-lg font-semibold text-gray-800">{unifiedStats.totalProducts || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Utilidad Potencial:</span>
                      <p className="text-lg font-semibold text-gray-800">
                        ${((unifiedStats.valueTotalVenta || 0) - (unifiedStats.valueTotalCostos || 0)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">ROI Esperado:</span>
                      <p className="text-lg font-semibold text-gray-800">
                        {unifiedStats.valueTotalCostos > 0 ? 
                          (((unifiedStats.valueTotalVenta - unifiedStats.valueTotalCostos) / unifiedStats.valueTotalCostos) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Key Metrics for Physical Inventory Records */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Inventarios Realizados</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalInventories || 0}</div>
              <p className="text-xs opacity-80 mt-1">
                {stats?.totalProducts || 0} productos analizados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-500 border-0 shadow-xl text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Impacto Faltantes</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats?.financialImpact?.faltanteCost?.toFixed(2) || '0.00'}</div>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {stats?.variancesByType?.faltante || 0} productos
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-xl text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Productos Exactos</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.variancesByType?.exacto || 0}</div>
              <p className="text-xs opacity-80 mt-1">
                Sin varianzas detectadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 border-0 shadow-xl text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Balance Neto</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <MinusCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${(stats?.financialImpact?.netBalance || 0) >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                ${stats?.financialImpact?.netBalance?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs opacity-80 mt-1">
                Sobrantes - Faltantes - Mermas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500 to-blue-500 border-0 shadow-xl text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Impacto Sobrantes</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <PlusCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats?.financialImpact?.sobranteCost?.toFixed(2) || '0.00'}</div>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {stats?.variancesByType?.sobrante || 0} productos
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 border-0 shadow-xl text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Costo de Mermas</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <MinusCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats?.financialImpact?.mermaCost?.toFixed(2) || '0.00'}</div>
              <p className="text-xs opacity-80 mt-1">
                {stats?.totalShrinkage || 0} productos con merma
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <TabsTrigger value="trends" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              Tendencias
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              Productos
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="distribution" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
              Distribución
            </TabsTrigger>
          </TabsList>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  Tendencia de Inventarios y Varianzas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={stats?.inventoryTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: 'none', 
                        borderRadius: '12px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                      }} 
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="inventories" 
                      stroke="#3b82f6" 
                      name="Inventarios"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="variances" 
                      stroke="#f59e0b" 
                      name="Varianzas"
                      strokeWidth={3}
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="shrinkage" 
                      stroke="#ef4444" 
                      name="Mermas"
                      strokeWidth={3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  Productos con Más Varianzas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.topVarianceProducts?.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay datos de productos con varianzas</p>
                    </div>
                  ) : (
                    stats?.topVarianceProducts?.map((product, index) => (
                      <div key={product.productId} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900">{product.productName}</h4>
                            <p className="text-sm text-slate-600">
                              Promedio varianza: {product.averageVariance.toFixed(1)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0">
                            <TrendingDown className="h-3 w-3 mr-1" />
                            {product.totalFaltantes}
                          </Badge>
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {product.totalSobrantes}
                          </Badge>
                          <Badge variant="outline" className="border-slate-300">
                            Total: {product.totalVariances}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  Rendimiento por Usuario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats?.userPerformance || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="userName" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: 'none', 
                        borderRadius: '12px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                      }} 
                    />
                    <Bar dataKey="inventories" fill="url(#blueGradient)" name="Inventarios" radius={4} />
                    <Bar dataKey="accuracy" fill="url(#greenGradient)" name="Precisión %" radius={4} />
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1e40af" stopOpacity={0.8}/>
                      </linearGradient>
                      <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                      <PieChartIcon className="h-5 w-5 text-white" />
                    </div>
                    Distribución de Varianzas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Exactos', value: stats?.variancesByType?.exacto || 0, color: '#10b981' },
                          { name: 'Faltantes', value: stats?.variancesByType?.faltante || 0, color: '#ef4444' },
                          { name: 'Sobrantes', value: stats?.variancesByType?.sobrante || 0, color: '#3b82f6' }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { name: 'Exactos', value: stats?.variancesByType?.exacto || 0, color: '#10b981' },
                          { name: 'Faltantes', value: stats?.variancesByType?.faltante || 0, color: '#ef4444' },
                          { name: 'Sobrantes', value: stats?.variancesByType?.sobrante || 0, color: '#3b82f6' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    Resumen Estadístico
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {stats?.variancesByType ? 
                          Math.round((stats.variancesByType.exacto / (stats.variancesByType.exacto + stats.variancesByType.faltante + stats.variancesByType.sobrante)) * 100) 
                          : 0}%
                      </div>
                      <div className="text-sm font-medium text-green-700">Precisión General</div>
                      <div className="text-xs text-green-600 mt-1">Productos contados exactamente</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
                      <div className="text-4xl font-bold text-red-600 mb-2">
                        {stats?.variancesByType ? 
                          Math.round((stats.variancesByType.faltante / (stats.variancesByType.exacto + stats.variancesByType.faltante + stats.variancesByType.sobrante)) * 100) 
                          : 0}%
                      </div>
                      <div className="text-sm font-medium text-red-700">Tasa de Faltantes</div>
                      <div className="text-xs text-red-600 mt-1">Productos con deficit detectado</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}