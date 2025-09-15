import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Phone, Filter, Search, BarChart3, FileText, Users, Calendar, CheckCircle, Clock, X, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AppointmentProduct {
  productName: string;
  quantity: number;
}

interface Appointment {
  id: number;
  customerName: string;
  customerPhone: string;
  subject: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes?: string;
  createdAt: string;
  products?: AppointmentProduct[];
}

export default function AppointmentsRegistry() {
  const [searchDate, setSearchDate] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", searchDate, searchName],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchDate) params.append("date", searchDate);
      if (searchName) params.append("customerName", searchName);
      
      const response = await fetch(`/api/appointments?${params}`);
      if (!response.ok) throw new Error("Error al obtener citas");
      return response.json();
    },
  });

  const filteredAppointments = useMemo(() => {
    if (filterStatus === "all") return appointments;
    return appointments.filter(apt => apt.status === filterStatus);
  }, [appointments, filterStatus]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter(apt => apt.status === "confirmed").length;
    const pending = appointments.filter(apt => apt.status === "pending").length;
    const cancelled = appointments.filter(apt => apt.status === "cancelled").length;
    const scheduled = appointments.filter(apt => apt.status === "scheduled").length;

    return { total, confirmed, pending, cancelled, scheduled };
  }, [appointments]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (time: string) => {
    return time;
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

  // Mutation to update appointment status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, newStatus }: { appointmentId: number, newStatus: string }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${appointmentId}`, {
        status: newStatus,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Éxito",
        description: "Estado de la cita actualizado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al actualizar el estado de la cita",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (appointmentId: number, newStatus: string) => {
    updateStatusMutation.mutate({ appointmentId, newStatus });
  };

  const clearFilters = () => {
    setSearchDate("");
    setSearchName("");
    setFilterStatus("all");
  };

  // Function to handle reschedule appointment
  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNewDate(appointment.appointmentDate.split('T')[0]);
    setNewTime(appointment.appointmentTime);
    setShowRescheduleModal(true);
  };

  // Mutation to reschedule appointment
  const rescheduleAppointmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAppointment) throw new Error("No appointment selected");
      
      const response = await apiRequest("PATCH", `/api/appointments/${selectedAppointment.id}`, {
        appointmentDate: newDate,
        appointmentTime: newTime,
        status: "scheduled"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      setNewDate("");
      setNewTime("");
      toast({
        title: "Éxito",
        description: "Cita reprogramada correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al reprogramar la cita",
        variant: "destructive",
      });
    },
  });

  const handleSaveReschedule = () => {
    if (!newDate || !newTime) {
      toast({
        title: "Error",
        description: "Por favor selecciona fecha y hora",
        variant: "destructive",
      });
      return;
    }
    rescheduleAppointmentMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Registro de Citas</h1>
            <p className="text-sm text-gray-600">Historial y consulta de todas las citas registradas</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Citas</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Confirmadas</p>
                <p className="text-2xl font-bold text-green-900">{stats.confirmed}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Programadas</p>
                <p className="text-2xl font-bold text-purple-900">{stats.scheduled}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Canceladas</p>
                <p className="text-2xl font-bold text-red-900">{stats.cancelled}</p>
              </div>
              <Filter className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Buscar por fecha
              </label>
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Buscar por cliente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nombre del cliente..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Filtrar por estado
              </label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="confirmed">Confirmadas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="scheduled">Programadas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Historial de Citas ({filteredAppointments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Cargando citas...</span>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron citas con los filtros aplicados</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Fecha de Cita</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha de Registro</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">#{appointment.id}</TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {appointment.customerName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {appointment.customerPhone}
                        </div>
                      </TableCell>
                      <TableCell>{appointment.subject}</TableCell>
                      <TableCell className="max-w-[200px]">
                        {appointment.products && appointment.products.length > 0 ? (
                          <div className="space-y-1">
                            {appointment.products.map((product, index) => (
                              <div key={index} className="text-sm">
                                <span className="font-medium">{product.productName}</span>
                                <span className="text-gray-500 ml-1">(x{product.quantity})</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sin productos</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(appointment.appointmentDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatTime(appointment.appointmentTime)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDate(appointment.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {appointment.notes ? (
                          <span className="text-sm text-gray-600 truncate block">
                            {appointment.notes}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="w-[200px]">
                        <div className="flex gap-1 flex-wrap">
                          {appointment.status !== "confirmed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(appointment.id, "confirmed")}
                              className="h-7 px-2 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                              disabled={updateStatusMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Confirmar
                            </Button>
                          )}
                          {appointment.status !== "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(appointment.id, "pending")}
                              className="h-7 px-2 text-xs bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                              disabled={updateStatusMutation.isPending}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Pendiente
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReschedule(appointment)}
                            className="h-7 px-2 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                            disabled={updateStatusMutation.isPending || rescheduleAppointmentMutation.isPending}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Programar
                          </Button>
                          {appointment.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(appointment.id, "cancelled")}
                              className="h-7 px-2 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                              disabled={updateStatusMutation.isPending}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Reprogramar Cita
            </DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Información de la Cita</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Cliente:</span> {selectedAppointment.customerName}</p>
                  <p><span className="font-medium">Asunto:</span> {selectedAppointment.subject}</p>
                  <p><span className="font-medium">Fecha actual:</span> {formatDate(selectedAppointment.appointmentDate)}</p>
                  <p><span className="font-medium">Hora actual:</span> {selectedAppointment.appointmentTime}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-date">Nueva Fecha</Label>
                  <Input
                    id="new-date"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="new-time">Nueva Hora</Label>
                  <Input
                    id="new-time"
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRescheduleModal(false);
                setSelectedAppointment(null);
                setNewDate("");
                setNewTime("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveReschedule}
              disabled={rescheduleAppointmentMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {rescheduleAppointmentMutation.isPending ? "Guardando..." : "Reprogramar Cita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}