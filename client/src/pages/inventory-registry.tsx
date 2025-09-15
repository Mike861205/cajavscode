import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Archive, 
  Search, 
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Printer,
  Calendar,
  User,
  Building,
  Package,
  Warehouse
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InventoryRecord {
  id: string;
  date: string;
  time: string;
  userId: number;
  userName: string;
  tenantName: string;
  warehouseName?: string;
  totalProducts: number;
  totalVariances: number;
  status: 'completed' | 'pending' | 'closed';
  products: Array<{
    productId: number;
    productName: string;
    systemStock: number;
    physicalCount: number;
    shrinkage: number;
    shrinkageNotes: string;
    variance: number;
    varianceType: 'faltante' | 'sobrante' | 'exacto';
  }>;
}

export default function InventoryRegistry() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<InventoryRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<InventoryRecord | null>(null);

  // Fetch inventory records
  const { data: inventoryRecords = [], isLoading } = useQuery<InventoryRecord[]>({
    queryKey: ['/api/inventory/history'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Delete inventory record mutation
  const deleteRecordMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const response = await apiRequest("DELETE", `/api/inventory/history/${recordId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/history'] });
      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  });

  // Update inventory record mutation - recalculates real stock
  const updateRecordMutation = useMutation({
    mutationFn: async (recordId: string) => {
      console.log(`Updating inventory stock for record: ${recordId}`);
      const response = await apiRequest("POST", `/api/inventory/history/${recordId}/update-stock`);
      if (!response.ok) {
        throw new Error(`Failed to update inventory: ${response.status}`);
      }
      return await response.json();
    },
    onSuccess: (data, recordId) => {
      console.log(`Successfully updated inventory stock for record: ${recordId}`);
      
      // UNIVERSAL CACHE INVALIDATION - Works for ALL tenants/users
      // Clear all product-related cache to force complete refresh
      queryClient.removeQueries({ queryKey: ['/api/products'] });
      queryClient.removeQueries({ queryKey: ['/api/inventory/history'] });
      queryClient.removeQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.removeQueries({ queryKey: ['/api/dashboard/top-products'] });
      queryClient.removeQueries({ queryKey: ['/api/sales/analytics'] });
      
      // Force immediate refetch of critical data
      queryClient.refetchQueries({ 
        queryKey: ['/api/products'],
        type: 'active'
      });
      
      queryClient.refetchQueries({ 
        queryKey: ['/api/inventory/history'],
        type: 'active' 
      });
      
      // Reload page if on products list to ensure stock update display
      if (window.location.pathname.includes('/products')) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
      
      toast({
        title: "Stock actualizado universalmente",
        description: "Las existencias se han actualizado en el inventario y módulo de productos para todos los usuarios.",
      });
    },
    onError: (error) => {
      console.error('Error updating inventory stock:', error);
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar el inventario. Intenta nuevamente.",
        variant: "destructive"
      });
    }
  });

  // Filter records based on search term
  const filteredRecords = inventoryRecords.filter(record =>
    record.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.warehouseName && record.warehouseName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleViewRecord = (record: InventoryRecord) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const handleDeleteRecord = (record: InventoryRecord) => {
    setRecordToDelete(record);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdateRecord = (recordId: string) => {
    console.log(`[DIANA UPDATE] Button clicked for record: ${recordId}`);
    console.log(`[DIANA UPDATE] Current user data:`, JSON.stringify({ 
      recordId,
      isPending: updateRecordMutation.isPending,
      currentURL: window.location.href,
      timestamp: new Date().toISOString()
    }));
    
    if (updateRecordMutation.isPending) {
      console.log(`[DIANA UPDATE] Update already in progress, skipping`);
      return;
    }
    
    console.log(`[DIANA UPDATE] About to call mutate() for record: ${recordId}`);
    try {
      updateRecordMutation.mutate(recordId);
      console.log(`[DIANA UPDATE] Mutate called successfully for record: ${recordId}`);
    } catch (error) {
      console.error(`[DIANA UPDATE] Error calling mutate:`, error);
    }
  };

  const printInventoryRecord = (record: InventoryRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Registro de Inventario - ${record.id}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .company { font-size: 18px; font-weight: bold; }
            .title { font-size: 14px; margin: 5px 0; }
            .info { margin: 10px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; font-weight: bold; }
            .variance-positive { color: #0066cc; font-weight: bold; }
            .variance-negative { color: #cc0000; font-weight: bold; }
            .variance-exact { color: #00cc00; font-weight: bold; }
            .summary { margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
            .summary-item { margin: 5px 0; }
            @media print { 
              body { margin: 0; } 
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">CAJA SAS ENTERPRISE</div>
            <div class="title">REGISTRO DE INVENTARIO</div>
            <div class="title">ID: ${record.id}</div>
          </div>
          
          <div class="info">
            <div><strong>Fecha:</strong> ${record.date}</div>
            <div><strong>Hora:</strong> ${record.time}</div>
            <div><strong>Usuario:</strong> ${record.userName}</div>
            <div><strong>Sucursal:</strong> ${record.tenantName}</div>
            <div><strong>Total Productos:</strong> ${record.totalProducts}</div>
            <div><strong>Productos con Varianza:</strong> ${record.totalVariances}</div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock Sistema</th>
                <th>Conteo Físico</th>
                <th>Merma</th>
                <th>Nota Merma</th>
                <th>Varianza</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${record.products.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.systemStock}</td>
                  <td>${item.physicalCount}</td>
                  <td>${item.shrinkage}</td>
                  <td style="font-size: 10px;">${item.shrinkageNotes || '-'}</td>
                  <td class="${item.variance === 0 ? 'variance-exact' : item.variance < 0 ? 'variance-negative' : 'variance-positive'}">
                    ${item.variance === 0 ? '0' : (item.variance > 0 ? '+' : '') + item.variance}
                  </td>
                  <td class="${item.variance === 0 ? 'variance-exact' : item.variance < 0 ? 'variance-negative' : 'variance-positive'}">
                    ${item.varianceType === 'exacto' ? 'Exacto' : item.varianceType === 'faltante' ? 'Faltante' : 'Sobrante'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-item"><strong>Resumen:</strong></div>
            <div class="summary-item">• Productos Exactos: ${record.products.filter(i => i.variance === 0).length}</div>
            <div class="summary-item">• Productos con Faltante: ${record.products.filter(i => i.variance < 0).length}</div>
            <div class="summary-item">• Productos con Sobrante: ${record.products.filter(i => i.variance > 0).length}</div>
            <div class="summary-item">• Total Faltante: ${record.products.filter(i => i.variance < 0).reduce((sum, i) => sum + Math.abs(i.variance), 0)}</div>
            <div class="summary-item">• Total Sobrante: ${record.products.filter(i => i.variance > 0).reduce((sum, i) => sum + i.variance, 0)}</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completado</Badge>;
      case 'applied':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Inventario Actualizado</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Cerrado</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Registro de Inventario</h2>
          <p className="text-muted-foreground">
            Historial completo de inventarios físicos realizados
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda y Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Input
              placeholder="Buscar por ID, usuario o almacén..."
              className="flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Registros de Inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando registros...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Varianzas</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">{record.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {record.date}
                        </div>
                      </TableCell>
                      <TableCell>{record.time}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-500" />
                          {record.userName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Warehouse className="h-4 w-4 text-gray-500" />
                          {record.warehouseName || record.tenantName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-gray-500" />
                          {record.totalProducts}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.totalVariances > 0 ? "destructive" : "default"}>
                          {record.totalVariances}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="min-w-[300px]">
                        <div className="flex flex-wrap gap-1 justify-start">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewRecord(record)}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Eye className="h-3 w-3" />
                            Ver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => printInventoryRecord(record)}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Printer className="h-3 w-3" />
                            Imprimir
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleUpdateRecord(record.id)}
                            disabled={updateRecordMutation.isPending}
                            className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Actualizar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDeleteRecord(record)}
                            disabled={deleteRecordMutation.isPending}
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                            Borrar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredRecords.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron registros de inventario</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Record Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalle del Inventario - {selectedRecord?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Fecha</div>
                  <div className="font-medium">{selectedRecord.date}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Hora</div>
                  <div className="font-medium">{selectedRecord.time}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Usuario</div>
                  <div className="font-medium">{selectedRecord.userName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Sucursal</div>
                  <div className="font-medium">{selectedRecord.tenantName}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Stock Sistema</TableHead>
                      <TableHead>Conteo Físico</TableHead>
                      <TableHead>Merma</TableHead>
                      <TableHead>Nota Merma</TableHead>
                      <TableHead>Varianza</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRecord.products.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.systemStock}</TableCell>
                        <TableCell>{item.physicalCount}</TableCell>
                        <TableCell>{item.shrinkage}</TableCell>
                        <TableCell className="text-xs">{item.shrinkageNotes || '-'}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            item.variance === 0 ? 'text-green-600' :
                            item.variance < 0 ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {item.variance === 0 ? '0' : (item.variance > 0 ? '+' : '') + item.variance}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.varianceType === 'exacto' ? 'default' :
                            item.varianceType === 'faltante' ? 'destructive' : 'secondary'
                          }>
                            {item.varianceType === 'exacto' ? 'Exacto' : 
                             item.varianceType === 'faltante' ? 'Faltante' : 'Sobrante'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Cerrar
                </Button>
                <Button onClick={() => printInventoryRecord(selectedRecord)} className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Eliminar Registro de Inventario
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar el registro de inventario{" "}
              <span className="font-semibold text-gray-900">
                "{recordToDelete?.id}"
              </span>
              ? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => recordToDelete && deleteRecordMutation.mutate(recordToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteRecordMutation.isPending}
            >
              {deleteRecordMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}