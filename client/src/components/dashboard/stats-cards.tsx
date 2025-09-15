import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingCart, Package, AlertTriangle, Calendar, CalendarDays } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDateRange } from "@/contexts/DateRangeContext";

interface DashboardStats {
  todaySales: number;
  totalTransactions: number;
  totalProducts: number;
  lowStockProducts: number;
}

interface CustomDateRangeStats {
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  startDate: string;
  endDate: string;
  days: number;
}

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { 
    dateRangeType, 
    startDate, 
    endDate, 
    setDateRange, 
    isCustomRange,
    getTimezoneAwareDates
  } = useDateRange();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempDateRangeType, setTempDateRangeType] = useState<"today" | "custom" | "week" | "month">(dateRangeType);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);

  const buildCustomStatsUrl = () => {
    const params = new URLSearchParams();
    params.append('dateRangeType', dateRangeType);
    
    // Use timezone-aware dates
    const { startDate: tzStartDate, endDate: tzEndDate } = getTimezoneAwareDates();
    params.append('startDate', tzStartDate);
    params.append('endDate', tzEndDate);
    
    return `/api/dashboard/custom-stats?${params.toString()}`;
  };

  const { data: customStats, isLoading: isCustomStatsLoading } = useQuery({
    queryKey: [buildCustomStatsUrl(), dateRangeType, startDate, endDate],
    enabled: isCustomRange && (dateRangeType !== "custom" || (!!startDate && !!endDate)),
  }) as { data: CustomDateRangeStats | undefined; isLoading: boolean };

  const handleDateRangeSubmit = () => {
    if (tempDateRangeType === "custom" && (!tempStartDate || !tempEndDate)) {
      return;
    }
    setDateRange(tempDateRangeType, tempStartDate, tempEndDate);
  };

  const formatPeriodTitle = () => {
    switch (dateRangeType) {
      case "today":
        return "Ventas Hoy";
      case "week":
        return "Ventas Esta Semana";
      case "month":
        return "Ventas Este Mes";
      case "custom":
        return `Ventas del ${startDate} al ${endDate}`;
      default:
        return "Ventas Hoy";
    }
  };

  const getCurrentSalesValue = () => {
    if (isCustomRange && customStats) {
      return `$${customStats.totalSales.toFixed(2)}`;
    }
    return stats && stats.todaySales !== null ? `$${stats.todaySales.toFixed(2)}` : "$0.00";
  };

  const getCurrentTransactionsValue = () => {
    if (isCustomRange && customStats) {
      return customStats.totalTransactions.toString();
    }
    return stats ? stats.totalTransactions.toString() : "0";
  };

  const cards = [
    {
      title: formatPeriodTitle(),
      value: getCurrentSalesValue(),
      icon: DollarSign,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      clickable: true
    },
    {
      title: "Transacciones",
      value: getCurrentTransactionsValue(),
      icon: ShoppingCart,
      iconBg: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      title: "Productos",
      value: stats ? stats.totalProducts.toString() : "0",
      icon: Package,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600"
    },
    {
      title: "Stock Bajo",
      value: stats ? stats.lowStockProducts.toString() : "0",
      icon: AlertTriangle,
      iconBg: "bg-red-100",
      iconColor: "text-red-600"
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center animate-pulse">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className={card.clickable ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}>
          <CardContent className="p-6">
            {card.clickable ? (
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <div className="flex items-center">
                    <div className={`p-2 ${card.iconBg} rounded-lg`}>
                      <card.icon className={`${card.iconColor} h-8 w-8`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">{card.title}</p>
                      <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Seleccionar Período de Ventas
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="period">Período</Label>
                      <Select value={tempDateRangeType} onValueChange={(value: any) => setTempDateRangeType(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Hoy</SelectItem>
                          <SelectItem value="week">Esta Semana</SelectItem>
                          <SelectItem value="month">Este Mes</SelectItem>
                          <SelectItem value="custom">Rango Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {tempDateRangeType === "custom" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate">Fecha Inicial</Label>
                          <Input
                            type="date"
                            id="startDate"
                            value={tempStartDate}
                            onChange={(e) => setTempStartDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate">Fecha Final</Label>
                          <Input
                            type="date"
                            id="endDate"
                            value={tempEndDate}
                            onChange={(e) => setTempEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={() => {
                        handleDateRangeSubmit();
                        setIsModalOpen(false);
                      }}>
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="flex items-center">
                <div className={`p-2 ${card.iconBg} rounded-lg`}>
                  <card.icon className={`${card.iconColor} h-8 w-8`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
