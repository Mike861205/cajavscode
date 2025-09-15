import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Edit, Trash2, Package, Calculator, Settings, X, Warehouse } from "lucide-react";
import { Label } from "@/components/ui/label";
import { formatStock } from "@/lib/stockUtils";
import { ImageUpload } from "@/components/ui/image-upload";
import { ImageHealthChecker } from "@/components/dashboard/image-health-checker";

// Product schemas
const productSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU es requerido"),
  price: z.string().min(1, "Precio es requerido"),
  costPrice: z.number().min(0, "Costo debe ser mayor a 0"),
  minStock: z.number().min(0, "Stock mínimo debe ser mayor a 0"),
  status: z.string().default("active"),
  stockType: z.string().default("unique"),
  stock: z.number().min(0, "Stock debe ser mayor a 0"),
  isComposite: z.boolean().default(false),
  imageUrl: z.string().optional(),
  unitType: z.string().optional(),
  allowDecimals: z.boolean().optional(),
  saleUnit: z.string().optional(),
  saleUnitName: z.string().optional(),
  warehouseStocks: z.array(z.object({
    warehouseId: z.number(),
    stock: z.number()
  })).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  id: number;
  name: string;
  description?: string;
  sku: string;
  price: string;
  costPrice: number;
  minStock: number;
  status: string;
  stockType: string;
  stock: number;
  isComposite: boolean;
  imageUrl?: string;
  warehouseStocks?: { warehouseId: number; stock: number }[];
}

interface ComponentData {
  id: number;
  componentProductId: number;
  name: string;
  quantity: number;
  cost: string;
}

export default function ProductTableModern() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isComposite, setIsComposite] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<ComponentData[]>([]);
  const [warehouseStocks, setWarehouseStocks] = useState<{warehouseId: number, stock: number}[]>([]);

  // Fetch data
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["/api/warehouses"],
  });

  const { data: userRole } = useQuery({
    queryKey: ["/api/user-role"],
  });

  // Filter available products for components (exclude composite products)
  const availableComponentProducts = (products as Product[]).filter((product: Product) => !product.isComposite);

  // Check if user is super admin
  const isSuperAdmin = userRole && (userRole as any)?.name === "super_admin";

  // Form setup
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      price: "",
      costPrice: 0,
      minStock: 0,
      status: "active",
      stockType: "unique",
      stock: 0,
      isComposite: false,
      imageUrl: "",
      warehouseStocks: [],
    },
  });

  // Watch form values
  const watchStockType = form.watch("stockType");
  const watchIsComposite = form.watch("isComposite");

  // Initialize warehouse stocks when opening form
  useEffect(() => {
    if (isSuperAdmin && Array.isArray(warehouses) && warehouses.length > 0 && isOpen) {
      if (isEditMode && editingProduct) {
        // For editing, load existing warehouse stocks or initialize with zeros
        const existingStocks = warehouses.map((w: any) => {
          const existingStock = (editingProduct as any).warehouseStocks?.find((ws: any) => ws.warehouseId === w.id);
          return { warehouseId: w.id, stock: existingStock?.stock || 0 };
        });
        setWarehouseStocks(existingStocks);
      } else if (!isEditMode) {
        // For new products, initialize all warehouse stocks to 0
        setWarehouseStocks(warehouses.map((w: any) => ({ warehouseId: w.id, stock: 0 })));
      }
    }
  }, [warehouses, isSuperAdmin, isEditMode, editingProduct, isOpen]);

  // Handle warehouse stock change
  const handleWarehouseStockChange = (warehouseId: number, stock: number) => {
    setWarehouseStocks(prev => 
      prev.map(ws => 
        ws.warehouseId === warehouseId 
          ? { ...ws, stock: Math.max(0, stock) }
          : ws
      )
    );
  };

  // Sync form with watched values
  useEffect(() => {
    setIsComposite(watchIsComposite);
  }, [watchIsComposite]);

  // Component management functions
  const addComponent = () => {
    const newComponent: ComponentData = {
      id: Date.now(),
      componentProductId: 0,
      name: "",
      quantity: 1,
      cost: "0"
    };
    setSelectedComponents(prev => [...prev, newComponent]);
  };

  const updateComponent = (index: number, field: keyof ComponentData, value: any) => {
    setSelectedComponents(prev => 
      prev.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    );
  };

  const removeComponent = (index: number) => {
    setSelectedComponents(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotalCost = () => {
    return selectedComponents.reduce((total, component) => {
      return total + (parseFloat(component.cost) * component.quantity);
    }, 0);
  };

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      
      // Add basic product data
      Object.keys(data).forEach(key => {
        if (key === 'warehouseStocks' && isSuperAdmin) {
          formData.append(key, JSON.stringify(warehouseStocks));
        } else if (key !== 'warehouseStocks') {
          formData.append(key, data[key]);
        }
      });

      // Add components if composite
      if (isComposite) {
        formData.append('components', JSON.stringify(selectedComponents));
      }

      // Add image if present
      if (imageFile) {
        formData.append('image', imageFile);
      }

      return apiRequest("POST", "/api/products", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "Producto creado",
        description: "El producto se ha creado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el producto",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      
      Object.keys(data).forEach(key => {
        if (key === 'warehouseStocks' && isSuperAdmin) {
          formData.append(key, JSON.stringify(warehouseStocks));
        } else if (key !== 'warehouseStocks') {
          formData.append(key, data[key]);
        }
      });

      if (isComposite) {
        formData.append('components', JSON.stringify(selectedComponents));
      }

      if (imageFile) {
        formData.append('image', imageFile);
      }

      return apiRequest("PATCH", `/api/products/${editingProduct?.id}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "Producto actualizado",
        description: "El producto se ha actualizado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el producto",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest("DELETE", `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto eliminado",
        description: "El producto se ha eliminado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el producto",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onSubmit = async (data: ProductFormData) => {
    let imageUrl = data.imageUrl;
    
    // If there's an image file, upload it first
    if (imageFile) {
      const uploadFormData = new FormData();
      uploadFormData.append('image', imageFile);
      
      try {
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: uploadFormData,
        });
        
        if (response.ok) {
          const result = await response.json();
          imageUrl = result.imageUrl;
        } else {
          toast({
            title: "Error",
            description: "Error al subir la imagen",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Error al subir la imagen",
          variant: "destructive",
        });
        return;
      }
    }

    const formData = {
      ...data,
      imageUrl,
      isComposite,
      costPrice: isComposite ? calculateTotalCost() : data.costPrice,
    };

    if (isEditMode) {
      updateProductMutation.mutate(formData);
    } else {
      createProductMutation.mutate(formData);
    }
  };

  const resetForm = () => {
    form.reset();
    setSelectedComponents([]);
    setWarehouseStocks([]);
    setImageFile(null);
    setImagePreview(null);
    setIsComposite(false);
    setIsEditMode(false);
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsEditMode(true);
    setIsComposite(product.isComposite || false);
    
    form.reset({
      name: product.name,
      description: product.description || "",
      sku: product.sku,
      price: product.price,
      costPrice: product.costPrice || 0,
      minStock: product.minStock || 0,
      status: product.status || "active",
      stockType: product.stockType || "unique",
      stock: product.stock || 0,
      isComposite: product.isComposite || false,
      imageUrl: (product as any).imageUrl || "",
      unitType: (product as any).unitType || "piece",
      allowDecimals: (product as any).allowDecimals || false,
      saleUnit: (product as any).saleUnit || "1",
      saleUnitName: (product as any).saleUnitName || "unidad",
    });

    setIsOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  // Filter products
  const filteredProducts = (products as Product[]).filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Gestión de Productos
          </CardTitle>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={openNewDialog}
                className="bg-white text-blue-600 hover:bg-gray-100 font-semibold"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50">
              <DialogHeader className="border-b border-gray-100 pb-4">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Package className="h-6 w-6 text-blue-600" />
                  {isEditMode ? "Editar Producto" : "Nuevo Producto"}
                </DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Basic Product Info */}
                    <Card className="border-gray-200 shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <CardTitle className="flex items-center gap-2 text-gray-800">
                          <Package className="h-5 w-5" />
                          Información Básica
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre del Producto</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Nombre del producto" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="sku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Código del producto" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="price"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Precio de Venta</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" step="0.01" placeholder="0.00" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="costPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Costo</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01" 
                                  placeholder="0.00"
                                  value={field.value}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  disabled={isComposite}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Descripción del producto" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Imagen del Producto</FormLabel>
                              <FormControl>
                                <ImageUpload
                                  value={field.value}
                                  onChange={(url) => {
                                    field.onChange(url);
                                  }}
                                  onFileSelect={(file) => {
                                    setImageFile(file);
                                    if (file) {
                                      const url = URL.createObjectURL(file);
                                      setImagePreview(url);
                                    }
                                  }}
                                  label="Imagen del Producto"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Product Type & Configuration */}
                    <Card className="border-gray-200 shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                        <CardTitle className="flex items-center gap-2 text-purple-800">
                          <Settings className="h-5 w-5" />
                          Configuración del Producto
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <FormField
                          control={form.control}
                          name="isComposite"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Producto Compuesto</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  Este producto está hecho de otros productos
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="minStock"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stock Mínimo</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  placeholder="0"
                                  value={field.value}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  {/* Gestión de Stock por Almacén para Super Admin */}
                  {isSuperAdmin && (
                    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-blue-800">
                          <Warehouse className="h-5 w-5" />
                          Gestión de Stock por Almacén
                        </CardTitle>
                        <p className="text-sm text-blue-600">
                          Como super admin, asigna stock específico a cada almacén
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {Array.isArray(warehouses) && warehouses.map((warehouse: any) => {
                          const warehouseStock = warehouseStocks.find(ws => ws.warehouseId === warehouse.id);
                          return (
                            <div key={warehouse.id} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-blue-100">
                              <div className="flex-1">
                                <Label className="font-medium text-gray-700">
                                  {warehouse.name}
                                </Label>
                                <p className="text-xs text-gray-500">
                                  Ubicación: {warehouse.location || 'No especificada'}
                                </p>
                              </div>
                              <div className="w-24">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={warehouseStock?.stock || 0}
                                  onChange={(e) => handleWarehouseStockChange(
                                    warehouse.id, 
                                    parseInt(e.target.value) || 0
                                  )}
                                  className="text-center font-medium"
                                />
                              </div>
                              <Badge variant={warehouseStock?.stock && warehouseStock.stock > 0 ? "default" : "secondary"}>
                                {warehouseStock?.stock || 0} unidades
                              </Badge>
                            </div>
                          );
                        })}
                        {(!Array.isArray(warehouses) || warehouses.length === 0) && (
                          <div className="text-center py-4 text-gray-500">
                            No hay almacenes configurados
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Additional Product Information */}
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <Package className="h-5 w-5" />
                        Información Adicional
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Descripción del producto" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Composite Product Components */}
                  {isComposite && (
                    <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2 text-orange-800">
                            <Settings className="h-5 w-5" />
                            Componentes del Producto
                          </CardTitle>
                          <Button 
                            type="button" 
                            onClick={addComponent} 
                            variant="outline" 
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Componente
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedComponents.map((component, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 border border-orange-200">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                              <div>
                                <Label>Producto Componente</Label>
                                <Select
                                  value={component.componentProductId ? component.componentProductId.toString() : ""}
                                  onValueChange={(value) => {
                                    const productId = parseInt(value);
                                    const selectedProduct = availableComponentProducts.find(p => p.id === productId);
                                    if (selectedProduct) {
                                      updateComponent(index, 'componentProductId', productId);
                                      updateComponent(index, 'name', selectedProduct.name);
                                      updateComponent(index, 'cost', selectedProduct.costPrice?.toString() || "0");
                                    }
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar producto" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableComponentProducts.map((product: any) => (
                                      <SelectItem key={product.id} value={product.id.toString()}>
                                        {product.name} - ${product.costPrice || product.price}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label>Cantidad</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={component.quantity}
                                  onChange={(e) => updateComponent(index, 'quantity', parseInt(e.target.value) || 1)}
                                />
                              </div>
                              
                              <div>
                                <Label>Costo Unitario</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={component.cost}
                                  onChange={(e) => updateComponent(index, 'cost', e.target.value)}
                                />
                              </div>
                              
                              <div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeComponent(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {selectedComponents.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No hay componentes agregados</p>
                            <p className="text-sm">Haga clic en "Agregar Componente" para empezar</p>
                          </div>
                        )}

                        {selectedComponents.length > 0 && (
                          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-900">Costo Total de Componentes:</span>
                              <span className="text-lg font-bold text-yellow-600">
                                ${calculateTotalCost().toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-2 pt-6 border-t border-gray-200">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createProductMutation.isPending || updateProductMutation.isPending}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {createProductMutation.isPending || updateProductMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {isEditMode ? "Actualizando..." : "Guardando..."}
                        </>
                      ) : (
                        <>
                          {isEditMode ? (
                            <>
                              <Edit className="mr-2 h-4 w-4" />
                              Actualizar Producto
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Guardar Producto
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Search and Filters */}
        <div className="mb-4 flex space-x-4">
          <Input
            placeholder="Buscar productos..."
            className="flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Costo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="h-12 w-12 rounded-lg object-cover shadow-sm border border-gray-200"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold shadow-sm">
                            {product.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.sku}</div>
                        {product.description && (
                          <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${product.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${product.costPrice || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={product.isComposite ? "secondary" : "default"}>
                      {product.isComposite ? "Compuesto" : "Simple"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Badge variant={product.stock > product.minStock ? "default" : "destructive"}>
                      {product.stock || 0}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteProduct(product)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    
    {/* Image Health Checker */}
    <div className="mt-8">
      <ImageHealthChecker />
    </div>
  );
}