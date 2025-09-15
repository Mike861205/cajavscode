import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  User,
  Building,
  Search,
  Filter,
  Eye,
  Download,
  X,
  Calculator
} from "lucide-react";

interface CashClosure {
  id: number;
  userId: number;
  userName: string;
  userFullName?: string;
  warehouseId: number;
  warehouseName: string;
  openingAmount: number;
  closingAmount: number;
  expectedBalance: number;
  difference: number;
  totalSales: number;
  totalExpenses?: number;
  totalWithdrawals?: number;
  openedAt: string;
  closedAt: string;
  salesByMethod?: Array<{
    method: string;
    total: number;
    count: number;
  }>;
}

export default function CashClosures() {
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClosure, setSelectedClosure] = useState<CashClosure | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Force cache invalidation on component mount to get fresh data
  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: ['/api/cash-register/closures']
    });
    // Also remove all cached data to force complete refresh
    queryClient.removeQueries({
      queryKey: ['/api/cash-register/closures']
    });
    // Force immediate refetch
    queryClient.refetchQueries({
      queryKey: ['/api/cash-register/closures']
    });
  }, [queryClient]);

  // Fetch cash register closures with fresh data
  const { data: closures = [], isLoading } = useQuery<CashClosure[]>({
    queryKey: ['/api/cash-register/closures'],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch warehouses for filter
  const { data: warehouses = [] } = useQuery({
    queryKey: ['/api/warehouses'],
  });

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  // Filter closures based on selected filters
  const filteredClosures = closures.filter(closure => {
    // Period filter
    if (selectedPeriod !== "all") {
      const closureDate = new Date(closure.closedAt || closure.openedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      switch (selectedPeriod) {
        case "today":
          if (!isSameDay(closureDate, today)) return false;
          break;
        case "yesterday":
          if (!isSameDay(closureDate, yesterday)) return false;
          break;
        case "week":
          if (closureDate < weekAgo) return false;
          break;
        case "month":
          if (closureDate < monthAgo) return false;
          break;
      }
    }

    // User filter
    if (selectedUser !== "all" && closure.userId.toString() !== selectedUser) {
      return false;
    }

    // Warehouse filter
    if (selectedWarehouse !== "all" && closure.warehouseId?.toString() !== selectedWarehouse) {
      return false;
    }

    // Search filter
    if (searchTerm && !closure.userName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Get unique users for filter
  const uniqueUsers = Array.from(new Set(closures.map(closure => closure.userName)))
    .map(username => {
      const closure = closures.find(c => c.userName === username);
      return closure ? { 
        id: closure.userId, 
        username: closure.userName, 
        fullName: closure.userFullName || closure.userName 
      } : null;
    })
    .filter(Boolean);

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: { label: "Efectivo", color: "bg-green-100 text-green-800" },
      card: { label: "Tarjeta", color: "bg-blue-100 text-blue-800" },
      transfer: { label: "Transferencia", color: "bg-purple-100 text-purple-800" },
      credit: { label: "Crédito", color: "bg-orange-100 text-orange-800" },
    };
    return methods[method as keyof typeof methods] || { label: method, color: "bg-gray-100 text-gray-800" };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cortes de Caja</h2>
          <p className="text-muted-foreground">
            Gestiona y visualiza los cortes de caja por usuario y almacén
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Historial de Cortes de Caja
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Label htmlFor="period">Período:</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="yesterday">Ayer</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="warehouse">Almacén:</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los almacenes</SelectItem>
                  {warehouses.map((warehouse: any) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="user">Usuario:</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-64">
              <Label htmlFor="search">Buscar:</Label>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Buscar por usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Results count and summary */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">
              {filteredClosures.length > 0 
                ? `Mostrando ${filteredClosures.length} corte${filteredClosures.length !== 1 ? 's' : ''} de caja${selectedWarehouse !== "all" ? ` del almacén seleccionado` : ` (vista global)`}`
                : "No se encontraron cortes de caja con los filtros aplicados."}
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Cargando cortes de caja...</p>
            </div>
          ) : filteredClosures.length === 0 ? (
            <div className="text-center py-8">
              <Calculator className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cortes de caja</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedPeriod !== "all" || selectedUser !== "all" || selectedWarehouse !== "all"
                  ? "No se encontraron cortes que coincidan con los filtros aplicados."
                  : "Aún no se han registrado cortes de caja."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Horarios</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead>Apertura</TableHead>
                    <TableHead>Cierre</TableHead>
                    <TableHead>Esperado</TableHead>
                    <TableHead>Diferencia</TableHead>
                    <TableHead>Ventas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClosures.map((closure) => (
                    <TableRow key={closure.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        #{closure.id}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {closure.closedAt ? format(new Date(closure.closedAt), "dd/MM/yyyy", { locale: es }) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-1 text-green-600">
                            <Clock className="h-3 w-3" />
                            <span>A: {closure.openedAt ? format(new Date(closure.openedAt), "HH:mm") : '-'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-red-600">
                            <Clock className="h-3 w-3" />
                            <span>C: {closure.closedAt ? format(new Date(closure.closedAt), "HH:mm") : '-'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-sm">{closure.userFullName || closure.userName}</div>
                            <div className="text-xs text-gray-500">@{closure.userName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{closure.warehouseName || 'Sin asignar'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium">${(closure.openingAmount || 0).toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">${(closure.closingAmount || 0).toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">${(closure.expectedBalance || 0).toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-sm font-medium",
                          Math.abs(closure.difference || 0) < 0.01 ? "text-green-600 bg-green-50" :
                          (closure.difference || 0) > 0 ? "text-blue-600 bg-blue-50" :
                          "text-red-600 bg-red-50"
                        )}>
                          {(closure.difference || 0) > 0 ? '+' : ''}${Math.abs(closure.difference || 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-green-600">
                          ${(closure.totalSales || 0).toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "border-current",
                            Math.abs(closure.difference || 0) < 0.01 ? "text-green-600 bg-green-50" :
                            (closure.difference || 0) > 0 ? "text-blue-600 bg-blue-50" :
                            "text-red-600 bg-red-50"
                          )}
                        >
                          {Math.abs(closure.difference || 0) < 0.01 ? "Exacto" :
                           (closure.difference || 0) > 0 ? "Sobrante" : "Faltante"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedClosure(closure);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedClosure && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalle del Corte de Caja #{selectedClosure.id}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">💰 Apertura</span>
                  </div>
                  <div className="text-2xl font-bold text-green-800">
                    ${(selectedClosure.openingAmount || 0).toFixed(2)}
                  </div>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">📈 Ventas</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-800">
                    ${(selectedClosure.totalSales || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Expenses and Withdrawals */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-red-700">📉 Gastos</span>
                  </div>
                  <div className="text-2xl font-bold text-red-800">
                    ${(selectedClosure.totalExpenses || 0).toFixed(2)}
                  </div>
                </div>
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-orange-700">💸 Retiros</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-800">
                    ${(selectedClosure.totalWithdrawals || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Sales by Payment Method */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Ventas por Método de Pago</h4>
                {(selectedClosure.salesByMethod || []).map((method) => {
                  const methodInfo = getPaymentMethodLabel(method.method);
                  const iconMap = {
                    cash: "💰",
                    card: "💳", 
                    transfer: "🔄",
                    credit: "📝"
                  };
                  const icon = iconMap[method.method as keyof typeof iconMap] || "💼";
                  
                  return (
                    <div key={method.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {methodInfo.label} ({method.count || 0} ventas)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          ${(method.total || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-semibold text-blue-700">Total Ventas:</div>
                  <div className="text-xl font-bold text-blue-800">
                    ${(selectedClosure.salesByMethod || []).reduce((sum, method) => sum + (method.total || 0), 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Expected Balance */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700">🎯 Balance Esperado</span>
                </div>
                <div className="text-2xl font-bold text-purple-800 mb-2">
                  ${(selectedClosure.expectedBalance || 0).toFixed(2)}
                </div>
                <div className="text-sm text-purple-600">
                  Diferencia: <span className={cn(
                    "font-medium",
                    Math.abs(selectedClosure.difference || 0) < 0.01 ? "text-green-600" :
                    (selectedClosure.difference || 0) > 0 ? "text-blue-600" :
                    "text-red-600"
                  )}>
                    {(selectedClosure.difference || 0) > 0 ? '+' : ''}${(selectedClosure.difference || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}