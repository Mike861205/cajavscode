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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Edit, Trash2, Package, Calculator, Settings, X, Warehouse, ImageIcon, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { formatStock } from "@/lib/stockUtils";
import { ImageUpload } from "@/components/ui/image-upload";

// Product schemas
const productSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU es requerido"),
  price: z.string().min(1, "Precio es requerido"),
  cost: z.string().optional(),
  stock: z.string().default("0"),
  minStock: z.string().default("0"),
  status: z.string().default("active"),
  isComposite: z.boolean().default(false),
  imageUrl: z.string().optional(),
  unitType: z.enum(["piece", "kg", "gram", "liter", "ml", "meter", "cm", "pound", "ounce", "box", "pack"]).default("piece"),
  allowDecimals: z.boolean().default(false),
  saleUnit: z.string().default("1"),
  saleUnitName: z.string().default("unidad"),
  warehouseStocks: z.array(z.object({
    warehouseId: z.number(),
    stock: z.number()
  })).optional(),
  components: z.array(z.object({
    componentProductId: z.number(),
    quantity: z.number(),
    cost: z.string()
  })).optional(),
});

const productComponentSchema = z.object({
  componentProductId: z.number(),
  quantity: z.number(),
  cost: z.string()
});

type ProductFormData = z.infer<typeof productSchema>;
type ProductComponent = z.infer<typeof productComponentSchema>;

interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  cost?: string;
  stock: number;
  minStock: number;
  status: string;
  imageUrl?: string;
  isComposite?: boolean;
  unitType?: string;
  allowDecimals?: boolean;
  saleUnit?: string;
  saleUnitName?: string;
  components?: ProductComponent[];
}

interface ComponentData {
  id: number;
  componentProductId: number;
  name: string;
  quantity: number;
  cost: string;
}

export default function ProductTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isComposite, setIsComposite] = useState(false);
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);

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
  const availableComponentProducts = (products as Product[])?.filter((product: Product) => !product.isComposite) || [];

  // Form setup
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      price: "",
      cost: "",
      stock: "0",
      minStock: "0",
      status: "active",
      isComposite: false,
      imageUrl: "",
      unitType: "piece",
      allowDecimals: false,
      saleUnit: "1",
      saleUnitName: "unidad",
      warehouseStocks: [],
      components: [],
    },
  });

  // Watch form values
  const watchIsComposite = form.watch("isComposite");
  const watchAllowDecimals = form.watch("allowDecimals");

  // Sync form with watched values
  useEffect(() => {
    setIsComposite(watchIsComposite);
  }, [watchIsComposite]);

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (data: ProductFormData) => 
      apiRequest("POST", "/api/products", {
        ...data,
        components: isComposite ? components.map(c => ({
          componentProductId: c.componentProductId,
          quantity: c.quantity,
          cost: c.cost
        })) : undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "Producto creado",
        description: "El producto se ha creado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el producto",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductFormData }) =>
      apiRequest("PATCH", `/api/products/${id}`, {
        ...data,
        components: isComposite ? components.map(c => ({
          componentProductId: c.componentProductId,
          quantity: c.quantity,
          cost: c.cost
        })) : undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "Producto actualizado",
        description: "El producto se ha actualizado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el producto",
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: number) => apiRequest("DELETE", `/api/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto eliminado",
        description: "El producto se ha eliminado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el producto",
        variant: "destructive",
      });
    },
  });

  // Image upload mutation
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const result = await response.json();
    return result.imageUrl;
  };

  const handleImageUpload = async (file: File) => {
    try {
      const imageUrl = await uploadImage(file);
      form.setValue("imageUrl", imageUrl);
      setImageFile(file);
      toast({
        title: "Imagen subida",
        description: "La imagen se ha subido correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al subir la imagen",
        variant: "destructive",
      });
    }
  };

  const updateProductImageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/products/${id}/image`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to update product image');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setImageUploadOpen(false);
      setSelectedProductForImage(null);
      toast({
        title: "Imagen actualizada",
        description: "La imagen del producto se ha actualizado correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la imagen",
        variant: "destructive",
      });
    },
  });

  const handleImageClick = (product: Product) => {
    setSelectedProductForImage(product);
    setImageUploadOpen(true);
  };

  const handleProductImageUpload = async (file: File) => {
    if (selectedProductForImage) {
      updateProductImageMutation.mutate({ id: selectedProductForImage.id, file });
    }
  };

  // Filter products
  const filteredProducts = (products as Product[])?.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || true; // Categories filtering can be added
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Form handlers
  const onSubmit = async (data: ProductFormData) => {
    if (isEditMode && editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const resetForm = () => {
    form.reset();
    setComponents([]);
    setImageFile(null);
    setIsComposite(false);
    setIsEditMode(false);
    setEditingProduct(null);
  };

  const handleViewProduct = (product: Product) => {
    // View product logic
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditMode(true);
    setIsComposite(product.isComposite || false);
    
    form.reset({
      name: product.name,
      description: (product as any).description || "",
      sku: product.sku,
      price: product.price,
      cost: product.cost || "",
      stock: product.stock?.toString() || "0",
      minStock: product.minStock?.toString() || "0",
      status: product.status || "active",
      isComposite: product.isComposite || false,
      imageUrl: product.imageUrl || "",
      unitType: (product as any).unitType || "piece",
      allowDecimals: (product as any).allowDecimals || false,
      saleUnit: (product as any).saleUnit || "1",
      saleUnitName: (product as any).saleUnitName || "unidad",
    });

    // Load existing components if composite
    if (product.isComposite && product.components) {
      const existingComponents = product.components.map(comp => ({
        id: Date.now() + Math.random(),
        componentProductId: comp.componentProductId,
        name: availableComponentProducts.find(p => p.id === comp.componentProductId)?.name || "",
        quantity: comp.quantity,
        cost: comp.cost
      }));
      setComponents(existingComponents);
    }

    setIsOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
      deleteProductMutation.mutate(product.id);
    }
  };

  // Component management
  const addComponent = () => {
    const newComponent: ComponentData = {
      id: Date.now(),
      componentProductId: 0,
      name: "",
      quantity: 1,
      cost: "0"
    };
    setComponents(prev => [...prev, newComponent]);
  };

  const removeComponent = (index: number) => {
    setComponents(prev => prev.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof ComponentData, value: any) => {
    setComponents(prev => 
      prev.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Productos</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {isEditMode ? "Editar Producto" : "Nuevo Producto"}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <Package className="h-5 w-5" />
                        Información Básica
                      </h3>
                      
                      <div className="space-y-4">
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

                        <div className="grid grid-cols-2 gap-4">
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
                            name="cost"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Costo</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" step="0.01" placeholder="0.00" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

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
                                  value={field.value || ""}
                                  onChange={(url) => field.onChange(url)}
                                  onFileSelect={(file) => {
                                    if (file) {
                                      handleImageUpload(file);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Configuration */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <Settings className="h-5 w-5" />
                        Configuración del Producto
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="unitType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unidad de Medida</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar unidad" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="piece">Pieza</SelectItem>
                                    <SelectItem value="kg">Kilogramo</SelectItem>
                                    <SelectItem value="gram">Gramo</SelectItem>
                                    <SelectItem value="liter">Litro</SelectItem>
                                    <SelectItem value="ml">Mililitro</SelectItem>
                                    <SelectItem value="meter">Metro</SelectItem>
                                    <SelectItem value="cm">Centímetro</SelectItem>
                                    <SelectItem value="pound">Libra</SelectItem>
                                    <SelectItem value="ounce">Onza</SelectItem>
                                    <SelectItem value="box">Caja</SelectItem>
                                    <SelectItem value="pack">Paquete</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="allowDecimals"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm">Permitir Decimales</FormLabel>
                                  <div className="text-xs text-muted-foreground">
                                    Para ventas fraccionadas
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
                        </div>

                        {/* Sale Unit Fields - Only shown when decimals are enabled */}
                        {watchAllowDecimals && (
                          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                            <FormField
                              control={form.control}
                              name="saleUnit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unidad de Venta</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="0.5" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="saleUnitName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nombre de Unidad</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="medio kilo" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="stock"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stock Inicial</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="0" 
                                    type="number" 
                                    step={watchAllowDecimals ? "0.01" : "1"}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="minStock"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stock Mínimo (Alerta)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="0" 
                                    type="number" 
                                    step={watchAllowDecimals ? "0.01" : "1"}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Stock por Almacén */}
                        {!isComposite && (warehouses as any[])?.length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                              <Package className="h-5 w-5" />
                              Stock Inicial por Almacén
                            </h3>
                            <div className="space-y-4">
                              {(warehouses as any[]).map((warehouse: any, index: number) => (
                                <div key={warehouse.id} className="flex items-center space-x-4">
                                  <Label className="w-32">{warehouse.name}</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0"
                                    defaultValue="0"
                                    className="flex-1"
                                    onChange={(e) => {
                                      const warehouseStocks = form.getValues("warehouseStocks") || [];
                                      const existingIndex = warehouseStocks.findIndex(ws => ws.warehouseId === warehouse.id);
                                      
                                      if (existingIndex >= 0) {
                                        warehouseStocks[existingIndex].stock = parseFloat(e.target.value) || 0;
                                      } else {
                                        warehouseStocks.push({
                                          warehouseId: warehouse.id,
                                          stock: parseFloat(e.target.value) || 0
                                        });
                                      }
                                      
                                      form.setValue("warehouseStocks", warehouseStocks);
                                      
                                      // Update global stock
                                      const totalStock = warehouseStocks.reduce((sum, ws) => sum + ws.stock, 0);
                                      form.setValue("stock", totalStock.toString());
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Composite Product Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                            <Package className="h-5 w-5" />
                            Producto Compuesto
                          </h3>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={isComposite}
                              onCheckedChange={(checked) => {
                                setIsComposite(checked);
                                form.setValue("isComposite", checked);
                              }}
                            />
                            <Label>Este es un producto compuesto</Label>
                          </div>

                          {isComposite && (
                            <div className="space-y-4">
                              <div className="border rounded-lg p-4">
                                <h4 className="font-medium mb-3">Componentes del Producto</h4>
                                
                                <div className="space-y-3">
                                  <div className="grid grid-cols-3 gap-3">
                                    <Select
                                      onValueChange={(value) => {
                                        const productId = parseInt(value);
                                        const product = availableComponentProducts.find((p: Product) => p.id === productId);
                                        if (product) {
                                          const components = form.getValues("components") || [];
                                          const existingIndex = components.findIndex(c => c.componentProductId === productId);
                                          
                                          if (existingIndex === -1) {
                                            components.push({
                                              componentProductId: productId,
                                              quantity: 1,
                                              cost: product.cost || "0"
                                            });
                                            form.setValue("components", components);
                                          }
                                        }
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar producto" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableComponentProducts.map((product: Product) => (
                                          <SelectItem key={product.id} value={product.id.toString()}>
                                            {product.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    <Input
                                      type="number"
                                      placeholder="Cantidad"
                                      step="0.01"
                                      min="0"
                                    />
                                    
                                    <Button type="button" onClick={addComponent}>
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  {/* Components List */}
                                  <div className="space-y-2">
                                    {components.map((component, index) => {
                                      const product = availableComponentProducts.find((p: Product) => p.id === component.componentProductId);
                                      return (
                                        <div key={component.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                          <div className="flex-1">
                                            <span className="font-medium">{product?.name || "Producto no encontrado"}</span>
                                          </div>
                                          <div className="w-24">
                                            <Input
                                              type="number"
                                              value={component.quantity}
                                              onChange={(e) => updateComponent(index, "quantity", parseFloat(e.target.value) || 0)}
                                              placeholder="Cantidad"
                                              step="0.01"
                                            />
                                          </div>
                                          <div className="w-24">
                                            <Input
                                              type="number"
                                              value={component.cost}
                                              onChange={(e) => updateComponent(index, "cost", e.target.value)}
                                              placeholder="Costo"
                                              step="0.01"
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeComponent(index)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  >
                    {isEditMode ? "Actualizar" : "Crear"} Producto
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Input
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {(categories as any[]).map((category: any) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IMAGEN</TableHead>
              <TableHead>PRODUCTO</TableHead>
              <TableHead>PRECIO</TableHead>
              <TableHead>COSTO</TableHead>
              <TableHead>TIPO</TableHead>
              <TableHead>STOCK</TableHead>
              <TableHead>ESTADO</TableHead>
              <TableHead>ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product: Product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div 
                    className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleImageClick(product)}
                  >
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-green-600">
                  ${parseFloat(product.price).toFixed(2)}
                </TableCell>
                <TableCell className="text-gray-600">
                  ${product.cost ? parseFloat(product.cost).toFixed(2) : "0.00"}
                </TableCell>
                <TableCell>
                  <Badge variant={product.isComposite ? "default" : "secondary"}>
                    {product.isComposite ? "Compuesto" : "Simple"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{formatStock(product.stock, product.allowDecimals || false)}</p>
                    {(product as any).warehouseStocks?.length > 0 ? (
                      <p className="text-sm text-green-600">
                        {(product as any).warehouseStocks.map((ws: any) => 
                          `${ws.warehouseName}: ${formatStock(ws.stock, product.allowDecimals || false)}`
                        ).join(', ')}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">Sin stock por almacén</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={product.status === "active" ? "default" : "secondary"}>
                    {product.status === "active" ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProduct(product)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProduct(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProduct(product)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Image Upload Modal */}
      <Dialog open={imageUploadOpen} onOpenChange={setImageUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Imagen del Producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Selecciona una nueva imagen para: <strong>{selectedProductForImage?.name}</strong></p>
            <ImageUpload
              value=""
              onChange={() => {}}
              onFileSelect={(file) => {
                if (file) {
                  handleProductImageUpload(file);
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}