import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, DollarSign, CreditCard, ShoppingCart, Package, AlertTriangle, Users, Building, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

interface DailySalesData {
  date: string;
  totalSales: number;
  totalTransactions: number;
  totalExpenses: number;
  totalPurchases: number;
  inventoryVariance: number;
  cashVariance: number;
  paymentMethods: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
  users: Array<{
    userId: number;
    userName: string;
    sales: number;
    transactions: number;
  }>;
  branches: Array<{
    branchId: string;
    branchName: string;
    sales: number;
    transactions: number;
  }>;
}

interface SalesReportData {
  dailyData: DailySalesData[];
  monthlyTotals: {
    totalSales: number;
    totalTransactions: number;
    totalExpenses: number;
    totalPurchases: number;
    totalInventoryVariance: number;
    totalCashVariance: number;
    netProfit: number;
  };
  users: Array<{ id: number; username: string; fullName: string }>;
  warehouses: Array<{ id: number; name: string }>;
}

export default function SalesReports() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const { formatCurrency } = useSettings();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: reportData, isLoading } = useQuery<SalesReportData>({
    queryKey: ["/api/reports/sales", format(currentDate, "yyyy-MM"), selectedUser, selectedWarehouse],
    queryFn: async () => {
      const params = new URLSearchParams({ month: format(currentDate, "yyyy-MM") });
      if (selectedUser !== "all") params.append("userId", selectedUser);
      if (selectedWarehouse !== "all") params.append("warehouseId", selectedWarehouse);
      
      const response = await apiRequest("GET", `/api/reports/sales?${params}`);
      return response.json();
    },
  });

  const getDayData = (date: Date): DailySalesData | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return reportData?.dailyData.find(d => d.date === dateStr);
  };

  const getSelectedDayData = (): DailySalesData | undefined => {
    if (!selectedDay) return undefined;
    return reportData?.dailyData.find(d => d.date === selectedDay);
  };

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
    setSelectedDay(null);
  };



  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const selectedDayData = getSelectedDayData();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white shadow-lg">
              <Calendar className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reportes de Ventas</h1>
              <p className="text-gray-600 mt-1">Análisis detallado de ventas por calendario mensual</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-8 shadow-lg border-0 bg-gradient-to-r from-white to-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Filtros de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Usuario:</span>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {reportData?.users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Almacén:</span>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los almacenes</SelectItem>
                  {reportData?.warehouses?.map(warehouse => (
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

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-xl text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reportData?.monthlyTotals?.totalSales || 0)}
            </div>
            <p className="text-xs opacity-80 mt-1">
              {reportData?.monthlyTotals?.totalTransactions || 0} transacciones
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 border-0 shadow-xl text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Gastos Totales</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reportData?.monthlyTotals?.totalExpenses || 0)}
            </div>
            <p className="text-xs opacity-80 mt-1">
              Gastos del mes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Compras Totales</CardTitle>
            <ShoppingCart className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reportData?.monthlyTotals?.totalPurchases || 0)}
            </div>
            <p className="text-xs opacity-80 mt-1">
              Inversión en inventario
            </p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-xl text-white ${
          (reportData?.monthlyTotals?.netProfit || 0) >= 0 
            ? "bg-gradient-to-br from-purple-500 to-purple-600" 
            : "bg-gradient-to-br from-orange-500 to-orange-600"
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Utilidad/Pérdida Mensual
            </CardTitle>
            <Package className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(reportData?.monthlyTotals?.netProfit || 0)}
            </div>
            <p className="text-xs opacity-80 mt-1">
              {(reportData?.monthlyTotals?.netProfit || 0) >= 0 ? "Utilidad del mes" : "Pérdida del mes"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="w-full">
        {/* Calendar - Full Width */}
        <div className="w-full">
          <Card className="shadow-xl border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {format(currentDate, "MMMM yyyy", { locale: es })}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map((day, index) => {
                  const dayData = getDayData(day);
                  const hasData = dayData && dayData.totalSales > 0;
                  const isSelected = selectedDay === format(day, "yyyy-MM-dd");
                  const isCurrentDay = isToday(day);

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDay(format(day, "yyyy-MM-dd"))}
                      className={cn(
                        "p-2 text-xs rounded-lg border transition-all duration-200 hover:shadow-md min-h-[160px] flex flex-col items-start justify-start space-y-1",
                        isSelected ? "border-blue-500 bg-blue-50 shadow-md" :
                        isCurrentDay ? "border-green-500 bg-green-50" :
                        hasData ? "border-gray-200 bg-white hover:bg-gray-50" :
                        "border-gray-100 bg-gray-50 text-gray-400"
                      )}
                    >
                      <span className={cn(
                        "font-semibold text-sm",
                        isCurrentDay ? "text-green-600" :
                        isSelected ? "text-blue-600" :
                        hasData ? "text-gray-900" : "text-gray-400"
                      )}>
                        {format(day, "d")}
                      </span>
                      
                      {hasData ? (
                        <div className="w-full space-y-1">
                          {/* Ventas por método de pago */}
                          {dayData.paymentMethods && dayData.paymentMethods.length > 0 ? (
                            dayData.paymentMethods.map((method, idx) => (
                              <div key={idx} className="flex justify-between items-center">
                                <span className="text-xs text-gray-500 capitalize">{method.method}</span>
                                <span className="text-xs font-medium text-green-600">
                                  {formatCurrency(method.amount)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Ventas</span>
                              <span className="text-xs font-medium text-green-600">
                                {formatCurrency(dayData.totalSales)}
                              </span>
                            </div>
                          )}
                          
                          {/* Gastos - Siempre mostrar */}
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Gastos</span>
                            <span className={`text-xs font-medium ${dayData.totalExpenses > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              {dayData.totalExpenses > 0 ? `-${formatCurrency(dayData.totalExpenses)}` : formatCurrency(0)}
                            </span>
                          </div>
                          
                          {/* Compras - Siempre mostrar */}
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Compras</span>
                            <span className={`text-xs font-medium ${dayData.totalPurchases > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                              {dayData.totalPurchases > 0 ? `-${formatCurrency(dayData.totalPurchases)}` : formatCurrency(0)}
                            </span>
                          </div>
                          
                          {/* Ingresos adicionales */}
                          {(dayData.inventoryVariance > 0 || dayData.cashVariance > 0) && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Ingresos</span>
                              <span className="text-xs font-medium text-purple-600">
                                +{formatCurrency(Math.max(0, dayData.inventoryVariance) + Math.max(0, dayData.cashVariance))}
                              </span>
                            </div>
                          )}
                          
                          {/* Utilidad/Pérdida del día (fórmula: ventas - gastos - compras) */}
                          <div className="flex justify-between items-center border-t pt-1 mt-1">
                            <span className="text-xs font-medium text-gray-700">Utilidad/Pérdida</span>
                            <span className={cn(
                              "text-xs font-bold",
                              (dayData.totalSales - dayData.totalExpenses - dayData.totalPurchases) > 0 
                                ? "text-green-700" 
                                : (dayData.totalSales - dayData.totalExpenses - dayData.totalPurchases) < 0
                                ? "text-red-700"
                                : "text-gray-600"
                            )}>
                              {formatCurrency(dayData.totalSales - dayData.totalExpenses - dayData.totalPurchases)}
                            </span>
                          </div>
                          
                          {/* Indicador visual de utilidad/pérdida */}
                          <div className="text-center mt-1">
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full font-medium",
                              (dayData.totalSales - dayData.totalExpenses - dayData.totalPurchases) > 0 
                                ? "bg-green-100 text-green-700" 
                                : (dayData.totalSales - dayData.totalExpenses - dayData.totalPurchases) < 0
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                            )}>
                              {(dayData.totalSales - dayData.totalExpenses - dayData.totalPurchases) > 0 
                                ? "Utilidad" 
                                : (dayData.totalSales - dayData.totalExpenses - dayData.totalPurchases) < 0
                                ? "Pérdida"
                                : "Sin movimiento"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full flex flex-col space-y-1">
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">Ventas</span>
                            <span className="text-xs text-gray-400">$0.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">Gastos</span>
                            <span className="text-xs text-gray-400">$0.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">Compras</span>
                            <span className="text-xs text-gray-400">$0.00</span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span className="text-xs text-gray-400">Total</span>
                            <span className="text-xs text-gray-400">$0.00</span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
}