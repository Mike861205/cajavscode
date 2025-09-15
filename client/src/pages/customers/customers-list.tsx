import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Customer } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Search, Edit, Trash2, User, Phone, MapPin, FileText, Building, Calendar, CreditCard, Plus, DollarSign, Wallet, Star, TrendingUp, UserCheck, CreditCard as CreditCardIcon, Check, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CustomersList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [creditCustomer, setCreditCustomer] = useState<Customer | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      console.log("🔍 CustomersList - Making GET request to /api/customers");
      const response = await fetch("/api/customers", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("✅ CustomersList - Response received:", data);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Log query state for debugging
  console.log("CustomersList - Query state:", { 
    isLoading, 
    error, 
    customersLength: customers.length,
    customers: customers.map(c => ({ id: c.id, name: c.name }))
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el cliente",
        variant: "destructive",
      });
    },
  });

  const addCreditMutation = useMutation({
    mutationFn: async ({ customerId, amount }: { customerId: number; amount: number }) => {
      const response = await fetch(`/api/customers/${customerId}/add-credit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ amount }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Crédito agregado",
        description: "El crédito ha sido agregado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setCreditAmount("");
      setCreditCustomer(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al agregar crédito",
        variant: "destructive",
      });
    },
  });

  const updateCreditEligibilityMutation = useMutation({
    mutationFn: async ({ customerId, creditEligible }: { customerId: number; creditEligible: boolean }) => {
      const response = await fetch(`/api/customers/${customerId}/credit-eligibility`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ creditEligible }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Elegibilidad actualizada",
        description: data.message || "La elegibilidad de crédito ha sido actualizada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar elegibilidad de crédito",
        variant: "destructive",
      });
    },
  });

  const customersArray = Array.isArray(customers) ? customers : [];
  const filteredCustomers = customersArray.filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.rfc && customer.rfc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando clientes...</p>
        </div>
      </div>
    );
  }

  const totalCredit = customersArray.reduce((sum, customer) => 
    sum + (parseFloat(customer.creditAvailable?.toString() || "0") || 0), 0);
  const activeCustomers = customersArray.filter(customer => 
    (parseFloat(customer.creditAvailable?.toString() || "0") || 0) > 0).length;

  return (
    <div className="space-y-6">
      {/* Header moderno con estadísticas */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <UserCheck className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Clientes Registrados</h1>
              <p className="text-blue-100">Gestión integral de clientes y créditos virtuales</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{customersArray.length}</p>
            <p className="text-blue-100">Total Clientes</p>
          </div>
        </div>
        
        {/* Estadísticas de créditos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-green-300" />
              <div>
                <p className="font-semibold">${totalCredit.toFixed(2)}</p>
                <p className="text-sm text-blue-100">Crédito Total</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Star className="h-6 w-6 text-yellow-300" />
              <div>
                <p className="font-semibold">{activeCustomers}</p>
                <p className="text-sm text-blue-100">Con Crédito</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-emerald-300" />
              <div>
                <p className="font-semibold">{activeCustomers > 0 ? ((activeCustomers / customersArray.length) * 100).toFixed(1) : 0}%</p>
                <p className="text-sm text-blue-100">Tasa Crédito</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-xl border-0">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Users className="h-5 w-5" />
              Lista de Clientes
            </CardTitle>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nombre, teléfono o RFC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Crédito</TableHead>
                  <TableHead>Elegibilidad</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        {searchTerm ? "No se encontraron clientes" : "No hay clientes registrados"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer: Customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{customer.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {customer.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.state ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            {customer.state}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.rfc ? (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <code className="text-sm bg-muted px-1 rounded">{customer.rfc}</code>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full p-1">
                              <Wallet className="h-3 w-3" />
                            </div>
                            <span className="text-sm font-bold text-green-700">
                              ${parseFloat(customer.creditAvailable || "0").toFixed(2)}
                            </span>
                          </div>
                          {parseFloat(customer.creditUsed || "0") > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-full p-1">
                                <CreditCardIcon className="h-3 w-3" />
                              </div>
                              <span className="text-xs text-gray-600">
                                Usado: ${parseFloat(customer.creditUsed || "0").toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateCreditEligibilityMutation.mutate({
                              customerId: customer.id,
                              creditEligible: !customer.creditEligible
                            })}
                            disabled={updateCreditEligibilityMutation.isPending}
                            className={`p-2 rounded-full transition-colors ${
                              customer.creditEligible 
                                ? 'bg-green-100 hover:bg-green-200 text-green-600' 
                                : 'bg-red-100 hover:bg-red-200 text-red-600'
                            }`}
                          >
                            {customer.creditEligible ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(customer.createdAt), "dd/MM/yyyy", { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCreditCustomer(customer)}
                                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 hover:from-green-600 hover:to-emerald-700 shadow-md"
                              >
                                <Wallet className="h-4 w-4 mr-1" />
                                Crédito
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-6 -m-6 mb-4">
                                <DialogHeader>
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="bg-green-500 rounded-full p-2">
                                      <Wallet className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                      <DialogTitle className="text-green-800 text-xl">Agregar Crédito Virtual</DialogTitle>
                                      <DialogDescription className="text-green-700">
                                        Cliente: <span className="font-semibold">{creditCustomer?.name}</span>
                                      </DialogDescription>
                                    </div>
                                  </div>
                                  
                                  {/* Estado actual del crédito */}
                                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-green-700 text-sm">Crédito Actual:</span>
                                      <span className="font-bold text-green-800">
                                        ${parseFloat(creditCustomer?.creditAvailable || "0").toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </DialogHeader>
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                                    <DollarSign className="h-4 w-4" />
                                    Monto a Agregar
                                  </label>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    value={creditAmount}
                                    onChange={(e) => setCreditAmount(e.target.value)}
                                    className="text-lg font-semibold text-center border-green-300 focus:border-green-500 focus:ring-green-500"
                                  />
                                </div>
                                
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-blue-700 text-sm">Nuevo Total:</span>
                                    <span className="font-bold text-blue-800 text-lg">
                                      ${(parseFloat(creditCustomer?.creditAvailable || "0") + parseFloat(creditAmount || "0")).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                
                                <Button 
                                  className="w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-semibold py-3 shadow-lg"
                                  onClick={() => {
                                    if (creditCustomer && creditAmount) {
                                      addCreditMutation.mutate({
                                        customerId: creditCustomer.id,
                                        amount: parseFloat(creditAmount)
                                      });
                                    }
                                  }}
                                  disabled={addCreditMutation.isPending || !creditAmount}
                                >
                                  {addCreditMutation.isPending ? (
                                    <div className="flex items-center gap-2">
                                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                      Procesando...
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <CreditCardIcon className="h-5 w-5" />
                                      Agregar Crédito
                                    </div>
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedCustomer(customer)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Detalles del Cliente</DialogTitle>
                                <DialogDescription>
                                  Información completa del cliente seleccionado
                                </DialogDescription>
                              </DialogHeader>
                              {selectedCustomer && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium">Nombre</label>
                                      <p className="text-sm text-muted-foreground">{selectedCustomer.name}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Teléfono</label>
                                      <p className="text-sm text-muted-foreground">{selectedCustomer.phone || "N/A"}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Estado</label>
                                      <p className="text-sm text-muted-foreground">{selectedCustomer.state || "N/A"}</p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">RFC</label>
                                      <p className="text-sm text-muted-foreground">{selectedCustomer.rfc || "N/A"}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="text-sm font-medium">Dirección</label>
                                      <p className="text-sm text-muted-foreground">{selectedCustomer.address || "N/A"}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <label className="text-sm font-medium">Fecha de Registro</label>
                                      <p className="text-sm text-muted-foreground">
                                        {format(new Date(selectedCustomer.createdAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente
                                  el cliente "{customer.name}" del sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteCustomerMutation.mutate(customer.id)}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}