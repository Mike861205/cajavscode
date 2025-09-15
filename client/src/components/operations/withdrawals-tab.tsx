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

interface Withdrawal {
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

interface WithdrawalsTabProps {
  filters?: {
    startDate?: string;
    endDate?: string;
    warehouseId?: number;
  };
}

export default function WithdrawalsTab({ filters = {} }: WithdrawalsTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [withdrawalToDelete, setWithdrawalToDelete] = useState<Withdrawal | null>(null);
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

  // Get withdrawals with filters
  const withdrawalsQueryKey = `/api/operations/withdrawals${buildQueryParams(filters) ? `?${buildQueryParams(filters)}` : ''}`;
  const { data: withdrawals = [], isLoading } = useQuery({
    queryKey: [withdrawalsQueryKey],
  });

  // Get active cash register
  const { data: activeCashRegister } = useQuery({
    queryKey: ["/api/cash-register/active"],
  });

  // Add withdrawal mutation
  const addWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalData: any) => {
      const response = await apiRequest("POST", "/api/operations/withdrawals", withdrawalData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operations/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register", activeCashRegister?.id, "summary"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Retiro registrado",
        description: "El retiro se ha registrado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo registrar el retiro.",
        variant: "destructive",
      });
    },
  });

  // Delete withdrawal mutation
  const deleteWithdrawalMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/operations/withdrawals/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/operations/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register", activeCashRegister?.id, "summary"] });
      setWithdrawalToDelete(null);
      toast({
        title: "Retiro eliminado",
        description: "El retiro se ha eliminado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el retiro.",
        variant: "destructive",
      });
    },
  });

  const handleAddWithdrawal = (e: React.FormEvent<HTMLFormElement>) => {
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

    const withdrawalData = {
      amount: parseFloat(formData.get("amount") as string),
      description: formData.get("description") as string,
      category: formData.get("category") as string,
      reference: formData.get("reference") as string,
    };

    addWithdrawalMutation.mutate(withdrawalData);
  };

  if (isLoading) {
    return <div>Cargando retiros...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Retiros Registrados</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!activeCashRegister}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Retiro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Nuevo Retiro</DialogTitle>
              <DialogDescription>
                Registra un retiro de dinero que se descontará de la caja actual
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddWithdrawal}>
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
                      <SelectItem value="personal">Retiro Personal</SelectItem>
                      <SelectItem value="banco">Depósito Bancario</SelectItem>
                      <SelectItem value="caja_fuerte">Caja Fuerte</SelectItem>
                      <SelectItem value="pagos">Pagos</SelectItem>
                      <SelectItem value="emergencia">Emergencia</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reference">Referencia</Label>
                  <Input
                    id="reference"
                    name="reference"
                    placeholder="Ej: Comprobante #123, Autorización, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descripción *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe el motivo del retiro..."
                    required
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={addWithdrawalMutation.isPending}>
                  {addWithdrawalMutation.isPending ? "Registrando..." : "Registrar Retiro"}
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
              No hay una caja registradora activa. Abre una caja para registrar retiros.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Retiros</CardTitle>
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
              {withdrawals.map((withdrawal: Withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(withdrawal.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-orange-600">
                      -${parseFloat(withdrawal.amount).toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-orange-200 text-orange-700">
                      {withdrawal.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {withdrawal.description}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {withdrawal.user?.fullName || withdrawal.user?.username}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {withdrawal.warehouse?.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setWithdrawalToDelete(withdrawal)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar retiro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará el retiro y ajustará el balance de la caja registradora.
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => withdrawalToDelete && deleteWithdrawalMutation.mutate(withdrawalToDelete.id)}
                            disabled={deleteWithdrawalMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {deleteWithdrawalMutation.isPending ? "Eliminando..." : "Eliminar"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {withdrawals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No hay retiros registrados
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