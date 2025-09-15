import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Shield, 
  RefreshCw, 
  Eye, 
  LogOut,
  LogIn,
  Download,
  Search,
  Filter,
  Pause,
  Play,
  Trash2,
  UserMinus,
  ChevronDown,
  ChevronRight,
  CreditCard
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DeleteUserModal } from "@/components/delete-user-modal";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  businessName: string;
  plan: string;
  status: string;
  isActive: boolean;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  createdAt: string;
  lastLogin?: string;
  totalSales: number;
  totalPurchases: number;
  tenantId: string;
  isOwner: boolean;
  phone?: string;
  country?: string;
  subUsers?: AdminUser[];
  currentUserCount?: number;
  currentWarehouseCount?: number;
  planLimits?: {
    maxUsers: number;
    maxWarehouses: number;
  };
  paidAmount?: number;
  paymentMode?: 'monthly' | 'annual';
}

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageRevenuePerUser: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [expandedLicenses, setExpandedLicenses] = useState<Set<string>>(new Set());
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [renewalUser, setRenewalUser] = useState<AdminUser | null>(null);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [renewalPeriod, setRenewalPeriod] = useState<'basic_monthly' | 'pro_monthly' | 'professional_monthly' | 'enterprise_monthly' | 'basic_yearly' | 'pro_yearly' | 'professional_yearly' | 'enterprise_yearly'>('basic_monthly');
  const [renewalNotes, setRenewalNotes] = useState('');
  const queryClient = useQueryClient();

  // Check admin authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiRequest("GET", "/api/admin/auth");
        if (!response.ok) {
          setLocation("/admin/login");
        }
      } catch (error) {
        setLocation("/admin/login");
      }
    };
    checkAuth();
  }, [setLocation]);

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users", searchTerm, dateFilter],
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", "/api/admin/reset-password", { userId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  // License actions mutations
  const pauseLicenseMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await apiRequest("POST", "/api/admin/pause-license", { tenantId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const activateLicenseMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await apiRequest("POST", "/api/admin/activate-license", { tenantId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const deleteLicenseMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const response = await apiRequest("DELETE", "/api/admin/delete-license", { tenantId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const manualRenewalMutation = useMutation({
    mutationFn: async ({ tenantId, period, notes }: { tenantId: string; period: 'basic_monthly' | 'pro_monthly' | 'professional_monthly' | 'enterprise_monthly' | 'basic_yearly' | 'pro_yearly' | 'professional_yearly' | 'enterprise_yearly'; notes: string }) => {
      const response = await apiRequest("POST", "/api/admin/manual-renewal", { 
        tenantId, 
        period, 
        notes,
        renewedBy: 'admin' // Track who renewed manually
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsRenewalModalOpen(false);
      setRenewalUser(null);
      setRenewalNotes('');
    },
  });

  // Delete user functions
  const handleDeleteUser = (user: AdminUser) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };

  // Manual renewal functions
  const handleManualRenewal = (user: AdminUser) => {
    setRenewalUser(user);
    setIsRenewalModalOpen(true);
  };

  const handleCloseRenewalModal = () => {
    setIsRenewalModalOpen(false);
    setRenewalUser(null);
    setRenewalNotes('');
    setRenewalPeriod('basic_monthly');
  };

  // Logout function
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/admin/logout");
      setLocation("/");
    } catch (error) {
      setLocation("/");
    }
  };

  // Group users by tenant (license owners and their sub-users)
  const groupedUsers = users?.reduce((acc, user) => {
    if (user.isOwner) {
      acc[user.tenantId] = {
        ...user,
        subUsers: users.filter(u => u.tenantId === user.tenantId && !u.isOwner)
      };
    }
    return acc;
  }, {} as Record<string, AdminUser>) || {};

  const filteredLicenses = Object.values(groupedUsers).filter(license => {
    // Search filter
    const matchesSearch = license.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.businessName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date filter
    let matchesDate = true;
    if (startDate || endDate) {
      const licenseDate = new Date(license.createdAt);
      if (startDate) {
        const start = new Date(startDate);
        matchesDate = matchesDate && licenseDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && licenseDate <= end;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  const toggleLicenseExpansion = (tenantId: string) => {
    const newExpanded = new Set(expandedLicenses);
    if (newExpanded.has(tenantId)) {
      newExpanded.delete(tenantId);
    } else {
      newExpanded.add(tenantId);
    }
    setExpandedLicenses(newExpanded);
  };

  const getStatusBadge = (user: AdminUser) => {
    if (user.status === "trial") {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Prueba</Badge>;
    }
    if (user.status === "active") {
      return <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">Activo</Badge>;
    }
    if (user.status === "expired") {
      return <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">Expirado</Badge>;
    }
    return <Badge variant="secondary">Inactivo</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      trial: "bg-gray-50 text-gray-700 border-gray-200",
      basic: "bg-blue-50 text-blue-700 border-blue-200",
      pro: "bg-purple-50 text-purple-700 border-purple-200",
      professional: "bg-green-50 text-green-700 border-green-200",
      enterprise: "bg-orange-50 text-orange-700 border-orange-200",
    };
    return (
      <Badge variant="outline" className={colors[plan as keyof typeof colors] || colors.trial}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    );
  };

  const getPlanLimits = (plan: string) => {
    const limits = {
      trial: { maxUsers: 1, maxWarehouses: 1 },
      basic: { maxUsers: 1, maxWarehouses: 1 },
      pro: { maxUsers: 2, maxWarehouses: 2 },
      professional: { maxUsers: 6, maxWarehouses: 3 },
      enterprise: { maxUsers: 12, maxWarehouses: 6 },
    };
    return limits[plan as keyof typeof limits] || limits.trial;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <p className="text-sm text-gray-600">Gestión de Suscriptores - Caja SAS Enterprise</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" className="text-red-600 hover:text-red-700">
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Suscripciones Activas</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.activeSubscriptions || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En Prueba</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats?.trialUsers || 0}</p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                  <p className="text-3xl font-bold text-green-600">${stats?.totalRevenue || '0'}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos Mensuales</p>
                  <p className="text-3xl font-bold text-blue-600">${stats?.monthlyRevenue || '0'}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ARPU</p>
                  <p className="text-3xl font-bold text-purple-600">${stats?.averageRevenuePerUser || '0'}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Gestión de Suscriptores</CardTitle>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Input
                    type="date"
                    placeholder="Fecha inicio"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-gray-500">a</span>
                  <Input
                    type="date"
                    placeholder="Fecha fin"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Licencia / Usuario</TableHead>
                    <TableHead>Plan / Límites</TableHead>
                    <TableHead>Pago / Modalidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Registro</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead>Ventas</TableHead>
                    <TableHead>Compras/Gastos</TableHead>
                    <TableHead>Utilidad/Pérdida</TableHead>
                    <TableHead>Login Directo</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLicenses.map((license) => {
                    const isExpanded = expandedLicenses.has(license.tenantId);
                    const limits = getPlanLimits(license.plan);
                    const hasSubUsers = license.subUsers && license.subUsers.length > 0;
                    
                    return (
                      <>
                        {/* License Owner Row */}
                        <TableRow key={license.id} className="bg-gray-50">
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {hasSubUsers && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleLicenseExpansion(license.tenantId)}
                                  className="p-1 h-auto"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                              <div className="flex items-center space-x-2">
                                <Shield className="w-4 h-4 text-blue-600" />
                                <div>
                                  <p className="font-medium text-gray-900">{license.username}</p>
                                  <p className="text-sm text-gray-500">{license.email}</p>
                                  <p className="text-xs text-blue-600">Licencia Principal</p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              {getPlanBadge(license.plan)}
                              <div className="text-xs text-gray-500 mt-1">
                                <p>Usuarios: {(license.subUsers?.length || 0) + 1}/{limits.maxUsers}</p>
                                <p>Sucursales: {license.currentWarehouseCount || 0}/{limits.maxWarehouses}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {license.status === 'trial' ? (
                              <div className="text-center">
                                <p className="text-sm text-gray-500">$0</p>
                                <p className="text-xs text-gray-400">Prueba</p>
                              </div>
                            ) : (
                              <div className="text-center">
                                <p className="text-sm font-medium">${license.paidAmount || 0}</p>
                                <p className="text-xs text-gray-500">{license.paymentMode === 'annual' ? 'Anual' : 'Mensual'}</p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(license)}</TableCell>
                          <TableCell>
                            {format(new Date(license.createdAt), "dd MMM yyyy", { locale: es })}
                          </TableCell>
                          <TableCell>
                            {license.subscriptionEndsAt
                              ? format(new Date(license.subscriptionEndsAt), "dd MMM yyyy", { locale: es })
                              : license.trialEndsAt
                              ? format(new Date(license.trialEndsAt), "dd MMM yyyy", { locale: es })
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">${license.totalSales?.toLocaleString() || '0'}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-green-600">${license.totalPurchases?.toLocaleString() || '0'}</p>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const profit = (license.totalSales || 0) - (license.totalPurchases || 0);
                              const isProfit = profit >= 0;
                              return (
                                <p className={`font-medium ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                                  ${Math.abs(profit).toLocaleString()}
                                  {isProfit ? ' ↗' : ' ↘'}
                                </p>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const response = await apiRequest("POST", "/api/admin/direct-login", {
                                    username: license.username
                                  });
                                  
                                  if (response.ok) {
                                    // Open dashboard in new tab after successful login
                                    window.open('/dashboard', '_blank');
                                  } else {
                                    const error = await response.json();
                                    alert(`Error: ${error.message}`);
                                  }
                                } catch (error) {
                                  alert('Error de conexión al intentar acceso directo');
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                            >
                              <LogIn className="w-4 h-4 mr-1" />
                              Acceder
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedUser(license)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Detalles de la Licencia</DialogTitle>
                                  </DialogHeader>
                                  {selectedUser && (
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-sm font-medium text-gray-700">Usuario</Label>
                                        <p className="text-sm text-gray-900">{selectedUser.username}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium text-gray-700">Email</Label>
                                        <p className="text-sm text-gray-900">{selectedUser.email}</p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium text-gray-700">Negocio</Label>
                                        <p className="text-sm text-gray-900">{selectedUser.businessName}</p>
                                      </div>
                                      {selectedUser.phone && (
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">Teléfono</Label>
                                          <p className="text-sm text-gray-900">{selectedUser.phone}</p>
                                        </div>
                                      )}
                                      {selectedUser.country && (
                                        <div>
                                          <Label className="text-sm font-medium text-gray-700">País</Label>
                                          <p className="text-sm text-gray-900">{selectedUser.country}</p>
                                        </div>
                                      )}
                                      <div>
                                        <Label className="text-sm font-medium text-gray-700">Último Login</Label>
                                        <p className="text-sm text-gray-900">
                                          {selectedUser.lastLogin
                                            ? format(new Date(selectedUser.lastLogin), "dd MMM yyyy HH:mm", { locale: es })
                                            : "Nunca"}
                                        </p>
                                      </div>
                                      <Button
                                        onClick={() => resetPasswordMutation.mutate(selectedUser.id)}
                                        disabled={resetPasswordMutation.isPending}
                                        className="w-full"
                                        variant="outline"
                                      >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        {resetPasswordMutation.isPending ? "Reseteando..." : "Resetear Contraseña"}
                                      </Button>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                              
                              {license.status === "active" || license.status === "trial" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => pauseLicenseMutation.mutate(license.tenantId)}
                                  disabled={pauseLicenseMutation.isPending}
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <Pause className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => activateLicenseMutation.mutate(license.tenantId)}
                                  disabled={activateLicenseMutation.isPending}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                              )}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleManualRenewal(license)}
                                disabled={manualRenewalMutation.isPending}
                                className="text-blue-600 hover:text-blue-700"
                                title="Renovación Manual"
                              >
                                <CreditCard className="w-4 h-4" />
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(license)}
                                disabled={deleteLicenseMutation.isPending}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Sub-users rows */}
                        {isExpanded && hasSubUsers && license.subUsers?.map((subUser) => (
                          <TableRow key={`subuser-${subUser.id}-${license.tenantId}`} className="bg-blue-50">
                            <TableCell>
                              <div className="flex items-center space-x-2 ml-6">
                                <UserMinus className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="font-medium text-gray-700">{subUser.username}</p>
                                  <p className="text-sm text-gray-500">{subUser.email}</p>
                                  <p className="text-xs text-gray-400">Usuario Hijo</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                                Usuario
                              </Badge>
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              {subUser.isActive ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Activo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  Inactivo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {format(new Date(subUser.createdAt), "dd MMM yyyy", { locale: es })}
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const response = await apiRequest("POST", "/api/admin/direct-login", {
                                      username: subUser.username
                                    });
                                    
                                    if (response.ok) {
                                      // Open dashboard in new tab after successful login
                                      window.open('/dashboard', '_blank');
                                    } else {
                                      const error = await response.json();
                                      alert(`Error: ${error.message}`);
                                    }
                                  } catch (error) {
                                    alert('Error de conexión al intentar acceso directo');
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                              >
                                <LogIn className="w-4 h-4 mr-1" />
                                Acceder
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetPasswordMutation.mutate(subUser.id)}
                                disabled={resetPasswordMutation.isPending}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de eliminación */}
      <DeleteUserModal
        user={userToDelete}
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
      />

      {/* Modal de renovación manual */}
      <Dialog open={isRenewalModalOpen} onOpenChange={setIsRenewalModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Renovación Manual de Licencia
            </DialogTitle>
          </DialogHeader>
          {renewalUser && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  {renewalUser.username} - {renewalUser.businessName}
                </p>
                <p className="text-xs text-blue-700">{renewalUser.email}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Estado actual: <span className="font-medium">{renewalUser.status}</span>
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Período de Renovación</Label>
                
                {/* Planes Mensuales */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Planes Mensuales</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={renewalPeriod === 'basic_monthly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRenewalPeriod('basic_monthly')}
                      className="flex flex-col h-auto py-2 text-xs"
                    >
                      <span className="font-medium">Básico</span>
                      <span className="text-xs opacity-70">$27 USD</span>
                    </Button>
                    <Button
                      variant={renewalPeriod === 'pro_monthly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRenewalPeriod('pro_monthly')}
                      className="flex flex-col h-auto py-2 text-xs"
                    >
                      <span className="font-medium">Pro</span>
                      <span className="text-xs opacity-70">$44 USD</span>
                    </Button>
                    <Button
                      variant={renewalPeriod === 'professional_monthly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRenewalPeriod('professional_monthly')}
                      className="flex flex-col h-auto py-2 text-xs"
                    >
                      <span className="font-medium">Profesional</span>
                      <span className="text-xs opacity-70">$63 USD</span>
                    </Button>
                    <Button
                      variant={renewalPeriod === 'enterprise_monthly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRenewalPeriod('enterprise_monthly')}
                      className="flex flex-col h-auto py-2 text-xs"
                    >
                      <span className="font-medium">Empresarial</span>
                      <span className="text-xs opacity-70">$89 USD</span>
                    </Button>
                  </div>
                </div>

                {/* Planes Anuales */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Planes Anuales</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={renewalPeriod === 'basic_yearly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRenewalPeriod('basic_yearly')}
                      className="flex flex-col h-auto py-2 text-xs"
                    >
                      <span className="font-medium">Básico</span>
                      <span className="text-xs opacity-70">$270 USD</span>
                    </Button>
                    <Button
                      variant={renewalPeriod === 'pro_yearly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRenewalPeriod('pro_yearly')}
                      className="flex flex-col h-auto py-2 text-xs"
                    >
                      <span className="font-medium">Pro</span>
                      <span className="text-xs opacity-70">$440 USD</span>
                    </Button>
                    <Button
                      variant={renewalPeriod === 'professional_yearly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRenewalPeriod('professional_yearly')}
                      className="flex flex-col h-auto py-2 text-xs"
                    >
                      <span className="font-medium">Profesional</span>
                      <span className="text-xs opacity-70">$630 USD</span>
                    </Button>
                    <Button
                      variant={renewalPeriod === 'enterprise_yearly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRenewalPeriod('enterprise_yearly')}
                      className="flex flex-col h-auto py-2 text-xs"
                    >
                      <span className="font-medium">Empresarial</span>
                      <span className="text-xs opacity-70">$833 USD</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Notas de Renovación</Label>
                <textarea
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                  placeholder="Ej: Pago por transferencia bancaria recibido el [fecha]. Comprobante #12345"
                  className="w-full h-20 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  <strong>Nota:</strong> Esta renovación manual actualizará la fecha de vencimiento y desbloqueará el sistema del cliente.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCloseRenewalModal}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => manualRenewalMutation.mutate({
                    tenantId: renewalUser.tenantId,
                    period: renewalPeriod,
                    notes: renewalNotes
                  })}
                  disabled={manualRenewalMutation.isPending || !renewalNotes.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {manualRenewalMutation.isPending ? "Procesando..." : "Renovar Licencia"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}