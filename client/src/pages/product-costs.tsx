import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Calculator, PieChart, ChefHat, Utensils, Search, Edit, Plus } from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface Product {
  id: number;
  name: string;
  price: number;
  cost: number;
  imageUrl?: string;
}

interface ProductCost {
  id: number;
  productId: number;
  materialCost: number;
  laborCost: number;
  overheadCost: number;
  packagingCost: number;
  shippingCost: number;
  otherCosts: number;
  totalCost: number;
  notes?: string;
}

interface CostIngredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  category: string;
}

interface ProductNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface ProductPreparation {
  id: number;
  stepNumber: number;
  title: string;
  description: string;
  duration: number;
}

// Esquemas de validación para formularios
const costSchema = z.object({
  materialCost: z.coerce.number().min(0, "El costo no puede ser negativo"),
  laborCost: z.coerce.number().min(0, "El costo no puede ser negativo"),
  overheadCost: z.coerce.number().min(0, "El costo no puede ser negativo"),
  packagingCost: z.coerce.number().min(0, "El costo no puede ser negativo"),
  shippingCost: z.coerce.number().min(0, "El costo no puede ser negativo"),
  otherCosts: z.coerce.number().min(0, "El costo no puede ser negativo"),
  notes: z.string().optional(),
});

const ingredientSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  quantity: z.coerce.number().min(0.001, "La cantidad debe ser mayor a 0"),
  unit: z.string().min(1, "La unidad es requerida"),
  unitCost: z.coerce.number().min(0, "El costo no puede ser negativo"),
  category: z.string().default("ingredient"),
  notes: z.string().optional(),
});

const nutritionSchema = z.object({
  calories: z.coerce.number().min(0, "Las calorías no pueden ser negativas"),
  protein: z.coerce.number().min(0, "Las proteínas no pueden ser negativas"),
  carbs: z.coerce.number().min(0, "Los carbohidratos no pueden ser negativos"),
  fat: z.coerce.number().min(0, "Las grasas no pueden ser negativas"),
  fiber: z.coerce.number().min(0, "La fibra no puede ser negativa").optional(),
  sugar: z.coerce.number().min(0, "El azúcar no puede ser negativo").optional(),
  sodium: z.coerce.number().min(0, "El sodio no puede ser negativo").optional(),
  servingSize: z.string().default("100g"),
  additionalInfo: z.string().optional(),
});

const preparationSchema = z.object({
  stepNumber: z.coerce.number().min(1, "El número de paso debe ser mayor a 0"),
  title: z.string().min(1, "El título es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  duration: z.coerce.number().min(0, "La duración no puede ser negativa"),
  temperature: z.coerce.number().optional(),
  equipment: z.string().optional(),
  notes: z.string().optional(),
});

export default function ProductCosts() {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados para controlar los modales
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
  const [nutritionModalOpen, setNutritionModalOpen] = useState(false);
  const [preparationModalOpen, setPreparationModalOpen] = useState(false);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
  });

  const { data: productCost, isLoading: costLoading } = useQuery({
    queryKey: ['/api/product-costs', selectedProductId],
    enabled: !!selectedProductId && selectedProductId !== null,
  });

  const { data: ingredients = [] } = useQuery({
    queryKey: [`/api/product-costs/ingredients/${selectedProductId}`],
    enabled: !!selectedProductId && selectedProductId !== null,
  });

  const { data: nutrition } = useQuery({
    queryKey: [`/api/product-costs/nutrition/${selectedProductId}`],
    enabled: !!selectedProductId && selectedProductId !== null,
  });

  const { data: preparation = [] } = useQuery({
    queryKey: [`/api/product-costs/preparation/${selectedProductId}`],
    enabled: !!selectedProductId && selectedProductId !== null,
  });

  const createCostMutation = useMutation({
    mutationFn: (data: any) => queryClient.apiRequest('POST', '/api/product-costs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs'] });
    },
  });

  const createIngredientMutation = useMutation({
    mutationFn: (data: any) => queryClient.apiRequest('POST', '/api/product-costs/ingredients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs/ingredients'] });
    },
  });

  const createNutritionMutation = useMutation({
    mutationFn: (data: any) => queryClient.apiRequest('POST', '/api/product-costs/nutrition', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs/nutrition'] });
    },
  });

  const createPreparationMutation = useMutation({
    mutationFn: (data: any) => queryClient.apiRequest('POST', '/api/product-costs/preparation', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-costs/preparation'] });
    },
  });

  // Formularios para los modales
  const costForm = useForm<z.infer<typeof costSchema>>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      materialCost: 0,
      laborCost: 0,
      overheadCost: 0,
      packagingCost: 0,
      shippingCost: 0,
      otherCosts: 0,
      notes: "",
    },
  });

  const ingredientForm = useForm<z.infer<typeof ingredientSchema>>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: "",
      quantity: 0,
      unit: "",
      unitCost: 0,
      category: "ingredient",
      notes: "",
    },
  });

  const nutritionForm = useForm<z.infer<typeof nutritionSchema>>({
    resolver: zodResolver(nutritionSchema),
    defaultValues: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      servingSize: "100g",
      additionalInfo: "",
    },
  });

  const preparationForm = useForm<z.infer<typeof preparationSchema>>({
    resolver: zodResolver(preparationSchema),
    defaultValues: {
      stepNumber: 1,
      title: "",
      description: "",
      duration: 0,
      temperature: 0,
      equipment: "",
      notes: "",
    },
  });

  // Manejadores de envío de formularios
  const onSubmitCost = (data: z.infer<typeof costSchema>) => {
    if (!selectedProductId) return;
    
    const totalCost = data.materialCost + data.laborCost + data.overheadCost + 
                     data.packagingCost + data.shippingCost + data.otherCosts;
    
    const costData = {
      productId: selectedProductId,
      ...data,
      totalCost,
    };

    createCostMutation.mutate(costData, {
      onSuccess: () => {
        toast({ title: "Costos configurados exitosamente" });
        setCostModalOpen(false);
        costForm.reset();
      },
    });
  };

  const onSubmitIngredient = (data: z.infer<typeof ingredientSchema>) => {
    if (!selectedProductId) return;
    
    const totalCost = data.quantity * data.unitCost;
    
    const ingredientData = {
      productId: selectedProductId,
      ...data,
      totalCost,
    };

    createIngredientMutation.mutate(ingredientData, {
      onSuccess: () => {
        toast({ title: "Ingrediente agregado exitosamente" });
        setIngredientModalOpen(false);
        ingredientForm.reset();
      },
    });
  };

  const onSubmitNutrition = (data: z.infer<typeof nutritionSchema>) => {
    if (!selectedProductId) return;

    const nutritionData = {
      productId: selectedProductId,
      ...data,
    };

    createNutritionMutation.mutate(nutritionData, {
      onSuccess: () => {
        toast({ title: "Información nutricional agregada exitosamente" });
        setNutritionModalOpen(false);
        nutritionForm.reset();
      },
    });
  };

  const onSubmitPreparation = (data: z.infer<typeof preparationSchema>) => {
    if (!selectedProductId) return;

    const preparationData = {
      productId: selectedProductId,
      ...data,
    };

    createPreparationMutation.mutate(preparationData, {
      onSuccess: () => {
        toast({ title: "Paso de preparación agregado exitosamente" });
        setPreparationModalOpen(false);
        preparationForm.reset();
      },
    });
  };

  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProduct = products.find((p: Product) => p.id === selectedProductId);

  // Preparar datos para el gráfico de distribución de costos
  const costChartData = productCost ? [
    { name: 'Materiales', value: productCost.materialCost, color: '#22C55E' },
    { name: 'Mano de Obra', value: productCost.laborCost, color: '#3B82F6' },
    { name: 'Gastos Generales', value: productCost.overheadCost, color: '#F59E0B' },
    { name: 'Empaque', value: productCost.packagingCost, color: '#EF4444' },
    { name: 'Envío', value: productCost.shippingCost, color: '#8B5CF6' },
    { name: 'Otros', value: productCost.otherCosts, color: '#6B7280' },
  ].filter(item => item.value > 0) : [];

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 via-white to-green-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Calculator className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Análisis de Costos de Productos</h1>
        </div>
        <p className="text-blue-100">Costea tus productos con análisis detallado de ingredientes, procesos y rentabilidad</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Selección de Productos */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Seleccionar Producto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            <div className="max-h-96 overflow-y-auto space-y-2">
              {productsLoading ? (
                <div className="text-center py-4">Cargando productos...</div>
              ) : (
                filteredProducts.map((product: Product) => (
                  <Card
                    key={product.id}
                    className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                      selectedProductId === product.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Utensils className="h-6 w-6 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-gray-600">
                          Precio: ${product.price} • Costo: ${product.cost || 0}
                        </p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            Margen: {product.cost ? (((product.price - product.cost) / product.price) * 100).toFixed(1) : 0}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Panel Principal de Análisis */}
        <div className="lg:col-span-2 space-y-6">
          {selectedProduct ? (
            <>
              {/* Header del Producto */}
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
                      {selectedProduct.imageUrl ? (
                        <img 
                          src={selectedProduct.imageUrl} 
                          alt={selectedProduct.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Utensils className="h-8 w-8" />
                      )}
                    </div>
                    {selectedProduct.name}
                  </CardTitle>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <p className="text-green-100 text-sm">Precio de Venta</p>
                      <p className="text-2xl font-bold">${selectedProduct.price}</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <p className="text-green-100 text-sm">Costo Total</p>
                      <p className="text-2xl font-bold">${productCost?.totalCost || selectedProduct.cost || 0}</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <p className="text-green-100 text-sm">Utilidad</p>
                      <p className="text-2xl font-bold">
                        {productCost ? 
                          (((selectedProduct.price - productCost.totalCost) / selectedProduct.price) * 100).toFixed(1) 
                          : (((selectedProduct.price - (selectedProduct.cost || 0)) / selectedProduct.price) * 100).toFixed(1)
                        }%
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribución de Costos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-orange-600" />
                      Distribución de Costos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {costChartData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={costChartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                            >
                              {costChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [`$${value}`, 'Costo']} />
                            <Legend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                        <PieChart className="h-12 w-12 mb-2" />
                        <p className="text-center">No hay datos de costos detallados</p>
                        <Dialog open={costModalOpen} onOpenChange={setCostModalOpen}>
                          <DialogTrigger asChild>
                            <Button className="mt-3" size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Configurar Costos
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Información Nutricional */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="h-5 w-5 text-green-600" />
                      Información Nutricional
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {nutrition ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <p className="text-2xl font-bold text-orange-600">{nutrition.calories || 0}</p>
                          <p className="text-sm text-gray-600">Calorías</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{nutrition.protein || 0}g</p>
                          <p className="text-sm text-gray-600">Proteína</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <p className="text-2xl font-bold text-yellow-600">{nutrition.carbs || 0}g</p>
                          <p className="text-sm text-gray-600">Carbohidratos</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-2xl font-bold text-purple-600">{nutrition.fat || 0}g</p>
                          <p className="text-sm text-gray-600">Grasas</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Utensils className="h-12 w-12 mx-auto mb-2" />
                        <p>No hay información nutricional disponible</p>
                        <Dialog open={nutritionModalOpen} onOpenChange={setNutritionModalOpen}>
                          <DialogTrigger asChild>
                            <Button className="mt-3" size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Agregar Información
                            </Button>
                          </DialogTrigger>
                        </Dialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Ingredientes Principales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5 text-purple-600" />
                      Ingredientes Principales
                    </div>
                    <Dialog open={ingredientModalOpen} onOpenChange={setIngredientModalOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Ingrediente
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ingredients.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Ingrediente</th>
                            <th className="text-center py-2">Cantidad</th>
                            <th className="text-center py-2">Unidad</th>
                            <th className="text-center py-2">Costo Unit.</th>
                            <th className="text-center py-2">Costo Total</th>
                            <th className="text-center py-2">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingredients.map((ingredient: CostIngredient) => (
                            <tr key={ingredient.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 font-medium">{ingredient.name}</td>
                              <td className="text-center">{ingredient.quantity}</td>
                              <td className="text-center">{ingredient.unit}</td>
                              <td className="text-center">${ingredient.unitCost}</td>
                              <td className="text-center font-bold text-green-600">${ingredient.totalCost}</td>
                              <td className="text-center">
                                <Button size="sm" variant="ghost">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ChefHat className="h-12 w-12 mx-auto mb-2" />
                      <p>No hay ingredientes registrados</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Proceso de Preparación */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5 text-green-600" />
                      Proceso de Preparación
                    </div>
                    <Dialog open={preparationModalOpen} onOpenChange={setPreparationModalOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Paso
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {preparation.length > 0 ? (
                    <div className="space-y-4">
                      {preparation.map((step: ProductPreparation) => (
                        <div key={step.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {step.stepNumber}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-green-800">{step.title}</h4>
                            <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                            {step.duration > 0 && (
                              <Badge variant="secondary" className="mt-2 text-xs">
                                {step.duration} min
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ChefHat className="h-12 w-12 mx-auto mb-2" />
                      <p>No hay proceso de preparación definido</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="lg:col-span-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calculator className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium text-gray-600 mb-2">Selecciona un producto</h3>
                <p className="text-gray-500 text-center">
                  Elige un producto de la lista para ver su análisis detallado de costos, 
                  ingredientes y proceso de preparación.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal de Configuración de Costos */}
      <Dialog open={costModalOpen} onOpenChange={setCostModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurar Análisis de Costos</DialogTitle>
          </DialogHeader>
          <Form {...costForm}>
            <form onSubmit={costForm.handleSubmit(onSubmitCost)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={costForm.control}
                  name="materialCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo de Materiales</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="laborCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo de Mano de Obra</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="overheadCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gastos Generales</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="packagingCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo de Empaque</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="shippingCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo de Envío</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="otherCosts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Otros Costos</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={costForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Notas adicionales sobre los costos..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCostModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createCostMutation.isPending}>
                  {createCostMutation.isPending ? 'Guardando...' : 'Guardar Costos'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Agregar Ingrediente */}
      <Dialog open={ingredientModalOpen} onOpenChange={setIngredientModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar Ingrediente</DialogTitle>
          </DialogHeader>
          <Form {...ingredientForm}>
            <form onSubmit={ingredientForm.handleSubmit(onSubmitIngredient)} className="space-y-4">
              <FormField
                control={ingredientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Ingrediente</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Carne de res, Cebolla, Aceite..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={ingredientForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.001" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={ingredientForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona unidad" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                            <SelectItem value="g">Gramos (g)</SelectItem>
                            <SelectItem value="l">Litros (l)</SelectItem>
                            <SelectItem value="ml">Mililitros (ml)</SelectItem>
                            <SelectItem value="pcs">Piezas (pcs)</SelectItem>
                            <SelectItem value="oz">Onzas (oz)</SelectItem>
                            <SelectItem value="lb">Libras (lb)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={ingredientForm.control}
                name="unitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo por Unidad</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ingredientForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ingredient">Ingrediente Principal</SelectItem>
                          <SelectItem value="seasoning">Condimento</SelectItem>
                          <SelectItem value="packaging">Empaque</SelectItem>
                          <SelectItem value="garnish">Guarnición</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={ingredientForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Notas sobre el ingrediente..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIngredientModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createIngredientMutation.isPending}>
                  {createIngredientMutation.isPending ? 'Agregando...' : 'Agregar Ingrediente'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Información Nutricional */}
      <Dialog open={nutritionModalOpen} onOpenChange={setNutritionModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Información Nutricional</DialogTitle>
          </DialogHeader>
          <Form {...nutritionForm}>
            <form onSubmit={nutritionForm.handleSubmit(onSubmitNutrition)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={nutritionForm.control}
                  name="calories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calorías</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={nutritionForm.control}
                  name="protein"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proteínas (g)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={nutritionForm.control}
                  name="carbs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carbohidratos (g)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={nutritionForm.control}
                  name="fat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grasas (g)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={nutritionForm.control}
                  name="fiber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fibra (g)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={nutritionForm.control}
                  name="sugar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Azúcar (g)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={nutritionForm.control}
                  name="sodium"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sodio (mg)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={nutritionForm.control}
                  name="servingSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamaño de Porción</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="100g" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={nutritionForm.control}
                name="additionalInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Información Adicional (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Ingredientes alergénicos, información especial..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setNutritionModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createNutritionMutation.isPending}>
                  {createNutritionMutation.isPending ? 'Guardando...' : 'Guardar Información'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Proceso de Preparación */}
      <Dialog open={preparationModalOpen} onOpenChange={setPreparationModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Paso de Preparación</DialogTitle>
          </DialogHeader>
          <Form {...preparationForm}>
            <form onSubmit={preparationForm.handleSubmit(onSubmitPreparation)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={preparationForm.control}
                  name="stepNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Paso</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={preparationForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración (minutos)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={preparationForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título del Paso</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Preparar la carne, Calentar el aceite..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={preparationForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Descripción detallada del paso..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={preparationForm.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperatura (°C) - Opcional</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={preparationForm.control}
                  name="equipment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipo - Opcional</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: Plancha, Horno, Sartén..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={preparationForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas - Opcional</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Notas adicionales sobre el paso..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setPreparationModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createPreparationMutation.isPending}>
                  {createPreparationMutation.isPending ? 'Agregando...' : 'Agregar Paso'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}