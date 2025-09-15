import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Edit, Trash2, X, Package, ShoppingCart, DollarSign, Calculator, Tag, Settings, Layers, Image as ImageIcon, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { formatStock } from "@/lib/stockUtils";
import { useSettings } from "@/contexts/SettingsContext";
import { ProductConjuntoForm } from "@/components/ProductConjuntoForm";
import ProductImportExport from "@/components/products/product-import-export";
import { ImageIntegrityManager } from "@/components/image-integrity-manager";
import { useAuth } from "@/hooks/use-auth";

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
  soldQuantity?: number;
  isComposite?: boolean;
  isConjunto?: boolean;
  components?: ProductComponent[];
  saleUnit?: string;
  saleUnitName?: string;
  saleUnitPrice?: string;
  allowDecimals?: boolean;
  unitType?: string;
  weightVariants?: Array<{
    weight: string;
    label: string;
    price: string;
    cost: string;
    discount: string;
    unit: string;
    sortOrder: number;
  }>;
}

interface ProductComponentData {
  id: number;
  name: string;
  cost: string;
  quantity: number;
  componentProductId: number;
}

// Form schemas
const productComponentSchema = z.object({
  componentProductId: z.number().min(1, "Producto requerido"),
  quantity: z.number().min(0.1, "Cantidad debe ser mayor a 0"),
  cost: z.number().min(0, "Costo debe ser mayor a 0")
});

const productSchema = z.object({
  name: z.string().min(1, "Nombre del producto requerido"),
  sku: z.string().min(1, "SKU requerido"),
  barcode: z.string().optional(),
  costPrice: z.number().min(0, "Costo debe ser mayor a 0"),
  salePrice: z.number().min(0, "Precio de venta debe ser mayor a 0"),
  profitMargin: z.number().min(0, "Margen de utilidad debe ser mayor a 0"),
  initialStock: z.number().min(0, "Stock inicial debe ser mayor o igual a 0"),
  categoryId: z.number().min(1, "Categoría requerida"),
  unit: z.string().min(1, "Unidad requerida"),
  hasTax: z.boolean(),
  isComposite: z.boolean(),
  description: z.string().optional(),
  components: z.array(productComponentSchema).optional(),
  warehouseStocks: z.array(z.object({
    warehouseId: z.number(),
    stock: z.number().min(0)
  })).optional()
});

type ProductFormData = z.infer<typeof productSchema>;
type ProductComponent = z.infer<typeof productComponentSchema>;

export default function ProductTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [selectedComponents, setSelectedComponents] = useState<ProductComponentData[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [uploadingImageForProduct, setUploadingImageForProduct] = useState<number | null>(null);
  const [isWeightSaleModalOpen, setIsWeightSaleModalOpen] = useState(false);
  const [weightSaleProduct, setWeightSaleProduct] = useState<Product | null>(null);
  const [isConjuntoFormOpen, setIsConjuntoFormOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { formatCurrency } = useSettings();

  // Image upload function
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/upload/image', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al subir la imagen: ${errorText}`);
    }
    
    const data = await response.json();
    return data.imageUrl;
  };

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      console.log("Uploading file:", file.name, file.size, "bytes");
      const imageUrl = await uploadImage(file);
      console.log("Image uploaded successfully:", imageUrl);
      setUploadedImageUrl(imageUrl);
      toast({
        title: "Imagen subida",
        description: "La imagen se ha subido correctamente"
      });
    } catch (error) {
      console.error("Image upload error:", error);
      toast({
        title: "Error al subir imagen",
        description: error instanceof Error ? error.message : "No se pudo subir la imagen",
        variant: "destructive"
      });
    }
  };

  const handleImageRemove = () => {
    setUploadedImageUrl("");
  };

  // Function to handle image upload for existing product
  const handleProductImageUpload = async (productId: number, file: File) => {
    try {
      setUploadingImageForProduct(productId);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/products/${productId}/image`, {
        method: 'PATCH',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error uploading image');
      }

      // Refresh products data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      toast({
        title: "Imagen actualizada",
        description: "La imagen del producto se ha actualizado correctamente.",
      });
    } catch (error) {
      console.error('Error uploading product image:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la imagen del producto.",
        variant: "destructive",
      });
    } finally {
      setUploadingImageForProduct(null);
    }
  };

  // Function to trigger file input for product image
  const triggerImageUpload = (productId: number) => {
    console.log('triggerImageUpload called for product ID:', productId);
    
    // Create hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    
    // Add to DOM temporarily
    document.body.appendChild(input);
    
    input.onchange = (e) => {
      console.log('File input changed');
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('File selected:', file.name, file.size);
        handleProductImageUpload(productId, file);
      } else {
        console.log('No file selected');
      }
      // Remove from DOM after use
      document.body.removeChild(input);
    };
    
    // Trigger click
    setTimeout(() => {
      input.click();
      console.log('File input clicked');
    }, 100);
  };

  const updateComponent = (index: number, field: string, value: any) => {
    console.log(`updateComponent - index: ${index}, field: ${field}, value:`, value);
    const updatedComponents = [...selectedComponents];
    updatedComponents[index] = { ...updatedComponents[index], [field]: value };
    console.log(`updateComponent - updated component ${index}:`, updatedComponents[index]);
    setSelectedComponents(updatedComponents);
    
    // Recalcular el costo total cuando se actualiza un componente
    if (field === 'cost' || field === 'quantity') {
      const newTotalCost = updatedComponents.reduce((total, comp) => {
        return total + (parseFloat(comp.cost || "0") * (comp.quantity || 0));
      }, 0);
      form.setValue("costPrice", newTotalCost);
    }
  };

  const calculateTotalCost = () => {
    return selectedComponents.reduce((total, comp) => {
      return total + (parseFloat(comp.cost) * comp.quantity);
    }, 0);
  };

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      costPrice: 0,
      salePrice: 0,
      profitMargin: 0,
      initialStock: 0,
      categoryId: 0,
      unit: "unidad",
      hasTax: true,
      isComposite: false,
      description: "",
      components: []
    }
  });

  // Reset form and image when dialog closes
  const resetFormAndDialog = () => {
    form.reset();
    setUploadedImageUrl("");
    setIsEditMode(false);
    setProductToEdit(null);
    setIsAddDialogOpen(false);
  };

  // Watch for changes in cost/sale price to calculate profit margin
  const watchCostPrice = form.watch("costPrice");
  const watchSalePrice = form.watch("salePrice");
  const watchIsComposite = form.watch("isComposite");
  const watchComponents = form.watch("components");

  // Calculate profit margin when prices change
  React.useEffect(() => {
    if (watchCostPrice > 0 && watchSalePrice > 0) {
      const margin = ((watchSalePrice - watchCostPrice) / watchSalePrice) * 100;
      form.setValue("profitMargin", Math.round(margin * 100) / 100);
    }
  }, [watchCostPrice, watchSalePrice, form]);

  // Calculate total cost for composite products
  React.useEffect(() => {
    if (watchIsComposite && watchComponents && watchComponents.length > 0) {
      const totalCost = watchComponents.reduce((sum, comp) => sum + (comp.cost * comp.quantity), 0);
      form.setValue("costPrice", totalCost);
    }
  }, [watchIsComposite, watchComponents, form]);

  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Force refresh when component mounts
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ["/api/products"] });
    refetch();
  }, []);

  // Filter products that can be used as components (not composite themselves)
  const availableComponentProducts = (products as Product[]).filter((product: Product) => !product.isComposite);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      return response.json();
    }
  });

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ["/api/warehouses"],
    queryFn: async () => {
      const response = await fetch("/api/warehouses");
      return response.json();
    }
  });

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/products", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      resetFormAndDialog();
      toast({
        title: "Producto agregado",
        description: "El producto se ha creado exitosamente"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al agregar producto",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/products/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      resetFormAndDialog();
      toast({
        title: "Producto actualizado",
        description: "El producto se ha actualizado exitosamente"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar producto",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar producto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateWeightSaleMutation = useMutation({
    mutationFn: async (data: { id: number; saleUnit: string; saleUnitName: string; saleUnitPrice: string; allowDecimals: boolean }) => {
      return await apiRequest("PATCH", `/api/products/${data.id}/weight-sale`, {
        saleUnit: data.saleUnit,
        saleUnitName: data.saleUnitName,
        saleUnitPrice: data.saleUnitPrice,
        allowDecimals: data.allowDecimals
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsWeightSaleModalOpen(false);
      setWeightSaleProduct(null);
      toast({
        title: "Configuración actualizada",
        description: "La configuración de venta por peso ha sido actualizada exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar la configuración",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    // Map form fields to database schema
    const productData = {
      name: data.name,
      description: data.description || "",
      sku: data.sku,
      price: data.salePrice.toString(),
      cost: data.costPrice.toString(),
      stock: data.initialStock.toString(),
      minStock: "5",
      realStock: data.initialStock.toString(),
      unitType: data.unit === "unidad" ? "piece" : data.unit,
      allowDecimals: false,
      saleUnit: "1",
      saleUnitName: "unidad",
      categoryId: data.categoryId || null,
      status: "active",
      isComposite: data.isComposite,
      sortOrder: 0,
      imageUrl: uploadedImageUrl,
      components: data.isComposite ? selectedComponents.filter(comp => comp.componentProductId > 0).map(comp => ({
        componentProductId: comp.componentProductId || comp.id,
        quantity: comp.quantity,
        cost: parseFloat(comp.cost)
      })) : [],
      warehouseStocks: data.warehouseStocks || []
    };
    
    console.log("Submitting product data:", productData);
    console.log("Form data:", data);
    console.log("Uploaded image URL:", uploadedImageUrl);
    
    if (isEditMode && productToEdit) {
      updateProductMutation.mutate({ id: productToEdit.id, data: productData });
    } else {
      addProductMutation.mutate(productData);
    }
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setIsEditMode(true);
    setUploadedImageUrl(product.imageUrl || "");
    
    // Load existing components if it's a composite product
    if (product.isComposite && product.components) {
      const componentData = product.components.map(comp => ({
        id: comp.componentProductId,
        componentProductId: comp.componentProductId,
        name: products.find(p => p.id === comp.componentProductId)?.name || "",
        cost: comp.cost?.toString() || "0",
        quantity: comp.quantity
      }));
      setSelectedComponents(componentData);
    }
    
    // Load product data into form
    form.reset({
      name: product.name,
      sku: product.sku,
      description: "",
      costPrice: parseFloat(product.cost || "0"),
      salePrice: parseFloat(product.price),
      profitMargin: 0,
      initialStock: product.stock,
      categoryId: 1,
      unit: "unidad",
      hasTax: false,
      isComposite: product.isComposite || false,
      components: []
    });
    setIsAddDialogOpen(true);
  };

  const handleWeightSaleConfig = (product: Product) => {
    setWeightSaleProduct(product);
    setIsWeightSaleModalOpen(true);
  };

  const addComponent = () => {
    const newComponent = {
      id: 0,
      componentProductId: 0,
      name: "",
      cost: "0",
      quantity: 1
    };
    setSelectedComponents([...selectedComponents, newComponent]);
  };

  const removeComponent = (index: number) => {
    const updatedComponents = selectedComponents.filter((_, i) => i !== index);
    setSelectedComponents(updatedComponents);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete.id);
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  // Use only real products from authenticated tenant
  const displayProducts = filteredProducts;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Gestión de Productos</CardTitle>
          <div className="flex gap-2">
            <ProductImportExport />
            <ImageIntegrityManager 
              tenantId={user?.tenantId || ''}
              trigger={
                <Button variant="outline" className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50">
                  <ImageIcon className="h-4 w-4" />
                  Gestión de Imágenes
                </Button>
              }
            />
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              if (!open) {
                resetFormAndDialog();
              } else {
                setIsAddDialogOpen(true);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
              <DialogHeader className="border-b pb-4 mb-6">
                <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {isEditMode ? (
                    <>
                      <Edit className="h-6 w-6 text-blue-600" />
                      Editar Producto
                    </>
                  ) : (
                    <>
                      <Plus className="h-6 w-6 text-blue-600" />
                      Agregar Nuevo Producto
                    </>
                  )}
                </DialogTitle>
                <p className="text-gray-600 mt-2">
                  {isEditMode ? 
                    "Actualice la información del producto" : 
                    "Complete la información del producto para agregarlo al inventario"
                  }
                </p>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Basic Information Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      Información Básica
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Nombre del Producto *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ej: Hamburguesa Clásica" 
                                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                                {...field} 
                              />
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
                            <FormLabel className="text-sm font-medium text-gray-700">SKU *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ej: HAM001" 
                                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="mt-6">
                      <FormField
                        control={form.control}
                        name="barcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Código de Barras</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ej: 1234567890123" 
                                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="mt-6">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Descripción</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Descripción detallada del producto..." 
                                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-[80px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Image Upload Section */}
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="h-5 w-5 text-purple-600" />
                      Imagen del Producto
                    </h3>
                    <ImageUpload
                      value={uploadedImageUrl}
                      onChange={setUploadedImageUrl}
                      onFileSelect={handleImageUpload}
                      productName={form.watch("name") || ""}
                      productDescription={form.watch("description") || ""}
                      enableAiGeneration={true}
                    />
                  </div>

                  {/* Product Type Section */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                      Tipo de Producto
                    </h3>
                    <FormField
                      control={form.control}
                      name="isComposite"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-green-300 bg-white p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium text-gray-900">
                              Producto Compuesto
                            </FormLabel>
                            <p className="text-sm text-gray-600">
                              Activar si el producto está hecho de varios componentes (ej: hamburguesa)
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="data-[state=checked]:bg-green-600"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Components Section (only for composite products) */}
                  {watchIsComposite && (
                    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-6 border border-yellow-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Settings className="h-5 w-5 text-yellow-600" />
                          Componentes del Producto
                        </h3>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={addComponent}
                          className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Componente
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        {selectedComponents.map((component, index) => (
                          <div key={index} className="bg-white rounded-lg border border-yellow-200 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Producto Componente</Label>
                                <div className="space-y-2">
                                  {/* Botón selector */}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-10 justify-between border-gray-300 hover:border-yellow-500"
                                    onClick={() => {
                                      const dropdown = document.getElementById(`dropdown-${index}`);
                                      if (dropdown) {
                                        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                                      }
                                    }}
                                  >
                                    <span className="text-left">
                                      {component.name ? `${component.name} - $${component.cost || '0.00'}` : "Seleccionar producto"}
                                    </span>
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                  
                                  {/* Dropdown manual */}
                                  <div 
                                    id={`dropdown-${index}`}
                                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto hidden"
                                    style={{ left: 0 }}
                                  >
                                    {availableComponentProducts.map((product: Product) => (
                                      <div
                                        key={product.id}
                                        className="px-3 py-2 hover:bg-yellow-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                                        onClick={() => {
                                          console.log('✅ Producto seleccionado:', product.name);
                                          
                                          // Actualizar componente con nueva data
                                          const updatedComponents = [...selectedComponents];
                                          updatedComponents[index] = {
                                            ...updatedComponents[index],
                                            componentProductId: product.id,
                                            id: product.id,
                                            name: product.name,
                                            cost: (product.cost || product.price).toString()
                                          };
                                          
                                          setSelectedComponents(updatedComponents);
                                          
                                          // Recalcular costo total
                                          const newTotalCost = updatedComponents.reduce((total, comp) => {
                                            return total + (parseFloat(comp.cost || "0") * (comp.quantity || 0));
                                          }, 0);
                                          form.setValue("costPrice", newTotalCost);
                                          
                                          // Cerrar dropdown
                                          const dropdown = document.getElementById(`dropdown-${index}`);
                                          if (dropdown) {
                                            dropdown.style.display = 'none';
                                          }
                                        }}
                                      >
                                        <div className="font-medium text-gray-900">{product.name}</div>
                                        <div className="text-sm text-gray-500">${product.cost || product.price}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Cantidad</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="1"
                                  className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                                  value={component.quantity}
                                  onChange={(e) => {
                                    updateComponent(index, 'quantity', parseFloat(e.target.value) || 0);
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Costo ($)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="h-10 border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                                  value={component.cost}
                                  onChange={(e) => {
                                    updateComponent(index, 'cost', e.target.value);
                                  }}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeComponent(index)}
                                className="h-10 border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
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
                          <div className="bg-white rounded-lg border border-yellow-200 p-4 mt-4">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-900">Costo Total de Componentes:</span>
                              <span className="text-lg font-bold text-yellow-600">
                                ${calculateTotalCost().toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pricing Information */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                      Información de Precios
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="costPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">
                              Costo {watchIsComposite && "(Calculado automáticamente)"}
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className={`h-11 pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500 ${watchIsComposite ? 'bg-gray-50' : ''}`}
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  readOnly={watchIsComposite}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Precio de Venta *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="h-11 pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="profitMargin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">% Utilidad (Calculado)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-11 pl-10 bg-gray-50 border-gray-300 text-gray-600 font-medium"
                                  {...field}
                                  value={field.value || ""}
                                  readOnly
                                />
                                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">%</span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Inventory & Configuration */}
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Tag className="h-5 w-5 text-gray-600" />
                      Inventario y Configuración
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <FormField
                        control={form.control}
                        name="initialStock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Inventario Inicial (Total - Calculado) *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className="h-11 pl-10 border-gray-300 focus:border-gray-500 focus:ring-gray-500 bg-gray-50"
                                  {...field}
                                  value={field.value || ""}
                                  readOnly
                                  title="Este valor se calcula automáticamente sumando el stock de todos los almacenes"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Unidad de Medida *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                                  <SelectValue placeholder="Seleccionar unidad" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="unidad">Unidad</SelectItem>
                                <SelectItem value="kg">Kilogramo (kg)</SelectItem>
                                <SelectItem value="gr">Gramo (gr)</SelectItem>
                                <SelectItem value="lt">Litro (lt)</SelectItem>
                                <SelectItem value="ml">Mililitro (ml)</SelectItem>
                                <SelectItem value="pza">Pieza (pza)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Warehouse Stock Distribution */}
                    {warehouses && warehouses.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="h-4 w-4 text-gray-600" />
                          <Label className="text-sm font-medium text-gray-700">
                            Distribución de Stock por Almacén
                          </Label>
                        </div>
                        <div className="grid grid-cols-1 gap-3 p-4 border rounded-lg bg-gray-50">
                          {warehouses.map((warehouse: any) => {
                            const currentStocks = form.watch('warehouseStocks') || [];
                            const warehouseStock = currentStocks.find(ws => ws.warehouseId === warehouse.id);
                            
                            return (
                              <div key={warehouse.id} className="flex items-center justify-between bg-white p-3 rounded border">
                                <Label className="text-sm font-medium">{warehouse.name}</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className="w-24"
                                  min={0}
                                  value={warehouseStock?.stock || 0}
                                  onChange={(e) => {
                                    const currentStocks = form.getValues('warehouseStocks') || [];
                                    const existingIndex = currentStocks.findIndex(ws => ws.warehouseId === warehouse.id);
                                    const newStock = parseInt(e.target.value) || 0;
                                    
                                    if (existingIndex >= 0) {
                                      currentStocks[existingIndex].stock = newStock;
                                    } else {
                                      currentStocks.push({ warehouseId: warehouse.id, stock: newStock });
                                    }
                                    
                                    form.setValue('warehouseStocks', currentStocks);
                                    
                                    // Calculate total stock and update the initialStock field
                                    const totalStock = currentStocks.reduce((sum, ws) => sum + ws.stock, 0);
                                    form.setValue('initialStock', totalStock);
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          El stock inicial total se calcula automáticamente sumando los stocks de todos los almacenes.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Categoría *</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger className="h-11 border-gray-300 focus:border-gray-500 focus:ring-gray-500">
                                  <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.isArray(categories) && categories.length > 0 ? categories.map((category: any) => (
                                  <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                  </SelectItem>
                                )) : (
                                  <SelectItem value="loading" disabled>Cargando categorías...</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hasTax"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-300 bg-white p-4 h-fit">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium text-gray-900">
                                Aplicar Impuesto
                              </FormLabel>
                              <p className="text-sm text-gray-600">
                                Incluir IVA del 16%
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="data-[state=checked]:bg-gray-600"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        setIsEditMode(false);
                        setProductToEdit(null);
                        form.reset();
                      }}
                      className="px-6 h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addProductMutation.isPending || updateProductMutation.isPending}
                      className="px-8 h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      {(addProductMutation.isPending || updateProductMutation.isPending) ? (
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
          <Button 
            onClick={() => setIsConjuntoFormOpen(true)}
            variant="outline"
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <Layers className="mr-2 h-4 w-4" />
            Producto Conjunto
          </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4 flex space-x-4">
          <Input
            placeholder="Buscar productos..."
            className="flex-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {Array.isArray(categories) && categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Almacén" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los almacenes</SelectItem>
              {Array.isArray(warehouses) && warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Imagen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Almacén
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Costo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Utilidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exist. Real
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="animate-pulse">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center animate-pulse">
                        <div className="ml-4">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded w-20"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-12"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-12"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                        <div className="h-8 bg-gray-200 rounded w-16"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                displayProducts.map((product) => {
                  return (
                    <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        type="button"
                        className="relative w-12 h-12 cursor-pointer group hover:bg-gray-100 rounded-lg transition-colors border-0 p-0 bg-transparent"
                        onClick={() => {
                          console.log('Button clicked for product:', product.id);
                          triggerImageUpload(product.id);
                        }}
                        title="Haz clic para cambiar imagen"
                      >
                        {uploadingImageForProduct === product.id ? (
                          <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        ) : (
                          <img 
                            src={product.imageUrl || "/api/placeholder/50/50"} 
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover transition-opacity group-hover:opacity-75"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `data:image/svg+xml;base64,${btoa(`
                                <svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
                                  <rect width="100%" height="100%" fill="#f3f4f6"/>
                                  <text x="50%" y="50%" font-family="Arial" font-size="12" fill="#9ca3af" text-anchor="middle" dy=".3em">
                                    ${product.name.charAt(0)}
                                  </text>
                                </svg>
                              `)}`;
                            }}
                          />
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all duration-200 flex items-center justify-center">
                          <div className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            📸
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(product as any).categoryName || 'Sin categoría'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(product as any).warehouseStocks && (product as any).warehouseStocks.length > 0 ? (
                        <div className="space-y-1">
                          {(product as any).warehouseStocks.map((ws: any) => (
                            <div key={ws.warehouseId} className="text-xs">
                              <span className="font-medium text-blue-600">{ws.warehouseName || 'Sin nombre'}:</span>
                              <span className="ml-1 text-gray-700">{formatStock(ws.stock || 0, (product as any).allowDecimals)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs">Sin almacén</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {product.isConjunto && product.weightVariants && product.weightVariants.length > 0 ? (
                        <div className="space-y-1">
                          {product.weightVariants.map((variant, index) => (
                            <div key={index} className="text-xs">
                              <span className="font-medium text-blue-600">{variant.label}:</span>
                              <span className="ml-1 text-green-600">{formatCurrency(parseFloat(variant.price || '0'))}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        formatCurrency(parseFloat(product.price || '0'))
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.isConjunto && product.weightVariants && product.weightVariants.length > 0 ? (
                        <div className="space-y-1">
                          {product.weightVariants.map((variant, index) => (
                            <div key={index} className="text-xs">
                              <span className="font-medium text-blue-600">{variant.label}:</span>
                              <span className="ml-1 text-gray-700">{formatCurrency(parseFloat(variant.cost || '0'))}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        formatCurrency(parseFloat((product as any).cost || '0'))
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.isConjunto && product.weightVariants && product.weightVariants.length > 0 ? (
                        <div className="space-y-1">
                          {product.weightVariants.map((variant, index) => {
                            const price = parseFloat(variant.price || '0');
                            const cost = parseFloat(variant.cost || '0');
                            const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
                            return (
                              <div key={index} className="text-xs">
                                <span className="font-medium text-blue-600">{variant.label}:</span>
                                <span className="ml-1 text-gray-700">{margin.toFixed(1)}%</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        (product as any).cost && product.price ? 
                          `${(((parseFloat(product.price) - parseFloat((product as any).cost)) / parseFloat(product.price)) * 100).toFixed(1)}%` 
                          : '0%'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="text-blue-600 font-medium">
                        {formatStock((product as any).totalStock || (product as any).realStock || (product as any).real_stock || 0, (product as any).allowDecimals)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={product.isComposite ? "outline" : product.isConjunto ? "default" : "secondary"} 
                        className={
                          product.isComposite ? "border-purple-300 text-purple-700 bg-purple-50" : 
                          product.isConjunto ? "border-blue-300 text-blue-700 bg-blue-50" : ""
                        }
                      >
                        {product.isComposite ? "Compuesto" : product.isConjunto ? "Conjunto" : "Simple"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <Badge variant={((product as any).totalStock || (product as any).realStock || (product as any).real_stock || 0) <= product.minStock ? "destructive" : "default"}>
                          {((product as any).totalStock || (product as any).realStock || (product as any).real_stock || 0) <= product.minStock ? "Stock Bajo" : "Activo"}
                        </Badge>
                        {(product.isComposite || product.isConjunto) && (product as any).components && (product as any).components.length > 0 && (
                          <div className="text-xs text-gray-600 mt-1">
                            <span className="font-medium text-blue-600">Componentes:</span>
                            {(product as any).components.map((comp: any, index: number) => (
                              <div key={index} className="ml-2 text-gray-700">
                                • {comp.componentName || comp.name} x{comp.quantity}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteProduct(product)}
                          disabled={deleteProductMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleWeightSaleConfig(product)}
                          className="border-green-500 text-green-700 hover:bg-green-50"
                          title="Configurar venta por peso"
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Products Summary Section */}
        {displayProducts.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Resumen de Productos
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Average Price */}
              <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium text-gray-700">Precio Promedio</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  ${(displayProducts.reduce((sum, p) => sum + parseFloat(p.price || '0'), 0) / displayProducts.length).toFixed(2)}
                </p>
              </div>

              {/* Average Cost */}
              <div className="bg-white p-4 rounded-lg border border-orange-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm font-medium text-gray-700">Costo Promedio</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  ${(displayProducts.reduce((sum, p) => sum + parseFloat((p as any).cost || '0'), 0) / displayProducts.length).toFixed(2)}
                </p>
              </div>

              {/* Average Profit Margin */}
              <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-gray-700">Utilidad Promedio</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {(() => {
                    const avgMargin = displayProducts.reduce((sum, p) => {
                      const price = parseFloat(p.price || '0');
                      const cost = parseFloat((p as any).cost || '0');
                      return sum + (price > 0 ? ((price - cost) / price) * 100 : 0);
                    }, 0) / displayProducts.length;
                    return `${avgMargin.toFixed(1)}%`;
                  })()}
                </p>
              </div>

              {/* Total Real Stock */}
              <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm font-medium text-gray-700">Existencias Totales</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {displayProducts.reduce((sum, p) => sum + parseFloat(formatStock((p as any).realStock || (p as any).real_stock || 0, (p as any).allowDecimals)), 0).toLocaleString()} unidades
                </p>
              </div>
            </div>

            {/* Additional Summary Row */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <span className="text-sm text-gray-600">Total de Productos:</span>
                  <p className="text-lg font-semibold text-gray-800">{displayProducts.length}</p>
                </div>
                <div className="text-center">
                  <span className="text-sm text-gray-600">Valor Total Inventario (Costo):</span>
                  <p className="text-lg font-semibold text-gray-800">
                    ${displayProducts.reduce((sum, p) => {
                      const cost = parseFloat((p as any).cost || '0');
                      const stock = (p as any).realStock || (p as any).real_stock || 0;
                      return sum + (cost * stock);
                    }, 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-sm text-gray-600">Valor Total Inventario (Precio):</span>
                  <p className="text-lg font-semibold text-gray-800">
                    ${displayProducts.reduce((sum, p) => {
                      const price = parseFloat(p.price || '0');
                      const stock = (p as any).realStock || (p as any).real_stock || 0;
                      return sum + (price * stock);
                    }, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {displayProducts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron productos</p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Eliminar Producto
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                ¿Estás seguro de que quieres eliminar el producto{" "}
                <span className="font-semibold text-gray-900">
                  "{productToDelete?.name}"
                </span>
                ?
                <br />
                <br />
                Esta acción no se puede deshacer y eliminará permanentemente:
                <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                  <li>Información del producto</li>
                  <li>Historial de inventario</li>
                  <li>Datos de ventas asociados</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel 
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={deleteProductMutation.isPending}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteProduct}
                disabled={deleteProductMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteProductMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Eliminando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    Eliminar Producto
                  </div>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Weight Sale Configuration Modal */}
        <Dialog open={isWeightSaleModalOpen} onOpenChange={setIsWeightSaleModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Package className="h-5 w-5" />
                Configurar Venta por Peso
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Configura la venta por gramaje para el producto{" "}
                <span className="font-semibold text-gray-900">
                  "{weightSaleProduct?.name}"
                </span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="saleUnit">Unidad de Venta (fracción)</Label>
                <Input
                  id="saleUnit"
                  type="number"
                  step="0.001"
                  placeholder="ej: 0.500"
                  defaultValue={weightSaleProduct?.saleUnit || "0.500"}
                />
                <p className="text-sm text-gray-500">
                  Cantidad que se vende por unidad (ej: 0.500 para medio kilo)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleUnitName">Nombre de la Unidad</Label>
                <Input
                  id="saleUnitName"
                  type="text"
                  placeholder="ej: medio kilo, 500 gramos"
                  defaultValue={weightSaleProduct?.saleUnitName || "medio kilo"}
                />
                <p className="text-sm text-gray-500">
                  Nombre descriptivo para la unidad de venta
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleUnitPrice">Precio por Unidad de Venta</Label>
                <Input
                  id="saleUnitPrice"
                  type="number"
                  step="0.01"
                  placeholder="ej: 200.00"
                  defaultValue={weightSaleProduct?.saleUnitPrice || ""}
                />
                <p className="text-sm text-gray-500">
                  Precio específico para esta fracción (ej: $200 por medio kilo)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowDecimals"
                  defaultChecked={weightSaleProduct?.allowDecimals || true}
                  className="h-4 w-4 text-green-600 rounded border-gray-300"
                />
                <Label htmlFor="allowDecimals" className="text-sm">
                  Permitir cantidades decimales en POS
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline"
                onClick={() => setIsWeightSaleModalOpen(false)}
                disabled={updateWeightSaleMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (weightSaleProduct) {
                    const saleUnit = (document.getElementById('saleUnit') as HTMLInputElement).value;
                    const saleUnitName = (document.getElementById('saleUnitName') as HTMLInputElement).value;
                    const saleUnitPrice = (document.getElementById('saleUnitPrice') as HTMLInputElement).value;
                    const allowDecimals = (document.getElementById('allowDecimals') as HTMLInputElement).checked;
                    
                    updateWeightSaleMutation.mutate({
                      id: weightSaleProduct.id,
                      saleUnit,
                      saleUnitName,
                      saleUnitPrice,
                      allowDecimals
                    });
                  }
                }}
                disabled={updateWeightSaleMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {updateWeightSaleMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Configurando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Configurar Venta por Peso
                  </div>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Producto Conjunto Modal */}
        <Dialog open={isConjuntoFormOpen} onOpenChange={setIsConjuntoFormOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Layers className="h-6 w-6 text-blue-600" />
                Crear Producto Conjunto
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Crea un producto padre con múltiples variantes de peso y precios específicos
              </DialogDescription>
            </DialogHeader>
            <ProductConjuntoForm 
              onSuccess={() => {
                setIsConjuntoFormOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                toast({
                  title: "Producto conjunto creado",
                  description: "El producto conjunto y sus variantes se han creado exitosamente",
                });
              }}
              onCancel={() => setIsConjuntoFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
