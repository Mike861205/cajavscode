import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertCustomerSchema, type InsertCustomer } from "@shared/schema";

// Create a form type without tenantId since it's added by the backend
type CustomerFormData = Omit<InsertCustomer, 'tenantId'>;
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone, MapPin, FileText, Building, UserPlus, Sparkles } from "lucide-react";

export default function CustomerRegistration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(insertCustomerSchema.omit({ tenantId: true })),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      state: "",
      rfc: "",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: CustomerFormData) => {
      try {
        const response = await apiRequest("POST", "/api/customers", customerData);
        return response.json();
      } catch (error: any) {
        console.error("Error creating customer:", error);
        throw new Error(error.message || "Error al registrar el cliente");
      }
    },
    onSuccess: (data) => {
      console.log("Customer created successfully:", data);
      toast({
        title: "Cliente registrado",
        description: "El cliente ha sido registrado exitosamente.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      // Forzar refetch de todas las queries relacionadas con clientes
      queryClient.refetchQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: any) => {
      console.error("Customer creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Error al registrar el cliente",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    console.log("🔵 Submitting customer data:", data);
    console.log("🔵 Form errors:", form.formState.errors);
    createCustomerMutation.mutate(data);
  };

  // Test button function
  const testSubmit = () => {
    const testData: CustomerFormData = {
      name: "mike macias",
      phone: "6241370820",
      address: "mexico",
      state: "bcs",
      rfc: "PAMM861205EP4"
    };
    console.log("🧪 Testing with data:", testData);
    createCustomerMutation.mutate(testData);
  };

  return (
    <div className="space-y-6">
      {/* Header moderno con gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 p-8 border border-blue-200 dark:border-blue-800">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-indigo-400/10 to-purple-400/10"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg">
              <UserPlus className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Alta de Clientes
              </h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                Registra un nuevo cliente en el sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta del formulario con diseño moderno */}
      <Card className="border-2 border-blue-100 dark:border-blue-900 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-t-lg border-b border-blue-200 dark:border-blue-800">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg text-white">
              <User className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Información del Cliente
            </span>
          </CardTitle>
          <CardDescription className="text-base">
            Completa todos los campos para registrar el nuevo cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md text-white">
                          <User className="h-4 w-4" />
                        </div>
                        Nombre Completo *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingresa el nombre completo del cliente"
                          {...field}
                          value={field.value || ""}
                          className="h-12 border-2 border-blue-200 dark:border-blue-800 focus:border-blue-500 rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-md text-white">
                          <Phone className="h-4 w-4" />
                        </div>
                        Teléfono
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Número de teléfono del cliente"
                          {...field}
                          value={field.value || ""}
                          className="h-12 border-2 border-green-200 dark:border-green-800 focus:border-green-500 rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <div className="p-1.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-md text-white">
                          <MapPin className="h-4 w-4" />
                        </div>
                        Dirección
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Dirección completa del cliente"
                          {...field}
                          value={field.value || ""}
                          className="h-12 border-2 border-purple-200 dark:border-purple-800 focus:border-purple-500 rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-md text-white">
                          <Building className="h-4 w-4" />
                        </div>
                        Estado
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Estado o provincia"
                          {...field}
                          value={field.value || ""}
                          className="h-12 border-2 border-orange-200 dark:border-orange-800 focus:border-orange-500 rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rfc"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 space-y-3">
                      <FormLabel className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md text-white">
                          <FileText className="h-4 w-4" />
                        </div>
                        RFC
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="RFC del cliente (opcional)"
                          {...field}
                          value={field.value || ""}
                          className="h-12 border-2 border-indigo-200 dark:border-indigo-800 focus:border-indigo-500 rounded-lg bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Botones modernos con gradientes y efectos */}
              <div className="flex gap-4 pt-8 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="submit"
                  disabled={createCustomerMutation.isPending}
                  className="flex-1 md:flex-none px-8 py-3 h-12 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {createCustomerMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Registrando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Registrar Cliente
                    </div>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  className="px-6 py-3 h-12 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transform hover:scale-105 transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Limpiar
                  </div>
                </Button>
                
                {/* Botón de prueba temporal para diagnóstico */}
                <Button
                  type="button"
                  onClick={testSubmit}
                  disabled={createCustomerMutation.isPending}
                  className="px-6 py-3 h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl"
                >
                  🧪 Test
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}