import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Calendar, 
  User, 
  DollarSign, 
  Calculator, 
  Clock, 
  AlertTriangle, 
  Gift, 
  Briefcase,
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  UserX,
  Plane
} from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import type { Employee } from "@shared/schema";

interface PayrollStampModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

interface PayrollData {
  employeeId: number;
  payrollDate: string;
  periodStart: string;
  periodEnd: string;
  absences: number;
  permissions: number;
  vacations: number;
  baseSalary: number;
  overtime: number;
  bonuses: number;
  commissions: number;
  vacationBonus: number;
  imss: number;
  isr: number;
  loans: number;
  advances: number;
  otherDeductions: number;
  absenceDeductions: number;
  permissionDeductions: number;
  totalPerceptions: number;
  totalDeductions: number;
  netPay: number;
}

export default function EnhancedPayrollStampModal({ isOpen, onClose, employee }: PayrollStampModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [payrollData, setPayrollData] = useState<PayrollData>({
    employeeId: 0,
    payrollDate: format(new Date(), "yyyy-MM-dd"),
    periodStart: format(new Date(), "yyyy-MM-dd"),
    periodEnd: format(addDays(new Date(), 14), "yyyy-MM-dd"),
    absences: 0,
    permissions: 0,
    vacations: 0,
    baseSalary: 0,
    overtime: 0,
    bonuses: 0,
    commissions: 0,
    vacationBonus: 0,
    imss: 0,
    isr: 0,
    loans: 0,
    advances: 0,
    otherDeductions: 0,
    absenceDeductions: 0,
    permissionDeductions: 0,
    totalPerceptions: 0,
    totalDeductions: 0,
    netPay: 0,
  });

  // Calcular salario mensual para mostrar (si es quincenal, multiplicar x2)
  const calculateDisplayMonthlySalary = (salary: number, salaryType: string) => {
    return salaryType === 'biweekly' ? salary * 2 : salary;
  };

  // Obtener salario quincenal real (si es mensual, dividir entre 2)
  const getBiweeklySalary = (salary: number, salaryType: string) => {
    return salaryType === 'monthly' ? salary / 2 : salary;
  };

  // Calcular descuentos por faltas/permisos
  const calculateAbsenceDeductions = (biweeklySalary: number, absences: number, permissions: number) => {
    const dailySalary = biweeklySalary / 15; // 15 días laborales en quincena
    const absenceDeduction = dailySalary * absences;
    const permissionDeduction = dailySalary * permissions;
    return { absenceDeduction, permissionDeduction };
  };

  // Calcular prima vacacional (25% del salario por días de vacaciones)
  const calculateVacationBonus = (biweeklySalary: number, vacationDays: number) => {
    const dailySalary = biweeklySalary / 15;
    const vacationPay = dailySalary * vacationDays;
    const vacationBonus = vacationPay * 0.25; // 25% de prima vacacional legal
    return { vacationPay, vacationBonus };
  };

  // Recalcular totales automáticamente
  useEffect(() => {
    if (!employee) return;

    const employeeSalary = parseFloat(employee.salary || "0");
    const biweeklySalary = getBiweeklySalary(employeeSalary, employee.salaryType);
    
    // Calcular descuentos por faltas y permisos
    const { absenceDeduction, permissionDeduction } = calculateAbsenceDeductions(
      biweeklySalary, 
      payrollData.absences, 
      payrollData.permissions
    );

    // Calcular prima vacacional
    const { vacationPay, vacationBonus } = calculateVacationBonus(
      biweeklySalary, 
      payrollData.vacations
    );

    // Calcular IMSS (empleado paga aproximadamente 2.375%)
    const imssDeduction = biweeklySalary * 0.02375;
    
    // Calcular ISR básico (estimado)
    const isrDeduction = biweeklySalary * 0.10; // Estimación básica

    // Totales
    const totalPerceptions = biweeklySalary + payrollData.overtime + payrollData.bonuses + 
                           payrollData.commissions + vacationPay + vacationBonus;
    
    const totalDeductions = imssDeduction + isrDeduction + payrollData.loans + 
                          payrollData.advances + payrollData.otherDeductions + 
                          absenceDeduction + permissionDeduction;

    const netPay = totalPerceptions - totalDeductions;

    setPayrollData(prev => ({
      ...prev,
      employeeId: employee.id,
      baseSalary: biweeklySalary,
      vacationBonus,
      imss: imssDeduction,
      isr: isrDeduction,
      absenceDeductions: absenceDeduction,
      permissionDeductions: permissionDeduction,
      totalPerceptions,
      totalDeductions,
      netPay: Math.max(0, netPay) // No puede ser negativo
    }));
  }, [employee, payrollData.absences, payrollData.permissions, payrollData.vacations, 
      payrollData.overtime, payrollData.bonuses, payrollData.commissions, 
      payrollData.loans, payrollData.advances, payrollData.otherDeductions]);

  const stampMutation = useMutation({
    mutationFn: async (data: PayrollData) => {
      const response = await fetch("/api/payroll/stamp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al timbrar nómina");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Nómina Timbrada",
        description: "La nómina se ha procesado exitosamente",
      });
      
      // Imprimir recibo si está disponible
      if (data.receiptHtml) {
        printReceipt(data.receiptHtml);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const printReceipt = (html: string) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleSubmit = () => {
    if (!employee) return;
    stampMutation.mutate(payrollData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
              <Receipt className="w-6 h-6" />
            </div>
            Timbrar Nómina - {employee.firstName} {employee.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información del Empleado */}
          <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-blue-600" />
                Datos del Empleado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Número:</span>
                <Badge variant="secondary">{employee.employeeNumber}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Puesto:</span>
                <span className="text-sm font-semibold">{employee.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Salario Mensual:</span>
                <span className="text-sm font-bold text-green-600">
                  {formatCurrency(calculateDisplayMonthlySalary(parseFloat(employee.salary || "0"), employee.salaryType))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Frecuencia:</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {employee.salaryType === 'monthly' ? 'Mensual' : 'Quincenal'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Período de Nómina */}
          <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-green-600" />
                Período de Nómina
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="payrollDate" className="text-sm font-medium">Fecha de Timbrado</Label>
                <Input
                  id="payrollDate"
                  type="date"
                  value={payrollData.payrollDate}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, payrollDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="periodStart" className="text-sm font-medium">Inicio</Label>
                  <Input
                    id="periodStart"
                    type="date"
                    value={payrollData.periodStart}
                    onChange={(e) => setPayrollData(prev => ({ ...prev, periodStart: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="periodEnd" className="text-sm font-medium">Fin</Label>
                  <Input
                    id="periodEnd"
                    type="date"
                    value={payrollData.periodEnd}
                    onChange={(e) => setPayrollData(prev => ({ ...prev, periodEnd: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Asistencia y Permisos */}
        <Card className="border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-orange-600" />
              Asistencia y Permisos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="absences" className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Faltas
                </Label>
                <Input
                  id="absences"
                  type="number"
                  min="0"
                  value={payrollData.absences}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, absences: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
                {payrollData.absenceDeductions > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Descuento: {formatCurrency(payrollData.absenceDeductions)}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="permissions" className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-yellow-500" />
                  Permisos
                </Label>
                <Input
                  id="permissions"
                  type="number"
                  min="0"
                  value={payrollData.permissions}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, permissions: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
                {payrollData.permissionDeductions > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Descuento: {formatCurrency(payrollData.permissionDeductions)}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="vacations" className="text-sm font-medium flex items-center gap-2">
                  <Gift className="w-4 h-4 text-green-500" />
                  Vacaciones
                </Label>
                <Input
                  id="vacations"
                  type="number"
                  min="0"
                  value={payrollData.vacations}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, vacations: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                />
                {payrollData.vacationBonus > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    Prima: {formatCurrency(payrollData.vacationBonus)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Percepciones */}
          <Card className="border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-green-700">
                <TrendingUp className="w-5 h-5" />
                Percepciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-semibold text-green-700">Salario Base (Quincenal)</span>
                <span className="font-bold text-green-800">{formatCurrency(payrollData.baseSalary)}</span>
              </div>
              
              <div>
                <Label htmlFor="overtime" className="text-sm font-medium">Tiempo Extra</Label>
                <Input
                  id="overtime"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollData.overtime}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, overtime: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>

              {/* Prima Vacacional - Solo aparece cuando hay vacaciones */}
              {payrollData.vacations > 0 && (
                <div className="flex justify-between items-center p-3 bg-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Plane className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-blue-700">Prima Vacacional ({payrollData.vacations} días)</span>
                  </div>
                  <span className="font-bold text-blue-800">{formatCurrency(payrollData.vacationBonus)}</span>
                </div>
              )}

              <div>
                <Label htmlFor="bonuses" className="text-sm font-medium">Bonificaciones</Label>
                <Input
                  id="bonuses"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollData.bonuses}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, bonuses: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="commissions" className="text-sm font-medium">Comisiones</Label>
                <Input
                  id="commissions"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollData.commissions}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, commissions: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>

              <Separator />
              <div className="flex justify-between items-center p-3 bg-green-100 rounded-lg">
                <span className="font-bold text-green-800">Total Percepciones</span>
                <span className="font-bold text-xl text-green-900">{formatCurrency(payrollData.totalPerceptions)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Deducciones */}
          <Card className="border-2 border-red-100 bg-gradient-to-br from-red-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                <TrendingDown className="w-5 h-5" />
                Deducciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-semibold text-red-700">IMSS (Automático)</span>
                <span className="font-bold text-red-800">{formatCurrency(payrollData.imss)}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <span className="font-semibold text-red-700">ISR (Automático)</span>
                <span className="font-bold text-red-800">{formatCurrency(payrollData.isr)}</span>
              </div>

              {/* Descuento por Faltas - Solo aparece cuando hay faltas */}
              {payrollData.absences > 0 && (
                <div className="flex justify-between items-center p-3 bg-red-100 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2">
                    <UserX className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-red-700">Descuento por Faltas ({payrollData.absences} días)</span>
                  </div>
                  <span className="font-bold text-red-800">{formatCurrency(payrollData.absenceDeductions)}</span>
                </div>
              )}

              {/* Descuento por Permisos - Solo aparece cuando hay permisos */}
              {payrollData.permissions > 0 && (
                <div className="flex justify-between items-center p-3 bg-orange-100 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="font-semibold text-orange-700">Descuento por Permisos ({payrollData.permissions} días)</span>
                  </div>
                  <span className="font-bold text-orange-800">{formatCurrency(payrollData.permissionDeductions)}</span>
                </div>
              )}

              <div>
                <Label htmlFor="loans" className="text-sm font-medium">Préstamos</Label>
                <Input
                  id="loans"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollData.loans}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, loans: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="advances" className="text-sm font-medium">Adelantos de Nómina</Label>
                <Input
                  id="advances"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollData.advances}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, advances: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="otherDeductions" className="text-sm font-medium">Otras Deducciones</Label>
                <Input
                  id="otherDeductions"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payrollData.otherDeductions}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, otherDeductions: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                />
              </div>

              <Separator />
              <div className="flex justify-between items-center p-3 bg-red-100 rounded-lg">
                <span className="font-bold text-red-800">Total Deducciones</span>
                <span className="font-bold text-xl text-red-900">{formatCurrency(payrollData.totalDeductions)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Neto a Pagar */}
        <Card className="border-4 border-blue-200 bg-gradient-to-br from-blue-100 to-purple-100">
          <CardContent className="py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
                  <DollarSign className="w-6 h-6" />
                </div>
                <span className="text-2xl font-bold text-gray-800">Neto a Pagar</span>
              </div>
              <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {formatCurrency(payrollData.netPay)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-6"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={stampMutation.isPending}
            className="px-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {stampMutation.isPending ? (
              <>
                <Calculator className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4 mr-2" />
                Timbrar Nómina
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}