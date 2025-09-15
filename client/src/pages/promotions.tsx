import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Eye, Target, Percent, Gift, Calendar, Users, TrendingUp, Package, Tag, X, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";

const promotionSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  type: z.enum(["percentage", "fixed_amount", "2x1", "buy_x_get_y", "bulk_discount"]),
  description: z.string().optional(),
  value: z.string().optional(),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
  applyTo: z.enum(["all", "specific_products", "specific_categories"]),
  minQuantity: z.number().min(0).optional(),
  maxQuantity: z.number().min(0).optional(),
  minPurchaseAmount: z.number().min(0).optional(),
  maxUses: z.number().min(0).optional(),
  buyQuantity: z.number().min(1).optional(),
  getQuantity: z.number().min(1).optional(),
  isActive: z.boolean().default(true),
  stackable: z.boolean().default(false),
  priority: z.number().min(1).default(1),
});

type PromotionFormData = z.infer<typeof promotionSchema>;

export default function PromotionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const form = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      name: "",
      type: "percentage",
      description: "",
      value: "",
      startDate: "",
      endDate: "",
      applyTo: "all",
      minQuantity: 0,
      maxQuantity: 0,
      minPurchaseAmount: 0,
      maxUses: 0,
      buyQuantity: 1,
      getQuantity: 1,
      isActive: true,
      stackable: false,
      priority: 1,
    },
  });

  // Watch the applyTo field to show/hide product and category selection
  const selectedApplyTo = form.watch("applyTo");
  const selectedType = form.watch("type");

  // Fetch promotions
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["/api/promotions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/promotions");
      return response.json();
    },
  });

  // Fetch products for selection
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/products");
      return response.json();
    },
  });

  // Fetch categories for selection
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/categories");
      return response.json();
    },
  });

  // Fetch promotion stats
  const { data: stats } = useQuery({
    queryKey: ["/api/promotions/stats"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/promotions/stats");
      return response.json();
    },
  });

  // Create promotion mutation
  const createPromotionMutation = useMutation({
    mutationFn: async (data: PromotionFormData & { selectedProducts: number[], selectedCategories: number[] }) => {
      const response = await apiRequest("POST", "/api/promotions", data);
      return response.json();
    },
    onSuccess: (newPromotion) => {
      queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions/stats"] });
      toast({
        title: "✅ Promoción creada",
        description: "La promoción ha sido creada exitosamente.",
      });
      setIsDialogOpen(false);
      form.reset();
      setSelectedProducts([]);
      setSelectedCategories([]);
    },
    onError: (error: any) => {
      console.error("Error creating promotion:", error);
      toast({
        title: "❌ Error al crear promoción",
        description: error.message || "No se pudo crear la promoción. Verifique todos los campos.",
        variant: "destructive",
      });
    },
  });

  // Update promotion mutation
  const updatePromotionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PromotionFormData> }) => {
      const response = await apiRequest("PUT", `/api/promotions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions/stats"] });
      toast({
        title: "✅ Promoción actualizada",
        description: "La promoción ha sido actualizada exitosamente.",
      });
      setIsDialogOpen(false);
      setEditingPromotion(null);
      form.reset();
      setSelectedProducts([]);
      setSelectedCategories([]);
    },
    onError: (error: any) => {
      console.error("Error updating promotion:", error);
      toast({
        title: "❌ Error al actualizar promoción",
        description: error.message || "No se pudo actualizar la promoción.",
        variant: "destructive",
      });
    },
  });

  // Delete promotion mutation
  const deletePromotionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/promotions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions/stats"] });
      toast({
        title: "✅ Promoción eliminada",
        description: "La promoción ha sido eliminada exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting promotion:", error);
      toast({
        title: "❌ Error al eliminar promoción",
        description: error.message || "No se pudo eliminar la promoción.",
        variant: "destructive",
      });
    },
  });

  // Toggle active promotion mutation
  const toggleActivePromotionMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/promotions/${id}/toggle`, { isActive });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/promotions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions/stats"] });
      toast({
        title: "✅ Estado actualizado",
        description: `Promoción ${variables.isActive ? 'activada' : 'desactivada'} correctamente.`,
      });
    },
    onError: (error: any) => {
      console.error("Error toggling promotion:", error);
      toast({
        title: "❌ Error al cambiar estado",
        description: error.message || "No se pudo cambiar el estado de la promoción.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: PromotionFormData) => {
    console.log("🔥 Submitting promotion form:", data);
    console.log("🔥 Selected products:", selectedProducts);
    console.log("🔥 Selected categories:", selectedCategories);
    
    // Validate promotion-specific fields
    if (data.type === "buy_x_get_y" && (!data.buyQuantity || !data.getQuantity)) {
      toast({
        title: "Error de validación",
        description: "Para promociones 'Compra X Lleva Y' debe especificar cantidades de compra y regalo.",
        variant: "destructive",
      });
      return;
    }
    
    if ((data.type === "percentage" || data.type === "fixed_amount" || data.type === "bulk_discount") && !data.value) {
      toast({
        title: "Error de validación",
        description: "Debe especificar un valor para este tipo de promoción.",
        variant: "destructive",
      });
      return;
    }
    
    if (data.applyTo === "specific_products" && selectedProducts.length === 0) {
      toast({
        title: "Error de validación",
        description: "Debe seleccionar al menos un producto para promociones específicas.",
        variant: "destructive",
      });
      return;
    }
    
    if (data.applyTo === "specific_categories" && selectedCategories.length === 0) {
      toast({
        title: "Error de validación",
        description: "Debe seleccionar al menos una categoría para promociones específicas.",
        variant: "destructive",
      });
      return;
    }

    const formattedData = {
      ...data,
      value: data.value ? data.value.toString() : null,
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días después por defecto
      selectedProducts: selectedProducts,
      selectedCategories: selectedCategories,
      // Ensure numbers are sent as numbers
      minQuantity: Number(data.minQuantity) || 0,
      maxQuantity: Number(data.maxQuantity) || 0,
      minPurchaseAmount: Number(data.minPurchaseAmount) || 0,
      maxUses: Number(data.maxUses) || 0,
      buyQuantity: Number(data.buyQuantity) || 1,
      getQuantity: Number(data.getQuantity) || 1,
      priority: Number(data.priority) || 1,
    };

    console.log("🔥 Formatted data for submission:", formattedData);

    if (editingPromotion) {
      updatePromotionMutation.mutate({ id: editingPromotion.id, data: formattedData });
    } else {
      createPromotionMutation.mutate(formattedData);
    }
  };

  const handleEdit = async (promotion: any) => {
    setEditingPromotion(promotion);
    
    // Cargar productos y categorías asociados
    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        apiRequest("GET", `/api/promotions/${promotion.id}/products`),
        apiRequest("GET", `/api/promotions/${promotion.id}/categories`)
      ]);
      
      const associatedProducts = await productsResponse.json();
      const associatedCategories = await categoriesResponse.json();
      
      // Configurar los productos y categorías seleccionados
      const productIds = associatedProducts.map((p: any) => p.productId);
      const categoryIds = associatedCategories.map((c: any) => c.categoryId);
      
      setSelectedProducts(productIds);
      setSelectedCategories(categoryIds);
      
      console.log("🔥 Loaded associated products:", productIds);
      console.log("🔥 Loaded associated categories:", categoryIds);
    } catch (error) {
      console.error("Error loading promotion associations:", error);
      // En caso de error, usar valores vacíos
      setSelectedProducts([]);
      setSelectedCategories([]);
    }
    
    // Usar la propiedad correcta dependiendo de cómo viene desde el backend
    const startDateValue = promotion.startDate || promotion.start_date;
    const endDateValue = promotion.endDate || promotion.end_date;
    
    console.log("🔥 Editing promotion - Raw promotion object:", promotion);
    console.log("🔥 Editing promotion - Start date value:", startDateValue);
    console.log("🔥 Editing promotion - End date value:", endDateValue);
    
    // Función helper para formatear fechas de forma segura
    const formatDateSafely = (dateValue: any): string => {
      if (!dateValue || dateValue === null) return new Date().toISOString().split('T')[0]; // Fecha actual como fallback
      
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          console.warn("🔥 Invalid date detected, using current date:", dateValue);
          return new Date().toISOString().split('T')[0];
        }
        return date.toISOString().split('T')[0];
      } catch (error) {
        console.error("🔥 Error parsing date:", error, dateValue);
        return new Date().toISOString().split('T')[0];
      }
    };
    
    const formattedStartDate = formatDateSafely(startDateValue);
    const formattedEndDate = formatDateSafely(endDateValue);
    
    console.log("🔥 Editing promotion - Formatted dates:", formattedStartDate, formattedEndDate);
    
    form.reset({
      name: promotion.name,
      type: promotion.type,
      description: promotion.description || "",
      value: promotion.value || "",
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      applyTo: promotion.applyTo,
      minQuantity: promotion.minQuantity || 0,
      maxQuantity: promotion.maxQuantity || 0,
      minPurchaseAmount: promotion.minPurchaseAmount || 0,
      maxUses: promotion.maxUses || 0,
      buyQuantity: promotion.buyQuantity || 1,
      getQuantity: promotion.getQuantity || 1,
      isActive: promotion.isActive,
      stackable: promotion.stackable,
      priority: promotion.priority,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("¿Está seguro que desea eliminar esta promoción?")) {
      deletePromotionMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    toggleActivePromotionMutation.mutate({ id, isActive });
  };

  const getPromotionTypeLabel = (type: string) => {
    const types = {
      percentage: "Porcentaje",
      fixed_amount: "Monto Fijo",
      "2x1": "2x1",
      buy_x_get_y: "Compra X Lleva Y",
      bulk_discount: "Descuento por Volumen",
    };
    return types[type] || type;
  };

  const getPromotionTypeIcon = (type: string) => {
    const icons = {
      percentage: <Percent className="h-4 w-4" />,
      fixed_amount: <Target className="h-4 w-4" />,
      "2x1": <Gift className="h-4 w-4" />,
      buy_x_get_y: <Gift className="h-4 w-4" />,
      bulk_discount: <TrendingUp className="h-4 w-4" />,
    };
    return icons[type] || <Target className="h-4 w-4" />;
  };

  const filteredPromotions = promotions.filter((promotion: any) =>
    promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    promotion.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );



  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <Gift className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Promociones y Descuentos
                  </h1>
                  <p className="text-white/80">
                    Gestiona promociones, descuentos y ofertas especiales
                  </p>
                </div>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                    onClick={() => {
                      setEditingPromotion(null);
                      form.reset();
                      setSelectedProducts([]);
                      setSelectedCategories([]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Promoción
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPromotion ? "Editar Promoción" : "Nueva Promoción"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingPromotion ? "Modifica los detalles de la promoción existente" : "Crea una nueva promoción o descuento para tus productos"}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre de la Promoción</FormLabel>
                              <FormControl>
                                <Input placeholder="Descuento de temporada" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Promoción</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="percentage">Descuento Porcentual</SelectItem>
                                  <SelectItem value="fixed_amount">Monto Fijo</SelectItem>
                                  <SelectItem value="2x1">2x1</SelectItem>
                                  <SelectItem value="buy_x_get_y">Compra X Lleva Y</SelectItem>
                                  <SelectItem value="bulk_discount">Descuento por Volumen</SelectItem>
                                </SelectContent>
                              </Select>
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
                              <Textarea placeholder="Descripción de la promoción" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {(selectedType === "percentage" || selectedType === "fixed_amount" || selectedType === "bulk_discount") && (
                        <FormField
                          control={form.control}
                          name="value"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {selectedType === "percentage" || selectedType === "bulk_discount" ? "Porcentaje (%)" : "Monto ($)"}
                              </FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="10" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {selectedType === "buy_x_get_y" && (
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="buyQuantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Compra Cantidad</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="getQuantity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Lleva Cantidad</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha de Inicio</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha de Fin</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="applyTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aplicar a</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar aplicación" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="all">Todos los productos</SelectItem>
                                <SelectItem value="specific_products">Productos específicos</SelectItem>
                                <SelectItem value="specific_categories">Categorías específicas</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Selección de productos específicos */}
                      {selectedApplyTo === "specific_products" && (
                        <div className="space-y-3">
                          <Label>Seleccionar Productos</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                            {products.map((product: any) => (
                              <div key={product.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`product-${product.id}`}
                                  checked={selectedProducts.includes(product.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedProducts([...selectedProducts, product.id]);
                                    } else {
                                      setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                    }
                                  }}
                                />
                                <Label htmlFor={`product-${product.id}`} className="text-sm cursor-pointer">
                                  {product.name} - ${product.price}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selección de categorías específicas */}
                      {selectedApplyTo === "specific_categories" && (
                        <div className="space-y-3">
                          <Label>Seleccionar Categorías</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                            {categories.map((category: any) => (
                              <div key={category.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`category-${category.id}`}
                                  checked={selectedCategories.includes(category.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedCategories([...selectedCategories, category.id]);
                                    } else {
                                      setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                                    }
                                  }}
                                />
                                <Label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer">
                                  {category.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="minQuantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cantidad Mínima</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="maxQuantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cantidad Máxima</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="maxUses"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Usos Máximos</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="minPurchaseAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Monto Mínimo de Compra</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prioridad</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex space-x-4">
                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Activa</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="stackable"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel>Acumulable</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              const response = await fetch("/api/test-promotion");
                              const data = await response.json();
                              console.log("Test result:", data);
                              toast({
                                title: "Test completado",
                                description: response.ok ? "Promoción de prueba creada exitosamente" : "Error en el test: " + data.message,
                                variant: response.ok ? "default" : "destructive",
                              });
                            } catch (error) {
                              console.error("Test error:", error);
                              toast({
                                title: "Error en test",
                                description: "Error al ejecutar la prueba",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Test
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createPromotionMutation.isPending || updatePromotionMutation.isPending}
                        >
                          {editingPromotion ? "Actualizar" : "Crear"} Promoción
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">Total Promociones Usadas</p>
                    <p className="text-3xl font-bold">{stats.totalUsages}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Ahorros Generados</p>
                    <p className="text-3xl font-bold">${stats.totalSavings.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">Promociones Activas</p>
                    <p className="text-3xl font-bold">{promotions.filter((p: any) => p.isActive).length}</p>
                  </div>
                  <Gift className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar promociones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promotions List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando promociones...</p>
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay promociones disponibles</p>
            </div>
          ) : (
            filteredPromotions.map((promotion: any) => (
              <Card key={promotion.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getPromotionTypeIcon(promotion.type)}
                      <CardTitle className="text-lg">{promotion.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Badge variant={promotion.isActive ? "default" : "secondary"}>
                        {promotion.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Tipo:</p>
                      <p className="font-semibold">{getPromotionTypeLabel(promotion.type)}</p>
                    </div>
                    
                    {promotion.description && (
                      <div>
                        <p className="text-sm text-gray-600">Descripción:</p>
                        <p className="text-sm">{promotion.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Inicio:</p>
                        <p>{(() => {
                          const dateValue = promotion.startDate;
                          console.log("🔥 Card Display - Start date value:", dateValue, typeof dateValue);
                          if (!dateValue || dateValue === null) return "Sin fecha";
                          try {
                            // Handle different date formats
                            let date;
                            if (typeof dateValue === 'string') {
                              // Try different string formats
                              if (dateValue.includes('T')) {
                                date = new Date(dateValue);
                              } else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                // YYYY-MM-DD format
                                date = new Date(dateValue + 'T00:00:00');
                              } else {
                                date = new Date(dateValue);
                              }
                            } else {
                              date = new Date(dateValue);
                            }
                            
                            const isValid = !isNaN(date.getTime());
                            console.log("🔥 Card Display - Start date processed:", date, "Valid:", isValid);
                            return isValid ? format(date, "dd/MM/yyyy", { locale: es }) : "Fecha inválida";
                          } catch (error) {
                            console.error("🔥 Card Display - Start date error:", error);
                            return "Fecha inválida";
                          }
                        })()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Fin:</p>
                        <p>{(() => {
                          const dateValue = promotion.endDate;
                          console.log("🔥 Card Display - End date value:", dateValue, typeof dateValue);
                          if (!dateValue || dateValue === null) return "Sin fecha";
                          try {
                            // Handle different date formats
                            let date;
                            if (typeof dateValue === 'string') {
                              // Try different string formats
                              if (dateValue.includes('T')) {
                                date = new Date(dateValue);
                              } else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                // YYYY-MM-DD format
                                date = new Date(dateValue + 'T00:00:00');
                              } else {
                                date = new Date(dateValue);
                              }
                            } else {
                              date = new Date(dateValue);
                            }
                            
                            const isValid = !isNaN(date.getTime());
                            console.log("🔥 Card Display - End date processed:", date, "Valid:", isValid);
                            return isValid ? format(date, "dd/MM/yyyy", { locale: es }) : "Fecha inválida";
                          } catch (error) {
                            console.error("🔥 Card Display - End date error:", error);
                            return "Fecha inválida";
                          }
                        })()}</p>
                      </div>
                    </div>
                    
                    {/* Alcance de la promoción */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-2">Aplica a:</p>
                      {promotion.applyTo === "all" ? (
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Gift className="h-3 w-3 mr-1" />
                            Todos los productos
                          </Badge>
                        </div>
                      ) : promotion.applyTo === "specific_products" ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Package className="h-3 w-3 mr-1" />
                              Productos específicos
                            </Badge>
                            <span className="text-xs text-gray-500">
                              ({promotion.productCount || 0} productos)
                            </span>
                          </div>
                          {promotion.productNames && promotion.productNames.length > 0 && (
                            <div className="pl-4">
                              {promotion.productNames.map((product: any, idx: number) => (
                                <div key={idx} className="text-xs text-gray-600">
                                  • {product.name} - ${product.price}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : promotion.applyTo === "specific_categories" ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              <Tag className="h-3 w-3 mr-1" />
                            Categorías específicas
                          </Badge>
                          <span className="text-xs text-gray-500">
                            ({promotion.categoryCount || 0} categorías)
                          </span>
                        </div>
                        {promotion.categoryNames && promotion.categoryNames.length > 0 && (
                          <div className="pl-4">
                            {promotion.categoryNames.map((category: any, idx: number) => (
                              <div key={idx} className="text-xs text-gray-600">
                                • {category.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          Sin especificar
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Usos: {promotion.usedCount || 0}</span>
                      <span className="text-gray-600">Prioridad: {promotion.priority}</span>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(promotion)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(promotion.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={promotion.isActive ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggleActive(promotion.id, !promotion.isActive)}
                        className={promotion.isActive 
                          ? "bg-red-600 hover:bg-red-700 text-white" 
                          : "bg-green-600 hover:bg-green-700 text-white"
                        }
                      >
                        {promotion.isActive ? (
                          <>
                            <X className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}