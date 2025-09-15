import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Search, Eye, Edit, Trash2, UserPlus, Mail, Phone, MapPin, Building, DollarSign, Calendar, CreditCard, User, UserX, UserCheck, Briefcase, Shield, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Employee } from "@shared/schema";
import EnhancedPayrollStampModal from "./enhanced-payroll-stamp-modal";

interface EmployeeListProps {
  onAddEmployee?: () => void;
}

export default function EmployeeList({ onAddEmployee }: EmployeeListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollEmployee, setPayrollEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading, error } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    refetchOnWindowFocus: false,
  });



  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/employees/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "✅ Empleado eliminado",
        description: "El empleado ha sido eliminado del sistema",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error al eliminar empleado",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const toggleEmployeeStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/employees/${id}`, { isActive });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.isActive ? "✅ Empleado activado" : "⚠️ Empleado desactivado",
        description: `El empleado ha sido ${variables.isActive ? 'activado' : 'desactivado'} en el sistema`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error al actualizar empleado",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const filteredEmployees = (employees as Employee[]).filter((employee: Employee) =>
    employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.department?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetails(true);
  };

  const handleDeleteEmployee = async (id: number) => {
    await deleteEmployeeMutation.mutateAsync(id);
  };

  const handleToggleStatus = async (employee: Employee) => {
    await toggleEmployeeStatusMutation.mutateAsync({
      id: employee.id,
      isActive: !employee.isActive
    });
  };

  const handlePayrollStamp = (employee: Employee) => {
    setPayrollEmployee(employee);
    setShowPayrollModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="bg-white rounded-lg p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-red-500 mb-2">❌</div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">Error al cargar empleados</h3>
                <p className="text-red-600">No se pudieron cargar los datos de empleados</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Registro de Empleados</h1>
          <p className="text-gray-600">Base de datos de empleados registrados en el sistema</p>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Empleados Registrados ({filteredEmployees.length})
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Gestiona la información de todos los empleados
                </CardDescription>
              </div>
              <Button
                onClick={onAddEmployee}
                className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Agregar Empleado
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Barra de búsqueda */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, número de empleado, puesto o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Tabla de empleados */}
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {searchTerm ? "No se encontraron empleados" : "No hay empleados registrados"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? "Intenta con otros términos de búsqueda" : "Comienza agregando tu primer empleado"}
                </p>
                {!searchTerm && (
                  <Button onClick={onAddEmployee} className="bg-gradient-to-r from-blue-500 to-purple-600">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Agregar Primer Empleado
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Fecha de Nacimiento</TableHead>
                      <TableHead>Fecha de Contratación</TableHead>
                      <TableHead>Salario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee: Employee) => (
                      <TableRow key={employee.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-semibold text-gray-900">{employee.fullName}</div>
                            <div className="text-sm text-gray-500">#{employee.employeeNumber}</div>
                            {employee.email && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {employee.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{employee.position}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4 text-gray-400" />
                            {employee.department || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-purple-500" />
                            {employee.birthDate ? format(new Date(employee.birthDate), "dd/MM/yyyy", { locale: es }) : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            {employee.hireDate ? format(new Date(employee.hireDate), "dd/MM/yyyy", { locale: es }) : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="font-semibold text-green-600">
                              ${parseFloat(employee.salary).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 capitalize">{employee.salaryType}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={employee.isActive ? "default" : "secondary"}
                            className={employee.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                          >
                            {employee.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(employee)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayrollStamp(employee)}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Timbrar Nómina"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(employee)}
                              className={`h-8 w-8 p-0 ${employee.isActive ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
                              title={employee.isActive ? 'Desactivar empleado' : 'Activar empleado'}
                            >
                              {employee.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará permanentemente
                                    el empleado <strong>{employee.fullName}</strong> del sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteEmployee(employee.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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

        {/* Modal de detalles del empleado */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Detalles del Empleado
              </DialogTitle>
              <DialogDescription>
                Información completa de {selectedEmployee?.fullName}
              </DialogDescription>
            </DialogHeader>
            
            {selectedEmployee && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información Personal */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Información Personal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Nombre Completo</Label>
                      <p className="font-semibold">{selectedEmployee.fullName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Número de Empleado</Label>
                      <p className="font-mono">{selectedEmployee.employeeNumber}</p>
                    </div>
                    {selectedEmployee.email && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </Label>
                        <p>{selectedEmployee.email}</p>
                      </div>
                    )}
                    {selectedEmployee.phone && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Teléfono
                        </Label>
                        <p>{selectedEmployee.phone}</p>
                      </div>
                    )}
                    {selectedEmployee.address && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Dirección
                        </Label>
                        <p>{selectedEmployee.address}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Información Laboral */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Información Laboral
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Puesto</Label>
                      <p className="font-semibold">{selectedEmployee.position}</p>
                    </div>
                    {selectedEmployee.department && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          Departamento
                        </Label>
                        <p>{selectedEmployee.department}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fecha de Contratación
                      </Label>
                      <p>{format(new Date(selectedEmployee.hireDate), "dd/MM/yyyy", { locale: es })}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Salario
                      </Label>
                      <p className="font-semibold text-green-600">
                        ${parseFloat(selectedEmployee.salary).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">{selectedEmployee.salaryType}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Estado</Label>
                      <Badge
                        variant={selectedEmployee.isActive ? "default" : "secondary"}
                        className={selectedEmployee.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                      >
                        {selectedEmployee.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Información Bancaria */}
                {(selectedEmployee.bankAccount || selectedEmployee.clabe) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Información Bancaria
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedEmployee.bankAccount && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Cuenta Bancaria</Label>
                          <p className="font-mono">{selectedEmployee.bankAccount}</p>
                        </div>
                      )}
                      {selectedEmployee.clabe && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">CLABE</Label>
                          <p className="font-mono">{selectedEmployee.clabe}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Información Legal */}
                {(selectedEmployee.curp || selectedEmployee.rfc || selectedEmployee.nss) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Información Legal
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedEmployee.curp && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">CURP</Label>
                          <p className="font-mono">{selectedEmployee.curp}</p>
                        </div>
                      )}
                      {selectedEmployee.rfc && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">RFC</Label>
                          <p className="font-mono">{selectedEmployee.rfc}</p>
                        </div>
                      )}
                      {selectedEmployee.nss && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">NSS</Label>
                          <p className="font-mono">{selectedEmployee.nss}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Contacto de Emergencia */}
                {(selectedEmployee.emergencyContact || selectedEmployee.emergencyPhone) && (
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Contacto de Emergencia
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedEmployee.emergencyContact && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Contacto</Label>
                          <p>{selectedEmployee.emergencyContact}</p>
                        </div>
                      )}
                      {selectedEmployee.emergencyPhone && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Teléfono</Label>
                          <p>{selectedEmployee.emergencyPhone}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Notas */}
                {selectedEmployee.notes && (
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Notas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedEmployee.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setShowDetails(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Timbrado de Nómina */}
        <EnhancedPayrollStampModal
          isOpen={showPayrollModal}
          onClose={() => setShowPayrollModal(false)}
          employee={payrollEmployee}
        />
      </div>
    </div>
  );
}