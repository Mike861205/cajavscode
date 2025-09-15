import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Wallet, 
  DollarSign, 
  Receipt, 
  TrendingDown, 
  ArrowDownLeft,
  Calculator,
  LockKeyhole
} from "lucide-react";
import CashClosingModal from "./cash-closing-modal";
import { CachePatterns, RealTimeConfig } from "@/lib/cache";

// Schemas for form validation
const openCashRegisterSchema = z.object({
  openingAmount: z.string().min(1, "El monto de apertura es requerido"),
});

const expenseSchema = z.object({
  amount: z.string().min(1, "El monto es requerido"),
  reference: z.string().min(1, "La referencia es requerida"),
  category: z.string().min(1, "La categoría es requerida"),
  description: z.string().optional(),
});

const incomeSchema = z.object({
  amount: z.string().min(1, "El monto es requerido"),
  reference: z.string().min(1, "La referencia es requerida"),
  date: z.string().min(1, "La fecha es requerida"),
  description: z.string().optional(),
});

const withdrawalSchema = z.object({
  amount: z.string().min(1, "El monto es requerido"),
  reference: z.string().min(1, "La referencia es requerida"),
  description: z.string().optional(),
});

type OpenCashRegisterForm = z.infer<typeof openCashRegisterSchema>;
type ExpenseForm = z.infer<typeof expenseSchema>;
type IncomeForm = z.infer<typeof incomeSchema>;
type WithdrawalForm = z.infer<typeof withdrawalSchema>;

export default function CashRegisterButtons() {
  const [openCashDialogOpen, setOpenCashDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [closeCashDialogOpen, setCloseCashDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for active cash register - Critical for POS operations, needs immediate updates
  const { data: activeCashRegister, refetch: refetchCashRegister } = useQuery<any>({
    queryKey: ["/api/cash-register/active"],
    ...RealTimeConfig.immediate, // Auto-refresh every 2 seconds for immediate updates
  });

  // Get cash register summary if there's an active register - Critical for cash details
  const { data: summary, refetch: refetchSummary } = useQuery<any>({
    queryKey: [`/api/cash-register/${activeCashRegister?.id}/summary`],
    enabled: !!activeCashRegister?.id,
    ...RealTimeConfig.immediate, // Auto-refresh every 2 seconds for immediate cash details
  });

  // Forms
  const openCashForm = useForm<OpenCashRegisterForm>({
    resolver: zodResolver(openCashRegisterSchema),
    defaultValues: {
      openingAmount: "",
    },
  });

  const expenseForm = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: "",
      reference: "",
      category: "",
      description: "",
    },
  });

  const incomeForm = useForm<IncomeForm>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: "",
      reference: "",
      date: new Date().toISOString().split('T')[0],
      description: "",
    },
  });

  const withdrawalForm = useForm<WithdrawalForm>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: "",
      reference: "",
      description: "",
    },
  });

  // Mutations
  const openCashMutation = useMutation({
    mutationFn: async (data: OpenCashRegisterForm) => {
      const response = await apiRequest("POST", "/api/cash-register/open", {
        openingAmount: parseFloat(data.openingAmount),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Caja abierta",
        description: "La caja se ha abierto correctamente",
      });
      // Use centralized cache invalidation for cash register operations
      CachePatterns.onCashRegisterChange(data.id);
      refetchCashRegister();
      setOpenCashDialogOpen(false);
      openCashForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al abrir la caja",
        variant: "destructive",
      });
    },
  });

  const expenseMutation = useMutation({
    mutationFn: async (data: ExpenseForm) => {
      const response = await apiRequest("POST", "/api/cash-transactions", {
        cashRegisterId: activeCashRegister?.id,
        type: "expense",
        amount: parseFloat(data.amount),
        reference: data.reference,
        category: data.category,
        description: data.description,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Gasto registrado",
        description: "El gasto se ha registrado correctamente",
      });
      // Use centralized cache invalidation for cash register operations
      CachePatterns.onCashRegisterChange(activeCashRegister?.id);
      setExpenseDialogOpen(false);
      expenseForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al registrar el gasto",
        variant: "destructive",
      });
    },
  });

  const incomeMutation = useMutation({
    mutationFn: async (data: IncomeForm) => {
      const response = await apiRequest("POST", "/api/cash-transactions", {
        cashRegisterId: activeCashRegister?.id,
        type: "income",
        amount: parseFloat(data.amount),
        reference: data.reference,
        category: "income",
        description: data.description || `Ingreso - ${data.reference}`,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ingreso registrado",
        description: "El ingreso se ha registrado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      queryClient.invalidateQueries({ queryKey: [`/api/cash-register/${activeCashRegister?.id}/summary`] });
      setIncomeDialogOpen(false);
      incomeForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al registrar el ingreso",
        variant: "destructive",
      });
    },
  });

  const withdrawalMutation = useMutation({
    mutationFn: async (data: WithdrawalForm) => {
      const response = await apiRequest("POST", "/api/cash-transactions", {
        cashRegisterId: activeCashRegister?.id,
        type: "withdrawal",
        amount: parseFloat(data.amount),
        reference: data.reference,
        description: data.description,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Retiro registrado",
        description: "El retiro se ha registrado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      queryClient.invalidateQueries({ queryKey: [`/api/cash-register/${activeCashRegister?.id}/summary`] });
      setWithdrawalDialogOpen(false);
      withdrawalForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al registrar el retiro",
        variant: "destructive",
      });
    },
  });

  const onOpenCash = (data: OpenCashRegisterForm) => {
    openCashMutation.mutate(data);
  };

  const onExpense = (data: ExpenseForm) => {
    expenseMutation.mutate(data);
  };

  const onIncome = (data: IncomeForm) => {
    incomeMutation.mutate(data);
  };

  const onWithdrawal = (data: WithdrawalForm) => {
    withdrawalMutation.mutate(data);
  };

  return (
    <div className="flex gap-2 items-center overflow-x-auto scrollbar-hide pb-1 min-w-0 px-2">
      {/* Apertura Caja Button */}
      <Dialog open={openCashDialogOpen} onOpenChange={setOpenCashDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant={!activeCashRegister ? "default" : "outline"}
            size="sm"
            className={`flex items-center gap-1 transition-all duration-300 touch-manipulation h-9 px-2 text-xs whitespace-nowrap flex-shrink-0 ${
              !activeCashRegister 
                ? "bg-green-600 hover:bg-green-700 text-white font-medium animate-pulse hover:animate-none" 
                : "bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
            }`}
            disabled={!!activeCashRegister}
            title={!activeCashRegister ? "Abrir nuevo turno de caja" : "Caja ya está abierta"}
          >
            <Wallet className="h-3 w-3" />
            <span className="font-medium">
              {!activeCashRegister ? "Apertura" : "Apertura"}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-6 w-6 text-green-600" />
              Apertura de Nuevo Turno de Caja
            </DialogTitle>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
              <p className="text-sm text-green-800 font-medium mb-2">
                ✅ Turno anterior cerrado correctamente
              </p>
              <p className="text-sm text-gray-600">
                Ingrese el monto inicial en efectivo para comenzar un nuevo turno de ventas.
              </p>
            </div>
          </DialogHeader>
          <form onSubmit={openCashForm.handleSubmit(onOpenCash)} className="space-y-4">
            <div>
              <Label htmlFor="openingAmount">Monto Inicial en Efectivo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="openingAmount"
                  type="number"
                  step="0.01"
                  placeholder="500.00"
                  className="pl-8"
                  {...openCashForm.register("openingAmount")}
                />
              </div>
              {openCashForm.formState.errors.openingAmount && (
                <p className="text-sm text-red-600 mt-1">
                  {openCashForm.formState.errors.openingAmount.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Este será el dinero disponible para dar cambio al inicio del turno.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Importante:</strong> Una vez abierta la caja, podrá procesar ventas, registrar gastos e ingresos hasta el cierre del turno.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenCashDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={openCashMutation.isPending} className="bg-green-600 hover:bg-green-700">
                {openCashMutation.isPending ? "Iniciando Turno..." : "Iniciar Turno"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Gastos Button */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-red-50 border-red-200 hover:bg-red-100 text-red-700 hover:text-red-800 transition-all duration-200 touch-manipulation h-9 px-2 text-xs whitespace-nowrap flex-shrink-0"
            disabled={!activeCashRegister}
            title="Registrar gastos de caja"
          >
            <TrendingDown className="h-3 w-3" />
            <span className="font-medium">Gastos</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Registrar Gasto
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={expenseForm.handleSubmit(onExpense)} className="space-y-4">
            <div>
              <Label htmlFor="expenseAmount">Monto</Label>
              <Input
                id="expenseAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...expenseForm.register("amount")}
              />
              {expenseForm.formState.errors.amount && (
                <p className="text-sm text-red-600 mt-1">
                  {expenseForm.formState.errors.amount.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="expenseReference">Referencia</Label>
              <Input
                id="expenseReference"
                placeholder="Número de factura, recibo, etc."
                {...expenseForm.register("reference")}
              />
              {expenseForm.formState.errors.reference && (
                <p className="text-sm text-red-600 mt-1">
                  {expenseForm.formState.errors.reference.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="expenseCategory">Categoría</Label>
              <Select onValueChange={(value) => expenseForm.setValue("category", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suministros">Suministros</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="publicidad">Publicidad</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
              {expenseForm.formState.errors.category && (
                <p className="text-sm text-red-600 mt-1">
                  {expenseForm.formState.errors.category.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="expenseDescription">Descripción (Opcional)</Label>
              <Textarea
                id="expenseDescription"
                placeholder="Detalles adicionales del gasto"
                {...expenseForm.register("description")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setExpenseDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={expenseMutation.isPending}>
                {expenseMutation.isPending ? "Registrando..." : "Registrar Gasto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ingresos Button */}
      <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 transition-all duration-200 touch-manipulation h-9 px-2 text-xs whitespace-nowrap flex-shrink-0"
            disabled={!activeCashRegister}
            title="Registrar ingreso adicional"
          >
            <DollarSign className="h-3 w-3" />
            <span className="font-medium">Ingresos</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Registrar Ingreso
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={incomeForm.handleSubmit(onIncome)} className="space-y-4">
            <div>
              <Label htmlFor="incomeAmount">Monto</Label>
              <Input
                id="incomeAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...incomeForm.register("amount")}
              />
              {incomeForm.formState.errors.amount && (
                <p className="text-sm text-red-600 mt-1">
                  {incomeForm.formState.errors.amount.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="incomeReference">Referencia</Label>
              <Input
                id="incomeReference"
                placeholder="Número de recibo, concepto, etc."
                {...incomeForm.register("reference")}
              />
              {incomeForm.formState.errors.reference && (
                <p className="text-sm text-red-600 mt-1">
                  {incomeForm.formState.errors.reference.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="incomeDate">Fecha</Label>
              <Input
                id="incomeDate"
                type="date"
                {...incomeForm.register("date")}
              />
              {incomeForm.formState.errors.date && (
                <p className="text-sm text-red-600 mt-1">
                  {incomeForm.formState.errors.date.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="incomeDescription">Descripción (Opcional)</Label>
              <Textarea
                id="incomeDescription"
                placeholder="Detalles adicionales del ingreso"
                {...incomeForm.register("description")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIncomeDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={incomeMutation.isPending}>
                {incomeMutation.isPending ? "Registrando..." : "Registrar Ingreso"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Retiros Button */}
      <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-700 hover:text-orange-800 transition-all duration-200 touch-manipulation h-9 px-2 text-xs whitespace-nowrap flex-shrink-0"
            disabled={!activeCashRegister}
            title="Registrar retiros de efectivo"
          >
            <ArrowDownLeft className="h-3 w-3" />
            <span className="font-medium">Retiros</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-orange-600" />
              Registrar Retiro
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={withdrawalForm.handleSubmit(onWithdrawal)} className="space-y-4">
            <div>
              <Label htmlFor="withdrawalAmount">Monto</Label>
              <Input
                id="withdrawalAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...withdrawalForm.register("amount")}
              />
              {withdrawalForm.formState.errors.amount && (
                <p className="text-sm text-red-600 mt-1">
                  {withdrawalForm.formState.errors.amount.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="withdrawalReference">Referencia</Label>
              <Input
                id="withdrawalReference"
                placeholder="Número de autorización, motivo, etc."
                {...withdrawalForm.register("reference")}
              />
              {withdrawalForm.formState.errors.reference && (
                <p className="text-sm text-red-600 mt-1">
                  {withdrawalForm.formState.errors.reference.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="withdrawalDescription">Descripción (Opcional)</Label>
              <Textarea
                id="withdrawalDescription"
                placeholder="Motivo del retiro"
                {...withdrawalForm.register("description")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setWithdrawalDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={withdrawalMutation.isPending}>
                {withdrawalMutation.isPending ? "Registrando..." : "Registrar Retiro"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detalle de Registros Button */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 hover:text-blue-800 transition-all duration-200 touch-manipulation h-9 px-2 text-xs whitespace-nowrap flex-shrink-0"
            disabled={!activeCashRegister}
            title="Ver detalle y resumen de caja"
          >
            <Receipt className="h-3 w-3" />
            <span className="font-medium">Detalle</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              Detalle de Registros - Caja #{activeCashRegister?.id}
            </DialogTitle>
          </DialogHeader>
          {summary && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Apertura</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    ${(summary.openingAmount || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Ingresos</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    ${(summary.totalIncome || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-800">Gastos</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">
                    ${(summary.totalExpenses || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownLeft className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-800">Retiros</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">
                    ${(summary.totalWithdrawals || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Sales by Payment Method */}
              {summary.salesByMethod && summary.salesByMethod.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium mb-3 text-blue-800">Ventas por Método de Pago</h4>
                  <div className="space-y-2">
                    {summary.salesByMethod.map((method: any) => (
                      <div key={method.method} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            method.method === 'cash' ? 'bg-green-500' :
                            method.method === 'card' ? 'bg-blue-500' :
                            method.method === 'transfer' ? 'bg-purple-500' :
                            method.method === 'credit' ? 'bg-orange-500' :
                            'bg-gray-500'
                          }`} />
                          <span className="text-sm font-medium">
                            {method.method === 'cash' ? 'Efectivo' :
                             method.method === 'card' ? 'Tarjeta' :
                             method.method === 'transfer' ? 'Transferencia' :
                             method.method === 'credit' ? 'Crédito' :
                             method.method}
                          </span>
                          <span className="text-xs text-gray-500">({method.count} ventas)</span>
                        </div>
                        <span className="font-semibold">${method.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Total Ventas:</span>
                      <span>${(summary.totalAllSales || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cancelaciones de Ventas - Informativo */}
              {(() => {
                // Procesar TODAS las cancelaciones directamente desde recentSales
                const cancellations = (summary.recentSales || [])
                  .filter((sale: any) => sale.status === 'cancelled')
                  .reduce((acc: any, sale: any) => {
                    // Extraer método de pago del formato "method:amount"
                    const paymentMethods = sale.paymentMethods?.split(',') || [];
                    paymentMethods.forEach((pm: string) => {
                      const [method, amount] = pm.split(':');
                      if (method && amount) {
                        const methodKey = method.trim();
                        const methodAmount = parseFloat(amount);
                        
                        if (!acc[methodKey]) {
                          acc[methodKey] = { total: 0, count: 0 };
                        }
                        acc[methodKey].total += methodAmount;
                        acc[methodKey].count += 1;
                      }
                    });
                    return acc;
                  }, {});

                const cancellationEntries = Object.entries(cancellations);
                
                return cancellationEntries.length > 0 ? (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border border-red-200">
                    <h4 className="font-medium mb-3 text-red-800">Cancelaciones (Informativo)</h4>
                    <div className="space-y-2">
                      {cancellationEntries.map(([method, data]: [string, any]) => (
                        <div key={method} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              method === 'cash' ? 'bg-red-400' :
                              method === 'card' ? 'bg-red-400' :
                              method === 'transfer' ? 'bg-red-400' :
                              method === 'credit' ? 'bg-red-400' :
                              'bg-red-400'
                            }`} />
                            <span className="text-sm font-medium text-red-700">
                              {method === 'cash' ? 'Efectivo' :
                               method === 'card' ? 'Tarjeta' :
                               method === 'transfer' ? 'Transferencia' :
                               method === 'credit' ? 'Crédito' :
                               method} (Cancelado)
                            </span>
                            <span className="text-xs text-red-500">({data.count} cancelaciones)</span>
                          </div>
                          <span className="font-semibold text-red-700">-${data.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <div className="flex items-center justify-between font-semibold text-red-800">
                        <span>Total Cancelado:</span>
                        <span>-${Object.values(cancellations).reduce((sum: number, data: any) => sum + data.total, 0).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-red-600 italic">
                      * Las cancelaciones no afectan el balance esperado, son solo informativas
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Expected Balance */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Balance Esperado (Solo Efectivo):</span>
                  <span className="text-xl font-bold text-gray-900">
                    ${(summary.expectedBalance || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Recent Sales List */}
              <div>
                <h4 className="font-medium mb-3">Ventas Recientes</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-6">
                  {(summary.recentSales || []).slice(0, 10).map((sale: any) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div>
                          <p className="font-medium text-sm">Venta #{sale.id}</p>
                          <p className="text-xs text-gray-500">
                            {sale.ticketTitle || 'Sin título'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-blue-600">
                          ${parseFloat(sale.total || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {sale.paymentMethods?.split(', ').map((method: string) => {
                            const [type] = method.split(':');
                            return type.charAt(0).toUpperCase() + type.slice(1);
                          }).join(', ') || 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash Transactions List */}
              <div>
                <h4 className="font-medium mb-3">Movimientos de Efectivo</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(summary.transactions || [])
                    .filter((transaction: any) => ['income', 'expense', 'withdrawal'].includes(transaction.type))
                    .slice(0, 20).map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          transaction.type === 'opening' ? 'bg-green-500' :
                          transaction.type === 'sale' ? 'bg-blue-500' :
                          transaction.type === 'income' ? 'bg-emerald-500' :
                          transaction.type === 'expense' ? 'bg-red-500' :
                          'bg-orange-500'
                        }`} />
                        <div>
                          <p className="font-medium text-sm">
                            {transaction.type === 'opening' ? 'Apertura' :
                             transaction.type === 'sale' ? 'Venta' :
                             transaction.type === 'income' ? 'Ingreso' :
                             transaction.type === 'expense' ? 'Gasto' :
                             'Retiro'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transaction.reference || transaction.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${
                          transaction.type === 'opening' || transaction.type === 'sale' || transaction.type === 'income'
                            ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'opening' || transaction.type === 'sale' || transaction.type === 'income' ? '+' : '-'}
                          ${parseFloat(transaction.amount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cierre de Caja Button */}
      <Dialog open={closeCashDialogOpen} onOpenChange={setCloseCashDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white transition-all duration-200 touch-manipulation h-9 px-2 text-xs whitespace-nowrap flex-shrink-0"
            disabled={!activeCashRegister}
            title="Cerrar turno de caja"
          >
            <LockKeyhole className="h-3 w-3" />
            <span className="font-medium">Cierre</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-purple-600" />
              Cierre de Caja #{activeCashRegister?.id}
            </DialogTitle>
          </DialogHeader>
          
          <CashClosingModal 
            summary={summary}
            activeCashRegister={activeCashRegister}
            onClose={() => setCloseCashDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}