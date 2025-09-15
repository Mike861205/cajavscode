import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard,
  Users,
  ShoppingCart,
  CalendarIcon,
  Ban,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

interface SalesMetrics {
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  cancelledSales: number;
  completedSales: number;
  pendingSales: number;
  salesByPaymentMethod: { method: string; total: number; count: number }[];
  salesByPeriod: { date: string; amount: number; transactions: number }[];
  topSellingPeriods: { period: string; amount: number }[];
}

export default function SalesDashboard() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [periodFilter, setPeriodFilter] = useState("week");

  // Fetch sales data with date filtering
  const { data: salesData, isLoading } = useQuery<SalesMetrics>({
    queryKey: ["/api/sales/metrics", periodFilter, dateRange],
    queryFn: async () => {
      // Build query parameters for date filtering
      const params = new URLSearchParams();
      
      if (periodFilter && periodFilter !== "all") {
        params.append("period", periodFilter);
      }
      
      if (dateRange.from) {
        const startDate = new Date(dateRange.from);
        startDate.setHours(0, 0, 0, 0);
        params.append("startDate", startDate.toISOString());
      }
      
      if (dateRange.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        params.append("endDate", endDate.toISOString());
      }
      
      const response = await fetch(`/api/sales?${params.toString()}`);
      const sales = await response.json();
      
      // Calculate metrics from sales data
      const totalSales = sales.reduce((sum: number, sale: any) => {
        const saleTotal = parseFloat(sale.total);
        return sum + (isNaN(saleTotal) ? 0 : saleTotal);
      }, 0);
      const totalTransactions = sales.length;
      const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
      
      const statusCounts = sales.reduce((acc: any, sale: any) => {
        acc[sale.status] = (acc[sale.status] || 0) + 1;
        return acc;
      }, {});

      const paymentMethodData = sales.reduce((acc: any, sale: any) => {
        const method = sale.paymentMethod;
        if (!acc[method]) {
          acc[method] = { total: 0, count: 0 };
        }
        const saleTotal = parseFloat(sale.total);
        acc[method].total += isNaN(saleTotal) ? 0 : saleTotal;
        acc[method].count += 1;
        return acc;
      }, {});

      return {
        totalSales,
        totalTransactions,
        averageTicket,
        cancelledSales: statusCounts.cancelled || 0,
        completedSales: statusCounts.completed || 0,
        pendingSales: statusCounts.pending || 0,
        salesByPaymentMethod: Object.entries(paymentMethodData).map(([method, data]: [string, any]) => ({
          method,
          total: data.total,
          count: data.count
        })),
        salesByPeriod: sales.map((sale: any) => {
          const saleTotal = parseFloat(sale.total);
          return {
            date: sale.createdAt,
            amount: isNaN(saleTotal) ? 0 : saleTotal,
            transactions: 1
          };
        }),
        topSellingPeriods: (() => {
          // Categorize sales by time periods based on createdAt
          const periodSales = {
            "Mañana (8-12)": 0,
            "Tarde (12-18)": 0,
            "Noche (18-22)": 0
          };
          
          sales.forEach((sale: any) => {
            const saleDate = new Date(sale.createdAt);
            const hour = saleDate.getHours();
            const minute = saleDate.getMinutes();
            const totalMinutes = hour * 60 + minute;
            
            // Interpret time periods according to specifications:
            // 22:01 to 11:59 → Noche (18-22)
            // 12:01 to 6:59 → Mañana (8-12)
            // Rest according to normal hours
            
            const saleTotal = parseFloat(sale.total);
            const validSaleTotal = isNaN(saleTotal) ? 0 : saleTotal;
            
            if ((hour === 22 && minute >= 1) || hour >= 23 || hour <= 11 || (hour === 12 && minute === 0)) {
              // 22:01 to 11:59 → Noche (18-22)
              periodSales["Noche (18-22)"] += validSaleTotal;
            } else if ((hour === 12 && minute >= 1) || (hour >= 1 && hour <= 6)) {
              // 12:01 to 6:59 → Mañana (8-12)
              periodSales["Mañana (8-12)"] += validSaleTotal;
            } else if (hour >= 7 && hour <= 11) {
              // 7:00 to 11:59 → Mañana (8-12)
              periodSales["Mañana (8-12)"] += validSaleTotal;
            } else if ((hour >= 12 && hour <= 17) || (hour === 18 && minute === 0)) {
              // 12:00 to 18:00 → Tarde (12-18)
              periodSales["Tarde (12-18)"] += validSaleTotal;
            } else if (hour >= 18 && hour <= 22 && !(hour === 22 && minute >= 1)) {
              // 18:01 to 22:00 → Noche (18-22)
              periodSales["Noche (18-22)"] += validSaleTotal;
            }
          });
          
          // Convert to array and sort by amount (highest first)
          return Object.entries(periodSales)
            .map(([period, amount]) => ({ period, amount }))
            .sort((a, b) => b.amount - a.amount);
        })()
      };
    }
  });

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      credit: "Crédito",
      voucher: "Vale de Despensa",
      gift_card: "Tarjeta Regalo"
    };
    return labels[method] || method;
  };

  const paymentMethodColors = {
    cash: "#10B981",
    card: "#3B82F6", 
    transfer: "#8B5CF6",
    credit: "#F59E0B",
    voucher: "#EF4444",
    gift_card: "#EC4899"
  };

  // Chart configurations
  const salesByMethodChart = {
    labels: salesData?.salesByPaymentMethod.map(item => getPaymentMethodLabel(item.method)) || [],
    datasets: [{
      data: salesData?.salesByPaymentMethod.map(item => item.total) || [],
      backgroundColor: salesData?.salesByPaymentMethod.map(item => 
        paymentMethodColors[item.method as keyof typeof paymentMethodColors] || "#6B7280"
      ) || [],
      borderWidth: 0,
    }]
  };

  const salesTrendChart = {
    labels: salesData?.salesByPeriod.slice(-7).map(item => 
      format(new Date(item.date), "dd/MM")
    ) || [],
    datasets: [{
      label: "Ventas ($)",
      data: salesData?.salesByPeriod.slice(-7).map(item => item.amount) || [],
      borderColor: "#3B82F6",
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      tension: 0.4,
      fill: true
    }]
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Ventas</h1>
          <p className="text-gray-600 mt-1">Análisis global de rendimiento y métricas de ventas</p>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex gap-3">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Año</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          {periodFilter === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    "Seleccionar fechas"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
                <p className="text-3xl font-bold text-green-600">
                  ${salesData && !isNaN(salesData.totalSales) ? salesData.totalSales.toFixed(2) : "0.00"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +12.5% vs período anterior
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transacciones</p>
                <p className="text-3xl font-bold text-blue-600">
                  {salesData?.totalTransactions || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +8.2% vs período anterior
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ticket Promedio</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${salesData && !isNaN(salesData.averageTicket) ? salesData.averageTicket.toFixed(2) : "0.00"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +4.1% vs período anterior
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cancelaciones</p>
                <p className="text-3xl font-bold text-red-600">
                  {salesData?.cancelledSales || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  <TrendingDown className="inline h-3 w-3 mr-1" />
                  -2.3% vs período anterior
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <Ban className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Payment Method */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Ventas por Método de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <Doughnut 
                data={salesByMethodChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
            <div className="mt-4 space-y-2">
              {salesData?.salesByPaymentMethod.map((item, index) => (
                <div key={item.method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: paymentMethodColors[item.method as keyof typeof paymentMethodColors] || "#6B7280" 
                      }}
                    />
                    <span className="text-sm">{getPaymentMethodLabel(item.method)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${item.total.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{item.count} transacciones</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sales Trend */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tendencia de Ventas (Últimos 7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Line 
                data={salesTrendChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return '$' + value;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview & Top Periods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Status Overview */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Estado de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Completadas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{salesData?.completedSales || 0}</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {salesData?.totalTransactions && salesData.totalTransactions > 0 
                    ? Math.round(((salesData?.completedSales || 0) / salesData.totalTransactions) * 100)
                    : 0}%
                </Badge>
              </div>
            </div>
            <Progress 
              value={salesData?.totalTransactions && salesData.totalTransactions > 0 
                ? ((salesData?.completedSales || 0) / salesData.totalTransactions) * 100
                : 0
              } 
              className="h-2" 
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Pendientes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{salesData?.pendingSales || 0}</span>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  {salesData?.totalTransactions && salesData.totalTransactions > 0 
                    ? Math.round(((salesData?.pendingSales || 0) / salesData.totalTransactions) * 100)
                    : 0}%
                </Badge>
              </div>
            </div>
            <Progress 
              value={salesData?.totalTransactions && salesData.totalTransactions > 0 
                ? ((salesData?.pendingSales || 0) / salesData.totalTransactions) * 100
                : 0
              } 
              className="h-2" 
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-500" />
                <span className="text-sm">Canceladas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{salesData?.cancelledSales || 0}</span>
                <Badge variant="outline" className="text-red-600 border-red-600">
                  {salesData?.totalTransactions && salesData.totalTransactions > 0 
                    ? Math.round(((salesData?.cancelledSales || 0) / salesData.totalTransactions) * 100)
                    : 0}%
                </Badge>
              </div>
            </div>
            <Progress 
              value={salesData?.totalTransactions && salesData.totalTransactions > 0 
                ? ((salesData?.cancelledSales || 0) / salesData.totalTransactions) * 100
                : 0
              } 
              className="h-2" 
            />
          </CardContent>
        </Card>

        {/* Top Selling Periods */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Períodos de Mayor Venta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {salesData?.topSellingPeriods.map((period, index) => (
              <div key={period.period} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-medium">{period.period}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    ${!isNaN(period.amount) ? period.amount.toFixed(2) : "0.00"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {salesData?.totalSales && salesData.totalSales > 0 && !isNaN(period.amount) && !isNaN(salesData.totalSales)
                      ? Math.round((period.amount / salesData.totalSales) * 100)
                      : 0}% del total
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}