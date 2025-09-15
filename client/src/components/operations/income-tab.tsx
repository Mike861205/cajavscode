import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, Calendar, User, Building2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Income {
  id: number;
  amount: string;
  description: string;
  category: string;
  reference: string;
  cashRegisterId: number;
  userId: number;
  warehouseId: number;
  createdAt: string;
  user: {
    id: number;
    username: string;
    fullName: string;
  };
  warehouse: {
    id: number;
    name: string;
  };
}

interface IncomeTabProps {
  filters?: {
    startDate?: string;
    endDate?: string;
    warehouseId?: number;
  };
}

export default function IncomeTab({ filters = {} }: IncomeTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Build query params for filters
  const buildQueryParams = (baseFilters: typeof filters) => {
    const params = new URLSearchParams();
    if (baseFilters.startDate) params.append('startDate', baseFilters.startDate);
    if (baseFilters.endDate) params.append('endDate', baseFilters.endDate);
    if (baseFilters.warehouseId) params.append('warehouseId', baseFilters.warehouseId.toString());
    return params.toString();
  };

  // Get income with filters
  const incomeQueryKey = `/api/operations/income${buildQueryParams(filters) ? `?${buildQueryParams(filters)}` : ''}`;
  const { data: income = [], isLoading } = useQuery({
    queryKey: [incomeQueryKey],
  });

  // Get active cash register
  const { data: activeCashRegister } = useQuery({
    queryKey: ["/api/cash-register/active"],
  });

  // Add income mutation
  const addIncomeMutation = useMutation({
    mutationFn: async (incomeData: any) => {
      const response = await apiRequest("POST", "/api/operations/income", incomeData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operations/income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register", activeCashRegister?.id, "summary"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Ingreso registrado",
        description: "El ingreso se ha registrado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo registrar el ingreso.",
        variant: "destructive",
      });
    },
  });

  // Delete income mutation
  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/operations/income/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operations/income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register", activeCashRegister?.id, "summary"] });
      setIncomeToDelete(null);
      toast({
        title: "Ingreso eliminado",
        description: "El ingreso se ha eliminado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el ingreso.",
        variant: "destructive",
      });
    },
  });

  const handleAddIncome = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!activeCashRegister) {
      toast({
        title: "Error",
        description: "No hay una caja registradora activa.",
        variant: "destructive",
      });
      return;
    }

    const incomeData = {
      amount: parseFloat(formData.get("amount") as string),
      description: formData.get("description") as string,
      category: formData.get("category") as string,
      reference: formData.get("reference") as string,
    };

    addIncomeMutation.mutate(incomeData);
  };

  if (isLoading) {
    return <div>Cargando ingresos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Ingresos Registrados</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!activeCashRegister}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Ingreso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Ingreso</DialogTitle>
              <DialogDescription>
                Registra un ingreso que se sumará a la caja actual
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddIncome}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Monto *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoría *</Label>
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="servicios">Servicios</SelectItem>
                      <SelectItem value="comisiones">Comisiones</SelectItem>
                      <SelectItem value="reembolsos">Reembolsos</SelectItem>
                      <SelectItem value="ajustes">Ajustes</SelectItem>
                      <SelectItem value="donaciones">Donaciones</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reference">Referencia</Label>
                  <Input
                    id="reference"
                    name="reference"
                    placeholder="Ej: Factura #123, Comprobante, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe el ingreso recibido..."
                    required
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={addIncomeMutation.isPending}>
                  {addIncomeMutation.isPending ? "Registrando..." : "Registrar Ingreso"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!activeCashRegister && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No hay una caja registradora activa. Abre una caja para registrar ingresos.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {income.map((item: Income) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-600">
                      +${parseFloat(item.amount).toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-green-200 text-green-700">
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {item.description}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {item.user?.fullName || item.user?.username}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {item.warehouse?.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setIncomeToDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar ingreso?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará el ingreso y ajustará el balance de la caja registradora.
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => incomeToDelete && deleteIncomeMutation.mutate(incomeToDelete.id)}
                            disabled={deleteIncomeMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleteIncomeMutation.isPending ? "Eliminando..." : "Eliminar"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {income.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay ingresos registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}