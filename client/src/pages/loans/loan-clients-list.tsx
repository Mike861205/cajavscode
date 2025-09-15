import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Eye, 
  Phone, 
  Mail, 
  Building, 
  DollarSign, 
  Users, 
  Calendar,
  UserCheck,
  TrendingUp,
  Calculator,
  CheckCircle,
  XCircle,
  FileText,
  Settings
} from "lucide-react";

// Función para calcular tabla de amortización
const calculateAmortizationSchedule = (principal: number, annualRate: number, termMonths: number) => {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                        (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  const schedule = [];
  let remainingBalance = principal;
  
  for (let month = 1; month <= termMonths; month++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance = remainingBalance - principalPayment;
    
    schedule.push({
      month,
      paymentAmount: monthlyPayment,
      principalPayment,
      interestPayment,
      remainingBalance: Math.max(0, remainingBalance),
      date: new Date(new Date().setMonth(new Date().getMonth() + month)).toLocaleDateString('es-MX')
    });
  }
  
  return schedule;
};

interface LoanClient {
  id: number;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  yearsExperience?: number;
  monthlyIncome?: string;
  monthlyExpenses?: string;
  status: string;
  creditStatus?: string;
  approvedAmount?: string;
  loanTermMonths?: number;
  interestRate?: string;
  monthlyPayment?: string;
  debtToIncomeRatio?: string;
  creditScore?: number;
  approvalNotes?: string;
  createdAt: string;
  references?: PersonalReference[];
}

interface PersonalReference {
  id: number;
  name: string;
  phone: string;
  address?: string;
}

export default function LoanClientsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<LoanClient | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authForm, setAuthForm] = useState({
    approvedAmount: "",
    loanTermMonths: "",
    interestRate: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch loan clients
  const { data: loanClients = [], isLoading } = useQuery({
    queryKey: ["/api/loan-clients"],
  });

  // Mutations for credit evaluation and authorization
  const evaluateCredit = useMutation({
    mutationFn: async (clientId: number) => {
      const response = await fetch(`/api/loan-clients/${clientId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        throw new Error("Error al evaluar crédito");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/loan-clients"] });
      toast({
        title: "Evaluación completada",
        description: `Cliente ${data.creditStatus === "approved" ? "aprobado" : "rechazado"} para préstamo`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo evaluar el crédito",
        variant: "destructive"
      });
    }
  });

  const authorizeCredit = useMutation({
    mutationFn: async (data: { clientId: number; approvedAmount: number; loanTermMonths: number; interestRate: number }) => {
      const response = await fetch(`/api/loan-clients/${data.clientId}/authorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvedAmount: data.approvedAmount,
          loanTermMonths: data.loanTermMonths,
          interestRate: data.interestRate
        })
      });
      if (!response.ok) {
        throw new Error("Error al autorizar préstamo");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/loan-clients"] });
      setShowAuthDialog(false);
      setAuthForm({ approvedAmount: "", loanTermMonths: "", interestRate: "" });
      toast({
        title: "Préstamo autorizado",
        description: `Préstamo autorizado por ${formatCurrency(data.calculation.principal)}`
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo autorizar el préstamo",
        variant: "destructive"
      });
    }
  });

  // Filter clients based on search term
  const filteredClients = loanClients.filter((client: LoanClient) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (amount: string | undefined) => {
    if (!amount) return "No especificado";
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Activo", className: "bg-green-100 text-green-800 border-green-200" },
      inactive: { label: "Inactivo", className: "bg-gray-100 text-gray-800 border-gray-200" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  }

  const getCreditStatusBadge = (creditStatus: string) => {
    const variants: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Settings },
      approved: { label: "Aprobado", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      rejected: { label: "Rechazado", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle }
    };

    const variant = variants[creditStatus] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={`${variant.color} border font-medium flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {variant.label}
      </Badge>
    );
  };;

  // Calculate statistics
  const totalClients = loanClients.length;
  const activeClients = loanClients.filter((client: LoanClient) => client.status === 'active').length;
  const averageIncome = loanClients.reduce((sum: number, client: LoanClient) => {
    if (client.monthlyIncome) {
      return sum + parseFloat(client.monthlyIncome);
    }
    return sum;
  }, 0) / (loanClients.filter((client: LoanClient) => client.monthlyIncome).length || 1);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-green-500 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Lista de Clientes - Préstamos</h1>
              <p className="text-purple-100">Cargando clientes de préstamos...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-green-500 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Lista de Clientes - Préstamos</h1>
            <p className="text-purple-100">Gestión de clientes registrados para préstamos</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-blue-600">{totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Clientes Activos</p>
                <p className="text-2xl font-bold text-green-600">{activeClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ingreso Promedio</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(averageIncome.toString())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800">Buscar Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, teléfono, email o empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-800">
            Clientes Registrados ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? "No se encontraron clientes" : "No hay clientes registrados"}
              </p>
              <p className="text-gray-400">
                {searchTerm ? "Intenta con diferentes términos de búsqueda" : "Registra tu primer cliente para comenzar"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Ingreso Mensual</TableHead>
                    <TableHead>Estado Crédito</TableHead>
                    <TableHead>Monto Aprobado</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client: LoanClient) => (
                    <TableRow key={client.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{client.name}</p>
                          <p className="text-sm text-gray-500">ID: {client.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </div>
                          {client.email && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {client.company || "No especificado"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-600">
                            {formatCurrency(client.monthlyIncome)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getCreditStatusBadge(client.creditStatus || "pending")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-600">
                            {client.approvedAmount ? formatCurrency(client.approvedAmount) : "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {formatDate(client.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedClient(client)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Detalles del Cliente - {selectedClient?.name}
                              </DialogTitle>
                            </DialogHeader>
                            
                            {selectedClient && (
                              <div className="space-y-6">
                                {/* Información Personal */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg text-blue-700">Información Personal</CardTitle>
                                  </CardHeader>
                                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="font-medium">Nombre Completo</p>
                                      <p className="text-gray-600">{selectedClient.name}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Teléfono</p>
                                      <p className="text-gray-600">{selectedClient.phone}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Email</p>
                                      <p className="text-gray-600">{selectedClient.email || "No especificado"}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Estado</p>
                                      <div className="mt-1">
                                        {getStatusBadge(selectedClient.status)}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Información Laboral */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg text-green-700">Información Laboral</CardTitle>
                                  </CardHeader>
                                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="font-medium">Empresa</p>
                                      <p className="text-gray-600">{selectedClient.company || "No especificado"}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Antigüedad Laboral</p>
                                      <p className="text-gray-600">
                                        {selectedClient.yearsExperience ? `${selectedClient.yearsExperience} años` : "No especificado"}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Información Financiera */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg text-orange-700">Información Financiera</CardTitle>
                                  </CardHeader>
                                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="font-medium">Ingreso Mensual</p>
                                      <p className="text-gray-600 font-semibold">
                                        {formatCurrency(selectedClient.monthlyIncome)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Gastos Mensuales</p>
                                      <p className="text-gray-600 font-semibold">
                                        {formatCurrency(selectedClient.monthlyExpenses)}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Referencias Personales */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg text-purple-700">Referencias Personales</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    {selectedClient.references && selectedClient.references.length > 0 ? (
                                      <div className="space-y-4">
                                        {selectedClient.references.map((reference, index) => (
                                          <div key={reference.id} className="p-4 border rounded-lg bg-gray-50">
                                            <h4 className="font-medium text-gray-800 mb-2">
                                              Referencia {index + 1}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                              <div>
                                                <span className="font-medium">Nombre:</span> {reference.name}
                                              </div>
                                              <div>
                                                <span className="font-medium">Teléfono:</span> {reference.phone}
                                              </div>
                                              {reference.address && (
                                                <div className="md:col-span-2">
                                                  <span className="font-medium">Dirección:</span> {reference.address}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-gray-500">No hay referencias registradas</p>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {/* Botón de evaluación crediticia */}
                        {client.creditStatus === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => evaluateCredit.mutate(client.id)}
                            disabled={evaluateCredit.isPending}
                            className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                          >
                            <Calculator className="h-4 w-4 mr-1" />
                            {evaluateCredit.isPending ? "Evaluando..." : "Evaluar"}
                          </Button>
                        )}

                        {/* Botón de autorización */}
                        {client.creditStatus === "approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClient(client);
                              setShowAuthDialog(true);
                              // Pre-cargar datos si ya existen
                              if (client.approvedAmount) {
                                setAuthForm({
                                  approvedAmount: client.approvedAmount.toString(),
                                  loanTermMonths: client.loanTermMonths?.toString() || '',
                                  interestRate: client.interestRate?.toString() || ''
                                });
                              }
                            }}
                            className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {client.approvedAmount ? "Re-autorizar" : "Autorizar"}
                          </Button>
                        )}

                        {/* Botón de contrato */}
                        {client.creditStatus === "approved" && client.approvedAmount && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/loan-clients/${client.id}/contract`, '_blank')}
                            className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Contrato
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

      {/* Modal de autorización de préstamo */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Autorizar Préstamo - {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="authorization" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="authorization">Autorización</TabsTrigger>
              <TabsTrigger value="amortization">Tabla de Amortización</TabsTrigger>
            </TabsList>
            
            <TabsContent value="authorization" className="space-y-4 mt-4">
              {/* Información del monto aprobado automáticamente */}
              {selectedClient?.approvedAmount && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Evaluación Automática</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Monto máximo aprobado: <span className="font-bold">${parseFloat(selectedClient.approvedAmount).toLocaleString()} MXN</span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Puedes reducir el monto, pero no aumentarlo más allá del límite aprobado
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="approvedAmount">Monto a Autorizar (MXN)</Label>
                <Input
                  id="approvedAmount"
                  type="number"
                  placeholder="Ej: 50000"
                  value={authForm.approvedAmount}
                  onChange={(e) => {
                    const newAmount = parseFloat(e.target.value) || 0;
                    const maxAmount = selectedClient?.approvedAmount ? parseFloat(selectedClient.approvedAmount) : 0;
                    
                    if (newAmount <= maxAmount) {
                      setAuthForm(prev => ({ ...prev, approvedAmount: e.target.value }));
                    }
                  }}
                  max={selectedClient?.approvedAmount || undefined}
                />
                {authForm.approvedAmount && selectedClient?.approvedAmount && 
                 parseFloat(authForm.approvedAmount) > parseFloat(selectedClient.approvedAmount) && (
                  <p className="text-sm text-red-600 mt-1">
                    El monto no puede ser mayor a ${parseFloat(selectedClient.approvedAmount).toLocaleString()} MXN
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="loanTermMonths">Plazo (meses)</Label>
                <Input
                  id="loanTermMonths"
                  type="number"
                  placeholder="Ej: 12"
                  value={authForm.loanTermMonths}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, loanTermMonths: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="interestRate">Tasa de Interés Anual (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 18.5"
                  value={authForm.interestRate}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, interestRate: e.target.value }))}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAuthDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (selectedClient && authForm.approvedAmount && authForm.loanTermMonths && authForm.interestRate) {
                      authorizeCredit.mutate({
                        clientId: selectedClient.id,
                        approvedAmount: parseFloat(authForm.approvedAmount),
                        loanTermMonths: parseInt(authForm.loanTermMonths),
                        interestRate: parseFloat(authForm.interestRate)
                      });
                    }
                  }}
                  disabled={authorizeCredit.isPending || !authForm.approvedAmount || !authForm.loanTermMonths || !authForm.interestRate}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {authorizeCredit.isPending ? "Procesando..." : "Autorizar"}
                </Button>
              </div>
            </TabsContent>
            
            {/* Pestaña de Tabla de Amortización */}
            <TabsContent value="amortization" className="space-y-4 mt-4">
              {authForm.approvedAmount && authForm.loanTermMonths && authForm.interestRate ? (
                <div className="space-y-4">
                  {/* Resumen del préstamo */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          ${parseFloat(authForm.approvedAmount).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Monto Principal</div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          ${(() => {
                            const schedule = calculateAmortizationSchedule(
                              parseFloat(authForm.approvedAmount),
                              parseFloat(authForm.interestRate),
                              parseInt(authForm.loanTermMonths)
                            );
                            return schedule[0]?.paymentAmount.toLocaleString() || 0;
                          })()}
                        </div>
                        <div className="text-sm text-gray-600">Pago Mensual</div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          ${(() => {
                            const schedule = calculateAmortizationSchedule(
                              parseFloat(authForm.approvedAmount),
                              parseFloat(authForm.interestRate),
                              parseInt(authForm.loanTermMonths)
                            );
                            const totalInterest = schedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
                            return totalInterest.toLocaleString();
                          })()}
                        </div>
                        <div className="text-sm text-gray-600">Total Intereses</div>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          ${(() => {
                            const schedule = calculateAmortizationSchedule(
                              parseFloat(authForm.approvedAmount),
                              parseFloat(authForm.interestRate),
                              parseInt(authForm.loanTermMonths)
                            );
                            const totalInterest = schedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
                            const totalAmount = parseFloat(authForm.approvedAmount) + totalInterest;
                            return totalAmount.toLocaleString();
                          })()}
                        </div>
                        <div className="text-sm text-gray-600">Total a Pagar</div>
                      </div>
                    </Card>
                  </div>
                  
                  {/* Tabla de amortización */}
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mes</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Pago Total</TableHead>
                          <TableHead className="text-right">Capital</TableHead>
                          <TableHead className="text-right">Interés</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculateAmortizationSchedule(
                          parseFloat(authForm.approvedAmount),
                          parseFloat(authForm.interestRate),
                          parseInt(authForm.loanTermMonths)
                        ).map((payment, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{payment.month}</TableCell>
                            <TableCell>{payment.date}</TableCell>
                            <TableCell className="text-right font-semibold">
                              ${payment.paymentAmount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              ${payment.principalPayment.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              ${payment.interestPayment.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ${payment.remainingBalance.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">Complete los datos en la pestaña de Autorización</p>
                  <p className="text-sm text-gray-400">
                    Ingrese el monto, plazo e interés para ver la tabla de amortización
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}