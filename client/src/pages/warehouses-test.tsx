import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, MapPin, Phone, FileText, Plus, Calendar, Edit, Trash2 } from "lucide-react";

export default function WarehousesTest() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    rfc: "",
    taxRegime: "",
    commercialName: ""
  });
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const { toast } = useToast();

  const taxRegimes = [
    { value: "RESICO", label: "Régimen Simplificado de Confianza" },
    { value: "GENERAL", label: "Régimen General de Ley" },
    { value: "MORAL", label: "Régimen de Personas Morales" },
    { value: "INCORPORACION", label: "Régimen de Incorporación Fiscal" },
    { value: "ACTIVIDADES", label: "Régimen de Actividades Empresariales" },
  ];

  const loadWarehouses = async () => {
    try {
      const response = await fetch("/api/warehouses", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error("Error loading warehouses:", error);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleSubmit = async () => {
    console.log("=== SUBMIT CLICKED ===");
    console.log("Form data:", formData);
    console.log("Editing warehouse:", editingWarehouse);
    
    setLoading(true);
    
    try {
      const url = editingWarehouse ? `/api/warehouses/${editingWarehouse.id}` : "/api/warehouses";
      const method = editingWarehouse ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      
      if (response.ok) {
        const result = await response.json();
        console.log("Success:", result);
        toast({
          title: editingWarehouse ? "¡Almacén actualizado exitosamente!" : "¡Almacén creado exitosamente!",
          description: editingWarehouse ? "El almacén ha sido actualizado correctamente" : "El nuevo almacén ha sido registrado en el sistema",
        });
        // Reset form
        setFormData({
          name: "",
          address: "",
          phone: "",
          rfc: "",
          taxRegime: "",
          commercialName: ""
        });
        setEditingWarehouse(null);
        setIsDialogOpen(false);
        loadWarehouses();
      } else {
        const error = await response.text();
        console.error("Error response:", error);
        toast({
          title: "Error",
          description: `Error ${response.status}: ${error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Network error:", error);
      toast({
        title: "Error de red",
        description: "No se pudo conectar al servidor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (warehouse) => {
    console.log("🔥 Edit warehouse clicked:", warehouse);
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      address: warehouse.address,
      phone: warehouse.phone || "",
      rfc: warehouse.rfc || "",
      taxRegime: warehouse.taxRegime || "",
      commercialName: warehouse.commercialName || ""
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingWarehouse(null);
    setFormData({
      name: "",
      address: "",
      phone: "",
      rfc: "",
      taxRegime: "",
      commercialName: ""
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Almacenes</h1>
          <p className="text-gray-600 mt-1">Administra los almacenes de tu empresa</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
              onClick={handleNew}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Almacén
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-6">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                {editingWarehouse ? "Editar Almacén" : "Registrar Nuevo Almacén"}
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-2">
                {editingWarehouse ? "Modifique la información del almacén" : "Complete la información del almacén para registrarlo en el sistema"}
              </p>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Información Básica */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Información Básica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nombre del Almacén *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ej: Almacén Central"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Nombre Comercial</label>
                    <Input
                      value={formData.commercialName}
                      onChange={(e) => setFormData({...formData, commercialName: e.target.value})}
                      placeholder="Ej: Mi Empresa S.A."
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ubicación
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Dirección Completa *</label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Ingrese la dirección completa del almacén..."
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Contacto */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Información de Contacto
                </h3>
                <div>
                  <label className="block text-sm font-medium mb-2">Teléfono</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Ej: +52 (624) 131-0317"
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Información Fiscal */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Información Fiscal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">RFC</label>
                    <Input
                      value={formData.rfc}
                      onChange={(e) => setFormData({...formData, rfc: e.target.value.toUpperCase()})}
                      placeholder="Ej: XAXX010101000"
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 uppercase"
                      maxLength={13}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Régimen Fiscal</label>
                    <Select onValueChange={(value) => setFormData({...formData, taxRegime: value})}>
                      <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Seleccione un régimen fiscal" />
                      </SelectTrigger>
                      <SelectContent>
                        {taxRegimes.map((regime) => (
                          <SelectItem key={regime.value} value={regime.value}>
                            {regime.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="px-6"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={loading || !formData.name || !formData.address}
                  className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {loading ? "Guardando..." : editingWarehouse ? "Actualizar Almacén" : "Guardar Almacén"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Almacenes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Almacenes Registrados ({warehouses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warehouses.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay almacenes registrados</h3>
              <p className="text-gray-600 mb-6">Comience registrando su primer almacén</p>
              <Button 
                onClick={handleNew}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Almacén
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Información Fiscal</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((warehouse: any) => (
                  <TableRow key={warehouse.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{warehouse.name}</div>
                        {warehouse.commercialName && (
                          <div className="text-sm text-gray-500">{warehouse.commercialName}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{warehouse.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {warehouse.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{warehouse.phone}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {warehouse.rfc && (
                          <Badge variant="secondary" className="text-xs">
                            <FileText className="w-3 h-3 mr-1" />
                            RFC: {warehouse.rfc}
                          </Badge>
                        )}
                        {warehouse.taxRegime && (
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {taxRegimes.find(r => r.value === warehouse.taxRegime)?.label || warehouse.taxRegime}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(warehouse.createdAt).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(warehouse)}
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
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