import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Activity, 
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Building2,
  MapPin,
  Warehouse
} from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isOwner: boolean;
  lastLogin: string | null;
  createdAt: string;
  role: string;
  roleId: number | null;
  warehouseId: number | null;
  warehouse?: {
    id: number;
    name: string;
  };
}

interface UserRole {
  id: number;
  name: string;
  displayName: string;
  description: string;
}

interface Warehouse {
  id: number;
  name: string;
}

interface UserWithRole {
  role: {
    name: string;
  } | null;
}

export default function UsersDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [selectedUserForWarehouse, setSelectedUserForWarehouse] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersResponse, rolesResponse, warehousesResponse, userResponse, userRoleResponse] = await Promise.all([
        fetch("/api/users", { credentials: "include" }),
        fetch("/api/user-roles", { credentials: "include" }),
        fetch("/api/warehouses", { credentials: "include" }),
        fetch("/api/user", { credentials: "include" }),
        fetch("/api/user-role", { credentials: "include" })
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        console.log("Users data:", usersData); // Debug log
        setUsers(usersData);
      }

      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        setRoles(rolesData);
      }

      if (warehousesResponse.ok) {
        const warehousesData = await warehousesResponse.json();
        setWarehouses(warehousesData);
      }

      let currentUserData = null;
      if (userResponse.ok) {
        currentUserData = await userResponse.json();
        setCurrentUser(currentUserData);
      }

      if (userRoleResponse.ok) {
        const userRoleData = await userRoleResponse.json();
        console.log("Current user role:", userRoleData); // Debug log
        setCurrentUser(prev => ({
          ...(prev || currentUserData || {}),
          role: userRoleData
        }));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/toggle-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "Estado actualizado",
          description: `Usuario ${!currentStatus ? 'activado' : 'desactivado'} exitosamente`,
        });
        loadData();
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del usuario",
        variant: "destructive",
      });
    }
  };



  const getRoleDisplayName = (roleId: number | null) => {
    if (!roleId) return "Sin rol";
    const role = roles.find(r => r.id === roleId);
    console.log(`Looking for role ID ${roleId}, found:`, role, `Available roles:`, roles); // Debug
    return role?.displayName || `Rol ID: ${roleId}`;
  };

  const getUserStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const recentLogins = users.filter(u => {
      if (!u.lastLogin) return false;
      const lastLogin = new Date(u.lastLogin);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return lastLogin > sevenDaysAgo;
    }).length;

    return { totalUsers, activeUsers, recentLogins };
  };

  const stats = getUserStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Cargando panel de usuarios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel de Usuarios</h1>
          <p className="text-gray-600 mt-1">Gestión completa de usuarios y roles del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => window.location.href = '/dashboard/users/roles'}
            variant="outline"
          >
            <Shield className="w-4 h-4 mr-2" />
            Gestionar Roles
          </Button>
          <Button 
            onClick={() => window.location.href = '/dashboard/users/registration'}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Usuarios registrados en el sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              De {stats.totalUsers} usuarios totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conexiones Recientes</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.recentLogins}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 7 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles Configurados</CardTitle>
            <Shield className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{roles.length}</div>
            <p className="text-xs text-muted-foreground">
              Roles disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Lista de Usuarios ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios registrados</h3>
              <p className="text-gray-600 mb-6">Comience agregando el primer usuario al sistema</p>
              <Button 
                onClick={() => window.location.href = '/dashboard/users/registration'}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Agregar Primer Usuario
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <Badge 
                        variant={user.isActive ? "default" : "secondary"}
                        className={user.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                      >
                        {user.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      {user.isOwner && (
                        <Badge className="ml-2 bg-purple-100 text-purple-800">
                          Propietario
                        </Badge>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        Rol: {getRoleDisplayName(user.roleId)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 flex items-center">
                        <Building2 className="w-3 h-3 mr-1" />
                        Almacén: {user.warehouse?.name || "No asignado"}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {user.lastLogin 
                          ? `Último acceso: ${new Date(user.lastLogin).toLocaleDateString()}`
                          : "Nunca se conectó"
                        }
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {/* Warehouse Assignment Button - Only for super_admin */}
                      {currentUser?.role?.name === "super_admin" && (
                        <Dialog open={showWarehouseModal} onOpenChange={setShowWarehouseModal}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUserForWarehouse(user);
                                setSelectedWarehouse("");
                                setShowWarehouseModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300"
                            >
                              <Building2 className="w-4 h-4 mr-1" />
                              Almacén
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2 text-xl">
                                <Warehouse className="w-6 h-6 text-blue-600" />
                                Asignar Almacén
                              </DialogTitle>
                              <p className="text-gray-600">
                                Selecciona un almacén para <span className="font-semibold text-gray-900">{selectedUserForWarehouse?.fullName}</span>
                              </p>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                              <div className="grid gap-3">
                                {warehouses.map((warehouse) => (
                                  <div
                                    key={warehouse.id}
                                    onClick={() => setSelectedWarehouse(warehouse.id.toString())}
                                    className={`
                                      relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200
                                      ${selectedWarehouse === warehouse.id.toString()
                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                      }
                                    `}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className={`
                                          w-10 h-10 rounded-full flex items-center justify-center
                                          ${selectedWarehouse === warehouse.id.toString()
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-600'
                                          }
                                        `}>
                                          <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <h3 className={`font-semibold ${
                                            selectedWarehouse === warehouse.id.toString()
                                              ? 'text-blue-900'
                                              : 'text-gray-900'
                                          }`}>
                                            {warehouse.name}
                                          </h3>
                                          <p className="text-sm text-gray-500">
                                            ID: {warehouse.id}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      {selectedWarehouse === warehouse.id.toString() && (
                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                          <CheckCircle className="w-4 h-4 text-white" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {warehouses.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                  <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                  <p>No hay almacenes disponibles</p>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setShowWarehouseModal(false);
                                  setSelectedUserForWarehouse(null);
                                  setSelectedWarehouse("");
                                }}
                              >
                                Cancelar
                              </Button>
                              <Button 
                                onClick={async () => {
                                  if (!selectedWarehouse || !selectedUserForWarehouse) return;

                                  try {
                                    const response = await fetch(`/api/users/${selectedUserForWarehouse.id}/assign-warehouse`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ warehouseId: parseInt(selectedWarehouse) }),
                                      credentials: "include",
                                    });

                                    if (response.ok) {
                                      toast({
                                        title: "✅ Almacén asignado",
                                        description: `${selectedUserForWarehouse.fullName} fue asignado al almacén ${warehouses.find(w => w.id.toString() === selectedWarehouse)?.name}`,
                                      });
                                      setShowWarehouseModal(false);
                                      setSelectedUserForWarehouse(null);
                                      setSelectedWarehouse("");
                                      loadData();
                                    } else {
                                      const error = await response.json();
                                      toast({
                                        title: "Error al asignar",
                                        description: error.message || "No se pudo asignar el almacén",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (error) {
                                    console.error("Error assigning warehouse:", error);
                                    toast({
                                      title: "Error de conexión",
                                      description: "No se pudo conectar con el servidor",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                disabled={!selectedWarehouse}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Building2 className="w-4 h-4 mr-2" />
                                Asignar Almacén
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {!user.isOwner && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          className={user.isActive ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                        >
                          {user.isActive ? (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Activar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}