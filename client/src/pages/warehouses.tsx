import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWarehouseSchema, type InsertWarehouse, type Warehouse } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Edit, Trash2, MapPin, Phone, FileText, Store, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Warehouses() {
  console.log("🔥 Warehouses component rendering");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const taxRegimes = [
    { value: "RESICO", label: "Régimen Simplificado de Confianza" },
    { value: "GENERAL", label: "Régimen General de Ley" },
    { value: "MORAL", label: "Régimen de Personas Morales" },
    { value: "INCORPORACION", label: "Régimen de Incorporación Fiscal" },
    { value: "ACTIVIDADES", label: "Régimen de Actividades Empresariales" },
  ];

  const form = useForm<InsertWarehouse>({
    resolver: zodResolver(insertWarehouseSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      rfc: "",
      taxRegime: "",
      commercialName: "",
    },
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ["/api/warehouses"],
  });

  // Create warehouse mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertWarehouse) => {
      return await apiRequest("POST", "/api/warehouses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      toast({
        title: "¡Almacén creado exitosamente!",
        description: "El nuevo almacén ha sido registrado en el sistema",
      });
      form.reset();
      setIsDialogOpen(false);
      setEditingWarehouse(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear almacén",
        description: error.message || "Ocurrió un error al registrar el almacén",
        variant: "destructive",
      });
    },
  });

  // Update warehouse mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertWarehouse> }) => {
      return await apiRequest("PUT", `/api/warehouses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      toast({
        title: "Almacén actualizado",
        description: "El almacén ha sido actualizado correctamente.",
      });
      setIsDialogOpen(false);
      setEditingWarehouse(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo actualizar el almacén.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertWarehouse) => {
    if (editingWarehouse) {
      updateMutation.mutate({ id: editingWarehouse.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    console.log("🔥 Edit warehouse clicked:", warehouse);
    setEditingWarehouse(warehouse);
    form.reset({
      name: warehouse.name,
      address: warehouse.address,
      phone: warehouse.phone || "",
      rfc: warehouse.rfc || "",
      taxRegime: warehouse.taxRegime || "",
      commercialName: warehouse.commercialName || "",
    });
    setIsDialogOpen(true);
    console.log("🔥 Dialog should be open now");
  };

  const handleNewWarehouse = () => {
    setEditingWarehouse(null);
    form.reset({
      name: "",
      address: "",
      phone: "",
      rfc: "",
      taxRegime: "",
      commercialName: "",
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando almacenes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Almacenes</h1>
          <p className="text-gray-600 mt-1">Gestiona los almacenes de tu empresa</p>
        </div>

        <Button 
          onClick={handleNewWarehouse}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Almacén
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-6">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                {editingWarehouse ? "Editar Almacén" : "Registrar Nuevo Almacén"}
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-2">
                {editingWarehouse 
                  ? "Modifique la información del almacén según sea necesario"
                  : "Complete la información del almacén para registrarlo en el sistema"
                }
              </p>
            </DialogHeader>
            
            <Form {...form}>
              <div className="space-y-6">
                {/* Información Básica */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Información Básica
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Nombre del Almacén *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ej: Almacén Central"
                              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="commercialName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Nombre Comercial</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ej: Mi Empresa S.A."
                              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Ubicación */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Ubicación
                  </h3>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Dirección Completa *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Ingrese la dirección completa del almacén..."
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contacto */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Información de Contacto
                  </h3>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Teléfono</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: +52 (624) 131-0317"
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Información Fiscal */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Información Fiscal
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rfc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">RFC</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ej: XAXX010101000"
                              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 uppercase"
                              maxLength={13}
                              {...field} 
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="taxRegime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Régimen Fiscal</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Seleccione un régimen fiscal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {taxRegimes.map((regime) => (
                                <SelectItem key={regime.value} value={regime.value}>
                                  {regime.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-6"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    onClick={async () => {
                      console.log("🔥 Button clicked - editing warehouse:", editingWarehouse);
                      const formData = form.getValues();
                      console.log("🔥 Form data:", formData);
                      
                      const isValid = await form.trigger();
                      console.log("🔥 Form is valid:", isValid);
                      
                      if (isValid) {
                        onSubmit(formData);
                      } else {
                        console.log("🔥 Form errors:", form.formState.errors);
                      }
                    }}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {editingWarehouse ? "Actualizando..." : "Guardando..."}
                      </>
                    ) : (
                      editingWarehouse ? "Actualizar Almacén" : "Guardar Almacén"
                    )}
                  </Button>
                </div>
              </div>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses?.map((warehouse: Warehouse) => (
          <Card key={warehouse.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                      {warehouse.name}
                      {warehouse.name === "Sistema" && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Por defecto
                        </span>
                      )}
                    </CardTitle>
                    {warehouse.commercialName && (
                      <p className="text-sm text-gray-600 mt-1 font-medium">{warehouse.commercialName}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      console.log("🔥 BUTTON CLICKED - Warehouse:", warehouse.id, warehouse.name);
                      setEditingWarehouse(warehouse);
                      console.log("🔥 Setting form values...");
                      form.reset({
                        name: warehouse.name,
                        address: warehouse.address,
                        phone: warehouse.phone || "",
                        rfc: warehouse.rfc || "",
                        taxRegime: warehouse.taxRegime || "",
                        commercialName: warehouse.commercialName || "",
                      });
                      console.log("🔥 Opening dialog...");
                      setIsDialogOpen(true);
                    }}
                    className="hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Edit className="w-4 h-4 text-blue-600" />
                  </Button>
                  {warehouse.name !== "Sistema" && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700 leading-relaxed">{warehouse.address}</span>
                </div>
              </div>
              
              {warehouse.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 font-medium">{warehouse.phone}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {warehouse.rfc && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200">
                    <FileText className="w-3 h-3 mr-1" />
                    RFC: {warehouse.rfc}
                  </Badge>
                )}
                {warehouse.taxRegime && (
                  <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                    {taxRegimes.find(r => r.value === warehouse.taxRegime)?.label || warehouse.taxRegime}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 pt-3 border-t border-gray-100">
                <Calendar className="w-3 h-3" />
                <span>Creado: {new Date(warehouse.createdAt).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {warehouses?.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay almacenes registrados</h3>
          <p className="text-gray-600 mb-6">Comience registrando su primer almacén</p>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Primer Almacén
          </Button>
        </div>
      )}
    </div>
  );
}