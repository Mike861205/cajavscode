import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Truck, Plus, Search, Building, Phone, Mail, MapPin, Users, Trash2, CheckSquare, Square, DollarSign, Calendar as CalendarIcon, AlertTriangle, ShoppingBag, Edit } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import type { Supplier } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

type DateFilter = "today" | "week" | "month" | "custom";

interface SupplierWithStats extends Supplier {
  totalPurchases: number;
  purchaseCount: number;
}

const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  address: z.string().min(1, "La dirección es requerida"),  
  phone: z.string().min(1, "El teléfono es requerido"),
  email: z.string().email("Email inválido").min(1, "El email es requerido"),
});

export default function SuppliersList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("month");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; message: string }>({ 
    open: false, 
    title: "", 
    message: "" 
  });
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithStats | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const editForm = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  // Calculate date range based on filter
  const getDateRange = () => {
    const today = new Date();
    switch (dateFilter) {
      case "today":
        return { start: format(today, "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
      case "week":
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        return { start: format(weekStart, "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
      case "month":
        const monthStart = startOfMonth(today);
        return { start: format(monthStart, "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
      case "custom":
        if (customStartDate && customEndDate) {
          return { 
            start: format(customStartDate, "yyyy-MM-dd"), 
            end: format(customEndDate, "yyyy-MM-dd") 
          };
        }
        return { start: format(startOfMonth(today), "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
      default:
        return { start: format(startOfMonth(today), "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
    }
  };

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: supplierStats = [], isLoading: isLoadingStats } = useQuery<SupplierWithStats[]>({
    queryKey: ["/api/suppliers/stats", dateFilter, customStartDate, customEndDate],
    queryFn: async () => {
      const { start, end } = getDateRange();
      const response = await apiRequest("GET", `/api/suppliers/stats?startDate=${start}&endDate=${end}`);
      return response.json();
    },
  });

  // Merge suppliers with their stats
  const suppliersWithStats = suppliers.map(supplier => {
    const stats = supplierStats.find(stat => stat.id === supplier.id);
    return {
      ...supplier,
      totalPurchases: stats?.totalPurchases || 0,
      purchaseCount: stats?.purchaseCount || 0,
    };
  });

  const filteredSuppliers = suppliersWithStats.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteSupplierMutation = useMutation({
    mutationFn: async (supplierId: number) => {
      const response = await apiRequest("DELETE", `/api/suppliers/${supplierId}`);
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Error al eliminar proveedor";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If can't parse JSON, use default message
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: (_, supplierId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setSelectedSuppliers(prev => prev.filter(id => id !== supplierId));
      toast({
        title: "Proveedor eliminado",
        description: "El proveedor ha sido eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      setErrorDialog({
        open: true,
        title: "No se puede eliminar el proveedor",
        message: error.message
      });
    },
  });

  const deleteBulkSuppliersMutation = useMutation({
    mutationFn: async (supplierIds: number[]) => {
      const results = await Promise.allSettled(
        supplierIds.map(async (id) => {
          const response = await apiRequest("DELETE", `/api/suppliers/${id}`);
          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = "Error al eliminar proveedor";
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.message || errorMessage;
            } catch {
              // If can't parse JSON, use default message
            }
            throw new Error(`ID ${id}: ${errorMessage}`);
          }
          return id;
        })
      );
      
      const successful = results
        .filter((result): result is PromiseFulfilledResult<number> => result.status === 'fulfilled')
        .map(result => result.value);
      
      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason.message);
      
      return { successful, failed };
    },
    onSuccess: ({ successful, failed }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setSelectedSuppliers([]);
      
      if (successful.length > 0 && failed.length === 0) {
        toast({
          title: "Proveedores eliminados",
          description: `${successful.length} proveedores han sido eliminados exitosamente`,
        });
      } else if (successful.length > 0 && failed.length > 0) {
        toast({
          title: "Eliminación parcial",
          description: `${successful.length} eliminados, ${failed.length} no se pudieron eliminar`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "No se pudieron eliminar",
          description: "Ningún proveedor pudo ser eliminado. Revisa que no tengan compras asociadas.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error inesperado al eliminar proveedores",
        variant: "destructive",
      });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof supplierSchema> }) => {
      const response = await apiRequest("PUT", `/api/suppliers/${id}`, data);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Error al actualizar proveedor");
      }
      return response.json();
    },
    onSuccess: (updatedSupplier) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/stats"] });
      setIsEditModalOpen(false);
      setEditingSupplier(null);
      editForm.reset();
      toast({
        title: "Proveedor actualizado",
        description: `${updatedSupplier.name} ha sido actualizado exitosamente`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el proveedor",
        variant: "destructive",
      });
    },
  });

  const handleSelectSupplier = (supplierId: number) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplierId) 
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSuppliers.length === filteredSuppliers.length) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(filteredSuppliers.map(supplier => supplier.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedSuppliers.length > 0) {
      deleteBulkSuppliersMutation.mutate(selectedSuppliers);
    }
  };

  const handleDeleteSingle = (supplierId: number) => {
    deleteSupplierMutation.mutate(supplierId);
  };

  const handleEditSupplier = (supplier: SupplierWithStats) => {
    setEditingSupplier(supplier);
    editForm.setValue("name", supplier.name);
    editForm.setValue("address", supplier.address || "");
    editForm.setValue("phone", supplier.phone || "");
    editForm.setValue("email", supplier.email || "");
    setIsEditModalOpen(true);
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditingSupplier(null);
    editForm.reset();
  };

  const onEditSubmit = (data: z.infer<typeof supplierSchema>) => {
    if (editingSupplier) {
      updateSupplierMutation.mutate({
        id: editingSupplier.id,
        data: data
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg">
              <Truck className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Registro de Proveedores</h1>
              <p className="text-gray-600 mt-1">Gestiona todos tus proveedores registrados</p>
            </div>
          </div>
          <Button
            onClick={() => setLocation('/dashboard/suppliers/register')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Proveedor
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Total Proveedores</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{suppliers.length}</div>
            <p className="text-xs opacity-80 mt-1">
              Proveedores registrados
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-xl text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Activos</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <Building className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{suppliers.length}</div>
            <p className="text-xs opacity-80 mt-1">
              Con información completa
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Filtrados</CardTitle>
            <div className="p-2 bg-white/20 rounded-lg">
              <Search className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{filteredSuppliers.length}</div>
            <p className="text-xs opacity-80 mt-1">
              Resultados de búsqueda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card className="mb-6 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar y Gestionar Proveedores
              </CardTitle>
              <CardDescription>
                Busca por nombre, email o teléfono
              </CardDescription>
            </div>
            {selectedSuppliers.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {selectedSuppliers.length} seleccionados
                </Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteBulkSuppliersMutation.isPending}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar Seleccionados
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar proveedores seleccionados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará {selectedSuppliers.length} proveedores de forma permanente. 
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteSelected}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Eliminar {selectedSuppliers.length} proveedores
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar proveedores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
              {filteredSuppliers.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  className="h-12 gap-2"
                >
                  {selectedSuppliers.length === filteredSuppliers.length ? (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      Deseleccionar Todo
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4" />
                      Seleccionar Todo
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Date Filters */}
            <div className="flex flex-wrap gap-4 items-center border-t pt-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Período de análisis:</span>
              </div>
              <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {dateFilter === "custom" && (
                <div className="flex gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="text-xs">
                        {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: es }) : "Fecha inicio"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        disabled={(date) => {
                          if (date > new Date()) return true;
                          if (customEndDate && date > customEndDate) return true;
                          return false;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-muted-foreground">a</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="text-xs">
                        {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: es }) : "Fecha fin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        disabled={(date) => {
                          if (date > new Date()) return true;
                          if (customStartDate && date < customStartDate) return true;
                          return false;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers List */}
      <Card className="shadow-xl border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Lista de Proveedores
          </CardTitle>
          <CardDescription>
            {filteredSuppliers.length} proveedores encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Cargando proveedores...</span>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Registra tu primer proveedor para comenzar'
                }
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setLocation('/dashboard/suppliers/register')}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Primer Proveedor
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuppliers.map((supplier) => (
                <Card 
                  key={supplier.id} 
                  className={`border transition-all duration-200 hover:shadow-lg ${
                    selectedSuppliers.includes(supplier.id) 
                      ? 'border-blue-500 bg-blue-50/50 shadow-md' 
                      : 'border-gray-200'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedSuppliers.includes(supplier.id)}
                          onCheckedChange={() => handleSelectSupplier(supplier.id)}
                          className="mt-1"
                        />
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Building className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{supplier.name}</CardTitle>
                            <Badge variant="secondary" className="mt-1">
                              ID: {supplier.id}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEditSupplier(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deleteSupplierMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que deseas eliminar a "{supplier.name}"? 
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSingle(supplier.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {supplier.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{supplier.address}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                    
                    {/* Purchase Statistics */}
                    <div className="pt-3 border-t border-gray-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">Total Compras:</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          ${supplier.totalPurchases?.toLocaleString('es-ES', { minimumFractionDigits: 2 }) || '0.00'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">Órdenes:</span>
                        </div>
                        <Badge variant="outline" className="text-blue-600">
                          {supplier.purchaseCount || 0}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Registrado: {new Date(supplier.createdAt).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Supplier Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
              <DialogTitle className="text-blue-900">Editar Proveedor</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 mt-2">
              Modifica los datos del proveedor {editingSupplier?.name}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Nombre del Proveedor</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej: Distribuidora ABC" 
                          {...field}
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="correo@empresa.com" 
                          {...field}
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(555) 123-4567" 
                          {...field}
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Dirección</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Calle, Ciudad, Estado, CP" 
                          {...field}
                          className="border-gray-300 focus:border-blue-500 resize-none"
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={updateSupplierMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateSupplierMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar Proveedor'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <DialogTitle className="text-red-900">{errorDialog.title}</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 mt-2">
              {errorDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={() => setErrorDialog({ ...errorDialog, open: false })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}