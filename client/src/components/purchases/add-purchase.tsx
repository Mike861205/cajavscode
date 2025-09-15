import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Trash2, 
  Package, 
  Calendar,
  Building2,
  Calculator,
  Truck,
  Receipt
} from "lucide-react";

// Schemas
const purchaseSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  supplierId: z.number().min(1, "Debe seleccionar un proveedor"),
  warehouseId: z.number().min(1, "Debe seleccionar un almacén"),
  status: z.enum(["pending", "received"], {
    required_error: "Debe seleccionar un estado"
  }),
  shippingCost: z.number().min(0, "El costo de envío debe ser positivo").optional(),
  notes: z.string().optional(),
  hasGlobalTax: z.boolean().default(false),
  globalTaxRate: z.number().min(0).max(100).optional()
});

// Types
interface CartItem {
  id: number;
  name: string;
  baseCost: number;
  purchaseCost: number;
  quantity: number;
  hasTax: boolean;
  taxRate: number;
  total: number;
}

interface Product {
  id: number;
  name: string;
  cost: string;
  stock: number;
  sku: string;
}

interface Supplier {
  id: number;
  name: string;
  email: string;
  phone: string;
}

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export default function AddPurchase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productQuantity, setProductQuantity] = useState(0.01);
  const [productCostMarkup, setProductCostMarkup] = useState(0);
  const [productHasTax, setProductHasTax] = useState(false);
  const [productTaxRate, setProductTaxRate] = useState(16);
  
  const { formatCurrency } = useSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      status: "pending",
      shippingCost: 0,
      hasGlobalTax: false,
      globalTaxRate: 16
    }
  });

  // Fetch products for search
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch suppliers
  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Fetch warehouses
  const { data: warehouses } = useQuery<any[]>({
    queryKey: ["/api/warehouses"],
  });

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!products || !searchTerm) return [];
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  }, [products, searchTerm]);

  // Calculate totals
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.purchaseCost * item.quantity), 0);
    const taxAmount = cart.reduce((sum, item) => {
      if (item.hasTax) {
        return sum + (item.purchaseCost * item.quantity * item.taxRate / 100);
      }
      return sum;
    }, 0);
    const shippingCost = form.watch("shippingCost") || 0;
    const total = subtotal + taxAmount + shippingCost;

    return {
      subtotal,
      taxAmount,
      shippingCost,
      total
    };
  }, [cart, form.watch("shippingCost")]);

  // Add product to cart
  const addToCart = () => {
    if (!selectedProduct) return;

    const baseCost = parseFloat(selectedProduct.cost);
    const markupAmount = baseCost * (productCostMarkup / 100);
    const purchaseCost = baseCost + markupAmount;
    const total = purchaseCost * productQuantity;

    const existingItem = cart.find(item => item.id === selectedProduct.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === selectedProduct.id 
          ? { 
              ...item, 
              quantity: item.quantity + productQuantity,
              total: (item.quantity + productQuantity) * item.purchaseCost
            }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: selectedProduct.id,
        name: selectedProduct.name,
        baseCost,
        purchaseCost,
        quantity: productQuantity,
        hasTax: productHasTax,
        taxRate: productTaxRate,
        total
      };
      setCart([...cart, newItem]);
    }

    // Reset form
    setSelectedProduct(null);
    setSearchTerm("");
    setProductQuantity(0.01);
    setProductCostMarkup(0);
    setProductHasTax(false);
    setProductTaxRate(16);
  };

  // Remove item from cart
  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  // Update cart item quantity
  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => 
      item.id === productId 
        ? { ...item, quantity, total: quantity * item.purchaseCost }
        : item
    ));
  };

  // Create purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const purchaseData = {
        purchase: {
          date: data.date,
          supplierId: data.supplierId,
          warehouseId: data.warehouseId,
          status: data.status,
          shippingCost: data.shippingCost || 0,
          notes: data.notes || "",
          total: cartTotals.total.toFixed(2),
          subtotal: cartTotals.subtotal.toFixed(2),
          tax: cartTotals.taxAmount.toFixed(2)
        },
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.purchaseCost.toFixed(2),
          total: (item.purchaseCost * item.quantity).toFixed(2)
        }))
      };

      console.log("Creating purchase:", JSON.stringify(purchaseData, null, 2));
      const response = await apiRequest("POST", "/api/purchases", purchaseData);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Compra creada exitosamente",
        description: `La compra ha sido registrada con ID: ${data.id}`,
      });
      
      // Reset form and cart
      form.reset({
        date: new Date().toISOString().split('T')[0],
        status: "pending",
        shippingCost: 0,
        hasGlobalTax: false,
        globalTaxRate: 16
      });
      setCart([]);
      setSelectedProduct(null);
      setSearchTerm("");
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      console.error("Purchase creation error:", error);
      toast({
        title: "Error al crear compra",
        description: error.message || "No se pudo crear la compra",
        variant: "destructive",
      });
    },
  });

  // Form submit handler
  const onSubmit = (data: PurchaseFormData) => {
    if (cart.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Debe agregar al menos un producto al carrito",
        variant: "destructive",
      });
      return;
    }

    if (!data.supplierId) {
      toast({
        title: "Proveedor requerido",
        description: "Debe seleccionar un proveedor",
        variant: "destructive",
      });
      return;
    }

    if (!data.warehouseId) {
      toast({
        title: "Almacén requerido", 
        description: "Debe seleccionar un almacén",
        variant: "destructive",
      });
      return;
    }

    createPurchaseMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Añadir Compra</h1>
          <p className="text-gray-600 mt-1">Registra una nueva compra de productos</p>
        </div>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-blue-600" />
          <span className="text-sm text-gray-600">Total: ${cartTotals.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Purchase Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Información de Compra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proveedor</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un proveedor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers?.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="warehouseId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Almacén
                          </FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un almacén" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {warehouses?.map((warehouse) => (
                                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                  {warehouse.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pendiente</SelectItem>
                              <SelectItem value="received">Recibido</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shippingCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo de Envío</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Product Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                Buscar Productos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Search Results */}
              {filteredProducts.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${parseFloat(product.cost).toFixed(2)}</p>
                          <p className="text-sm text-gray-600">Stock: {product.stock}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Product Configuration */}
              {selectedProduct && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {selectedProduct.name}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={productQuantity}
                        onChange={(e) => setProductQuantity(parseFloat(e.target.value) || 0.01)}
                      />
                    </div>
                    
                    <div>
                      <Label>Sobrecosto (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productCostMarkup}
                        onChange={(e) => setProductCostMarkup(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="product-tax"
                        checked={productHasTax}
                        onCheckedChange={(checked) => setProductHasTax(checked === true)}
                      />
                      <Label htmlFor="product-tax">Aplicar IVA</Label>
                    </div>
                    
                    {productHasTax && (
                      <div className="flex items-center space-x-2">
                        <Label>IVA (%):</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={productTaxRate}
                          onChange={(e) => setProductTaxRate(parseFloat(e.target.value) || 16)}
                          className="w-20"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-gray-600">
                        Costo base: ${parseFloat(selectedProduct.cost).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Costo final: ${(parseFloat(selectedProduct.cost) * (1 + productCostMarkup / 100)).toFixed(2)}
                      </p>
                    </div>
                    <Button onClick={addToCart} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar al Carrito
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Shopping Cart */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                Carrito de Compras
                <Badge variant="secondary">{cart.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>El carrito está vacío</p>
                  <p className="text-sm">Busca y agrega productos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Cantidad:</span>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateCartQuantity(item.id, parseFloat(e.target.value) || 0.01)}
                            className="w-20 h-8"
                          />
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Costo unitario:</span>
                          <span>${item.purchaseCost.toFixed(2)}</span>
                        </div>
                        
                        {item.hasTax && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">IVA ({item.taxRate}%):</span>
                            <span>${(item.purchaseCost * item.quantity * item.taxRate / 100).toFixed(2)}</span>
                          </div>
                        )}
                        
                        <Separator />
                        
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>${(item.purchaseCost * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${cartTotals.subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>IVA:</span>
                  <span>${cartTotals.taxAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Envío:</span>
                  <span>${cartTotals.shippingCost.toFixed(2)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${cartTotals.total.toFixed(2)}</span>
                </div>
                
                <Button 
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={createPurchaseMutation.isPending || cart.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {createPurchaseMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Receipt className="h-4 w-4 mr-2" />
                      Guardar Compra
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}