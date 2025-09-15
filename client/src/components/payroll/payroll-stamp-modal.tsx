import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calculator, FileText, User, Calendar, DollarSign, Minus, Plus } from "lucide-react";
import { format } from "date-fns";
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
  // Percepciones
  baseSalary: number;
  overtime: number;
  bonuses: number;
  commissions: number;
  // Deducciones
  imss: number;
  isr: number;
  loans: number;
  advances: number;
  otherDeductions: number;
  // Totales
  totalPerceptions: number;
  totalDeductions: number;
  netPay: number;
}

export default function PayrollStampModal({ isOpen, onClose, employee }: PayrollStampModalProps) {
  const [payrollData, setPayrollData] = useState<PayrollData>({
    employeeId: 0,
    payrollDate: format(new Date(), "yyyy-MM-dd"),
    periodStart: format(new Date(), "yyyy-MM-dd"),
    periodEnd: format(new Date(), "yyyy-MM-dd"),
    absences: 0,
    permissions: 0,
    vacations: 0,
    baseSalary: 0,
    overtime: 0,
    bonuses: 0,
    commissions: 0,
    imss: 0,
    isr: 0,
    loans: 0,
    advances: 0,
    otherDeductions: 0,
    totalPerceptions: 0,
    totalDeductions: 0,
    netPay: 0,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calcular salario base según modalidad de pago
  useEffect(() => {
    if (employee) {
      const salary = parseFloat(employee.salary);
      let calculatedBaseSalary = 0;

      switch (employee.salaryType) {
        case "monthly":
          calculatedBaseSalary = salary;
          break;
        case "biweekly":
          calculatedBaseSalary = salary * 2;
          break;
        case "weekly":
          calculatedBaseSalary = salary * 4.33; // Promedio mensual
          break;
        case "daily":
          calculatedBaseSalary = salary * 30;
          break;
        default:
          calculatedBaseSalary = salary;
      }

      setPayrollData(prev => ({
        ...prev,
        employeeId: employee.id,
        baseSalary: calculatedBaseSalary,
      }));
    }
  }, [employee]);

  // Calcular deducciones automáticamente
  useEffect(() => {
    const baseSalary = payrollData.baseSalary;
    
    // Cálculo IMSS (empleado paga 3.625% del SBC)
    const imssDeduction = baseSalary * 0.03625;
    
    // Cálculo ISR simplificado (tabla 2025)
    let isrDeduction = 0;
    if (baseSalary > 8952.49) {
      isrDeduction = baseSalary * 0.10; // Simplificado para demo
    }

    setPayrollData(prev => ({
      ...prev,
      imss: Math.round(imssDeduction * 100) / 100,
      isr: Math.round(isrDeduction * 100) / 100,
    }));
  }, [payrollData.baseSalary]);

  // Calcular totales
  useEffect(() => {
    const totalPerceptions = payrollData.baseSalary + payrollData.overtime + payrollData.bonuses + payrollData.commissions;
    const totalDeductions = payrollData.imss + payrollData.isr + payrollData.loans + payrollData.advances + payrollData.otherDeductions;
    const netPay = totalPerceptions - totalDeductions;

    setPayrollData(prev => ({
      ...prev,
      totalPerceptions: Math.round(totalPerceptions * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
    }));
  }, [
    payrollData.baseSalary,
    payrollData.overtime,
    payrollData.bonuses,
    payrollData.commissions,
    payrollData.imss,
    payrollData.isr,
    payrollData.loans,
    payrollData.advances,
    payrollData.otherDeductions,
  ]);

  const createPayrollMutation = useMutation({
    mutationFn: async (data: PayrollData) => {
      const response = await apiRequest("POST", "/api/payroll/stamp", data);
      return response;
    },
    onSuccess: (response) => {
      toast({
        title: "✅ Nómina Timbrada",
        description: "El recibo de nómina ha sido generado exitosamente",
      });
      
      // Abrir ventana de impresión
      if (response.receiptHtml) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(response.receiptHtml);
          printWindow.document.close();
          printWindow.print();
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Error al timbrar nómina",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof PayrollData, value: string | number) => {
    setPayrollData(prev => ({
      ...prev,
      [field]: typeof value === "string" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = () => {
    if (!employee) return;
    
    createPayrollMutation.mutate(payrollData);
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-blue-600" />
            Timbrar Nómina - {employee.fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información del Empleado */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-4 w-4" />
                Datos del Empleado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-500">Empleado</Label>
                <p className="font-semibold">{employee.fullName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Número</Label>
                <p className="font-mono">{employee.employeeNumber}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Puesto</Label>
                <p>{employee.position}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Salario ({employee.salaryType})</Label>
                <p className="text-green-600 font-semibold">
                  ${parseFloat(employee.salary).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Período y Fecha */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-4 w-4" />
                Período de Nómina
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="payrollDate">Fecha de Timbrado</Label>
                <Input
                  id="payrollDate"
                  type="date"
                  value={payrollData.payrollDate}
                  onChange={(e) => handleInputChange("payrollDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="periodStart">Período Inicio</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={payrollData.periodStart}
                  onChange={(e) => handleInputChange("periodStart", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="periodEnd">Período Fin</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={payrollData.periodEnd}
                  onChange={(e) => handleInputChange("periodEnd", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ausencias y Permisos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ausencias y Permisos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="absences">Faltas</Label>
                <Input
                  id="absences"
                  type="number"
                  min="0"
                  value={payrollData.absences}
                  onChange={(e) => handleInputChange("absences", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="permissions">Permisos</Label>
                <Input
                  id="permissions"
                  type="number"
                  min="0"
                  value={payrollData.permissions}
                  onChange={(e) => handleInputChange("permissions", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="vacations">Vacaciones</Label>
                <Input
                  id="vacations"
                  type="number"
                  min="0"
                  value={payrollData.vacations}
                  onChange={(e) => handleInputChange("vacations", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Percepciones */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-green-700">
                <Plus className="h-4 w-4" />
                Percepciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="baseSalary">Salario Base</Label>
                <Input
                  id="baseSalary"
                  type="number"
                  step="0.01"
                  value={payrollData.baseSalary}
                  onChange={(e) => handleInputChange("baseSalary", e.target.value)}
                  className="bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="overtime">Tiempo Extra</Label>
                <Input
                  id="overtime"
                  type="number"
                  step="0.01"
                  min="0"
                  value={payrollData.overtime}
                  onChange={(e) => handleInputChange("overtime", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bonuses">Bonificaciones</Label>
                <Input
                  id="bonuses"
                  type="number"
                  step="0.01"
                  min="0"
                  value={payrollData.bonuses}
                  onChange={(e) => handleInputChange("bonuses", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="commissions">Comisiones</Label>
                <Input
                  id="commissions"
                  type="number"
                  step="0.01"
                  min="0"
                  value={payrollData.commissions}
                  onChange={(e) => handleInputChange("commissions", e.target.value)}
                />
              </div>
              <Separator />
              <div className="flex justify-between items-center font-semibold text-green-700">
                <span>Total Percepciones:</span>
                <span>${payrollData.totalPerceptions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

          {/* Deducciones */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                <Minus className="h-4 w-4" />
                Deducciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="imss">IMSS (Automático)</Label>
                <Input
                  id="imss"
                  type="number"
                  step="0.01"
                  value={payrollData.imss}
                  className="bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="isr">ISR (Automático)</Label>
                <Input
                  id="isr"
                  type="number"
                  step="0.01"
                  value={payrollData.isr}
                  className="bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="loans">Préstamos</Label>
                <Input
                  id="loans"
                  type="number"
                  step="0.01"
                  min="0"
                  value={payrollData.loans}
                  onChange={(e) => handleInputChange("loans", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="advances">Adelantos de Nómina</Label>
                <Input
                  id="advances"
                  type="number"
                  step="0.01"
                  min="0"
                  value={payrollData.advances}
                  onChange={(e) => handleInputChange("advances", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="otherDeductions">Otras Deducciones</Label>
                <Input
                  id="otherDeductions"
                  type="number"
                  step="0.01"
                  min="0"
                  value={payrollData.otherDeductions}
                  onChange={(e) => handleInputChange("otherDeductions", e.target.value)}
                />
              </div>
              <Separator />
              <div className="flex justify-between items-center font-semibold text-red-700">
                <span>Total Deducciones:</span>
                <span>${payrollData.totalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Neto a Pagar */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-blue-600" />
                <span className="text-xl font-semibold text-blue-800">Neto a Pagar:</span>
              </div>
              <span className="text-2xl font-bold text-blue-800">
                ${payrollData.netPay.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createPayrollMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createPayrollMutation.isPending ? (
              <>
                <Calculator className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Timbrar e Imprimir
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}