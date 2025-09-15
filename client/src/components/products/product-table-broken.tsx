import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Upload
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { formatStock } from "@/lib/utils";

// Validation schemas
const productSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  sku: z.string().min(1, "El SKU es obligatorio"),
  price: z.string().min(1, "El precio es obligatorio"),
  cost: z.string().optional(),
  minStock: z.string().min(1, "El stock mínimo es obligatorio"),
  stock: z.string().min(1, "El stock es obligatorio"),
  categoryId: z.number().optional(),
  status: z.string().default("active"),
  description: z.string().optional(),
  barcode: z.string().optional(),
  unitType: z.enum(["piece", "meter", "kg", "gram", "liter", "ml", "cm", "pound", "ounce", "box", "pack"]).default("piece"),
  allowDecimals: z.boolean().default(false),
  saleUnit: z.string().optional(),
  saleUnitName: z.string().optional(),
  isComposite: z.boolean().default(false),
  components: z.array(z.object({
    componentProductId: z.number(),
    quantity: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
    cost: z.string()
  })).optional(),
  warehouseStocks: z.array(z.object({
    warehouseId: z.number(),
    stock: z.number().min(0, "El stock debe ser mayor o igual a 0")
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isComposite, setIsComposite] = useState(false);
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [productForImage, setProductForImage] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      price: "",
      cost: "",
      minStock: "",
      stock: "",
      categoryId: undefined,
      status: "active",
      description: "",
      barcode: "",
      unitType: "piece",
      allowDecimals: false,
      saleUnit: "",
      saleUnitName: "",
      isComposite: false,
      components: [],
      warehouseStocks: []
    }
  });

  // Query for products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Query for categories  
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Query for warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ["/api/warehouses"],
  });

  // Query for warehouse stocks
  const { data: warehouseStocks = [] } = useQuery({
    queryKey: ["/api/warehouse-stocks"],
  });

  const availableComponentProducts = (products as Product[]).filter((product: Product) => !product.isComposite);

  // Function to get warehouse stock breakdown for a product
  const getWarehouseStockBreakdown = (productId: number) => {
    const productData = (warehouseStocks as any[]).find((ws: any) => ws.productId === productId);
    
    if (!productData || !productData.warehouseStocks) {
      return {};
    }
    
    const breakdown: { [key: string]: string } = {};
    
    productData.warehouseStocks.forEach((ws: any) => {
      breakdown[ws.warehouseName] = ws.stock;
    });
    
    return breakdown;
  };

  // Function to get total stock for a product from warehouse breakdown
  const getTotalStockFromBreakdown = (productId: number) => {
    const productData = (warehouseStocks as any[]).find((ws: any) => ws.productId === productId);
    return productData?.totalStock || "0";
  };

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: (data: ProductFormData) => 
      apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-stocks"] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "Éxito",
        description: "Producto creado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear producto",
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductFormData }) =>
      apiRequest("PUT", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-stocks"] });
      setIsOpen(false);
      resetForm();
      toast({
        title: "Éxito", 
        description: "Producto actualizado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar producto",
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-stocks"] });
      toast({
        title: "Éxito",
        description: "Producto eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar producto",
        variant: "destructive",
      });
    },
  });

  // Upload image function
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Error al subir la imagen');
    }
    
    const data = await response.json();
    return data.imageUrl;
  };

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      const imageUrl = await uploadImage(file);
      setImageFile(file);
      setImagePreview(imageUrl);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al subir la imagen",
        variant: "destructive",
      });
    }
  };

  // Update product image mutation
  const updateImageMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const imageUrl = await uploadImage(file);
      return apiRequest("PATCH", `/api/products/${id}/image`, { imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setImageModalOpen(false);
      setProductForImage(null);
      toast({
        title: "Éxito",
        description: "Imagen del producto actualizada exitosamente",
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
    setProductForImage(product);
    setImageModalOpen(true);
  };

  const handleProductImageUpload = async (file: File) => {
    if (!productForImage) return;
    setUploadingImage(true);
    try {
      await updateImageMutation.mutateAsync({ 
        id: productForImage.id, 
        file 
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Filter products with basic search functionality
  const filteredProducts = (products as Product[]).filter((product: Product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      let imageUrl = imagePreview;
      
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const productData = {
        ...data,
        imageUrl,
        isComposite,
        components: isComposite ? components.map(c => ({
          componentProductId: c.componentProductId,
          quantity: c.quantity,
          cost: c.cost
        })) : []
      };

      if (isEditMode && editingProduct) {
        await updateMutation.mutateAsync({ 
          id: editingProduct.id, 
          data: productData 
        });
      } else {
        await createMutation.mutateAsync(productData);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditMode(true);
    setIsComposite(product.isComposite || false);
    setImagePreview(product.imageUrl || null);
    
    // Set form values
    form.reset({
      name: product.name,
      sku: product.sku,
      price: product.price,
      cost: product.cost || "",
      minStock: product.minStock.toString(),
      stock: product.stock.toString(),
      status: product.status,
      unitType: product.unitType as any || "piece",
      allowDecimals: product.allowDecimals || false,
      saleUnit: product.saleUnit || "",
      saleUnitName: product.saleUnitName || "",
      isComposite: product.isComposite || false
    });

    if (product.components) {
      setComponents(product.components.map(c => ({
        id: c.id,
        componentProductId: c.componentProductId,
        name: c.name,
        quantity: c.quantity,
        cost: c.cost
      })));
    }

    setIsOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el producto "${product.name}"?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  const resetForm = () => {
    form.reset();
    setIsEditMode(false);
    setEditingProduct(null);
    setIsComposite(false);
    setComponents([]);
    setImageFile(null);
    setImagePreview(null);
  };

  const addComponent = () => {
    setComponents([...components, {
      id: Date.now(),
      componentProductId: 0,
      name: "",
      quantity: 0,
      cost: "0"
    }]);
  };

  const removeComponent = (id: number) => {
    setComponents(components.filter(c => c.id !== id));
  };

  const updateComponent = (id: number, field: string, value: any) => {
    setComponents(components.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gestión de Productos
          </CardTitle>
          
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
                  <Package className="h-6 w-6 text-blue-600" />
                  {isEditMode ? "Editar Producto" : "Nuevo Producto"}
                </DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Basic Product Info */}
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Información Básica
                        </h3>
                      </div>
                      
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
                                <Input {...field} placeholder="0.00" type="number" step="0.01" />
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
                                <Input {...field} placeholder="0.00" type="number" step="0.01" />
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
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Configuración del Producto
                        </h3>
                      </div>
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
                                  Permite vender en cantidades fraccionarias (ej: 0.5 kg)
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
                          <>
                            <FormField
                              control={form.control}
                              name="saleUnit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unidad de Venta</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="ej: kg, litro, metro" />
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
                                    <Input {...field} placeholder="ej: kilogramo, litros, metros" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
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
                                    step={form.watch("allowDecimals") ? "0.01" : "1"}
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
                                    step={form.watch("allowDecimals") ? "0.01" : "1"}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                    </div>
                  </div>

                  {/* Image Upload Section */}
                  <div className="space-y-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Imagen del Producto
                      </h3>
                    </div>
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
                  {!isComposite && (warehouses as any[]).length > 0 && (
                    <div className="space-y-4">
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Stock Inicial por Almacén
                        </h3>
                      </div>
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">
                            Distribuye el stock inicial entre los almacenes disponibles. El total debe coincidir con el stock inicial ingresado arriba.
                          </p>
                          
                          <FormField
                            control={form.control}
                            name="warehouseStocks"
                            render={({ field }) => (
                              <FormItem>
                                <div className="grid gap-4">
                                  {(warehouses as any[]).map((warehouse: any) => {
                                    const currentStock = field.value?.find((ws: any) => ws.warehouseId === warehouse.id)?.stock || 0;
                                    return (
                                      <div key={warehouse.id} className="flex items-center gap-4 p-3 border rounded-lg">
                                        <div className="flex-1">
                                          <Label className="font-medium">{warehouse.name}</Label>
                                          <p className="text-sm text-gray-500">{warehouse.address}</p>
                                        </div>
                                        <div className="w-32">
                                          <Input
                                            type="number"
                                            step={form.watch("allowDecimals") ? "0.01" : "1"}
                                            min="0"
                                            placeholder="0"
                                            value={currentStock}
                                            onChange={(e) => {
                                              const newStock = parseFloat(e.target.value) || 0;
                                              const currentStocks = field.value || [];
                                              const updatedStocks = currentStocks.filter((ws: any) => ws.warehouseId !== warehouse.id);
                                              if (newStock > 0) {
                                                updatedStocks.push({ warehouseId: warehouse.id, stock: newStock });
                                              }
                                              field.onChange(updatedStocks);
                                            }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-blue-900">Total distribuido:</span>
                                    <span className="font-bold text-blue-900">
                                      {formatStock(
                                        (field.value || []).reduce((sum: number, ws: any) => sum + ws.stock, 0),
                                        form.watch("allowDecimals") || false
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                    <span className="text-sm text-blue-700">Stock inicial configurado:</span>
                                    <span className="text-sm text-blue-700">
                                      {formatStock(parseFloat(form.watch("stock")) || 0, form.watch("allowDecimals") || false)}
                                    </span>
                                  </div>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                    </div>
                  )}

                  {/* Composite Product Section */}
                  <div className="space-y-4">
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <h3 className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Producto Compuesto
                      </h3>
                    </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={isComposite}
                          onCheckedChange={setIsComposite}
                        />
                        <Label>Este es un producto compuesto</Label>
                      </div>
                      
                      {isComposite && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Componentes</h4>
                            <Button type="button" onClick={addComponent} size="sm">
                              <Plus className="mr-2 h-4 w-4" />
                              Agregar Componente
                            </Button>
                          </div>
                          
                          {components.map((component) => (
                            <div key={component.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                              <div className="col-span-5">
                                <Label>Producto</Label>
                                <Select
                                  value={component.componentProductId.toString()}
                                  onValueChange={(value) => {
                                    const productId = parseInt(value);
                                    const product = availableComponentProducts.find((p: Product) => p.id === productId);
                                    updateComponent(component.id, 'componentProductId', productId);
                                    updateComponent(component.id, 'name', product?.name || '');
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
                              
                              <div className="col-span-2">
                                <Label>Cantidad</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={component.quantity}
                                  onChange={(e) => updateComponent(component.id, 'quantity', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              
                              <div className="col-span-3">
                                <Label>Costo</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={component.cost}
                                  onChange={(e) => updateComponent(component.id, 'cost', e.target.value)}
                                />
                              </div>
                              
                              <div className="col-span-2">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeComponent(component.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

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

      <Card>
        <CardHeader>

      <CardContent>
        {/* Search */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar productos por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">IMAGEN</TableHead>
                <TableHead>PRODUCTO</TableHead>
                <TableHead>PRECIO</TableHead>
                <TableHead>COSTO</TableHead>
                <TableHead>TIPO</TableHead>
                <TableHead>STOCK</TableHead>
                <TableHead>ESTADO</TableHead>
                <TableHead className="text-right">ACCIONES</TableHead>
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
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                    </div>
                  </TableCell>
                  <TableCell>${product.price}</TableCell>
                  <TableCell>${product.cost || "0.00"}</TableCell>
                  <TableCell>
                    <Badge variant={product.isComposite ? "outline" : "secondary"}>
                      {product.isComposite ? "Compuesto" : "Simple"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      {(() => {
                        const totalStock = getTotalStockFromBreakdown(product.id);
                        const stockNumber = parseFloat(totalStock) || 0;
                        
                        // Si no hay datos del warehouse breakdown, usar el stock del producto
                        const displayStock = stockNumber > 0 ? stockNumber : (parseFloat(product.stock?.toString() || "0") || 0);
                        
                        return (
                          <div className={`font-medium ${displayStock <= product.minStock ? 'text-red-600' : 'text-black'}`}>
                            {formatStock(displayStock, product.allowDecimals || false)}
                          </div>
                        );
                      })()}
                      <div className="text-xs text-green-600">
                        {(() => {
                          const breakdown = getWarehouseStockBreakdown(product.id);
                          const entries = Object.entries(breakdown);
                          if (entries.length === 0) {
                            return 'Sin stock por almacén';
                          }
                          return entries.map(([warehouse, stock]) => 
                            `${warehouse}: ${formatStock(parseFloat(stock), product.allowDecimals || false)}`
                          ).join(', ');
                        })()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === "active" ? "default" : "secondary"}>
                      {product.status === "active" ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewProduct(product)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
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

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron productos
          </div>
        )}
      </CardContent>
    </Card>

    {/* Product Detail Modal */}
    {selectedProduct && (
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedProduct.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {selectedProduct.imageUrl && (
              <div className="flex justify-center">
                <img 
                  src={selectedProduct.imageUrl} 
                  alt={selectedProduct.name}
                  className="max-w-full h-48 object-contain rounded-lg border"
                />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">SKU</Label>
                <p className="text-sm">{selectedProduct.sku}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Precio</Label>
                <p className="text-sm">${selectedProduct.price}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Stock</Label>
                <p className="text-sm">{formatStock(selectedProduct.stock, selectedProduct.allowDecimals || false)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Stock Mínimo</Label>
                <p className="text-sm">{formatStock(selectedProduct.minStock, selectedProduct.allowDecimals || false)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Estado</Label>
                <p className="text-sm">{selectedProduct.status === "active" ? "Activo" : "Inactivo"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Tipo</Label>
                <p className="text-sm">{selectedProduct.isComposite ? "Compuesto" : "Simple"}</p>
              </div>
            </div>
            
            {selectedProduct.isComposite && selectedProduct.components && selectedProduct.components.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Componentes</Label>
                <div className="mt-2 space-y-2">
                  {selectedProduct.components.map((component) => (
                    <div key={component.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">{component.name}</span>
                      <span className="text-sm text-gray-600">
                        Cantidad: {component.quantity} | Costo: ${component.cost}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )}

    {/* Image Upload Modal */}
    <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Actualizar Imagen
          </DialogTitle>
        </DialogHeader>
        
        {productForImage && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Producto: <span className="font-medium">{productForImage.name}</span>
              </p>
            </div>
            
            {productForImage.imageUrl && (
              <div className="flex justify-center">
                <img 
                  src={productForImage.imageUrl} 
                  alt={productForImage.name}
                  className="w-32 h-32 object-cover rounded-lg border"
                />
              </div>
            )}
            
            <ImageUpload
              value=""
              onChange={() => {}}
              onFileSelect={handleProductImageUpload}
            />
            
            {uploadingImage && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-2" />
                <span className="text-sm">Actualizando imagen...</span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}