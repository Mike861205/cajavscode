import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Store, 
  Settings, 
  CreditCard, 
  Building, 
  Globe, 
  Phone, 
  Mail,
  Save,
  Eye,
  Link,
  MessageCircle,
  Palette,
  Upload,
  Image,
  Loader2,
  Package,
  ToggleLeft,
  ToggleRight,
  ShoppingCart,
  DollarSign
} from "lucide-react";
import type { StoreSettings } from "@shared/schema";

// Componente para gestión de productos de la tienda
function ProductsManagement() {
  const { toast } = useToast();
  
  // Query para obtener productos
  const { data: storeProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/store-products"],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Query para obtener categorías
  const { data: storeCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/store-categories"],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutation para toggle de producto
  const toggleProductMutation = useMutation({
    mutationFn: async ({ productId, isActive }: { productId: number, isActive: boolean }) => {
      const response = await apiRequest("POST", `/api/store-products/${productId}/toggle`, { isActive });
      if (!response.ok) {
        throw new Error("Failed to toggle product");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store-products"] });
      toast({
        title: "Producto actualizado",
        description: "El estado del producto se ha actualizado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el producto",
        variant: "destructive",
      });
    },
  });

  // Mutation para toggle de categoría
  const toggleCategoryMutation = useMutation({
    mutationFn: async ({ categoryName, isActive }: { categoryName: string, isActive: boolean }) => {
      const response = await apiRequest("POST", `/api/store-categories/${encodeURIComponent(categoryName)}/toggle`, { isActive });
      if (!response.ok) {
        throw new Error("Failed to toggle category");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/store-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/store-products"] });
      toast({
        title: "Categoría actualizada",
        description: "El estado de la categoría se ha actualizado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría",
        variant: "destructive",
      });
    },
  });

  const handleToggleProduct = (productId: number, isActive: boolean) => {
    toggleProductMutation.mutate({ productId, isActive });
  };

  const handleToggleCategory = (categoryName: string, isActive: boolean) => {
    toggleCategoryMutation.mutate({ categoryName, isActive });
  };

  if (productsLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Categorías */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Gestión de Categorías</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
            <p className="text-sm text-blue-800">
              <strong>Gestión de Categorías:</strong> Activa o desactiva categorías completas de productos. 
              Al desactivar una categoría, todos los productos de esa categoría se desactivarán automáticamente.
            </p>
          </div>

          <div className="space-y-4">
            {Array.isArray(storeCategories) && storeCategories.length > 0 ? (
              storeCategories.map((category: any) => (
                <div key={category.categoryName} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Package className="h-5 w-5 text-gray-500" />
                    <div>
                      <h3 className="font-medium">{category.categoryName}</h3>
                      <p className="text-sm text-gray-500">Categoría de productos</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={category.isActive ? "default" : "secondary"}>
                      {category.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                    <Button
                      variant={category.isActive ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleCategory(category.categoryName, !category.isActive)}
                      disabled={toggleCategoryMutation.isPending}
                    >
                      {category.isActive ? (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2" />
                          Activar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay categorías disponibles</p>
                <p className="text-sm">Crea productos con categorías en el sistema para comenzar</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Productos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <span>Gestión de Productos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
            <p className="text-sm text-green-800">
              <strong>Gestión de Productos:</strong> Selecciona qué productos aparecerán en tu tienda online. 
              Solo los productos activados serán visibles para tus clientes.
            </p>
          </div>

          <div className="space-y-4">
            {Array.isArray(storeProducts) && storeProducts.length > 0 ? (
              storeProducts.map((product: any) => (
                <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ShoppingCart className="h-5 w-5 text-gray-500" />
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>SKU: {product.sku}</span>
                        <span>Categoría: {product.category || 'Sin categoría'}</span>
                        <span className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ${parseFloat(product.price || '0').toFixed(2)}
                        </span>
                        <span>Stock: {parseFloat(product.totalStock || '0').toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={product.isActiveInStore ? "default" : "secondary"}>
                      {product.isActiveInStore ? "Activo" : "Inactivo"}
                    </Badge>
                    <Button
                      variant={product.isActiveInStore ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleProduct(product.id, !product.isActiveInStore)}
                      disabled={toggleProductMutation.isPending}
                    >
                      {product.isActiveInStore ? (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2" />
                          Activar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay productos disponibles</p>
                <p className="text-sm">Crea productos en el sistema para comenzar a vender en tu tienda</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StoreSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Referencias para inputs de archivo
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  
  // Estados de upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  // Función para subir imagen
  const uploadImage = async (file: File, setUploading: (loading: boolean) => void, field: keyof StoreSettings) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error uploading image');
      }

      const result = await response.json();
      
      // Actualizar el campo correspondiente en el formulario
      handleInputChange(field, result.imageUrl || result.url);
      
      toast({
        title: "Imagen subida exitosamente",
        description: "La imagen se ha subido correctamente a tu tienda.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error al subir imagen",
        description: "No se pudo subir la imagen. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Funciones específicas para cada tipo de imagen
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        toast({
          title: "Archivo muy grande",
          description: "El archivo debe ser menor a 5MB.",
          variant: "destructive",
        });
        return;
      }
      uploadImage(file, setUploadingLogo, 'storeLogo');
    }
  };

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        toast({
          title: "Archivo muy grande",
          description: "El archivo debe ser menor a 5MB.",
          variant: "destructive",
        });
        return;
      }
      uploadImage(file, setUploadingBanner, 'storeBanner');
    }
  };

  const handleBackgroundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        toast({
          title: "Archivo muy grande",
          description: "El archivo debe ser menor a 5MB.",
          variant: "destructive",
        });
        return;
      }
      uploadImage(file, setUploadingBackground, 'storeBackgroundImage');
    }
  };

  // Obtener configuración de tienda actual
  const { data: storeSettings, isLoading } = useQuery<StoreSettings>({
    queryKey: ["/api/store/settings"],
    enabled: !!user,
  });

  const [formData, setFormData] = useState<Partial<StoreSettings>>({
    storeName: "",
    storeSubdomain: "",
    customDomain: "",
    storeDescription: "",
    isActive: true,
    allowOnlineOrders: true,
    stripeEnabled: false,
    paypalEnabled: false,
    mercadopagoEnabled: false,
    bankTransferEnabled: true,
    contactEmail: "",
    contactPhone: "",
    storeAddress: "",
    // WhatsApp
    whatsappEnabled: false,
    whatsappNumber: "",
    whatsappMessage: "¡Hola! Me interesa conocer más sobre sus productos.",
    // Diseño
    storeLogo: "",
    storeBanner: "",
    storeBackgroundImage: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#64748b",
    backgroundOpacity: 80,
    favicon: "",
    showBrandOnFavicon: true,
    ...storeSettings,
  });

  // Actualizar form cuando lleguen los datos
  useEffect(() => {
    if (storeSettings) {
      setFormData(prev => ({ ...prev, ...storeSettings }));
    }
  }, [storeSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<StoreSettings>) => {
      const response = await apiRequest("POST", "/api/store/settings", data);
      if (!response.ok) {
        throw new Error("Failed to update store settings");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuración guardada",
        description: "La configuración de tu tienda se ha actualizado correctamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/store/settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof StoreSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateSubdomain = () => {
    const name = formData.storeName?.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20) || '';
    handleInputChange('storeSubdomain', name);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const storeUrl = formData.storeSubdomain ? 
    `${window.location.origin}/store/${formData.storeSubdomain}` : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Configuración de Tienda
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configura tu tienda online para vender productos a través de internet
          </p>
        </div>
        
        {formData.storeSubdomain && (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Globe className="h-3 w-3 mr-1" />
              Tienda Activa
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-2" />
                Ver Tienda
              </a>
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">
              <Store className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="design">
              <Palette className="h-4 w-4 mr-2" />
              Diseño
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="products">
              <Store className="h-4 w-4 mr-2" />
              Productos
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="h-4 w-4 mr-2" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="contact">
              <Building className="h-4 w-4 mr-2" />
              Contacto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Información General</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Nombre de la Tienda *</Label>
                    <Input
                      id="storeName"
                      value={formData.storeName || ''}
                      onChange={(e) => handleInputChange('storeName', e.target.value)}
                      placeholder="Ej: Daddy Pollo"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="storeSubdomain">Subdominio *</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="storeSubdomain"
                        value={formData.storeSubdomain || ''}
                        onChange={(e) => handleInputChange('storeSubdomain', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                        placeholder="daddypollo"
                        required
                      />
                      <Button type="button" variant="outline" onClick={generateSubdomain}>
                        <Link className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.storeSubdomain && (
                      <p className="text-sm text-gray-600">
                        Tu tienda estará disponible en: <strong>{storeUrl}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customDomain">Dominio Personalizado (Opcional)</Label>
                  <Input
                    id="customDomain"
                    value={formData.customDomain || ''}
                    onChange={(e) => handleInputChange('customDomain', e.target.value)}
                    placeholder="Ej: www.daddypollo.com"
                  />
                  <p className="text-sm text-gray-500">
                    Si tienes un dominio propio, puedes configurarlo aquí para que apunte a tu tienda
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeDescription">Descripción de la Tienda</Label>
                  <Textarea
                    id="storeDescription"
                    value={formData.storeDescription || ''}
                    onChange={(e) => handleInputChange('storeDescription', e.target.value)}
                    placeholder="Describe tu tienda, productos y servicios..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Tienda Activa</h4>
                    <p className="text-sm text-gray-600">
                      Los clientes pueden ver y comprar productos en tu tienda
                    </p>
                  </div>
                  <Switch
                    checked={formData.isActive || false}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Permitir Pedidos Online</h4>
                    <p className="text-sm text-gray-600">
                      Los clientes pueden realizar pedidos y pagos online
                    </p>
                  </div>
                  <Switch
                    checked={formData.allowOnlineOrders || false}
                    onCheckedChange={(checked) => handleInputChange('allowOnlineOrders', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <div className="space-y-6">
              {/* Stripe */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-sm font-bold">S</span>
                    </div>
                    <span>Stripe</span>
                    <Switch
                      checked={formData.stripeEnabled || false}
                      onCheckedChange={(checked) => handleInputChange('stripeEnabled', checked)}
                    />
                  </CardTitle>
                </CardHeader>
                {formData.stripeEnabled && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="stripePublicKey">Clave Pública de Stripe</Label>
                      <Input
                        id="stripePublicKey"
                        value={formData.stripePublicKey || ''}
                        onChange={(e) => handleInputChange('stripePublicKey', e.target.value)}
                        placeholder="pk_..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stripeSecretKey">Clave Secreta de Stripe</Label>
                      <Input
                        id="stripeSecretKey"
                        type="password"
                        value={formData.stripeSecretKey || ''}
                        onChange={(e) => handleInputChange('stripeSecretKey', e.target.value)}
                        placeholder="sk_..."
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* PayPal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-800 rounded flex items-center justify-center">
                      <span className="text-white text-sm font-bold">P</span>
                    </div>
                    <span>PayPal</span>
                    <Switch
                      checked={formData.paypalEnabled || false}
                      onCheckedChange={(checked) => handleInputChange('paypalEnabled', checked)}
                    />
                  </CardTitle>
                </CardHeader>
                {formData.paypalEnabled && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="paypalClientId">Client ID de PayPal</Label>
                      <Input
                        id="paypalClientId"
                        value={formData.paypalClientId || ''}
                        onChange={(e) => handleInputChange('paypalClientId', e.target.value)}
                        placeholder="Tu Client ID de PayPal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paypalClientSecret">Client Secret de PayPal</Label>
                      <Input
                        id="paypalClientSecret"
                        type="password"
                        value={formData.paypalClientSecret || ''}
                        onChange={(e) => handleInputChange('paypalClientSecret', e.target.value)}
                        placeholder="Tu Client Secret de PayPal"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Transferencia Bancaria */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5" />
                    <span>Transferencia Bancaria</span>
                    <Switch
                      checked={formData.bankTransferEnabled || false}
                      onCheckedChange={(checked) => handleInputChange('bankTransferEnabled', checked)}
                    />
                  </CardTitle>
                </CardHeader>
                {formData.bankTransferEnabled && (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Nombre del Banco</Label>
                      <Input
                        id="bankName"
                        value={formData.bankName || ''}
                        onChange={(e) => handleInputChange('bankName', e.target.value)}
                        placeholder="Ej: BBVA México"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankAccountNumber">Número de Cuenta</Label>
                      <Input
                        id="bankAccountNumber"
                        value={formData.bankAccountNumber || ''}
                        onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                        placeholder="Número de cuenta"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bankAccountHolder">Titular de la Cuenta</Label>
                      <Input
                        id="bankAccountHolder"
                        value={formData.bankAccountHolder || ''}
                        onChange={(e) => handleInputChange('bankAccountHolder', e.target.value)}
                        placeholder="Nombre del titular"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="design">
            <div className="space-y-6">
              {/* Colores de la tienda */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="h-5 w-5" />
                    <span>Colores de la Tienda</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Color Primario</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={formData.primaryColor || '#3b82f6'}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          className="w-16 h-10"
                        />
                        <Input
                          value={formData.primaryColor || '#3b82f6'}
                          onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">Color Secundario</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="secondaryColor"
                          type="color"
                          value={formData.secondaryColor || '#64748b'}
                          onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                          className="w-16 h-10"
                        />
                        <Input
                          value={formData.secondaryColor || '#64748b'}
                          onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                          placeholder="#64748b"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Transparencia de Fondo */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Transparencia de Fondo de Imagen: {formData.backgroundOpacity || 80}%</Label>
                      <div className="px-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={formData.backgroundOpacity || 80}
                          onChange={(e) => handleInputChange('backgroundOpacity', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, ${formData.primaryColor || '#3b82f6'} 0%, ${formData.primaryColor || '#3b82f6'} ${formData.backgroundOpacity || 80}%, #e5e7eb ${formData.backgroundOpacity || 80}%, #e5e7eb 100%)`
                          }}
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        Ajusta la transparencia de la imagen de fondo de tu tienda (0% = totalmente transparente, 100% = totalmente opaco)
                      </p>
                    </div>
                  </div>

                  {/* Favicon Personalizado */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="favicon">Favicon Personalizado (Opcional)</Label>
                      <Input
                        id="favicon"
                        value={formData.favicon || ''}
                        onChange={(e) => handleInputChange('favicon', e.target.value)}
                        placeholder="https://ejemplo.com/mi-favicon.ico"
                      />
                      <p className="text-sm text-gray-500">
                        URL del favicon que aparecerá en la pestaña del navegador (formato .ico o .png recomendado, 16x16 o 32x32 px)
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium text-sm">Mostrar Marca en Favicon</h4>
                        <p className="text-xs text-gray-600">
                          Combinar tu favicon con la marca de la tienda
                        </p>
                      </div>
                      <Switch
                        checked={formData.showBrandOnFavicon ?? true}
                        onCheckedChange={(checked) => handleInputChange('showBrandOnFavicon', checked)}
                      />
                    </div>
                    
                    {formData.favicon && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium mb-2">Vista Previa del Favicon:</p>
                        <div className="flex items-center space-x-2">
                          <img 
                            src={formData.favicon} 
                            alt="Favicon preview" 
                            className="w-4 h-4"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <span className="text-sm text-gray-600">{formData.storeName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Imágenes de la tienda */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Image className="h-5 w-5" />
                    <span>Imágenes de la Tienda</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="storeLogo">Logo de la Tienda</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="storeLogo"
                        value={formData.storeLogo || ''}
                        onChange={(e) => handleInputChange('storeLogo', e.target.value)}
                        placeholder="URL del logo (recomendado: 200x200px)"
                      />
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {uploadingLogo ? 'Subiendo...' : 'Subir'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Recomendación: 200x200 píxeles, formato PNG o JPG (máx. 5MB)
                    </p>
                    {formData.storeLogo && (
                      <div className="mt-2">
                        <img 
                          src={formData.storeLogo} 
                          alt="Logo preview" 
                          className="w-16 h-16 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storeBanner">Banner Principal</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="storeBanner"
                        value={formData.storeBanner || ''}
                        onChange={(e) => handleInputChange('storeBanner', e.target.value)}
                        placeholder="URL del banner (recomendado: 1200x400px)"
                      />
                      <input
                        type="file"
                        ref={bannerInputRef}
                        onChange={handleBannerUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={uploadingBanner}
                      >
                        {uploadingBanner ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {uploadingBanner ? 'Subiendo...' : 'Subir'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Recomendación: 1200x400 píxeles para el banner principal (máx. 5MB)
                    </p>
                    {formData.storeBanner && (
                      <div className="mt-2">
                        <img 
                          src={formData.storeBanner} 
                          alt="Banner preview" 
                          className="w-32 h-12 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storeBackgroundImage">Imagen de Fondo</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="storeBackgroundImage"
                        value={formData.storeBackgroundImage || ''}
                        onChange={(e) => handleInputChange('storeBackgroundImage', e.target.value)}
                        placeholder="URL de la imagen de fondo (opcional)"
                      />
                      <input
                        type="file"
                        ref={backgroundInputRef}
                        onChange={handleBackgroundUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => backgroundInputRef.current?.click()}
                        disabled={uploadingBackground}
                      >
                        {uploadingBackground ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {uploadingBackground ? 'Subiendo...' : 'Subir'}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Opcional: Imagen de fondo para darle personalidad a tu tienda (máx. 5MB)
                    </p>
                    {formData.storeBackgroundImage && (
                      <div className="mt-2">
                        <img 
                          src={formData.storeBackgroundImage} 
                          alt="Background preview" 
                          className="w-32 h-20 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backgroundOpacity">Transparencia del Fondo (%)</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-4">
                        <input
                          id="backgroundOpacity"
                          type="range"
                          min="0"
                          max="100"
                          value={formData.backgroundOpacity || 80}
                          onChange={(e) => handleInputChange('backgroundOpacity', parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium min-w-[3rem]">
                          {formData.backgroundOpacity || 80}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Ajusta la transparencia del fondo (0% = transparente, 100% = opaco)
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="favicon">Favicon</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="favicon"
                        value={formData.favicon || ''}
                        onChange={(e) => handleInputChange('favicon', e.target.value)}
                        placeholder="URL del favicon (recomendado: 32x32px)"
                      />
                      <Button type="button" variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Subir
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Recomendación: 32x32 píxeles, formato ICO o PNG
                    </p>
                    {formData.favicon && (
                      <div className="mt-2">
                        <img 
                          src={formData.favicon} 
                          alt="Favicon preview" 
                          className="w-8 h-8 object-cover rounded border"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="whatsapp">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>WhatsApp Flotante</span>
                  <Switch
                    checked={formData.whatsappEnabled || false}
                    onCheckedChange={(checked) => handleInputChange('whatsappEnabled', checked)}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>WhatsApp Flotante:</strong> Agrega un botón flotante en tu tienda que permite a los clientes contactarte directamente por WhatsApp con un mensaje predefinido.
                  </p>
                </div>

                {formData.whatsappEnabled && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="whatsappNumber">Número de WhatsApp *</Label>
                      <Input
                        id="whatsappNumber"
                        value={formData.whatsappNumber || ''}
                        onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                        placeholder="Ej: +526691234567 (incluye código de país)"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        Incluye el código de país. Ejemplo: +52 para México
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsappMessage">Mensaje Predeterminado</Label>
                      <Textarea
                        id="whatsappMessage"
                        value={formData.whatsappMessage || '¡Hola! Me interesa conocer más sobre sus productos.'}
                        onChange={(e) => handleInputChange('whatsappMessage', e.target.value)}
                        placeholder="Mensaje que aparecerá automáticamente cuando el cliente haga clic en WhatsApp"
                        rows={3}
                      />
                      <p className="text-sm text-gray-500">
                        Este mensaje aparecerá automáticamente cuando los clientes hagan clic en el botón de WhatsApp
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Vista Previa</Label>
                      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                            <MessageCircle className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">WhatsApp</p>
                            <p className="text-sm text-gray-600">
                              {formData.whatsappMessage || '¡Hola! Me interesa conocer más sobre sus productos.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <ProductsManagement />
          </TabsContent>

          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <span>Información de Contacto</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email de Contacto</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={formData.contactEmail || ''}
                      onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      placeholder="contacto@tutienda.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Teléfono de Contacto</Label>
                    <Input
                      id="contactPhone"
                      value={formData.contactPhone || ''}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                      placeholder="+52 123 456 7890"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storeAddress">Dirección de la Tienda</Label>
                  <Textarea
                    id="storeAddress"
                    value={formData.storeAddress || ''}
                    onChange={(e) => handleInputChange('storeAddress', e.target.value)}
                    placeholder="Dirección completa de tu tienda física..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-4 pt-6">
          <Button 
            type="submit" 
            disabled={updateSettingsMutation.isPending}
            className="min-w-[120px]"
          >
            {updateSettingsMutation.isPending ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </div>
      </form>
    </div>
  );
}