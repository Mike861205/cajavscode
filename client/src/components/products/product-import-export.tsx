import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileDown, 
  FileUp, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  FileText,
  FileSpreadsheet
} from "lucide-react";

interface ImportResult {
  success: boolean;
  message: string;
  created: number;
  updated: number;
  errors: string[];
}

export default function ProductImportExport() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutación para importar productos
  const importProductsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest("POST", "/api/products/import", formData, {
        headers: {
          // No establecer Content-Type, dejarlo que el navegador lo configure automáticamente
        }
      });
      
      return response.json();
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      setImportProgress(100);
      
      if (data.success) {
        toast({
          title: "Importación exitosa",
          description: `Se crearon ${data.created} productos y se actualizaron ${data.updated}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      } else {
        toast({
          title: "Error en importación",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Error al importar productos: " + error.message,
        variant: "destructive",
      });
      setImportProgress(0);
    }
  });

  // Mutación para exportar productos
  const exportProductsMutation = useMutation({
    mutationFn: async (format: 'excel' | 'pdf') => {
      const response = await apiRequest("GET", `/api/products/export/${format}`);
      return response.blob();
    },
    onSuccess: (blob, format) => {
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productos_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Exportación exitosa",
        description: `Productos exportados en formato ${format.toUpperCase()}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Error al exportar productos: " + error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea un archivo Excel
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: "Archivo inválido",
          description: "Por favor selecciona un archivo Excel (.xlsx o .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
      setImportProgress(0);
    }
  };

  const handleImport = () => {
    if (!selectedFile) return;
    
    setImportProgress(10);
    importProductsMutation.mutate(selectedFile);
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    exportProductsMutation.mutate(format);
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/products/template');
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_productos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Plantilla descargada",
        description: "Plantilla de productos lista para completar",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al descargar la plantilla",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex gap-2">
      {/* Botón Importar */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-green-600" />
              Importar Productos
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Descargar plantilla */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Paso 1: Descargar Plantilla</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Descarga la plantilla Excel con los campos requeridos
                </p>
                <Button 
                  onClick={downloadTemplate}
                  variant="outline" 
                  className="w-full gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Descargar Plantilla
                </Button>
              </CardContent>
            </Card>

            {/* Seleccionar archivo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Paso 2: Seleccionar Archivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="file-upload">Archivo Excel (.xlsx, .xls)</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      ref={fileInputRef}
                      className="mt-1"
                    />
                  </div>
                  
                  {selectedFile && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800">{selectedFile.name}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Progreso de importación */}
            {importProgress > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Importando...</span>
                      <span className="text-sm text-gray-600">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="w-full" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resultado de importación */}
            {importResult && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {importResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">
                        {importResult.success ? 'Importación Exitosa' : 'Error en Importación'}
                      </span>
                    </div>
                    
                    {importResult.success && (
                      <div className="space-y-1">
                        <Badge variant="secondary">
                          {importResult.created} productos creados
                        </Badge>
                        <Badge variant="outline">
                          {importResult.updated} productos actualizados
                        </Badge>
                      </div>
                    )}
                    
                    {importResult.errors.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-red-600">Errores:</span>
                        {importResult.errors.map((error, index) => (
                          <p key={index} className="text-sm text-red-600">• {error}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button 
                onClick={handleImport}
                disabled={!selectedFile || importProductsMutation.isPending}
                className="flex-1"
              >
                {importProductsMutation.isPending ? 'Importando...' : 'Importar Productos'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsImportOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Botón Exportar */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-blue-600" />
              Exportar Productos
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecciona el formato para exportar tus productos:
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => handleExport('excel')}
                disabled={exportProductsMutation.isPending}
                className="flex-col h-20 gap-2"
                variant="outline"
              >
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
                <span className="text-sm">Excel</span>
              </Button>
              
              <Button 
                onClick={() => handleExport('pdf')}
                disabled={exportProductsMutation.isPending}
                className="flex-col h-20 gap-2"
                variant="outline"
              >
                <FileText className="h-6 w-6 text-red-600" />
                <span className="text-sm">PDF</span>
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsExportOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}