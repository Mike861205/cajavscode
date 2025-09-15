import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertEmployeeSchema, type InsertEmployee } from "@shared/schema";
import { UserPlus, Save, X, User, Briefcase, CreditCard, FileText, Mail, Phone, MapPin, Shield, Building, DollarSign, Calendar } from "lucide-react";
import { z } from "zod";

interface EmployeeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Schema simplificado para el formulario
const employeeFormSchema = z.object({
  employeeNumber: z.string().min(1, "El número de empleado es requerido"),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  position: z.string().min(1, "El puesto es requerido"),
  hireDate: z.string().min(1, "La fecha de contratación es requerida"),
  salary: z.string().min(1, "El salario es requerido"),
  salaryType: z.string().min(1, "La frecuencia de pago es requerida"),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  rfc: z.string().optional(),
  curp: z.string().optional(),
  nss: z.string().optional(),
  department: z.string().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  clabe: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  notes: z.string().optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

export default function EmployeeFormV2({ onSuccess, onCancel }: EmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeNumber: "",
      firstName: "",
      lastName: "",
      position: "",
      hireDate: new Date().toISOString().split('T')[0],
      salary: "",
      salaryType: "monthly",
      bankAccount: "",
      clabe: "",
      curp: "",
      rfc: "",
      nss: "",
      address: "",
      emergencyContact: "",
      emergencyPhone: "",
      isActive: true
    }
  });

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      console.log("=== INICIO MUTACIÓN ===");
      console.log("Datos del formulario:", data);
      setIsSubmitting(true);
      try {
        // Verificar que tenemos el usuario
        if (!user) {
          throw new Error("No se pudo obtener datos del usuario");
        }

        // Convertir los datos al formato correcto para el backend
        const employeeData = {
          employeeNumber: data.employeeNumber,
          firstName: data.firstName,
          lastName: data.lastName,
          position: data.position,
          hireDate: data.hireDate, // Enviar como string, el backend lo convertirá
          salary: data.salary,
          salaryType: data.salaryType || "monthly",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          zipCode: data.zipCode || "",
          rfc: data.rfc || "",
          curp: data.curp || "",
          nss: data.nss || "",
          department: data.department || "",
          bankAccount: data.bankAccount || "",
          bankName: data.bankName || "",
          clabe: data.clabe || "",
          emergencyContact: data.emergencyContact || "",
          emergencyPhone: data.emergencyPhone || "",
          notes: data.notes || "",
        };
        console.log("Datos a enviar al servidor:", employeeData);
        
        const response = await apiRequest("POST", "/api/employees", employeeData);
        console.log("Respuesta del servidor:", response);
        return response;
      } catch (error) {
        console.error("Error en la mutación:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      console.log("✅ Mutación exitosa");
      toast({
        title: "Empleado registrado",
        description: "El empleado ha sido registrado exitosamente",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("❌ Error en mutación:", error);
      toast({
        title: "Error",
        description: error.message || "Error al registrar empleado",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: EmployeeFormData) => {
    console.log("=== SUBMIT FORMULARIO ===");
    console.log("Datos recibidos en onSubmit:", data);
    console.log("Errores del formulario:", form.formState.errors);
    console.log("Es válido el formulario:", form.formState.isValid);
    console.log("Estado del formulario:", form.formState);
    
    // Verificar si hay errores de validación
    if (Object.keys(form.formState.errors).length > 0) {
      console.error("Formulario tiene errores de validación:", form.formState.errors);
      toast({
        title: "Error de validación",
        description: "Por favor corrige los errores en el formulario",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Iniciando mutación...");
    mutation.mutate(data);
  };

  // Auto-generar número de empleado
  const generateEmployeeNumber = () => {
    const number = Math.floor(1000 + Math.random() * 9000);
    form.setValue("employeeNumber", number.toString());
  };

  // Auto-completar nombre completo
  const updateFullName = () => {
    const firstName = form.getValues("firstName");
    const lastName = form.getValues("lastName");
    const fullName = `${firstName} ${lastName}`.trim();
    form.setValue("fullName", fullName);
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Alta de Empleado</h1>
            <p className="text-gray-600 dark:text-gray-400">Registra un nuevo empleado en el sistema de nóminas</p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => {
          console.log("=== FORM SUBMIT EVENT ===");
          console.log("Evento de envío:", e);
          console.log("Formulario válido antes de submit:", form.formState.isValid);
          console.log("Errores antes de submit:", form.formState.errors);
          form.handleSubmit(onSubmit)(e);
        }} className="space-y-8">
          {/* Información Personal */}
          <Card className="shadow-lg border-t-4 border-t-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-xl text-blue-900 dark:text-blue-100">Información Personal</CardTitle>
              </div>
              <CardDescription>Datos básicos del empleado</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="employeeNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Número de Empleado *
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="1234" 
                            {...field} 
                            className="font-mono bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                          />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={generateEmployeeNumber}
                          className="px-3"
                        >
                          🎲
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Nombre(s) *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Juan Carlos" 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            updateFullName();
                          }}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Apellidos *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="García López" 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            updateFullName();
                          }}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="juan.garcia@empresa.com" 
                          {...field}
                          value={field.value || ""}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
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
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Teléfono
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="555-123-4567" 
                          {...field}
                          value={field.value || ""}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
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
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Dirección
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Calle, Número, Colonia" 
                          {...field}
                          value={field.value || ""}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información Laboral */}
          <Card className="shadow-lg border-t-4 border-t-green-500">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-green-600" />
                <CardTitle className="text-xl text-green-900 dark:text-green-100">Información Laboral</CardTitle>
              </div>
              <CardDescription>Datos del puesto y departamento</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Puesto *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Vendedor" 
                          {...field}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Departamento
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ventas" 
                          {...field}
                          value={field.value || ""}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha de Contratación *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Salario *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="15000" 
                          {...field}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salaryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Frecuencia de Pago *
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                            <SelectValue placeholder="Selecciona frecuencia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="biweekly">Quincenal</SelectItem>
                          <SelectItem value="monthly">Mensual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información Bancaria */}
          <Card className="shadow-lg border-t-4 border-t-purple-500">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-xl text-purple-900 dark:text-purple-100">Información Bancaria</CardTitle>
              </div>
              <CardDescription>Datos para depósito de nómina</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="bankAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Cuenta Bancaria
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="1234567890" 
                          {...field}
                          value={field.value || ""}
                          className="font-mono bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clabe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        CLABE
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123456789012345678" 
                          {...field}
                          value={field.value || ""}
                          maxLength={18}
                          className="font-mono bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información Legal */}
          <Card className="shadow-lg border-t-4 border-t-orange-500">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-xl text-orange-900 dark:text-orange-100">Información Legal</CardTitle>
              </div>
              <CardDescription>Documentos oficiales y registros</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="curp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        CURP
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="GALE850101HDFRPN01" 
                          {...field}
                          value={field.value || ""}
                          maxLength={18}
                          className="font-mono bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
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
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        RFC
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="GALE850101ABC" 
                          {...field}
                          value={field.value || ""}
                          maxLength={13}
                          className="font-mono bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nss"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        NSS (IMSS)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="12345678901" 
                          {...field}
                          value={field.value || ""}
                          maxLength={11}
                          className="font-mono bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contacto de Emergencia */}
          <Card className="shadow-lg border-t-4 border-t-red-500">
            <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-600" />
                <CardTitle className="text-xl text-red-900 dark:text-red-100">Contacto de Emergencia</CardTitle>
              </div>
              <CardDescription>Persona a contactar en caso de emergencia</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="emergencyContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Nombre del Contacto
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="María García" 
                          {...field}
                          value={field.value || ""}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Teléfono de Emergencia
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="555-987-6543" 
                          {...field}
                          value={field.value || ""}
                          className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className="w-full sm:w-auto px-8 py-3 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
            <Button 
              type="submit" 
              onClick={(e) => {
                console.log("=== CLICK EN BOTÓN REGISTRAR ===");
                console.log("Evento:", e);
                console.log("Formulario válido:", form.formState.isValid);
                console.log("Errores:", form.formState.errors);
                console.log("Valores del formulario:", form.getValues());
              }}
              disabled={isSubmitting || mutation.isPending}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg"
            >
              {isSubmitting || mutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Registrar Empleado
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}