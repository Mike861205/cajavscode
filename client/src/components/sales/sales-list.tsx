import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSettings } from "@/contexts/SettingsContext";
import { useDateRange } from "@/contexts/DateRangeContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Filter, 
  CalendarIcon, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Ban, 
  Receipt, 
  Download,
  Eye,
  CalendarDays,
  CreditCard,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Sale {
  id: number;
  total: string;
  subtotal: string;
  tax: string;
  discount: string;
  paymentMethod: string;
  ticketTitle?: string;
  warehouseId?: number;
  status: string;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    username: string;
  };
}

export default function SalesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [saleToAddPayment, setSaleToAddPayment] = useState<Sale | null>(null);
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>("");
  const [paymentMethods, setPaymentMethods] = useState<Array<{method: string, amount: number}>>([]);
  
  const { formatCurrency } = useSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales", dateFilter, dateRange],
  });

  // Debug sales data
  React.useEffect(() => {
    if (sales.length > 0) {
      console.log("DEBUG: All sales data:", sales);
      const creditSales = sales.filter(s => s.paymentMethod === "credit" || s.paymentMethod === "Crédito" || s.paymentMethod?.toLowerCase() === "credito");
      console.log("DEBUG: Credit sales found:", creditSales.map(s => ({ id: s.id, paymentMethod: s.paymentMethod })));
    }
  }, [sales]);



  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ["/api/warehouses"],
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest("PATCH", `/api/sales/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Venta actualizada",
        description: "El estado de la venta ha sido actualizado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la venta",
        variant: "destructive",
      });
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/sales/${id}`);
    },
    onSuccess: () => {
      // CRITICAL: Complete cache invalidation for immediate updates after sale cancellation
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      // FORCE: Remove and invalidate ALL cash register queries (including dynamic IDs)
      queryClient.removeQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith("/api/cash-register")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith("/api/cash-register")
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Stock restoration updates
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/chart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/top-products"] });
      toast({
        title: "Venta cancelada",
        description: "La venta ha sido cancelada y restada del punto de venta",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo cancelar la venta",
        variant: "destructive",
      });
    },
  });

  const updatePaymentMethodMutation = useMutation({
    mutationFn: async ({ id, paymentMethod, paymentMethods }: { 
      id: number; 
      paymentMethod: string;
      paymentMethods?: Array<{method: string, amount: number}>;
    }) => {
      return await apiRequest("PATCH", `/api/sales/${id}/payment`, { 
        paymentMethod,
        paymentMethods 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-registers"] });
      setIsAddPaymentModalOpen(false);
      setSaleToAddPayment(null);
      setNewPaymentMethod("");
      setPaymentMethods([]);
      toast({
        title: "Pago actualizado",
        description: "El método de pago ha sido actualizado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el método de pago",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: "Completada", variant: "default" as const },
      pending: { label: "Pendiente", variant: "secondary" as const },
      cancelled: { label: "Cancelada", variant: "destructive" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.completed;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      credit: "Crédito",
      gift_card: "Tarjeta Regalo",
      voucher: "Vale de Despensa"
    };
    return methods[method as keyof typeof methods] || method;
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.id.toString().includes(searchTerm) ||
      sale.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
    const matchesPaymentMethod = paymentMethodFilter === "all" || sale.paymentMethod === paymentMethodFilter;
    const matchesWarehouse = warehouseFilter === "all" || sale.warehouseId?.toString() === warehouseFilter;
    
    // Date filtering logic
    let matchesDate = true;
    if (dateFilter !== "all") {
      const saleDate = new Date(sale.createdAt);
      const today = new Date();
      
      switch (dateFilter) {
        case "today":
          // Use timezone-aware comparison
          const { timezoneManager } = useSettings();
          const todayStart = timezoneManager.getTodayStart();
          const todayEnd = timezoneManager.getTodayEnd();
          matchesDate = saleDate >= todayStart && saleDate <= todayEnd;
          break;
        case "week":
          const { timezoneManager: tzManager } = useSettings();
          const weekRange = tzManager.getThisWeekRange();
          matchesDate = saleDate >= weekRange.start && saleDate <= weekRange.end;
          break;
        case "month":
          const { timezoneManager: tzManagerMonth } = useSettings();
          const monthRange = tzManagerMonth.getThisMonthRange();
          matchesDate = saleDate >= monthRange.start && saleDate <= monthRange.end;
          break;
        case "custom":
          if (dateRange.from && dateRange.to) {
            const fromDate = new Date(dateRange.from);
            const toDate = new Date(dateRange.to);
            fromDate.setHours(0, 0, 0, 0);
            toDate.setHours(23, 59, 59, 999);
            matchesDate = saleDate >= fromDate && saleDate <= toDate;
          } else if (dateRange.from) {
            const fromDate = new Date(dateRange.from);
            fromDate.setHours(0, 0, 0, 0);
            matchesDate = saleDate >= fromDate;
          }
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPaymentMethod && matchesWarehouse && matchesDate;
  });

  const handleCancelSale = (id: number) => {
    deleteSaleMutation.mutate(id);
    setSaleToCancel(null);
  };

  const handleDeleteSale = (id: number) => {
    deleteSaleMutation.mutate(id);
    setSaleToDelete(null);
  };

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailsModalOpen(true);
  };

  const handlePrintReceipt = (sale: Sale) => {
    // Create receipt data and print
    const receiptData = {
      items: [], // This would be fetched from sale items
      subtotal: parseFloat(sale.subtotal),
      tax: parseFloat(sale.tax),
      total: parseFloat(sale.total),
      payment: {
        method: sale.paymentMethod,
        amount: parseFloat(sale.total),
        currency: "MXN",
        exchangeRate: 1
      },
      saleId: `V${sale.id}`,
      timestamp: new Date(sale.createdAt),
      cashier: sale.user.fullName,
      businessName: "Caja SAS Enterprise"
    };

    // Generate receipt text
    const receiptText = `
==============================
     CAJA SAS ENTERPRISE
==============================
Ticket #: ${receiptData.saleId}
Fecha: ${format(receiptData.timestamp, "dd/MM/yyyy HH:mm")}
Cajero: ${receiptData.cashier}
${sale.ticketTitle ? `Cliente/Pedido: ${sale.ticketTitle}` : ''}
------------------------------

DETALLE DE VENTA:
Subtotal:        $${receiptData.subtotal.toFixed(2)}
Impuestos:       $${receiptData.tax.toFixed(2)}
------------------------------
TOTAL:           $${receiptData.total.toFixed(2)}

Método de pago: ${getPaymentMethodLabel(receiptData.payment.method)}

==============================
    GRACIAS POR SU COMPRA
==============================
    `;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ticket de Venta #${sale.id}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <pre>${receiptText}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }

    toast({
      title: "Ticket impreso",
      description: `Ticket de venta #${sale.id} enviado a impresión`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Lista de Ventas</h2>
          <p className="text-gray-600">Gestiona y consulta todas las transacciones de venta</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por ID, usuario o método..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los métodos</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="gift_card">Tarjeta Regalo</SelectItem>
                <SelectItem value="voucher">Vale de Despensa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Almacén" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los almacenes</SelectItem>
                {Array.isArray(warehouses) && warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fechas</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="custom">Rango personalizado</SelectItem>
                </SelectContent>
              </Select>
              
              {dateFilter === "custom" && (
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
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Ventas ({filteredSales.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No se encontraron ventas</p>
              <p className="text-gray-400">Ajusta los filtros para ver más resultados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Título Ticket</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Caja</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">#{sale.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{format(new Date(sale.createdAt), "dd/MM/yyyy", { locale: es })}</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(sale.createdAt), "HH:mm", { locale: es })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{sale.user.fullName}</span>
                          <span className="text-xs text-gray-500">@{sale.user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-green-600">{formatCurrency(parseFloat(sale.total))}</span>
                          <span className="text-xs text-gray-500">
                            Subtotal: {formatCurrency(parseFloat(sale.subtotal))} | Imp: {formatCurrency(parseFloat(sale.tax))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getPaymentMethodLabel(sale.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-indigo-700">
                          {sale.ticketTitle || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-blue-700">
                          {Array.isArray(warehouses) && warehouses.find(w => w.id === sale.warehouseId)?.name || 'Sin asignar'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sale.status)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">Caja 01</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePrintReceipt(sale)}>
                              <Receipt className="mr-2 h-4 w-4" />
                              Imprimir Ticket
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewDetails(sale)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                            {(() => {
                              const paymentMethod = sale.paymentMethod?.toString().toLowerCase().trim();
                              const shouldShow = paymentMethod === "credit" || paymentMethod === "crédito" || paymentMethod === "credito";
                              console.log(`Sale ${sale.id}: paymentMethod = "${sale.paymentMethod}" -> normalized: "${paymentMethod}" -> shouldShow: ${shouldShow}`);
                              return shouldShow;
                            })() && (
                              <DropdownMenuItem onClick={() => {
                                setSaleToAddPayment(sale);
                                setIsAddPaymentModalOpen(true);
                              }}>
                                <Plus className="mr-2 h-4 w-4" />
                                Añadir Pago
                              </DropdownMenuItem>
                            )}
                            {sale.status === "completed" && (
                              <DropdownMenuItem onClick={() => setSaleToCancel(sale)}>
                                <Ban className="mr-2 h-4 w-4" />
                                Cancelar Venta
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => setSaleToDelete(sale)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles de Venta #{selectedSale?.id}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              {/* Sale Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha y Hora</label>
                  <p className="text-sm">{format(new Date(selectedSale.createdAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Estado</label>
                  <div className="mt-1">{getStatusBadge(selectedSale.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Cajero</label>
                  <p className="text-sm">{selectedSale.user.fullName} (@{selectedSale.user.username})</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Método de Pago</label>
                  <p className="text-sm">{getPaymentMethodLabel(selectedSale.paymentMethod)}</p>
                </div>
              </div>

              {/* Financial Details */}
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Resumen Financiero</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${selectedSale.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impuestos (10%):</span>
                    <span>${selectedSale.tax}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Descuento:</span>
                    <span>-${selectedSale.discount}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">${selectedSale.total}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-4 flex space-x-2">
                <Button onClick={() => handlePrintReceipt(selectedSale)} variant="outline">
                  <Receipt className="mr-2 h-4 w-4" />
                  Imprimir Ticket
                </Button>
                {selectedSale.status === "completed" && (
                  <Button onClick={() => {
                    setSaleToCancel(selectedSale);
                    setIsDetailsModalOpen(false);
                  }} variant="outline">
                    <Ban className="mr-2 h-4 w-4" />
                    Cancelar Venta
                  </Button>
                )}
                <Button onClick={() => setIsDetailsModalOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Sale Confirmation Dialog */}
      <AlertDialog open={!!saleToDelete} onOpenChange={() => setSaleToDelete(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-semibold text-gray-900">
                  ¿Cancelar venta?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-gray-600 mt-1">
                  Venta #{saleToDelete?.id} • ${saleToDelete?.total}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">
              Esta acción marcará la venta como cancelada, revertirá el inventario 
              y ajustará el saldo de la caja registradora.
            </p>
            <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-orange-600">!</span>
                </div>
                <div className="text-sm text-orange-700">
                  <strong>Información:</strong> La venta se mantendrá en el historial 
                  marcada como "cancelada" para auditoría.
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-gray-100 text-gray-700 hover:bg-gray-200">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => saleToDelete && handleDeleteSale(saleToDelete.id)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Ban className="mr-2 h-4 w-4" />
              Cancelar Venta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Sale Confirmation Dialog */}
      <AlertDialog open={!!saleToCancel} onOpenChange={() => setSaleToCancel(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                <Ban className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-semibold text-gray-900">
                  ¿Cancelar venta?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-gray-600 mt-1">
                  Venta #{saleToCancel?.id} • ${saleToCancel?.total}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-700">
              La venta será marcada como cancelada y no aparecerá en los reportes 
              de ventas activas.
            </p>
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-amber-600">i</span>
                </div>
                <div className="text-sm text-amber-700">
                  <strong>Nota:</strong> Esta acción se puede revertir cambiando el estado 
                  de la venta posteriormente si es necesario.
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-gray-100 text-gray-700 hover:bg-gray-200">
              No, mantener activa
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => saleToCancel && handleCancelSale(saleToCancel.id)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Ban className="mr-2 h-4 w-4" />
              Sí, cancelar venta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Payment Modal */}
      <Dialog open={isAddPaymentModalOpen} onOpenChange={setIsAddPaymentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Añadir Pago - Venta #{saleToAddPayment?.id}
            </DialogTitle>
          </DialogHeader>
          {saleToAddPayment && (
            <div className="space-y-6">
              {/* Sale Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total de la venta:</span>
                  <span className="font-bold text-lg text-green-600">${saleToAddPayment.total}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600">Estado actual:</span>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    Crédito
                  </Badge>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Seleccionar nuevo método de pago:
                  </label>
                  <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                      <SelectItem value="tarjeta">💳 Tarjeta</SelectItem>
                      <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                      <SelectItem value="multiple">🔄 Múltiple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Multiple Payment Methods */}
                {newPaymentMethod === "multiple" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Métodos de pago:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPaymentMethods([...paymentMethods, { method: "efectivo", amount: 0 }]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                    
                    {paymentMethods.map((payment, index) => (
                      <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 rounded-lg">
                        <Select
                          value={payment.method}
                          onValueChange={(value) => {
                            const updated = [...paymentMethods];
                            updated[index].method = value;
                            setPaymentMethods(updated);
                          }}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                            <SelectItem value="tarjeta">💳 Tarjeta</SelectItem>
                            <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Monto"
                          value={payment.amount || ""}
                          onChange={(e) => {
                            const updated = [...paymentMethods];
                            updated[index].amount = parseFloat(e.target.value) || 0;
                            setPaymentMethods(updated);
                          }}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {paymentMethods.length > 0 && (
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                        <span className="text-sm font-medium">Total:</span>
                        <span className="font-bold">
                          ${paymentMethods.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddPaymentModalOpen(false);
                    setNewPaymentMethod("");
                    setPaymentMethods([]);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (newPaymentMethod === "multiple") {
                      const total = paymentMethods.reduce((sum, p) => sum + p.amount, 0);
                      if (Math.abs(total - parseFloat(saleToAddPayment.total)) > 0.01) {
                        toast({
                          title: "Error",
                          description: "El total de los pagos debe coincidir con el total de la venta",
                          variant: "destructive",
                        });
                        return;
                      }
                    }
                    
                    updatePaymentMethodMutation.mutate({
                      id: saleToAddPayment.id,
                      paymentMethod: newPaymentMethod,
                      paymentMethods: newPaymentMethod === "multiple" ? paymentMethods : undefined
                    });
                  }}
                  disabled={!newPaymentMethod || updatePaymentMethodMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {updatePaymentMethodMutation.isPending ? (
                    "Procesando..."
                  ) : (
                    "Actualizar Pago"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}