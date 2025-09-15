import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Image as ImageIcon, RefreshCw, Trash2, Upload, FileX, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ImageIntegrityReport {
  tenantId: string;
  totalProducts: number;
  withImages: number;
  imagesExisting: number;
  imagesBroken: number;
  imagesHealthy: number;
  details: Array<{
    productId: number;
    productName: string;
    imageUrl?: string;
    exists: boolean;
    shouldRestore: boolean;
  }>;
}

interface ImageIntegrityManagerProps {
  tenantId: string;
  trigger?: React.ReactNode;
}

export function ImageIntegrityManager({ tenantId, trigger }: ImageIntegrityManagerProps) {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isMigrateDialogOpen, setIsMigrateDialogOpen] = useState(false);
  const [isCleanDialogOpen, setIsCleanDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cargar reporte de integridad
  const {
    data: report,
    isLoading: isLoadingReport,
    error: reportError,
    refetch: refetchReport
  } = useQuery<ImageIntegrityReport>({
    queryKey: [`/api/images/integrity/${tenantId}`],
    enabled: isReportOpen,
  });

  // Mutación para migrar imágenes
  const migrateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/images/migrate/${tenantId}`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Migración exitosa",
        description: data.message || `${data.migratedCount} imágenes migradas exitosamente`,
      });
      refetchReport();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsMigrateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error en migración",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para limpiar URLs rotas
  const cleanMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/images/clean/${tenantId}`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Limpieza exitosa",
        description: data.message || `${data.cleanedCount} URLs rotas limpiadas exitosamente`,
      });
      refetchReport();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsCleanDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error en limpieza",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenReport = () => {
    setIsReportOpen(true);
    refetchReport();
  };

  const getHealthPercentage = () => {
    if (!report || report.withImages === 0) return 0;
    return Math.round((report.imagesHealthy / report.withImages) * 100);
  };

  const getStatusColor = (status: 'healthy' | 'broken' | 'no-image') => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'broken': return 'bg-red-100 text-red-800';
      case 'no-image': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="gap-2">
      <ImageIcon className="h-4 w-4" />
      Gestión de Imágenes
    </Button>
  );

  return (
    <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
      <DialogTrigger asChild onClick={handleOpenReport}>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-blue-600" />
            Sistema de Integridad de Imágenes
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Audita y gestiona la integridad de las imágenes de productos para evitar pérdida de datos
          </DialogDescription>
        </DialogHeader>

        {isLoadingReport ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Analizando integridad de imágenes...</p>
            </div>
          </div>
        ) : reportError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error al cargar reporte</h3>
            <p className="text-red-600 mb-4">No se pudo generar el reporte de integridad</p>
            <Button onClick={() => refetchReport()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : report ? (
          <div className="space-y-6">
            {/* Resumen de integridad */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Integridad</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{report.totalProducts}</div>
                  <div className="text-sm text-gray-600">Total Productos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{report.withImages}</div>
                  <div className="text-sm text-gray-600">Con Imágenes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-600">{report.imagesHealthy}</div>
                  <div className="text-sm text-gray-600">Saludables</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{report.imagesBroken}</div>
                  <div className="text-sm text-gray-600">Rotas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{getHealthPercentage()}%</div>
                  <div className="text-sm text-gray-600">Salud</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Salud de Imágenes</span>
                  <span>{getHealthPercentage()}%</span>
                </div>
                <Progress value={getHealthPercentage()} className="h-2" />
              </div>
            </div>

            {/* Acciones de gestión */}
            {report.imagesBroken > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 border border-yellow-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Acciones Recomendadas
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-gray-900">Migrar Imágenes</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Busca y migra imágenes existentes a estructura por tenant segura
                    </p>
                    <AlertDialog open={isMigrateDialogOpen} onOpenChange={setIsMigrateDialogOpen}>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        onClick={() => setIsMigrateDialogOpen(true)}
                        disabled={migrateMutation.isPending}
                      >
                        {migrateMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Migrar Imágenes
                      </Button>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Migrar Imágenes Legacy</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción buscará archivos de imagen en el directorio principal y los moverá 
                            a una estructura organizada por tenant para evitar futuras pérdidas. 
                            Las URLs en la base de datos se actualizarán automáticamente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => migrateMutation.mutate()}
                            disabled={migrateMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {migrateMutation.isPending ? "Migrando..." : "Migrar Ahora"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Trash2 className="h-5 w-5 text-red-600" />
                      <h4 className="font-medium text-gray-900">Limpiar URLs Rotas</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Elimina referencias a imágenes que ya no existen físicamente
                    </p>
                    <AlertDialog open={isCleanDialogOpen} onOpenChange={setIsCleanDialogOpen}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 gap-2"
                        onClick={() => setIsCleanDialogOpen(true)}
                        disabled={cleanMutation.isPending}
                      >
                        {cleanMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Limpiar URLs
                      </Button>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Limpiar URLs Rotas</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará las URLs de imagen de la base de datos para productos 
                            cuyas imágenes ya no existen físicamente. Los productos mostrarán el 
                            placeholder por defecto hasta que se suban nuevas imágenes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => cleanMutation.mutate()}
                            disabled={cleanMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {cleanMutation.isPending ? "Limpiando..." : "Limpiar Ahora"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            )}

            {/* Detalles de productos */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Detalles por Producto</h3>
                <p className="text-gray-600">Estado de cada imagen de producto</p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <div className="divide-y divide-gray-200">
                  {report.details.map((detail) => {
                    const status = detail.imageUrl ? (detail.exists ? 'healthy' : 'broken') : 'no-image';
                    
                    return (
                      <div key={detail.productId} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {status === 'healthy' && <CheckCircle className="h-5 w-5 text-green-600" />}
                            {status === 'broken' && <FileX className="h-5 w-5 text-red-600" />}
                            {status === 'no-image' && <Info className="h-5 w-5 text-gray-400" />}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{detail.productName}</div>
                            {detail.imageUrl && (
                              <div className="text-sm text-gray-500 font-mono">
                                {detail.imageUrl}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <Badge className={getStatusColor(status)}>
                          {status === 'healthy' && 'Saludable'}
                          {status === 'broken' && 'Imagen Rota'}
                          {status === 'no-image' && 'Sin Imagen'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsReportOpen(false)}>
            Cerrar
          </Button>
          <Button onClick={() => refetchReport()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar Reporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}