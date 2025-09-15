import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Plus, Edit2, Trash2, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface JobPosition {
  id: number;
  title: string;
  description?: string;
  departmentId: number;
  departmentName?: string;
  isActive: boolean;
  employeeCount?: number;
  tenantId: string;
  createdAt: Date;
}

interface Department {
  id: number;
  name: string;
  isActive: boolean;
}

export function JobPositionManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    departmentId: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["/api/job-positions"],
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; departmentId: number }) => {
      return apiRequest("POST", "/api/job-positions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-positions"] });
      toast({
        title: "Puesto creado",
        description: "El puesto de trabajo se ha creado exitosamente.",
      });
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el puesto de trabajo.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; title: string; description: string; departmentId: number }) => {
      return apiRequest("PUT", `/api/job-positions/${data.id}`, {
        title: data.title,
        description: data.description,
        departmentId: data.departmentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-positions"] });
      toast({
        title: "Puesto actualizado",
        description: "El puesto de trabajo se ha actualizado exitosamente.",
      });
      resetForm();
      setEditingPosition(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el puesto de trabajo.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/job-positions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-positions"] });
      toast({
        title: "Puesto eliminado",
        description: "El puesto de trabajo se ha eliminado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el puesto de trabajo.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({ title: "", description: "", departmentId: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.departmentId) {
      toast({
        title: "Error",
        description: "El título del puesto y el departamento son requeridos.",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      title: formData.title,
      description: formData.description,
      departmentId: parseInt(formData.departmentId),
    };

    if (editingPosition) {
      updateMutation.mutate({
        id: editingPosition.id,
        ...submitData,
      });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (position: JobPosition) => {
    setEditingPosition(position);
    setFormData({
      title: position.title,
      description: position.description || "",
      departmentId: position.departmentId.toString(),
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este puesto de trabajo?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Gestión de Puestos de Trabajo</h3>
          <p className="text-sm text-muted-foreground">
            Define los puestos disponibles en cada departamento
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingPosition(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Puesto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPosition ? "Editar Puesto" : "Nuevo Puesto de Trabajo"}
              </DialogTitle>
              <DialogDescription>
                {editingPosition 
                  ? "Modifica la información del puesto de trabajo."
                  : "Crea un nuevo puesto de trabajo en tu organización."
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título del Puesto *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej. Gerente de Ventas, Analista, Cajero"
                  required
                />
              </div>
              <div>
                <Label htmlFor="department">Departamento *</Label>
                <Select 
                  value={formData.departmentId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, departmentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept: Department) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe las responsabilidades del puesto..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    setEditingPosition(null);
                    setIsAddDialogOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? "Guardando..." : 
                   editingPosition ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Puestos de Trabajo ({positions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay puestos de trabajo</h3>
              <p className="text-muted-foreground mb-4">
                {departments.length === 0 
                  ? "Primero crea departamentos, luego define los puestos de trabajo"
                  : "Define los puestos de trabajo disponibles en tu organización"
                }
              </p>
              {departments.length > 0 && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Puesto
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Empleados</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position: JobPosition) => (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">{position.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {position.departmentName || "Sin departamento"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {position.description || (
                        <span className="text-muted-foreground">Sin descripción</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={position.isActive ? "default" : "secondary"}>
                        {position.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {position.employeeCount || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(position)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Puesto de Trabajo</DialogTitle>
                              <DialogDescription>
                                Modifica la información del puesto de trabajo.
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div>
                                <Label htmlFor="edit-title">Título del Puesto *</Label>
                                <Input
                                  id="edit-title"
                                  value={formData.title}
                                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                  placeholder="Ej. Gerente de Ventas"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="edit-department">Departamento *</Label>
                                <Select 
                                  value={formData.departmentId} 
                                  onValueChange={(value) => setFormData(prev => ({ ...prev, departmentId: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un departamento" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {departments.map((dept: Department) => (
                                      <SelectItem key={dept.id} value={dept.id.toString()}>
                                        {dept.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="edit-description">Descripción</Label>
                                <Textarea
                                  id="edit-description"
                                  value={formData.description}
                                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Describe las responsabilidades del puesto..."
                                  rows={3}
                                />
                              </div>
                              <DialogFooter>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => {
                                    resetForm();
                                    setEditingPosition(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button 
                                  type="submit" 
                                  disabled={updateMutation.isPending}
                                >
                                  {updateMutation.isPending ? "Actualizando..." : "Actualizar"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(position.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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

export default JobPositionManager;