import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, TrendingDown, TrendingUp, MinusCircle } from "lucide-react";
import ExpensesTab from "@/components/operations/expenses-tab";
import IncomeTab from "@/components/operations/income-tab";
import WithdrawalsTab from "@/components/operations/withdrawals-tab";
import OperationsFilters from "@/components/operations/operations-filters";

export default function Operations() {
  const [activeTab, setActiveTab] = useState("expenses");
  const [filters, setFilters] = useState<{
    startDate?: string;
    endDate?: string;
    warehouseId?: number;
  }>({});

  // Build query params for filters
  const buildQueryParams = (baseFilters: typeof filters) => {
    const params = new URLSearchParams();
    if (baseFilters.startDate) params.append('startDate', baseFilters.startDate);
    if (baseFilters.endDate) params.append('endDate', baseFilters.endDate);
    if (baseFilters.warehouseId) params.append('warehouseId', baseFilters.warehouseId.toString());
    return params.toString();
  };

  // Get totals with filters
  const expensesQueryKey = `/api/operations/expenses${buildQueryParams(filters) ? `?${buildQueryParams(filters)}` : ''}`;
  const incomeQueryKey = `/api/operations/income${buildQueryParams(filters) ? `?${buildQueryParams(filters)}` : ''}`;
  const withdrawalsQueryKey = `/api/operations/withdrawals${buildQueryParams(filters) ? `?${buildQueryParams(filters)}` : ''}`;

  const { data: expenses = [] } = useQuery({
    queryKey: [expensesQueryKey],
  });

  const { data: income = [] } = useQuery({
    queryKey: [incomeQueryKey],
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: [withdrawalsQueryKey],
  });

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  // Calculate totals based on current filters
  const totalExpenses = (expenses as any[]).reduce((sum: number, expense: any) => sum + parseFloat(expense.amount || '0'), 0);
  const totalIncome = (income as any[]).reduce((sum: number, item: any) => sum + parseFloat(item.amount || '0'), 0);
  const totalWithdrawals = (withdrawals as any[]).reduce((sum: number, withdrawal: any) => sum + parseFloat(withdrawal.amount || '0'), 0);

  // Determine labels based on filters
  const getDateLabel = () => {
    if (filters.startDate && filters.endDate) {
      return `del ${filters.startDate} al ${filters.endDate}`;
    } else if (filters.startDate) {
      return `desde ${filters.startDate}`;
    } else if (filters.endDate) {
      return `hasta ${filters.endDate}`;
    }
    return "del Día";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operaciones</h1>
          <p className="text-muted-foreground">
            Gestiona gastos, ingresos y retiros de caja por almacén
          </p>
        </div>
      </div>

      {/* Filters */}
      <OperationsFilters onFiltersChange={handleFiltersChange} />

      {/* Modern Statistics Cards with Gradients */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-red-500 to-pink-600 border-0 shadow-2xl text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Gastos {getDateLabel()}
            </CardTitle>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <TrendingDown className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              ${totalExpenses.toLocaleString()}
            </div>
            <p className="text-sm opacity-80">
              Total de gastos registrados
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <TrendingDown className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 border-0 shadow-2xl text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Ingresos {getDateLabel()}
            </CardTitle>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              ${totalIncome.toLocaleString()}
            </div>
            <p className="text-sm opacity-80">
              Total de ingresos registrados
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <TrendingUp className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-yellow-500 border-0 shadow-2xl text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Retiros {getDateLabel()}
            </CardTitle>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <MinusCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">
              ${totalWithdrawals.toLocaleString()}
            </div>
            <p className="text-sm opacity-80">
              Total de retiros registrados
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <MinusCircle className="h-16 w-16" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Operations Management with Colorful Tabs */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-t-lg">
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Gestión de Operaciones
          </CardTitle>
          <CardDescription className="text-white/90">
            Registra y administra todas las operaciones de caja por almacén
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-2 rounded-xl shadow-lg mb-6">
              <TabsTrigger 
                value="expenses" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:scale-105 rounded-lg px-4 py-3"
              >
                <TrendingDown className="h-5 w-5 mr-2" />
                <span className="font-medium">Gastos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="income" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:scale-105 rounded-lg px-4 py-3"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                <span className="font-medium">Ingresos</span>
              </TabsTrigger>
              <TabsTrigger 
                value="withdrawals" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200 hover:scale-105 rounded-lg px-4 py-3"
              >
                <MinusCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Retiros</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="expenses" className="space-y-4">
              <ExpensesTab filters={filters} />
            </TabsContent>
            <TabsContent value="income" className="space-y-4">
              <IncomeTab filters={filters} />
            </TabsContent>
            <TabsContent value="withdrawals" className="space-y-4">
              <WithdrawalsTab filters={filters} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}