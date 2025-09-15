import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface ImageHealthReport {
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

export function ImageHealthChecker() {
  const [report, setReport] = useState<ImageHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await fetch('/api/user', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    }
  });

  const fetchReport = async () => {
    if (!user?.tenantId) return;
    
    setLoading(true);
    try {
      const reportResponse = await fetch(`/api/images/integrity/${user.tenantId}`, {
        credentials: 'include'
      });
      if (!reportResponse.ok) throw new Error('Failed to fetch report');
      const data = await reportResponse.json();
      setReport(data);
    } catch (error) {
      console.error('Error fetching image report:', error);
      toast({
        title: "Error",
        description: "No se pudo obtener el reporte de imágenes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const migrateImages = async () => {
    if (!report) return;
    
    setMigrating(true);
    try {
      const response = await fetch(`/api/images/migrate/${report.tenantId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "Migración completada",
        description: result.message
      });
      
      // Refresh report
      await fetchReport();
    } catch (error) {
      console.error('Error migrating images:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron migrar las imágenes",
        variant: "destructive"
      });
    } finally {
      setMigrating(false);
    }
  };

  const cleanBrokenUrls = async () => {
    if (!report) return;
    
    setCleaning(true);
    try {
      const response = await fetch(`/api/images/clean/${report.tenantId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "Limpieza completada",
        description: result.message
      });
      
      // Refresh report
      await fetchReport();
    } catch (error) {
      console.error('Error cleaning URLs:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron limpiar las URLs rotas",
        variant: "destructive"
      });
    } finally {
      setCleaning(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const healthPercentage = report ? 
    Math.round((report.imagesHealthy / Math.max(report.withImages, 1)) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Estado de las Imágenes
        </CardTitle>
        <CardDescription>
          Verifica y mantiene la integridad de las imágenes de productos
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Verificando imágenes...</span>
          </div>
        ) : report ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{report.totalProducts}</div>
                <div className="text-sm text-muted-foreground">Total Productos</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{report.withImages}</div>
                <div className="text-sm text-muted-foreground">Con Imágenes</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{report.imagesHealthy}</div>
                <div className="text-sm text-muted-foreground">Saludables</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{report.imagesBroken}</div>
                <div className="text-sm text-muted-foreground">Rotas</div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <Badge 
                variant={healthPercentage >= 90 ? "default" : healthPercentage >= 70 ? "secondary" : "destructive"}
                className="text-lg px-4 py-2"
              >
                {healthPercentage >= 90 ? (
                  <CheckCircle className="h-4 w-4 mr-1" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-1" />
                )}
                {healthPercentage}% Salud
              </Badge>
            </div>

            {report.imagesBroken > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Se detectaron {report.imagesBroken} imágenes con problemas. 
                  Usa las opciones de reparación para solucionarlos.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={migrateImages}
                disabled={migrating || report.imagesBroken === 0}
                className="flex-1"
              >
                {migrating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Migrar Imágenes
              </Button>
              
              <Button 
                onClick={cleanBrokenUrls}
                disabled={cleaning || report.imagesBroken === 0}
                variant="outline"
                className="flex-1"
              >
                {cleaning ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Limpiar URLs Rotas
              </Button>
              
              <Button 
                onClick={fetchReport}
                variant="ghost"
                size="icon"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No se pudo cargar el reporte de imágenes. Inténtalo de nuevo.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}