import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, FileText, User, DollarSign, Clock, Filter, Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PayrollRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeNumber: string;
  department: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  basicSalary: number;
  overtimeHours: number;
  overtimePay: number;
  bonuses: number;
  deductions: number;
  imssDeduction: number;
  isrDeduction: number;
  netPay: number;
  paymentDate: string;
  stampingDate: string;
  status: 'timbrado' | 'pendiente' | 'cancelado';
  notes?: string;
}

export default function PayrollHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Fetch payroll records
  const { data: payrollRecords = [], isLoading } = useQuery<PayrollRecord[]>({
    queryKey: ["/api/payroll/history"],
  });

  // Fetch employees for filter dropdown
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
  });

  // Filter records based on search criteria
  const filteredRecords = payrollRecords.filter(record => {
    const matchesSearch = 
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMonth = !selectedMonth || selectedMonth === "all" || 
      record.payPeriodStart.includes(selectedMonth);
    
    const matchesEmployee = !selectedEmployee || selectedEmployee === "all" || 
      record.employeeId.toString() === selectedEmployee;
    
    const matchesStatus = !selectedStatus || selectedStatus === "all" || 
      record.status === selectedStatus;

    return matchesSearch && matchesMonth && matchesEmployee && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'timbrado':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Timbrado</Badge>;
      case 'pendiente':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendiente</Badge>;
      case 'cancelado':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelado</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy', { locale: es });
      months.push({ value, label });
    }
    return months;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando historial de timbrado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Timbrado</h1>
          <p className="text-gray-600">Registro completo de nóminas timbradas</p>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-600">
            {filteredRecords.length} registros
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search by name/number */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar empleado</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Nombre o número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Month filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mes</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  {generateMonthOptions().map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Empleado</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="timbrado">Timbrado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear filters */}
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedMonth("all");
                setSelectedEmployee("all");
                setSelectedStatus("all");
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Timbrado</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No se encontraron registros</p>
              <p className="text-sm text-gray-500">
                {payrollRecords.length === 0 
                  ? "Aún no hay nóminas timbradas en el sistema"
                  : "Intenta ajustar los filtros de búsqueda"
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Empleado</th>
                    <th className="text-left py-3 px-4 font-medium">Departamento</th>
                    <th className="text-left py-3 px-4 font-medium">Período</th>
                    <th className="text-left py-3 px-4 font-medium">Salario Neto</th>
                    <th className="text-left py-3 px-4 font-medium">Fecha Timbrado</th>
                    <th className="text-left py-3 px-4 font-medium">Estado</th>
                    <th className="text-left py-3 px-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{record.employeeName}</div>
                            <div className="text-sm text-gray-500">#{record.employeeNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{record.department}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div>{formatDate(record.payPeriodStart)}</div>
                          <div className="text-gray-500">al {formatDate(record.payPeriodEnd)}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-green-600">
                          {formatCurrency(record.netPay)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {formatDate(record.stampingDate)}
                        </div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(record.status)}</td>
                      <td className="py-3 px-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              Ver Detalle
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Recibo de Nómina - {record.employeeName}
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-6">
                              {/* Employee Info */}
                              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Empleado</label>
                                  <p className="font-semibold">{record.employeeName}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Número</label>
                                  <p className="font-semibold">#{record.employeeNumber}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Departamento</label>
                                  <p className="font-semibold">{record.department}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Período</label>
                                  <p className="font-semibold">
                                    {formatDate(record.payPeriodStart)} - {formatDate(record.payPeriodEnd)}
                                  </p>
                                </div>
                              </div>

                              {/* Earnings */}
                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-green-700">Percepciones</h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex justify-between p-3 bg-green-50 rounded">
                                    <span>Salario Base:</span>
                                    <span className="font-semibold">{formatCurrency(record.basicSalary)}</span>
                                  </div>
                                  <div className="flex justify-between p-3 bg-green-50 rounded">
                                    <span>Horas Extra ({record.overtimeHours}h):</span>
                                    <span className="font-semibold">{formatCurrency(record.overtimePay)}</span>
                                  </div>
                                  <div className="flex justify-between p-3 bg-green-50 rounded">
                                    <span>Bonificaciones:</span>
                                    <span className="font-semibold">{formatCurrency(record.bonuses)}</span>
                                  </div>
                                  <div className="flex justify-between p-3 bg-green-100 rounded font-semibold">
                                    <span>Total Percepciones:</span>
                                    <span>{formatCurrency(record.basicSalary + record.overtimePay + record.bonuses)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Deductions */}
                              <div>
                                <h3 className="text-lg font-semibold mb-3 text-red-700">Deducciones</h3>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex justify-between p-3 bg-red-50 rounded">
                                    <span>IMSS (2.375%):</span>
                                    <span className="font-semibold">{formatCurrency(record.imssDeduction)}</span>
                                  </div>
                                  <div className="flex justify-between p-3 bg-red-50 rounded">
                                    <span>ISR (10%):</span>
                                    <span className="font-semibold">{formatCurrency(record.isrDeduction)}</span>
                                  </div>
                                  <div className="flex justify-between p-3 bg-red-50 rounded">
                                    <span>Otras Deducciones:</span>
                                    <span className="font-semibold">{formatCurrency(record.deductions)}</span>
                                  </div>
                                  <div className="flex justify-between p-3 bg-red-100 rounded font-semibold">
                                    <span>Total Deducciones:</span>
                                    <span>{formatCurrency(record.imssDeduction + record.isrDeduction + record.deductions)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Net Pay */}
                              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-xl font-semibold text-blue-900">Pago Neto:</span>
                                  <span className="text-2xl font-bold text-blue-900">
                                    {formatCurrency(record.netPay)}
                                  </span>
                                </div>
                              </div>

                              {/* Stamping Info */}
                              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Fecha de Pago</label>
                                  <p className="font-semibold">{formatDate(record.paymentDate)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Fecha de Timbrado</label>
                                  <p className="font-semibold">{formatDate(record.stampingDate)}</p>
                                </div>
                                <div className="col-span-2">
                                  <label className="text-sm font-medium text-gray-500">Estado</label>
                                  <div className="mt-1">{getStatusBadge(record.status)}</div>
                                </div>
                                {record.notes && (
                                  <div className="col-span-2">
                                    <label className="text-sm font-medium text-gray-500">Notas</label>
                                    <p className="mt-1 text-sm">{record.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}