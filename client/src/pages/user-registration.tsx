import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  UserPlus, 
  User, 
  Mail, 
  Lock, 
  Shield, 
  Building2,
  Eye,
  EyeOff,
  Save,
  X
} from "lucide-react";

interface UserRole {
  id: number;
  name: string;
  displayName: string;
  description: string;
}

interface Warehouse {
  id: number;
  name: string;
  address: string;
}

export default function UserRegistration() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    businessName: "",
    roleId: "",
    warehouseId: "",
    isActive: true,
  });
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const loadRoles = async () => {
    try {
      const response = await fetch("/api/user-roles", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await fetch("/api/warehouses", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error("Error loading warehouses:", error);
    }
  };

  const handleSubmit = async () => {
    console.log("=== SUBMIT USER REGISTRATION ===");
    console.log("Form data:", formData);

    // Validations
    if (!formData.username || !formData.email || !formData.password || !formData.fullName || !formData.roleId) {
      toast({
        title: "Campos requeridos",
        description: "Por favor complete todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error de contraseña",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Contraseña débil",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        businessName: formData.businessName || formData.fullName,
        roleId: parseInt(formData.roleId),
        warehouseId: formData.warehouseId && formData.warehouseId !== "none" ? parseInt(formData.warehouseId) : null,
        isActive: formData.isActive,
      };

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(userData),
      });

      console.log("Response status:", response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log("Success:", result);
        toast({
          title: "¡Usuario creado exitosamente!",
          description: `El usuario ${formData.username} ha sido registrado en el sistema`,
        });
        
        // Reset form
        setFormData({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
          fullName: "",
          businessName: "",
          roleId: "",
          warehouseId: "",
          isActive: true,
        });
      } else {
        const error = await response.json();
        console.error("Error response:", error);
        toast({
          title: "Error al crear usuario",
          description: error.message || "No se pudo crear el usuario",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Network error:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar al servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({...formData, password, confirmPassword: password});
    toast({
      title: "Contraseña generada",
      description: "Se ha generado una contraseña segura automáticamente",
    });
  };

  useEffect(() => {
    loadRoles();
    loadWarehouses();
  }, []);

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'admin':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sales':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const selectedRole = roles.find(r => r.id === parseInt(formData.roleId));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alta de Usuario</h1>
          <p className="text-gray-600 mt-1">Registra un nuevo usuario en el sistema</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <UserPlus className="w-4 h-4 mr-1" />
          Nuevo Registro
        </Badge>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Información del Usuario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Datos Personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Nombre Completo *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="Ej: Juan Pérez López"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="businessName">Nombre del Negocio</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                  placeholder="Mi Empresa S.A."
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Correo Electrónico *</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="usuario@empresa.com"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Credenciales de Acceso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Nombre de Usuario *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="usuario123"
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="password">Contraseña *</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePassword}
                  >
                    Generar
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                <div className="relative mt-1">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    placeholder="Repita la contraseña"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Role and Permissions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Rol y Permisos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Rol del Usuario *</Label>
                <Select value={formData.roleId || ""} onValueChange={(value) => setFormData({...formData, roleId: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccione un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleColor(role.name) + " text-xs"}>
                            {role.displayName}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRole && (
                  <p className="text-sm text-gray-600 mt-2">{selectedRole.description}</p>
                )}
              </div>
              <div>
                <Label htmlFor="warehouse">Almacén Asignado</Label>
                <Select value={formData.warehouseId || ""} onValueChange={(value) => setFormData({...formData, warehouseId: value})}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccione un almacén (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin almacén asignado</SelectItem>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{warehouse.name}</div>
                            <div className="text-xs text-gray-500">{warehouse.address}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-4">Estado del Usuario</h3>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
              />
              <Label htmlFor="isActive" className="text-sm">
                Usuario activo (puede iniciar sesión)
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              className="px-6"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Creando..." : "Crear Usuario"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}