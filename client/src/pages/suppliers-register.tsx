import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Truck, Plus, Building, Phone, Mail, MapPin, CheckCircle, Loader2, Users, ArrowRight } from "lucide-react";
import { insertSupplierSchema, type InsertSupplier } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useLocation } from "wouter";

const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  address: z.string().min(1, "La dirección es requerida"),  
  phone: z.string().min(1, "El teléfono es requerido"),
  email: z.string().email("Email inválido").min(1, "El email es requerido"),
});

export default function SuppliersRegister() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<z.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (data: z.infer<typeof supplierSchema>) => {
      console.log("Sending supplier data:", data);
      const response = await apiRequest("POST", "/api/suppliers", data);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (newSupplier) => {
      console.log("Supplier created successfully:", newSupplier);
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setIsSubmitted(true);
      toast({
        title: "¡Proveedor registrado exitosamente!",
        description: `${newSupplier.name} ha sido agregado al sistema`,
      });
      form.reset();
      setTimeout(() => {
        setIsSubmitted(false);
        setLocation('/dashboard/suppliers');
      }, 2000);
    },
    onError: (error: any) => {
      console.error("Error creating supplier:", error);
      toast({
        title: "Error al registrar proveedor",
        description: error.message || "No se pudo registrar el proveedor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof supplierSchema>) => {
    console.log("Form submitted with data:", data);
    createSupplierMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Modern Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-30 scale-110"></div>
              <div className="relative p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white shadow-2xl">
                <Truck className="h-12 w-12" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
            Alta de Proveedores
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Registra nuevos proveedores de manera rápida y sencilla
          </p>
        </div>

        {isSubmitted && (
          <Card className="mb-8 border-0 bg-gradient-to-r from-green-50 to-emerald-50 shadow-xl">
            <CardContent className="p-8">
              <div className="flex items-center justify-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-green-800 mb-1">¡Proveedor Registrado!</h3>
                  <p className="text-green-600">Redirigiendo al listado de proveedores...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Building className="h-6 w-6" />
                  Información del Proveedor
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Completa los datos para registrar un nuevo proveedor
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Company Name */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-base font-semibold text-gray-700 flex items-center gap-2">
                              <Building className="h-5 w-5 text-blue-600" />
                              Nombre de la Empresa
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ej: Distribuidora Los Pinos S.A."
                                className="h-14 text-base border-2 border-gray-200 focus:border-blue-500 transition-all"
                                disabled={createSupplierMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Address */}
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-base font-semibold text-gray-700 flex items-center gap-2">
                              <MapPin className="h-5 w-5 text-blue-600" />
                              Dirección Completa
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ej: Av. Principal 123, Col. Centro, Ciudad"
                                className="h-14 text-base border-2 border-gray-200 focus:border-blue-500 transition-all"
                                disabled={createSupplierMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Phone */}
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-gray-700 flex items-center gap-2">
                              <Phone className="h-5 w-5 text-blue-600" />
                              Teléfono
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Ej: +52 55 1234 5678"
                                className="h-14 text-base border-2 border-gray-200 focus:border-blue-500 transition-all"
                                disabled={createSupplierMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Email */}
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-semibold text-gray-700 flex items-center gap-2">
                              <Mail className="h-5 w-5 text-blue-600" />
                              Correo Electrónico
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="contacto@empresa.com"
                                className="h-14 text-base border-2 border-gray-200 focus:border-blue-500 transition-all"
                                disabled={createSupplierMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-gray-100">
                      <Button
                        type="submit"
                        disabled={createSupplierMutation.isPending}
                        className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-base shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        {createSupplierMutation.isPending ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                            Registrando Proveedor...
                          </>
                        ) : (
                          <>
                            <Plus className="h-5 w-5 mr-3" />
                            Registrar Proveedor
                          </>
                        )}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLocation('/dashboard/suppliers')}
                        disabled={createSupplierMutation.isPending}
                        className="h-14 px-8 border-2 border-gray-300 hover:border-blue-500 font-semibold transition-all"
                      >
                        <ArrowRight className="h-5 w-5 mr-2" />
                        Ver Registro
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Info Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Gestión Eficiente</h3>
                    <p className="text-purple-100 text-sm">
                      Administra todos tus proveedores desde un solo lugar
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-lg text-gray-800">Campos Requeridos</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    <Building className="h-3 w-3 mr-1" />
                    Nombre
                  </Badge>
                  <span className="text-sm text-gray-600">Nombre de la empresa</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <MapPin className="h-3 w-3 mr-1" />
                    Dirección
                  </Badge>
                  <span className="text-sm text-gray-600">Dirección completa</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                    <Phone className="h-3 w-3 mr-1" />
                    Teléfono
                  </Badge>
                  <span className="text-sm text-gray-600">Número de contacto</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Badge>
                  <span className="text-sm text-gray-600">Correo electrónico</span>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card className="border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Después del Registro
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div className="space-y-2 text-sm text-gray-600">
                  <p>✓ El proveedor aparecerá en la lista de proveedores</p>
                  <p>✓ Podrás seleccionarlo al crear compras</p>
                  <p>✓ Se asignará un ID único automáticamente</p>
                  <p>✓ Los datos quedarán guardados de forma permanente</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}