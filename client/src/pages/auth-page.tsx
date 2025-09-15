import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
  remember: z.boolean().default(false),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "El nombre completo es requerido"),
  email: z.string().email("Email inválido"),
  businessName: z
    .string()
    .min(2, "El nombre del negocio es requerido")
    .regex(/^[a-z0-9]+$/, "Solo minúsculas y números, sin espacios ni signos"),
  username: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  phone: z.string().min(10, "Teléfono debe tener al menos 10 dígitos"),
  country: z.string().min(2, "País es requerido"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("register");
  const [businessSlugPreview, setBusinessSlugPreview] = useState("");
  const { toast } = useToast();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      remember: false,
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      businessName: "",
      username: "",
      password: "",
      phone: "",
      country: "",
    },
  });

  // Redirect if already logged in (using useEffect to avoid setState during render)
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  // Early return if user is logged in to prevent rendering
  if (user) {
    return null;
  }

  const onLogin = async (data: LoginData) => {
    try {
      await loginMutation.mutateAsync({
        username: data.username,
        password: data.password,
      });
      setLocation("/dashboard");
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const onRegister = async (data: RegisterData) => {
    try {
      await registerMutation.mutateAsync({
        fullName: data.fullName,
        email: data.email,
        username: data.username,
        password: data.password,
        businessName: data.businessName,
        phone: data.phone,
        country: data.country,
        role: "admin",
      });

      toast({
        title: "¡Registro exitoso!",
        description:
          "Tu cuenta demo ha sido creada. Bienvenido a Caja Sas Enterprise.",
      });

      setLocation("/dashboard");
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Caja SAS Enterprise
            </h1>
            <p className="text-gray-600">
              Sistema Multi-Tenant de Gestión Empresarial
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Cada negocio tendrá su propio subdominio personalizado
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Prueba 7 Días</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Iniciar Sesión</CardTitle>
                  <CardDescription>
                    Accede a tu panel de control empresarial
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form
                      onSubmit={loginForm.handleSubmit(onLogin)}
                      className="space-y-4"
                    >
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usuario</FormLabel>
                            <FormControl>
                              <Input placeholder="tu_usuario" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="remember"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <Label>Recordarme</Label>
                            </div>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending
                          ? "Iniciando sesión..."
                          : "Iniciar Sesión"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Prueba Gratuita 7 Días</CardTitle>
                  <CardDescription>
                    Prueba todas las funciones por 7 días sin costo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form
                      onSubmit={registerForm.handleSubmit(onRegister)}
                      className="space-y-4"
                    >
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Juan Pérez" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="tu@empresa.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Nombre del Negocio (minisculas y sin caracteres)
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="cajasasenterprise"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Show preview URL
                                  const slug = e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]/g, "");
                                  setBusinessSlugPreview(slug);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                            {businessSlugPreview && (
                              <div className="text-xs text-blue-600 mt-1 p-2 bg-blue-50 rounded border border-blue-200">
                                <div className="flex items-center gap-1">
                                  <span>🌐 Tu URL será:</span>
                                  <strong>
                                    www.cajasasenterprise.com/
                                    {businessSlugPreview}
                                  </strong>
                                </div>
                                <div className="text-gray-500 mt-1">
                                  Sistema completamente aislado para tu negocio
                                </div>
                              </div>
                            )}
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usuario</FormLabel>
                            <FormControl>
                              <Input placeholder="mi_usuario" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+52 1234567890"
                                type="tel"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>País</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="México"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending
                          ? "Creando cuenta..."
                          : "Comenzar Prueba 7 Días"}
                      </Button>
                    </form>
                  </Form>

                  <p className="text-sm text-gray-500 mt-4 text-center">
                    Al registrarte aceptas nuestros términos y condiciones
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center space-y-2">
            <Button variant="ghost" onClick={() => setLocation("/")}>
              ← Volver al inicio
            </Button>
            <div className="text-sm text-gray-500">
              ¿Quieres ver nuestros planes?{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-normal text-blue-600"
                onClick={() => setLocation("/pricing")}
              >
                Ver Precios
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-primary/80 items-center justify-center p-8">
        <div className="text-center text-white max-w-md">
          <div className="mb-8">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20V6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4V4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4">Sistema Todo en Uno</h2>
            <p className="text-lg text-blue-100 mb-6">
              Gestiona tu negocio completo desde una sola plataforma. POS,
              inventario, ventas, compras y más.
            </p>
            <div className="space-y-2 text-left">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-3 text-green-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Prueba gratuita de 7 días
              </div>
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-3 text-green-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Base de datos aislada
              </div>
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-3 text-green-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Soporte técnico incluido
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
