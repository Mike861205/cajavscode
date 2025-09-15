import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Edit, 
  Trash2, 
  Check, 
  Calendar, 
  Building2, 
  Package, 
  DollarSign,
  FileText,
  Plus,
  Eye
} from "lucide-react";

// Types
interface Purchase {
  id: number;
  supplierId: number;
  supplierName: string;
  status: "pending" | "received";
  total: string;
  createdAt: string;
  tenantId: string;
  userId: number;
  warehouseId: number | null;
  warehouseName: string | null;
}

interface PurchaseItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  hasTax: boolean;
  taxRate: number;
}

export default function PurchasesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch purchases
  const { data: purchases, isLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/purchases"],
  });

  // Accept purchase mutation
  const acceptPurchaseMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      const res = await apiRequest("PUT", `/api/purchases/${purchaseId}`, {
        status: "received"
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Compra aceptada",
        description: "La compra ha sido marcada como recibida",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al aceptar compra",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete purchase mutation
  const deletePurchaseMutation = useMutation({
    mutationFn: async (purchaseId: number) => {
      const res = await apiRequest("DELETE", `/api/purchases/${purchaseId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Compra eliminada",
        description: "La compra ha sido eliminada correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar compra",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter purchases based on search term
  const filteredPurchases = purchases?.filter(purchase => 
    (purchase.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.id.toString().includes(searchTerm) ||
    (purchase.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case "received":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Recibido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Query to fetch detailed purchase with items
  const { data: detailedPurchase, isLoading: isDetailLoading } = useQuery({
    queryKey: ["/api/purchases", selectedPurchase?.id],
    queryFn: async () => {
      if (!selectedPurchase?.id) return null;
      const res = await fetch(`/api/purchases/${selectedPurchase.id}`);
      if (!res.ok) throw new Error("Failed to fetch purchase details");
      return res.json();
    },
    enabled: !!selectedPurchase?.id && isViewDialogOpen,
  });

  const handleViewPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setIsViewDialogOpen(true);
  };

  const handleAcceptPurchase = (purchaseId: number) => {
    acceptPurchaseMutation.mutate(purchaseId);
  };

  const handleDeletePurchase = (purchaseId: number) => {
    deletePurchaseMutation.mutate(purchaseId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historial de Compras</h1>
          <p className="text-gray-600 mt-1">Gestiona el historial de compras realizadas</p>
        </div>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-gray-600">
            Total: {filteredPurchases.length} compras
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por proveedor, ID o estado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Compras
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron compras</h3>
              <p className="text-gray-600">
                {searchTerm ? "Intenta con diferentes términos de búsqueda" : "Aún no hay compras registradas"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-mono text-sm">
                        #{purchase.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(purchase.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {purchase.supplierName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(purchase.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          Ver detalles
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{purchase.warehouseName || 'Sin asignar'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">${parseFloat(purchase.total).toFixed(2)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPurchase(purchase)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {purchase.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAcceptPurchase(purchase.id)}
                              disabled={acceptPurchaseMutation.isPending}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar compra?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente 
                                  la compra #{purchase.id} y todos sus datos asociados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePurchase(purchase.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Purchase Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Detalle de Compra #{selectedPurchase?.id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPurchase && (
            <div className="space-y-6">
              {/* Purchase Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ID:</span>
                      <span className="font-mono">#{selectedPurchase.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha:</span>
                      <span>{new Date(selectedPurchase.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Proveedor:</span>
                      <span>{selectedPurchase.supplierName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      {getStatusBadge(selectedPurchase.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Creado:</span>
                      <span>{new Date(selectedPurchase.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumen Financiero</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>${parseFloat(selectedPurchase.total).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Purchase Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Productos de la Compra</CardTitle>
                </CardHeader>
                <CardContent>
                  {isDetailLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : detailedPurchase?.items && detailedPurchase.items.length > 0 ? (
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Precio Unitario</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailedPurchase.items.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.productName || 'Producto no encontrado'}
                              </TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>${parseFloat(item.price).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">
                                ${parseFloat(item.total).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-4">
                      No se encontraron productos para esta compra.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}