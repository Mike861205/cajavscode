import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, Building, DollarSign, Phone, Mail, MapPin, Shield, Calendar, CreditCard, AlertCircle, UserCheck } from "lucide-react";

interface EmployeeFormSimpleProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EmployeeFormSimple({ onSuccess, onCancel }: EmployeeFormSimpleProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cargar catálogos organizacionales
  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
  });

  const { data: jobPositions = [] } = useQuery({
    queryKey: ["/api/job-positions"],
  });

  // Estado del formulario
  const [formData, setFormData] = useState({
    employeeNumber: "",
    firstName: "",
    lastName: "",
    position: "",
    birthDate: "",
    hireDate: new Date().toISOString().split('T')[0],
    salary: "",
    salaryType: "monthly",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    rfc: "",
    curp: "",
    nss: "",
    department: "",
    bankAccount: "",
    bankName: "",
    clabe: "",
    emergencyContact: "",
    emergencyPhone: "",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validaciones básicas
      if (!formData.employeeNumber || !formData.firstName || !formData.lastName || !formData.position || !formData.salary) {
        toast({
          title: "Error de validación",
          description: "Por favor complete todos los campos obligatorios",
          variant: "destructive",
        });
        return;
      }

      // Preparar datos para envío
      const employeeData = {
        ...formData,
        salary: parseFloat(formData.salary),
        isActive: true,
        status: "active"
      };

      // Enviar al servidor
      await apiRequest("POST", "/api/employees", employeeData);

      toast({
        title: "Empleado registrado",
        description: `${formData.firstName} ${formData.lastName} ha sido registrado exitosamente`,
      });

      // Invalidar cache para actualizar la lista
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });

      // Limpiar formulario
      setFormData({
        employeeNumber: "",
        firstName: "",
        lastName: "",
        position: "",
        birthDate: "",
        hireDate: new Date().toISOString().split('T')[0],
        salary: "",
        salaryType: "monthly",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        rfc: "",
        curp: "",
        nss: "",
        department: "",
        bankAccount: "",
        bankName: "",
        clabe: "",
        emergencyContact: "",
        emergencyPhone: "",
        notes: "",
      });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error("Error al registrar empleado:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el empleado. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Registro de Empleado</h1>
            <p className="text-gray-600 dark:text-gray-400">Complete la información del nuevo empleado</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Personal */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-blue-700 dark:text-blue-300">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeNumber" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Número de Empleado *
                </Label>
                <Input
                  id="employeeNumber"
                  value={formData.employeeNumber}
                  onChange={(e) => handleChange("employeeNumber", e.target.value)}
                  placeholder="001"
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre *
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="Juan"
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Apellido *
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="Pérez"
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fecha de Nacimiento *
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleChange("birthDate", e.target.value)}
                  className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de Contacto */}
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-green-700 dark:text-green-300">
              <Mail className="h-5 w-5" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="juan@empresa.com"
                  className="focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="6241234567"
                  className="focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Laboral */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-purple-700 dark:text-purple-300">
              <Building className="h-5 w-5" />
              Información Laboral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Puesto *
                </Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => handleChange("position", value)}
                >
                  <SelectTrigger className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    <SelectValue placeholder="Selecciona un puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobPositions.map((position: any) => (
                      <SelectItem key={position.id} value={position.title}>
                        {position.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Departamento
                </Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => handleChange("department", value)}
                >
                  <SelectTrigger className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department: any) => (
                      <SelectItem key={department.id} value={department.name}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hireDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fecha de Contratación *
                </Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => handleChange("hireDate", e.target.value)}
                  className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Salarial */}
        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-orange-700 dark:text-orange-300">
              <DollarSign className="h-5 w-5" />
              Información Salarial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Salario *
                </Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) => handleChange("salary", e.target.value)}
                  placeholder="15000"
                  className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryType" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Frecuencia de Pago
                </Label>
                <Select value={formData.salaryType} onValueChange={(value) => handleChange("salaryType", value)}>
                  <SelectTrigger className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="biweekly">Quincenal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Bancaria */}
        <Card className="border-l-4 border-l-teal-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-teal-700 dark:text-teal-300">
              <CreditCard className="h-5 w-5" />
              Información Bancaria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Banco
                </Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => handleChange("bankName", e.target.value)}
                  placeholder="BBVA"
                  className="focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Número de Cuenta
                </Label>
                <Input
                  id="bankAccount"
                  value={formData.bankAccount}
                  onChange={(e) => handleChange("bankAccount", e.target.value)}
                  placeholder="1234567890"
                  className="focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clabe" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  CLABE
                </Label>
                <Input
                  id="clabe"
                  value={formData.clabe}
                  onChange={(e) => handleChange("clabe", e.target.value)}
                  placeholder="012345678901234567"
                  className="focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Legal */}
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-red-700 dark:text-red-300">
              <Shield className="h-5 w-5" />
              Información Legal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rfc" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  RFC
                </Label>
                <Input
                  id="rfc"
                  value={formData.rfc}
                  onChange={(e) => handleChange("rfc", e.target.value)}
                  placeholder="ABCD123456EFG"
                  className="focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="curp" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  CURP
                </Label>
                <Input
                  id="curp"
                  value={formData.curp}
                  onChange={(e) => handleChange("curp", e.target.value)}
                  placeholder="ABCD123456EFGHIJ12"
                  className="focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nss" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  NSS
                </Label>
                <Input
                  id="nss"
                  value={formData.nss}
                  onChange={(e) => handleChange("nss", e.target.value)}
                  placeholder="12345678901"
                  className="focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dirección */}
        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-indigo-700 dark:text-indigo-300">
              <MapPin className="h-5 w-5" />
              Dirección
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dirección
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Calle Principal #123"
                  className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ciudad
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Ciudad de México"
                  className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Estado
                </Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="CDMX"
                  className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Código Postal
                </Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleChange("zipCode", e.target.value)}
                  placeholder="12345"
                  className="focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contacto de Emergencia */}
        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-yellow-700 dark:text-yellow-300">
              <AlertCircle className="h-5 w-5" />
              Contacto de Emergencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre del Contacto
                </Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => handleChange("emergencyContact", e.target.value)}
                  placeholder="María Pérez"
                  className="focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Teléfono de Emergencia
                </Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={(e) => handleChange("emergencyPhone", e.target.value)}
                  placeholder="6241234567"
                  className="focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notas Adicionales */}
        <Card className="border-l-4 border-l-gray-500 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-gray-700 dark:text-gray-300">
              <Building className="h-5 w-5" />
              Notas Adicionales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Información Adicional
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Información adicional sobre el empleado..."
                rows={3}
                className="focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex gap-4 pt-6">
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow-md transition-colors"
          >
            {isSubmitting ? "Registrando..." : "Registrar Empleado"}
          </Button>
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}