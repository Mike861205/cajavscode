import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calculator,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Package,
  Target,
  AlertTriangle,
  CheckCircle,
  Timer,
  Activity
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface CashClosureData {
  id: number;
  userId: number;
  warehouseId: number;
  openingAmount: number;
  closingAmount: number;
  difference: number;
  expectedBalance: number;
  totalSales: number;
  totalIncome: number;
  totalExpenses: number;
  totalWithdrawals: number;
  openedAt: string;
  closedAt: string;
  userName: string;
  userFullName: string;
  warehouseName: string;
}

export function CashRegisterStats() {
  const [dateRange, setDateRange] = useState({
    from: "",
    to: ""
  });

  // Fetch cash register closures
  const { data: closures = [], isLoading } = useQuery<CashClosureData[]>({
    queryKey: ["/api/cash-register/closures"],
  });

  // Calculate statistics
  const stats = calculateStats(closures);

  const clearFilters = () => {
    setDateRange({ from: "", to: "" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
          <Calculator className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estadísticas de Cajas</h1>
          <p className="text-sm text-gray-600">Análisis detallado del manejo de cajas registradoras</p>
        </div>
      </div>

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros de Período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date-from">Fecha Desde</Label>
              <Input
                id="date-from"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({...prev, from: e.target.value}))}
              />
            </div>
            <div>
              <Label htmlFor="date-to">Fecha Hasta</Label>
              <Input
                id="date-to"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({...prev, to: e.target.value}))}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Closures */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <p className="text-sm font-medium opacity-90">Total Cierres</p>
                  <p className="text-3xl font-bold">{stats.totalClosures}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calculator className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Difference */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className={`bg-gradient-to-r ${stats.averageDifference >= 0 ? 'from-green-500 to-emerald-500' : 'from-red-500 to-rose-500'} p-6`}>
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <p className="text-sm font-medium opacity-90">Diferencia Promedio</p>
                  <p className="text-3xl font-bold">${Math.abs(stats.averageDifference).toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  {stats.averageDifference >= 0 ? 
                    <TrendingUp className="h-6 w-6 text-white" /> : 
                    <TrendingDown className="h-6 w-6 text-white" />
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Effectiveness Rate */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-6">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <p className="text-sm font-medium opacity-90">Efectividad</p>
                  <p className="text-3xl font-bold">{stats.effectivenessRate}%</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Sales */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <p className="text-sm font-medium opacity-90">Ventas Promedio</p>
                  <p className="text-3xl font-bold">${stats.averageSales.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Differences Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Faltantes vs Sobrantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.differencesChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Diferencia']} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Distribución de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.performanceDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({name, value}) => `${name}: ${value}`}
                >
                  {stats.performanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Estadísticas de Tiempo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Hora promedio apertura</span>
              <Badge variant="outline">{stats.averageOpeningTime}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Hora promedio cierre</span>
              <Badge variant="outline">{stats.averageClosingTime}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tiempo promedio operación</span>
              <Badge variant="outline">{stats.averageOperationTime}h</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumen Financiero
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total faltantes</span>
              <Badge variant="destructive">${stats.totalShortages.toFixed(2)}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total sobrantes</span>
              <Badge variant="default" className="bg-green-100 text-green-800">${stats.totalSurplus.toFixed(2)}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Balance neto</span>
              <Badge variant={stats.netBalance >= 0 ? "default" : "destructive"} 
                     className={stats.netBalance >= 0 ? "bg-green-100 text-green-800" : ""}>
                ${stats.netBalance.toFixed(2)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Performance Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Indicadores de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cierres exactos</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                {stats.exactClosures} ({((stats.exactClosures / stats.totalClosures) * 100).toFixed(1)}%)
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Con diferencias</span>
              <Badge variant="secondary">
                {stats.closuresWithDifferences} ({((stats.closuresWithDifferences / stats.totalClosures) * 100).toFixed(1)}%)
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Mayor diferencia</span>
              <Badge variant="outline">${stats.maxDifference.toFixed(2)}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Closures Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Últimos Cierres de Caja
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Usuario</th>
                    <th className="text-left p-2">Almacén</th>
                    <th className="text-left p-2">Apertura</th>
                    <th className="text-left p-2">Cierre</th>
                    <th className="text-left p-2">Esperado</th>
                    <th className="text-left p-2">Diferencia</th>
                    <th className="text-left p-2">Ventas</th>
                    <th className="text-left p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {closures.slice(0, 10).map((closure) => (
                    <tr key={closure.id} className="border-b">
                      <td className="p-2">{closure.userName || closure.userFullName || 'N/A'}</td>
                      <td className="p-2">{closure.warehouseName || 'N/A'}</td>
                      <td className="p-2">${closure.openingAmount.toFixed(2)}</td>
                      <td className="p-2">${closure.closingAmount.toFixed(2)}</td>
                      <td className="p-2">${closure.expectedBalance.toFixed(2)}</td>
                      <td className="p-2">
                        <span className={closure.difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${Math.abs(closure.difference).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-2">${closure.totalSales.toFixed(2)}</td>
                      <td className="p-2">
                        {closure.difference === 0 ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">Exacto</Badge>
                        ) : closure.difference > 0 ? (
                          <Badge variant="default" className="bg-blue-100 text-blue-800">Sobrante</Badge>
                        ) : (
                          <Badge variant="destructive">Faltante</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function calculateStats(closures: CashClosureData[]) {
  if (closures.length === 0) {
    return {
      totalClosures: 0,
      averageDifference: 0,
      effectivenessRate: 0,
      averageSales: 0,
      totalShortages: 0,
      totalSurplus: 0,
      netBalance: 0,
      exactClosures: 0,
      closuresWithDifferences: 0,
      maxDifference: 0,
      averageOpeningTime: 'N/A',
      averageClosingTime: 'N/A',
      averageOperationTime: 0,
      differencesChart: [],
      performanceDistribution: []
    };
  }

  const totalClosures = closures.length;
  const totalDifference = closures.reduce((sum, closure) => sum + closure.difference, 0);
  const averageDifference = totalDifference / totalClosures;
  const totalSales = closures.reduce((sum, closure) => sum + closure.totalSales, 0);
  const averageSales = totalSales / totalClosures;

  const exactClosures = closures.filter(c => c.difference === 0).length;
  const closuresWithDifferences = totalClosures - exactClosures;
  const effectivenessRate = Math.round((exactClosures / totalClosures) * 100);

  const shortages = closures.filter(c => c.difference < 0);
  const surplus = closures.filter(c => c.difference > 0);
  const totalShortages = Math.abs(shortages.reduce((sum, closure) => sum + closure.difference, 0));
  const totalSurplus = surplus.reduce((sum, closure) => sum + closure.difference, 0);
  const netBalance = totalSurplus - totalShortages;

  const maxDifference = Math.max(...closures.map(c => Math.abs(c.difference)));

  // Calculate time statistics
  let totalOpeningMinutes = 0;
  let totalClosingMinutes = 0;
  let totalOperationHours = 0;
  let validTimeEntries = 0;

  closures.forEach(closure => {
    if (closure.openedAt && closure.closedAt) {
      const openedTime = new Date(closure.openedAt);
      const closedTime = new Date(closure.closedAt);
      
      if (!isNaN(openedTime.getTime()) && !isNaN(closedTime.getTime())) {
        // Calculate opening time in minutes from midnight
        const openingMinutes = openedTime.getHours() * 60 + openedTime.getMinutes();
        const closingMinutes = closedTime.getHours() * 60 + closedTime.getMinutes();
        
        totalOpeningMinutes += openingMinutes;
        totalClosingMinutes += closingMinutes;
        
        // Calculate operation duration in hours
        const operationMs = closedTime.getTime() - openedTime.getTime();
        const operationHours = operationMs / (1000 * 60 * 60);
        if (operationHours > 0 && operationHours < 24) { // Sanity check
          totalOperationHours += operationHours;
        }
        
        validTimeEntries++;
      }
    }
  });

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const averageOpeningTime = validTimeEntries > 0 ? formatTime(totalOpeningMinutes / validTimeEntries) : 'N/A';
  const averageClosingTime = validTimeEntries > 0 ? formatTime(totalClosingMinutes / validTimeEntries) : 'N/A';
  const averageOperationTime = validTimeEntries > 0 ? (totalOperationHours / validTimeEntries) : 0;

  // Chart data
  const differencesChart = closures.slice(-10).map((closure, index) => ({
    name: `Cierre ${closure.id}`,
    value: closure.difference
  }));

  const performanceDistribution = [
    { name: 'Exactos', value: exactClosures, color: '#10b981' },
    { name: 'Sobrantes', value: surplus.length, color: '#3b82f6' },
    { name: 'Faltantes', value: shortages.length, color: '#ef4444' }
  ];

  return {
    totalClosures,
    averageDifference,
    effectivenessRate,
    averageSales,
    totalShortages,
    totalSurplus,
    netBalance,
    exactClosures,
    closuresWithDifferences,
    maxDifference,
    averageOpeningTime,
    averageClosingTime,
    averageOperationTime: averageOperationTime.toFixed(1),
    differencesChart,
    performanceDistribution
  };
}