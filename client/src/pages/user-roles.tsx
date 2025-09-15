import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Lock,
  Eye,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Building2,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserRole {
  id: number;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  userCount: number;
  createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'sales', name: 'Acceso al Punto de Venta', icon: ShoppingCart, description: 'Puede acceder al módulo de ventas y realizar ventas' },
  { id: 'products_view', name: 'Ver Productos', icon: Package, description: 'Puede consultar el catálogo de productos' },
  { id: 'products_manage', name: 'Gestionar Productos', icon: Package, description: 'Puede crear, editar y eliminar productos' },
  { id: 'inventory_view', name: 'Ver Inventario', icon: BarChart3, description: 'Puede consultar reportes de inventario' },
  { id: 'inventory_manage', name: 'Gestionar Inventario', icon: BarChart3, description: 'Puede ajustar inventarios' },
  { id: 'purchases_view', name: 'Ver Compras', icon: ShoppingCart, description: 'Puede consultar historial de compras' },
  { id: 'purchases_manage', name: 'Gestionar Compras', icon: ShoppingCart, description: 'Puede crear y gestionar compras' },
  { id: 'reports_view', name: 'Ver Reportes', icon: BarChart3, description: 'Puede acceder a reportes básicos' },
  { id: 'reports_advanced', name: 'Reportes Avanzados', icon: BarChart3, description: 'Puede acceder a todos los reportes' },
  { id: 'warehouses_view', name: 'Ver Sucursales', icon: Building2, description: 'Puede consultar información de sucursales' },
  { id: 'warehouses_manage', name: 'Gestionar Sucursales', icon: Building2, description: 'Puede administrar sucursales y almacenes' },
  { id: 'users_view', name: 'Ver Usuarios', icon: Users, description: 'Puede consultar lista de usuarios' },
  { id: 'users_manage', name: 'Gestionar Usuarios', icon: Users, description: 'Puede crear, editar y eliminar usuarios' },
  { id: 'roles_view', name: 'Ver Roles', icon: Shield, description: 'Puede consultar roles del sistema' },
  { id: 'roles_manage', name: 'Gestionar Roles', icon: Shield, description: 'Puede crear y modificar roles' },
  { id: 'system_settings', name: 'Configuración Sistema', icon: Settings, description: 'Puede acceder a configuración general' },
  { id: 'system_admin', name: 'Administración Total', icon: Lock, description: 'Acceso completo al sistema' },
];

const SYSTEM_ROLES = [
  {
    name: 'super_admin',
    displayName: 'Super Administrador',
    description: 'Usuario propietario con acceso completo al sistema',
    permissions: AVAILABLE_PERMISSIONS.map(p => p.id),
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  {
    name: 'admin',
    displayName: 'Administrador',
    description: 'Administrador con acceso completo excepto gestión de usuarios y roles',
    permissions: AVAILABLE_PERMISSIONS.filter(p => !p.id.includes('users') && !p.id.includes('roles')).map(p => p.id),
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  {
    name: 'manager',
    displayName: 'Gerente',
    description: 'Gerente con acceso a ventas, productos, inventario y reportes',
    permissions: ['sales', 'products_view', 'products_manage', 'inventory_view', 'inventory_manage', 'purchases_view', 'purchases_manage', 'reports_view', 'reports_advanced', 'warehouses_view'],
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    name: 'sales',
    displayName: 'Vendedor',
    description: 'Vendedor con acceso únicamente al punto de venta',
    permissions: ['sales', 'products_view'],
    color: 'bg-green-100 text-green-800 border-green-200'
  }
];

export default function UserRoles() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    permissions: [] as string[],
  });
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
    } finally {
      setLoading(false);
    }
  };

  const initializeSystemRoles = async () => {
    try {
      const response = await fetch("/api/user-roles/initialize", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        toast({
          title: "Roles inicializados",
          description: "Se han creado los roles básicos del sistema",
        });
        loadRoles();
      }
    } catch (error) {
      console.error("Error initializing roles:", error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.displayName) {
      toast({
        title: "Campos requeridos",
        description: "El nombre y nombre de visualización son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = editingRole ? `/api/user-roles/${editingRole.id}` : "/api/user-roles";
      const method = editingRole ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: editingRole ? "Rol actualizado" : "Rol creado",
          description: `El rol ${formData.displayName} ha sido ${editingRole ? 'actualizado' : 'creado'} exitosamente`,
        });
        setIsDialogOpen(false);
        setEditingRole(null);
        setFormData({ name: "", displayName: "", description: "", permissions: [] });
        loadRoles();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "No se pudo guardar el rol",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving role:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar al servidor",
        variant: "destructive",
      });
    }
  };

  const deleteRole = async (roleId: number) => {
    try {
      const response = await fetch(`/api/user-roles/${roleId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Rol eliminado",
          description: "El rol ha sido eliminado exitosamente",
        });
        loadRoles();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "No se pudo eliminar el rol",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting role:", error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar al servidor",
        variant: "destructive",
      });
    }
  };

  const editRole = (role: UserRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions,
    });
    setIsDialogOpen(true);
  };

  const togglePermission = (permissionId: string) => {
    const newPermissions = formData.permissions.includes(permissionId)
      ? formData.permissions.filter(p => p !== permissionId)
      : [...formData.permissions, permissionId];
    setFormData({...formData, permissions: newPermissions});
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const getRoleColor = (roleName: string) => {
    const systemRole = SYSTEM_ROLES.find(r => r.name === roleName);
    return systemRole?.color || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Roles</h1>
          <p className="text-gray-600 mt-1">Define roles y permisos para usuarios del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          {roles.length === 0 && (
            <Button 
              onClick={initializeSystemRoles}
              variant="outline"
            >
              Inicializar Roles
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Rol
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre del Rol</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="ej: custom_role"
                      disabled={editingRole?.isSystemRole}
                    />
                  </div>
                  <div>
                    <Label htmlFor="displayName">Nombre de Visualización</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      placeholder="ej: Rol Personalizado"
                      disabled={editingRole?.isSystemRole}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe las responsabilidades de este rol"
                    rows={3}
                    disabled={editingRole?.isSystemRole}
                  />
                </div>

                <div>
                  <Label>Permisos</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 max-h-60 overflow-y-auto">
                    {AVAILABLE_PERMISSIONS.map((permission) => (
                      <div
                        key={permission.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.permissions.includes(permission.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => togglePermission(permission.id)}
                      >
                        <div className="flex items-center gap-2">
                          <permission.icon className="w-4 h-4 text-gray-600" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{permission.name}</div>
                            <div className="text-xs text-gray-500">{permission.description}</div>
                          </div>
                          {formData.permissions.includes(permission.id) && (
                            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingRole(null);
                      setFormData({ name: "", displayName: "", description: "", permissions: [] });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingRole ? 'Actualizar' : 'Crear'} Rol
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Roles del Sistema ({roles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3">Cargando roles...</span>
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay roles configurados</h3>
              <p className="text-gray-600 mb-6">Inicialice los roles del sistema para comenzar</p>
              <Button 
                onClick={initializeSystemRoles}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Shield className="w-4 h-4 mr-2" />
                Inicializar Roles del Sistema
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rol</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Usuarios</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(role.name)}>
                          <Shield className="w-3 h-3 mr-1" />
                          {role.displayName}
                        </Badge>
                        {role.isSystemRole && (
                          <Badge variant="outline" className="text-xs">
                            Sistema
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600">{role.description}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {role.permissions.length} permisos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{role.userCount || 0} usuarios</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(role.createdAt).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={() => editRole(role)}
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={() => editRole(role)}
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteRole(role.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}