import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ShoppingCart, 
  Phone, 
  User, 
  Package, 
  Calendar,
  Search,
  CreditCard
} from "lucide-react";
import { useLocation } from "wouter";

interface SalesAppointment {
  id: number;
  customerName: string;
  customerPhone: string;
  subject: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes: string;
  products: Array<{
    productName: string;
    quantity: number;
  }>;
}

export function SalesRegistry() {
  const [, setLocation] = useLocation();
  const [searchCustomer, setSearchCustomer] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch appointments with products
  const { data: appointments = [], isLoading } = useQuery<SalesAppointment[]>({
    queryKey: ["/api/appointments"],
  });

  // Fetch sales to check which appointments have been sold
  const { data: sales = [] } = useQuery<any[]>({
    queryKey: ["/api/sales"],
  });

  // Filter appointments that have products
  const appointmentsWithProducts = appointments.filter(appointment => 
    appointment.products && appointment.products.length > 0
  );

  // Function to check if appointment has been sold
  const isAppointmentSold = (appointment: SalesAppointment) => {
    const customerTicketTitle = `${appointment.customerName} - ${appointment.customerPhone}`;
    return sales.some(sale => 
      sale.ticketTitle === customerTicketTitle && 
      sale.status === 'completed'
    );
  };

  // Calculate sold appointments
  const soldAppointments = appointmentsWithProducts.filter(appointment => 
    isAppointmentSold(appointment)
  );

  // Apply filters
  const filteredAppointments = appointmentsWithProducts.filter(appointment => {
    const matchesCustomer = appointment.customerName.toLowerCase().includes(searchCustomer.toLowerCase()) ||
                           appointment.customerPhone.includes(searchCustomer);
    const matchesStatus = filterStatus === "all" || appointment.status === filterStatus;
    
    return matchesCustomer && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { color: "bg-green-100 text-green-800", label: "Confirmada" },
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pendiente" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelada" },
      scheduled: { color: "bg-blue-100 text-blue-800", label: "Programada" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { color: "bg-gray-100 text-gray-800", label: status };

    return (
      <Badge className={`${config.color} font-medium`}>
        {config.label}
      </Badge>
    );
  };

  const getSaleStatusBadge = (appointment: SalesAppointment) => {
    const isSold = isAppointmentSold(appointment);
    
    return (
      <Badge className={isSold ? "bg-green-100 text-green-800 font-medium" : "bg-orange-100 text-orange-800 font-medium"}>
        {isSold ? "Vendido" : "Pendiente"}
      </Badge>
    );
  };

  const handleGoToPOS = (appointment: SalesAppointment) => {
    // Create URL with customer info and products for POS
    const customerInfo = {
      name: appointment.customerName,
      phone: appointment.customerPhone,
      appointmentId: appointment.id
    };
    
    const queryParams = new URLSearchParams({
      customer: JSON.stringify(customerInfo),
      products: JSON.stringify(appointment.products)
    });
    
    setLocation(`/dashboard/pos?${queryParams.toString()}`);
  };

  const clearFilters = () => {
    setSearchCustomer("");
    setFilterStatus("all");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
          <ShoppingCart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro Venta</h1>
          <p className="text-sm text-gray-600">Citas con productos listos para vender</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Total Appointments Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-6">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <p className="text-sm font-medium opacity-90">Total de Citas con Productos</p>
                  <p className="text-3xl font-bold">{appointmentsWithProducts.length}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sold Appointments Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-6">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <p className="text-sm font-medium opacity-90">Citas Vendidas</p>
                  <p className="text-3xl font-bold">{soldAppointments.length}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search-customer">Buscar Cliente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search-customer"
                  placeholder="Nombre o teléfono..."
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="filter-status">Estado</Label>
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="confirmed">Confirmadas</option>
                <option value="pending">Pendientes</option>
                <option value="scheduled">Programadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Citas con Productos ({filteredAppointments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No hay citas con productos para mostrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Venta</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{appointment.customerName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{appointment.customerPhone}</span>
                        </div>
                      </TableCell>
                      <TableCell>{appointment.subject}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {appointment.products.map((product, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{product.productName}</span>
                              <span className="text-gray-500 ml-2">({product.quantity})</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(appointment.appointmentDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{appointment.appointmentTime}</TableCell>
                      <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                      <TableCell>{getSaleStatusBadge(appointment)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleGoToPOS(appointment)}
                          className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                          disabled={isAppointmentSold(appointment)}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          {isAppointmentSold(appointment) ? "Vendido" : "Vender"}
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
    </div>
  );
}