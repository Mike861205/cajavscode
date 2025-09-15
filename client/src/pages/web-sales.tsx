import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Download, FileText, ShoppingCart, DollarSign, TrendingUp, Award, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WebSale {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  orderDate: string;
  items: Array<{
    productName: string;
    quantity: string;
    unitPrice: string;
    total: string;
  }>;
}

interface WebSalesStats {
  totalSales: number;
  totalRevenue: string;
  averageTicket: string;
  topProducts: Array<{
    productName: string;
    totalSold: string;
    revenue: string;
  }>;
  salesByPaymentMethod: Array<{
    paymentMethod: string;
    count: number;
    total: string;
  }>;
  salesByDay: Array<{
    date: string;
    sales: number;
    revenue: string;
  }>;
}

export default function WebSales() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return format(firstDay, "yyyy-MM-dd");
  });
  
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return format(today, "yyyy-MM-dd");
  });

  // Consulta para obtener las ventas web
  const { data: webSales = [], isLoading: isLoadingSales } = useQuery<WebSale[]>({
    queryKey: ["/api/web-sales", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        startDate: startDate + "T00:00:00.000Z",
        endDate: endDate + "T23:59:59.999Z"
      });
      const response = await apiRequest("GET", `/api/web-sales?${params}`);
      return response.json();
    },
  });

  // Consulta para obtener estadísticas de ventas web
  const { data: stats, isLoading: isLoadingStats } = useQuery<WebSalesStats>({
    queryKey: ["/api/web-sales/stats", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        startDate: startDate + "T00:00:00.000Z",
        endDate: endDate + "T23:59:59.999Z"
      });
      const response = await apiRequest("GET", `/api/web-sales/stats?${params}`);
      return response.json();
    },
  });

  // Mutations for order actions
  const markAsPaidMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("PATCH", `/api/web-sales/${orderId}/mark-paid`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/web-sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/web-sales/stats"] });
      toast({
        title: "Éxito",
        description: "La orden ha sido marcada como pagada",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al marcar la orden como pagada",
        variant: "destructive",
      });
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("PATCH", `/api/web-sales/${orderId}/cancel`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/web-sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/web-sales/stats"] });
      toast({
        title: "Éxito",
        description: "La orden ha sido cancelada",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al cancelar la orden",
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("DELETE", `/api/web-sales/${orderId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/web-sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/web-sales/stats"] });
      toast({
        title: "Éxito",
        description: "La orden ha sido eliminada",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al eliminar la orden",
        variant: "destructive",
      });
    },
  });

  const markAsPaid = (orderId: number) => {
    markAsPaidMutation.mutate(orderId);
  };

  const cancelOrder = (orderId: number) => {
    cancelOrderMutation.mutate(orderId);
  };

  const deleteOrder = (orderId: number) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar esta orden?")) {
      deleteOrderMutation.mutate(orderId);
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({ 
        startDate: startDate + "T00:00:00.000Z",
        endDate: endDate + "T23:59:59.999Z",
        format: 'excel'
      });
      const response = await fetch(`/api/web-sales/export?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ventas-web-${startDate}-${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams({ 
        startDate: startDate + "T00:00:00.000Z",
        endDate: endDate + "T23:59:59.999Z",
        format: 'pdf'
      });
      const response = await fetch(`/api/web-sales/export?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ventas-web-${startDate}-${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-100 text-green-800";
      case "shipped": return "bg-blue-100 text-blue-800";
      case "processing": return "bg-yellow-100 text-yellow-800";
      case "paid": return "bg-emerald-100 text-emerald-800";
      case "pending": return "bg-orange-100 text-orange-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "stripe": return "bg-purple-100 text-purple-800";
      case "paypal": return "bg-blue-100 text-blue-800";
      case "mercadopago": return "bg-cyan-100 text-cyan-800";
      case "bank_transfer": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoadingSales || isLoadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ventas Web</h1>
          <p className="text-muted-foreground">
            Gestiona y analiza las ventas de tu tienda online
          </p>
        </div>
      </div>

      {/* Filtros de fecha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Filtros de Fecha
          </CardTitle>
          <CardDescription>
            Selecciona el período para ver las ventas web
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="grid gap-2">
              <Label htmlFor="start-date">Fecha de Inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-date">Fecha de Fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportExcel} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button onClick={handleExportPDF} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Ventas</p>
                <p className="text-2xl font-bold">{stats?.totalSales || 0}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Ingresos Totales</p>
                <p className="text-2xl font-bold">${stats?.totalRevenue || "0.00"}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Ticket Promedio</p>
                <p className="text-2xl font-bold">${stats?.averageTicket || "0.00"}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Producto Top</p>
                <p className="text-lg font-bold">
                  {stats?.topProducts?.[0]?.productName || "N/A"}
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productos más vendidos */}
      {stats?.topProducts && stats.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>
              Los productos con mayor volumen de ventas en el período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad Vendida</TableHead>
                  <TableHead>Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topProducts.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{product.productName}</TableCell>
                    <TableCell>{product.totalSold}</TableCell>
                    <TableCell>${product.revenue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tabla de ventas web */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas Web</CardTitle>
          <CardDescription>
            Lista completa de pedidos realizados en tu tienda online
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webSales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No se encontraron ventas web en el período seleccionado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sale.customerName}</p>
                        <p className="text-sm text-muted-foreground">{sale.customerEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">${sale.total}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", getStatusColor(sale.status))}>
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", getStatusColor(sale.paymentStatus))}>
                        {sale.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", getPaymentMethodColor(sale.paymentMethod))}>
                        {sale.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(sale.orderDate), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {sale.items.map((item, index) => (
                          <div key={index} className="text-xs">
                            {item.productName} (x{item.quantity})
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {sale.paymentStatus === "pending" && sale.paymentMethod === "transferencia" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsPaid(sale.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => cancelOrder(sale.id)}
                          className="text-yellow-600 hover:text-yellow-700"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteOrder(sale.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}