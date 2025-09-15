import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Star, 
  ShoppingBag,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Truck,
  ChevronRight,
  Search
} from "lucide-react";
import type { StoreSettings, Product } from "@shared/schema";
import WhatsAppFloat from "@/components/store/WhatsAppFloat";

interface StoreData {
  store: StoreSettings;
  products: Product[];
}

interface CartItem {
  productId: number;
  productName: string;
  productSku?: string;
  unitPrice: string;
  quantity: number;
  total: string;
}

interface StoreCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
}

export default function StoreFrontend() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerData, setCustomerData] = useState<StoreCustomer>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    shippingAddress: "",
    shippingCity: "",
    shippingState: "",
    shippingZipCode: "",
    shippingCountry: "MX"
  });

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [shippingMethod, setShippingMethod] = useState("pickup");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Función para actualizar el favicon dinámicamente
  const updateFavicon = (faviconUrl?: string) => {
    if (!faviconUrl) return;
    
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = faviconUrl;
    document.getElementsByTagName('head')[0].appendChild(link);
  };

  // Función para actualizar el título de la página
  const updatePageTitle = (storeName: string, storeDescription?: string) => {
    document.title = storeDescription 
      ? `${storeName} - ${storeDescription}`
      : storeName;
  };

  // Fetch store data
  const { data: storeData, isLoading, error } = useQuery<StoreData>({
    queryKey: [`/api/store/${subdomain}`],
    enabled: !!subdomain,
  });

  // Extraer datos de la tienda
  const store = storeData?.store;
  const products = storeData?.products || [];

  // Actualizar favicon y título cuando se carga la tienda
  useEffect(() => {
    if (store) {
      if (store.favicon) {
        updateFavicon(store.favicon);
      }
      updatePageTitle(store.storeName, store.storeDescription || undefined);
    }
  }, [store]);

  // Filtrar productos por búsqueda y categoría
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === "" || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || 
      product.categoryName?.toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  // Obtener categorías únicas de los productos
  const categories = ["all", ...Array.from(new Set(products.map(p => p.categoryName).filter(Boolean)))];

  // Estilos personalizables
  const customStyles = {
    '--primary-color': store?.primaryColor || '#3b82f6',
    '--secondary-color': store?.secondaryColor || '#64748b',
  } as React.CSSProperties;

  const addToCart = (product: Product) => {
    const unitPrice = typeof product.price === 'string' ? product.price : (product.price as number).toString();
    
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.productId === product.id);
      
      if (existingItem) {
        return currentCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (parseFloat(item.unitPrice) * (item.quantity + 1)).toFixed(2) }
            : item
        );
      }
      
      return [...currentCart, {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitPrice,
        quantity: 1,
        total: unitPrice
      }];
    });

    toast({
      title: "Producto agregado",
      description: `${product.name} agregado al carrito`,
    });
  };

  const updateCartItemQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(currentCart => currentCart.filter(item => item.productId !== productId));
      return;
    }

    setCart(currentCart =>
      currentCart.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity, total: (parseFloat(item.unitPrice) * newQuantity).toFixed(2) }
          : item
      )
    );
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + parseFloat(item.total), 0).toFixed(2);
  };

  const getCartItemsCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos al carrito antes de proceder",
        variant: "destructive"
      });
      return;
    }

    // Validar datos requeridos
    if (!customerData.firstName || !customerData.lastName || !customerData.email) {
      toast({
        title: "Datos incompletos",
        description: "Por favor completa nombre, apellido y email",
        variant: "destructive"
      });
      return;
    }

    if (!selectedPaymentMethod) {
      toast({
        title: "Método de pago requerido",
        description: "Selecciona un método de pago para continuar",
        variant: "destructive"
      });
      return;
    }

    // Si es envío, validar dirección
    if (shippingMethod === "delivery" && !customerData.shippingAddress) {
      toast({
        title: "Dirección requerida",
        description: "Proporciona una dirección para el envío",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("🛒 Iniciando checkout...");
      console.log("🏪 Subdomain:", subdomain);
      console.log("📦 Cart:", cart);

      const orderData = {
        customer: customerData,
        items: cart,
        totals: {
          subtotal: getCartTotal(),
          tax: "0",
          shipping: shippingMethod === "delivery" ? "50" : "0",
          discount: "0",
          total: shippingMethod === "delivery" 
            ? (parseFloat(getCartTotal()) + 50).toFixed(2) 
            : getCartTotal()
        },
        paymentMethod: selectedPaymentMethod,
        shippingMethod: shippingMethod
      };

      console.log("📋 Order data:", orderData);

      const response = await fetch(`/store/${subdomain}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      console.log("📡 Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Error response text:", errorText);
        
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || "Error al procesar la orden";
        } catch (e) {
          errorMessage = errorText || "Error al procesar la orden";
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Show success message with order details
      toast({
        title: "¡Pedido creado con éxito!",
        description: `Tu número de pedido es: ${result.orderNumber}. Total: $${orderData.totals.total}`,
      });

      // Clear cart and close checkout
      setCart([]);
      setIsCheckoutOpen(false);
      
      // Reset form
      setCustomerData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        shippingAddress: "",
        shippingCity: "",
        shippingState: "",
        shippingZipCode: "",
        shippingCountry: "MX"
      });
      setSelectedPaymentMethod("");
      setShippingMethod("pickup");

      // Redirect to WhatsApp for order confirmation
      if (result.whatsappNumber && result.whatsappMessage) {
        setTimeout(() => {
          const whatsappUrl = `https://wa.me/${result.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(result.whatsappMessage)}`;
          window.open(whatsappUrl, '_blank');
        }, 2000); // Wait 2 seconds for user to see success message
      }
      
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: error.message || "Error al procesar el pedido",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tienda no encontrada</h1>
          <p className="text-gray-600">La tienda que buscas no está disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 relative"
      style={{
        backgroundImage: store?.storeBackgroundImage ? `url(${store.storeBackgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay de transparencia para la imagen de fondo */}
      {store?.storeBackgroundImage && (
        <div 
          className="fixed inset-0 bg-white pointer-events-none z-0"
          style={{
            opacity: store?.backgroundOpacity ? (100 - store.backgroundOpacity) / 100 : 0.2
          }}
        />
      )}

      {/* Contenido principal con z-index superior */}
      <div className="relative z-10">
      {/* Header Moderno */}
      <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50" style={customStyles}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Header */}
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              {store?.storeLogo && (
                <div className="relative">
                  <img 
                    src={store.storeLogo} 
                    alt={store.storeName} 
                    className="h-12 w-12 object-contain rounded-xl shadow-sm ring-2 ring-gray-100"
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {store?.storeName}
                </h1>
                {store?.storeDescription && (
                  <p className="text-sm text-gray-600 hidden sm:block font-medium">
                    {store.storeDescription}
                  </p>
                )}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCheckoutOpen(true)}
              className="relative bg-white/80 backdrop-blur border-gray-200 hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md"
              style={{ 
                borderColor: 'var(--primary-color)', 
                color: 'var(--primary-color)' 
              }}
            >
              <ShoppingBag className="h-5 w-5 mr-2" />
              <span className="font-medium">Carrito</span>
              {getCartItemsCount() > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 text-xs font-bold bg-gradient-to-r from-red-500 to-red-600 border-2 border-white shadow-md"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  {getCartItemsCount()}
                </Badge>
              )}
            </Button>
          </div>

          {/* Search and Filter Bar */}
          <div className="py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>

              {/* Category Filter */}
              <div className="w-full sm:w-48">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.slice(1).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section Moderno */}
      <section 
        className="relative overflow-hidden h-80 lg:h-96"
        style={{
          background: store?.storeBanner 
            ? `url(${store.storeBanner})` 
            : `linear-gradient(135deg, ${store?.primaryColor || '#3b82f6'} 0%, ${store?.secondaryColor || '#64748b'} 100%)`
        }}
      >
        {/* Elementos decorativos de fondo */}
        {!store?.storeBanner && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-8 -left-8 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          </div>
        )}
        
        {/* Overlay para mejorar legibilidad */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center text-center text-white">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent leading-tight">
              {store?.storeName}
            </h2>
            {store?.storeDescription && (
              <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                {store.storeDescription}
              </p>
            )}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Button 
                size="lg" 
                className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-8 py-4"
                onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Ver Productos
              </Button>
              {store?.whatsappNumber && (
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-2 border-white text-white hover:bg-white hover:text-gray-900 transition-all duration-300 text-lg px-8 py-4"
                  onClick={() => window.open(`https://wa.me/${store.whatsappNumber.replace(/[^0-9]/g, '')}`)}
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Contactar
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Elemento decorativo inferior */}
        <div className="absolute bottom-0 w-full h-4 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" id="products-section">
        {/* Título de sección */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Nuestros Productos
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gray-900 to-transparent mx-auto"></div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No hay productos disponibles</h3>
            <p className="text-lg text-gray-500 max-w-md mx-auto">
              La tienda aún no tiene productos para mostrar. Regresa pronto para ver nuestro catálogo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur border-0 shadow-md">
                <CardHeader className="pb-4">
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl mb-4 flex items-center justify-center group-hover:from-gray-100 group-hover:to-gray-200 transition-all duration-300 overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) => {
                          // Si la imagen falla al cargar, mostrar el placeholder
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const placeholder = target.nextElementSibling as HTMLElement;
                          if (placeholder) {
                            placeholder.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-full h-full flex items-center justify-center ${product.imageUrl ? 'hidden' : 'flex'}`}
                      style={{ display: product.imageUrl ? 'none' : 'flex' }}
                    >
                      <ShoppingBag className="h-16 w-16 text-gray-400 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {product.name}
                  </CardTitle>
                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{product.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                      ${typeof product.price === 'string' ? product.price : (product.price as number).toFixed(2)}
                    </div>
                    <Button 
                      onClick={() => addToCart(product)} 
                      className="w-full bg-gradient-to-r hover:shadow-lg transition-all duration-300 text-white font-semibold py-2.5"
                      style={{ 
                        background: `linear-gradient(135deg, ${store?.primaryColor || '#3b82f6'} 0%, ${store?.secondaryColor || '#64748b'} 100%)` 
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar al Carrito
                    </Button>
                  </div>
                  {product.sku && (
                    <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar Compra</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Cart Summary */}
            <div>
              <h3 className="font-medium mb-3">Resumen del Pedido</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between py-2 border-b">
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-gray-600">${item.unitPrice} c/u</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="w-16 text-right font-medium">${item.total}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-lg font-bold text-green-600">${getCartTotal()}</span>
              </div>
            </div>

            {/* Customer Information */}
            <div>
              <h3 className="font-medium mb-3">Información de Contacto</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input
                    id="firstName"
                    value={customerData.firstName}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Apellido *</Label>
                  <Input
                    id="lastName"
                    value={customerData.lastName}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerData.email}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            <div>
              <h3 className="font-medium mb-3">Información de Entrega</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Dirección *</Label>
                  <Textarea
                    id="address"
                    value={customerData.shippingAddress}
                    onChange={(e) => setCustomerData(prev => ({ ...prev, shippingAddress: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Ciudad *</Label>
                    <Input
                      id="city"
                      value={customerData.shippingCity}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, shippingCity: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      value={customerData.shippingState}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, shippingState: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">Código Postal *</Label>
                    <Input
                      id="zipCode"
                      value={customerData.shippingZipCode}
                      onChange={(e) => setCustomerData(prev => ({ ...prev, shippingZipCode: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Method */}
            <div>
              <h3 className="font-medium mb-3">Método de Entrega</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="pickup"
                    name="shippingMethod"
                    value="pickup"
                    checked={shippingMethod === "pickup"}
                    onChange={(e) => setShippingMethod(e.target.value)}
                    className="text-blue-600"
                  />
                  <Label htmlFor="pickup" className="flex items-center cursor-pointer">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Recoger en tienda - Gratis
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="delivery"
                    name="shippingMethod"
                    value="delivery"
                    checked={shippingMethod === "delivery"}
                    onChange={(e) => setShippingMethod(e.target.value)}
                    className="text-blue-600"
                  />
                  <Label htmlFor="delivery" className="flex items-center cursor-pointer">
                    <Truck className="h-4 w-4 mr-2" />
                    Envío a domicilio - $50.00
                  </Label>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <h3 className="font-medium mb-3">Método de Pago *</h3>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona método de pago" />
                </SelectTrigger>
                <SelectContent>
                  {store?.bankTransferEnabled && (
                    <SelectItem value="transferencia">
                      <div className="flex items-center">
                        <span className="mr-2">🏦</span>
                        Transferencia Bancaria
                      </div>
                    </SelectItem>
                  )}
                  {store?.stripeEnabled && (
                    <SelectItem value="stripe">
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Stripe
                      </div>
                    </SelectItem>
                  )}
                  {store?.paypalEnabled && (
                    <SelectItem value="paypal">
                      <div className="flex items-center">
                        <span className="mr-2">🅿️</span>
                        PayPal
                      </div>
                    </SelectItem>
                  )}
                  {store?.mercadopagoEnabled && (
                    <SelectItem value="mercadopago">
                      <div className="flex items-center">
                        <span className="mr-2">💳</span>
                        Mercado Pago
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Show bank transfer details when selected */}
              {selectedPaymentMethod === "transferencia" && store?.bankTransferEnabled && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Datos para Transferencia</h4>
                  <div className="space-y-2 text-sm">
                    {store.bankName && (
                      <div>
                        <span className="font-medium text-blue-800">Banco:</span>
                        <span className="ml-2 text-blue-700">{store.bankName}</span>
                      </div>
                    )}
                    {store.bankAccountNumber && (
                      <div>
                        <span className="font-medium text-blue-800">Cuenta:</span>
                        <span className="ml-2 text-blue-700 font-mono">{store.bankAccountNumber}</span>
                      </div>
                    )}
                    {store.bankAccountHolder && (
                      <div>
                        <span className="font-medium text-blue-800">Titular:</span>
                        <span className="ml-2 text-blue-700">{store.bankAccountHolder}</span>
                      </div>
                    )}
                    <div className="text-xs text-blue-600 mt-3">
                      💡 Realiza la transferencia y guarda tu comprobante. El pedido será procesado una vez confirmemos el pago.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Total with shipping */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span>Subtotal:</span>
                <span>${getCartTotal()}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span>Envío:</span>
                <span>${shippingMethod === "delivery" ? "50.00" : "0.00"}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-lg font-bold text-green-600">
                  ${shippingMethod === "delivery" 
                    ? (parseFloat(getCartTotal()) + 50).toFixed(2) 
                    : getCartTotal()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="flex-1">
                Continuar Comprando
              </Button>
              <Button onClick={handleCheckout} className="flex-1">
                <CreditCard className="h-4 w-4 mr-2" />
                Realizar Pedido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Contacto</h3>
              <div className="space-y-2 text-sm text-gray-600">
                {store?.contactEmail && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    {store.contactEmail}
                  </div>
                )}
                {store?.contactPhone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {store.contactPhone}
                  </div>
                )}
                {store?.storeAddress && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {store.storeAddress}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Métodos de Pago</h3>
              <div className="text-sm text-gray-600">
                {store?.stripeEnabled && <p>• Tarjetas de crédito/débito</p>}
                {store?.paypalEnabled && <p>• PayPal</p>}
                {store?.mercadopagoEnabled && <p>• MercadoPago</p>}
                {store?.bankTransferEnabled && <p>• Transferencia bancaria</p>}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-4">Entrega</h3>
              <div className="text-sm text-gray-600">
                <p>• Retiro en tienda</p>
                <p>• Entrega local</p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Flotante */}
      {store?.whatsappEnabled && store?.whatsappNumber && (
        <WhatsAppFloat
          phoneNumber={store.whatsappNumber}
          message={store.whatsappMessage || '¡Hola! Me interesa conocer más sobre sus productos.'}
          storeName={store.storeName}
        />
      )}
      
      {/* Cierre del contenido principal */}
      </div>
    </div>
  );
}