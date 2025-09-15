import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  Search,
  ImageIcon,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatStock } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/image-upload";

// Define schemas
const unitTypes = [
  "piece", "kg", "gram", "liter", "ml", "meter", "cm", "pound", "ounce", "box", "pack"
] as const;

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  sku: z.string().min(1, "El SKU es requerido"),
  price: z.string().min(1, "El precio es requerido"),
  cost: z.string().optional(),
  categoryId: z.number().optional(),
  description: z.string().optional(),
  barcode: z.string().optional(),
  isComposite: z.boolean().default(false),
  unitType: z.enum(unitTypes).default("piece"),
  allowDecimals: z.boolean().default(false),
  saleUnit: z.string().optional(),
  saleUnitName: z.string().optional(),
  stock: z.string().default("0"),
  minStock: z.string().default("0"),
  warehouseStocks: z.array(z.object({
    warehouseId: z.number(),
    stock: z.number().min(0)
  })).optional(),
  components: z.array(z.object({
    componentProductId: z.number(),
    quantity: z.number().min(0.01),
    cost: z.string()
  })).optional()
});

const productComponentSchema = z.object({
  id: z.number(),
  componentProductId: z.number(),
  name: z.string(),
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
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isComposite, setIsComposite] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<Product | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: "",
      cost: "",
      description: "",
      barcode: "",
      isComposite: false,
      unitType: "piece",
      allowDecimals: false,
      saleUnit: "",
      saleUnitName: "",
      stock: "0",
      minStock: "0",
      warehouseStocks: [],
      components: []
    }
  });

  // Queries
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"]
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/categories"]
  });

  const { data: warehouses } = useQuery({
    queryKey: ["/api/warehouses"]
  });

  const availableComponentProducts = (products as Product[])?.filter((product: Product) => !product.isComposite) || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ProductFormData) => 
      apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "Producto creado",
        description: "El producto se ha creado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductFormData }) =>
      apiRequest("PUT", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "Producto actualizado",
        description: "El producto se ha actualizado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto eliminado",
        description: "El producto se ha eliminado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Error al subir la imagen');
    }
    
    const data = await response.json();
    return data.imageUrl;
  };

  const handleImageUpload = async (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const imageUploadMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/products/${id}/image`, {
        method: 'PATCH',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar la imagen');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsImageModalOpen(false);
      toast({
        title: "Imagen actualizada",
        description: "La imagen del producto se ha actualizado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleImageClick = (product: Product) => {
    setSelectedImage(product);
    setIsImageModalOpen(true);
  };

  const handleProductImageUpload = async (file: File) => {
    if (selectedImage) {
      imageUploadMutation.mutate({ id: selectedImage.id, file });
    }
  };

  // Filter products
  const filteredProducts = (products as Product[])?.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.categoryId?.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const resetForm = useCallback(() => {
    form.reset();
    setIsEditMode(false);
    setEditingProduct(null);
    setIsComposite(false);
    setImageFile(null);
    setImagePreview("");
  }, [form]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      let finalData = { ...data };

      if (imageFile) {
        const imageUrl = await uploadImage(imageFile);
        finalData = { ...finalData, imageUrl };
      }

      if (isEditMode && editingProduct) {
        updateMutation.mutate({ id: editingProduct.id, data: finalData });
      } else {
        createMutation.mutate(finalData);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al procesar la imagen",
        variant: "destructive",
      });
    }
  };

  const handleViewProduct = (product: Product) => {
    console.log("Ver producto:", product);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditMode(true);
    setIsComposite(product.isComposite || false);
    setImagePreview(product.imageUrl || "");
    
    form.reset({
      name: product.name,
      sku: product.sku,
      price: product.price,
      cost: product.cost || "",
      description: "",
      barcode: "",
      isComposite: product.isComposite || false,
      unitType: (product.unitType as any) || "piece",
      allowDecimals: product.allowDecimals || false,
      saleUnit: product.saleUnit || "",
      saleUnitName: product.saleUnitName || "",
      stock: product.stock?.toString() || "0",
      minStock: product.minStock?.toString() || "0"
    });
    
    setIsOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    if (confirm(`¿Estás seguro de que quieres eliminar el producto "${product.name}"?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  if (productsLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-6 w-6" />
          Gestión de Productos
        </h1>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4 mb-6">
              <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-6 w-6" />
                {isEditMode ? "Editar Producto" : "Nuevo Producto"}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <Input {...field} placeholder="Código SKU" />
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

                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Barras</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Código de barras" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Unit and Stock Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <Package className="h-5 w-5" />
                    Configuración del Producto
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="unitType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Unidad</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo de unidad" />
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
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Permitir Cantidades Decimales
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Permite vender fracciones de este producto (ej: 0.5 kg)
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

                  {form.watch("allowDecimals") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="saleUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unidad de Venta</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="ej: 0.5" />
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
                            <FormLabel>Nombre de la Unidad</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="ej: medio kilo" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Global</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0" />
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
                            <Input {...field} type="number" step="0.01" placeholder="0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <ImageIcon className="h-5 w-5" />
                    Imagen del Producto
                  </h3>
                  <ImageUpload
                    value={imagePreview || ""}
                    onChange={(imageUrl) => {
                      setImagePreview(imageUrl);
                      setImageFile(null);
                    }}
                    onFileSelect={handleImageUpload}
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
                          </div>

                          <div className="space-y-2">
                            {form.watch("components")?.map((component, index) => {
                              const product = availableComponentProducts.find((p: Product) => p.id === component.componentProductId);
                              return (
                                <div key={index} className="flex items-center space-x-3 p-3 border rounded">
                                  <span className="flex-1">{product?.name}</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={component.quantity}
                                    onChange={(e) => {
                                      const components = form.getValues("components") || [];
                                      components[index].quantity = parseFloat(e.target.value) || 0;
                                      form.setValue("components", components);
                                    }}
                                    className="w-24"
                                    placeholder="Cant."
                                  />
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={component.cost}
                                    onChange={(e) => {
                                      const components = form.getValues("components") || [];
                                      components[index].cost = e.target.value;
                                      form.setValue("components", components);
                                    }}
                                    className="w-24"
                                    placeholder="Costo"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const components = form.getValues("components") || [];
                                      components.splice(index, 1);
                                      form.setValue("components", components);
                                    }}
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

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <div className="flex items-center">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Guardando...
                      </div>
                    ) : (
                      isEditMode ? "Actualizar Producto" : "Crear Producto"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar productos por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {(categories as any[])?.map((category: any) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold">IMAGEN</TableHead>
              <TableHead className="font-semibold">PRODUCTO</TableHead>
              <TableHead className="font-semibold">PRECIO</TableHead>
              <TableHead className="font-semibold">COSTO</TableHead>
              <TableHead className="font-semibold">TIPO</TableHead>
              <TableHead className="font-semibold">STOCK</TableHead>
              <TableHead className="font-semibold">ESTADO</TableHead>
              <TableHead className="font-semibold">ACCIONES</TableHead>
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
                    <p className="font-medium">{formatStock(product.stock, product.allowDecimals)}</p>
                    {(product as any).warehouseStocks?.length > 0 ? (
                      <p className="text-sm text-green-600">
                        {(product as any).warehouseStocks.map((ws: any) => 
                          `${ws.warehouseName}: ${formatStock(ws.stock, product.allowDecimals)}`
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
                      <Pencil className="h-4 w-4" />
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
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Actualizar Imagen</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Producto: <span className="font-medium">{selectedImage?.name}</span>
            </p>
            
            <ImageUpload
              value=""
              onChange={() => {}}
              onFileSelect={handleProductImageUpload}
            />
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsImageModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}