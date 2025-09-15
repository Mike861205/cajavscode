import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CalendarIcon, 
  Search, 
  Package, 
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Eye,
  Warehouse
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";

interface InventoryItem {
  productId: number;
  systemStock: number;
  physicalCount: number;
  shrinkage: number;
  shrinkageNotes: string;
  variance: number;
  varianceType: 'faltante' | 'sobrante' | 'exacto';
}

interface InventoryCount {
  id: string;
  date: string;
  products: InventoryItem[];
  dateRange: {
    from: Date;
    to: Date;
  };
  status: 'pending' | 'completed';
  totalProducts: number;
  totalVariances: number;
}

export default function PhysicalInventory() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: new Date()
  });
  const [inventoryData, setInventoryData] = useState<{ [key: number]: InventoryItem }>({});
  const [showVariancesOnly, setShowVariancesOnly] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [currentInventory, setCurrentInventory] = useState<InventoryCount | null>(null);

  // Fetch products with error handling
  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error("Error fetching products:", error);
      toast({
        title: "Error cargando productos",
        description: "No se pudieron cargar los productos. Por favor, actualiza la página.",
        variant: "destructive",
      });
    }
  });

  // Fetch categories with error handling
  const { data: categories = [], error: categoriesError } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error("Error fetching categories:", error);
    }
  });

  // Fetch warehouses with error handling
  const { data: warehouses = [], error: warehousesError } = useQuery<any[]>({
    queryKey: ["/api/warehouses"],
    retry: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error("Error fetching warehouses:", error);
      toast({
        title: "Error cargando almacenes",
        description: "No se pudieron cargar los almacenes. Por favor, actualiza la página.",
        variant: "destructive",
      });
    }
  });

  // Format stock for display with robust validation
  const formatStock = (stock: any) => {
    // Handle null, undefined, or non-numeric values
    if (stock === null || stock === undefined || stock === '') {
      return '0';
    }
    
    // Convert to number if it's a string
    const numStock = typeof stock === 'string' ? parseFloat(stock) : stock;
    
    // Check if it's a valid number
    if (isNaN(numStock) || !isFinite(numStock)) {
      return '0';
    }
    
    // Return formatted number
    return numStock % 1 === 0 ? numStock.toString() : numStock.toFixed(2);
  };

  // Calculate inventory item data
  const calculateInventoryItem = (product: Product, physicalCount: number, shrinkage: number, shrinkageNotes: string = ''): InventoryItem => {
    let systemStock = 0;
    
    if (selectedWarehouse) {
      // Get stock for specific warehouse
      const warehouseStock = (product as any).warehouseStocks?.find((ws: any) => ws.warehouseId === selectedWarehouse);
      const stockValue = warehouseStock?.stock;
      systemStock = stockValue ? parseFloat(stockValue.toString()) || 0 : 0;
    } else {
      // Get total stock across all warehouses - use the calculated total stock
      const warehouseStocks = (product as any).warehouseStocks || [];
      systemStock = warehouseStocks.reduce((total: number, ws: any) => {
        const stockValue = ws.stock;
        const numericStock = stockValue ? parseFloat(stockValue.toString()) || 0 : 0;
        return total + numericStock;
      }, 0);
      
      // Fallback to product stock field if warehouse stocks not available
      if (systemStock === 0 && warehouseStocks.length === 0) {
        const productStock = (product as any).stock || (product as any).realStock || 0;
        systemStock = productStock ? parseFloat(productStock.toString()) || 0 : 0;
      }
    }
    
    // Variance calculation: physical count + shrinkage should equal system stock for zero variance
    const variance = (physicalCount + shrinkage) - systemStock;
    let varianceType: 'faltante' | 'sobrante' | 'exacto' = 'exacto';
    
    if (variance < 0) varianceType = 'faltante';
    else if (variance > 0) varianceType = 'sobrante';

    return {
      productId: product.id,
      systemStock,
      physicalCount,
      shrinkage,
      shrinkageNotes,
      variance,
      varianceType
    };
  };

  // Handle physical count input
  const handlePhysicalCountChange = (productId: number, value: string) => {
    const physicalCount = parseFloat(value) || 0;
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentItem = inventoryData[productId];
    const shrinkage = currentItem?.shrinkage || 0;
    const shrinkageNotes = currentItem?.shrinkageNotes || '';
    const inventoryItem = calculateInventoryItem(product, physicalCount, shrinkage, shrinkageNotes);
    
    setInventoryData(prev => ({
      ...prev,
      [productId]: inventoryItem
    }));
  };

  // Handle shrinkage input
  const handleShrinkageChange = (productId: number, value: string) => {
    const shrinkage = parseFloat(value) || 0;
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentItem = inventoryData[productId];
    const physicalCount = currentItem?.physicalCount || 0;
    const shrinkageNotes = currentItem?.shrinkageNotes || '';
    const inventoryItem = calculateInventoryItem(product, physicalCount, shrinkage, shrinkageNotes);
    
    setInventoryData(prev => ({
      ...prev,
      [productId]: inventoryItem
    }));
  };

  // Handle shrinkage notes input
  const handleShrinkageNotesChange = (productId: number, notes: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentItem = inventoryData[productId];
    const physicalCount = currentItem?.physicalCount || 0;
    const shrinkage = currentItem?.shrinkage || 0;
    const inventoryItem = calculateInventoryItem(product, physicalCount, shrinkage, notes);
    
    setInventoryData(prev => ({
      ...prev,
      [productId]: inventoryItem
    }));
  };

  // Handle product selection
  const handleProductSelect = (productId: number, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  // Filter products based on search and selection
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVarianceFilter = !showVariancesOnly || 
                                 (inventoryData[product.id] && inventoryData[product.id].variance !== 0);
    return matchesSearch && matchesVarianceFilter;
  });

  // Check for critical errors
  const hasErrors = productsError || categoriesError || warehousesError;
  
  // Log debugging info for diagnostic purposes
  console.log('Physical Inventory Debug:', {
    productsCount: products.length,
    warehousesCount: warehouses.length,
    categoriesCount: categories.length,
    productsError: productsError?.message,
    warehousesError: warehousesError?.message,
    categoriesError: categoriesError?.message,
    selectedWarehouse,
    filteredProductsCount: filteredProducts.length
  });

  // Calculate total stock of filtered products with safe numeric handling
  const totalFilteredStock = filteredProducts.reduce((total, product) => {
    try {
      const stockValue = calculateInventoryItem(product, 0, 0, '').systemStock;
      const numericStock = typeof stockValue === 'string' ? parseFloat(stockValue) : stockValue;
      return total + (isNaN(numericStock) ? 0 : numericStock);
    } catch (error) {
      console.error('Error calculating stock for product:', product.id, error);
      return total;
    }
  }, 0);

  // Handle select all
  const handleSelectAll = (checked: boolean | string) => {
    const isChecked = checked === true;
    setSelectAll(isChecked);
    if (isChecked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Get variance display
  const getVarianceDisplay = (item: InventoryItem) => {
    if (item.variance === 0) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Exacto
        </Badge>
      );
    } else if (item.variance < 0) {
      return (
        <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
          <TrendingDown className="h-3 w-3 mr-1" />
          Faltante: {Math.abs(item.variance)}
        </Badge>
      );
    } else {
      return (
        <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
          <TrendingUp className="h-3 w-3 mr-1" />
          Sobrante: {item.variance}
        </Badge>
      );
    }
  };

  // Save inventory count
  const saveInventoryMutation = useMutation({
    mutationFn: async () => {
      const inventoryProducts = Object.values(inventoryData)
        .filter(item => selectedProducts.includes(item.productId))
        .map(item => ({
          ...item,
          systemStock: typeof item.systemStock === 'string' ? parseFloat(item.systemStock) : item.systemStock,
          physicalCount: typeof item.physicalCount === 'string' ? parseFloat(item.physicalCount) : item.physicalCount,
          shrinkage: typeof item.shrinkage === 'string' ? parseFloat(item.shrinkage) : item.shrinkage,
          variance: typeof item.variance === 'string' ? parseFloat(item.variance) : item.variance
        }));

      // Enrich products with warehouse information
      const enrichedProducts = inventoryProducts.map(item => ({
        ...item,
        warehouseId: selectedWarehouse
      }));

      const inventoryData_api = {
        products: enrichedProducts,
        dateRange: {
          from: dateRange.from!.toISOString(),
          to: dateRange.to!.toISOString()
        },
        notes: `Inventario físico realizado el ${new Date().toLocaleDateString()}${selectedWarehouse ? ` - Almacén: ${warehouses.find((w: any) => w.id === selectedWarehouse)?.name}` : ' - Global'}`,
        warehouseId: selectedWarehouse
      };

      console.log("🔧 Frontend sending inventory data:", JSON.stringify(inventoryData_api, null, 2));
      console.log("🔧 Selected warehouse:", selectedWarehouse);
      console.log("🔧 Warehouse type:", typeof selectedWarehouse);
      console.log("🔧 Warehouse name:", selectedWarehouse ? warehouses.find((w: any) => w.id === selectedWarehouse)?.name : 'Global');

      const response = await apiRequest("POST", "/api/inventory/physical", inventoryData_api);
      return await response.json();
    },
    onSuccess: (inventoryCount) => {
      setCurrentInventory(inventoryCount);
      setIsReportModalOpen(true);
      
      // Reset inventory data for next cycle
      setInventoryData({});
      setSelectedProducts([]);
      
      // Only invalidate queries without forcing immediate refetch
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/history"] });
      
      toast({
        title: "Inventario guardado",
        description: "El stock del sistema se ha actualizado con el conteo físico.",
      });
    }
  });

  // Close inventory mutation - transfers physical count to system stock
  const closeInventoryMutation = useMutation({
    mutationFn: async (inventoryId: string) => {
      if (!currentInventory) throw new Error('No inventory data available');
      
      const response = await apiRequest("POST", `/api/inventory/physical/${inventoryId}/close`, {
        products: currentInventory.products
      });
      return await response.json();
    },
    onSuccess: () => {
      // Reset inventory data
      setInventoryData({});
      setSelectedProducts([]);
      setSelectAll(false);
      setIsReportModalOpen(false);
      setCurrentInventory(null);
      
      // Invalidate queries efficiently without forcing immediate refetch
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/history'] });
      
      toast({
        title: "Stock actualizado",
        description: "El inventario físico se aplicó correctamente al sistema.",
      });
    }
  });

  const handleSaveInventory = () => {
    if (selectedProducts.length === 0) return;
    saveInventoryMutation.mutate();
  };

  // Listen for print completion message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'inventory_printed' && currentInventory) {
        closeInventoryMutation.mutate(currentInventory.id);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentInventory, closeInventoryMutation]);

  const printInventoryReport = () => {
    if (!currentInventory) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const productsData = currentInventory.products.map(item => {
      const product = products.find(p => p.id === item.productId);
      return { ...item, product };
    });

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventario Físico - ${currentInventory.id}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .company { font-size: 18px; font-weight: bold; }
            .title { font-size: 14px; margin: 5px 0; }
            .info { margin: 10px 0; }
            .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; font-weight: bold; }
            .variance-positive { color: #0066cc; font-weight: bold; }
            .variance-negative { color: #cc0000; font-weight: bold; }
            .variance-exact { color: #00cc00; font-weight: bold; }
            .summary { margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
            .summary-item { margin: 5px 0; }
            @media print { 
              body { margin: 0; } 
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">CAJA SAS ENTERPRISE</div>
            <div class="title">INVENTARIO FÍSICO</div>
            <div class="title">ID: ${currentInventory.id}</div>
          </div>
          
          <div class="info">
            <div><strong>Fecha:</strong> ${format(new Date(currentInventory.date), 'dd/MM/yyyy HH:mm', { locale: es })}</div>
            <div><strong>Período:</strong> ${format(currentInventory.dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(currentInventory.dateRange.to, 'dd/MM/yyyy', { locale: es })}</div>
            <div><strong>Total Productos:</strong> ${currentInventory.totalProducts}</div>
            <div><strong>Productos con Varianza:</strong> ${currentInventory.totalVariances}</div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Stock Sistema</th>
                <th>Conteo Físico</th>
                <th>Merma</th>
                <th>Nota Merma</th>
                <th>Varianza</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${productsData.map(item => `
                <tr>
                  <td>${item.product?.sku || ''}</td>
                  <td>${item.product?.name || ''}</td>
                  <td>${item.systemStock}</td>
                  <td>${item.physicalCount}</td>
                  <td>${item.shrinkage}</td>
                  <td style="font-size: 10px;">${item.shrinkageNotes || '-'}</td>
                  <td class="${item.variance === 0 ? 'variance-exact' : item.variance < 0 ? 'variance-negative' : 'variance-positive'}">
                    ${item.variance === 0 ? '0' : (item.variance > 0 ? '+' : '') + item.variance}
                  </td>
                  <td class="${item.variance === 0 ? 'variance-exact' : item.variance < 0 ? 'variance-negative' : 'variance-positive'}">
                    ${item.varianceType === 'exacto' ? 'Exacto' : item.varianceType === 'faltante' ? 'Faltante' : 'Sobrante'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-item"><strong>Resumen:</strong></div>
            <div class="summary-item">• Productos Exactos: ${productsData.filter(i => i.variance === 0).length}</div>
            <div class="summary-item">• Productos con Faltante: ${productsData.filter(i => i.variance < 0).length}</div>
            <div class="summary-item">• Productos con Sobrante: ${productsData.filter(i => i.variance > 0).length}</div>
            <div class="summary-item">• Total Faltante: ${productsData.filter(i => i.variance < 0).reduce((sum, i) => sum + Math.abs(i.variance), 0)}</div>
            <div class="summary-item">• Total Sobrante: ${productsData.filter(i => i.variance > 0).reduce((sum, i) => sum + i.variance, 0)}</div>
          </div>

          <div style="margin-top: 40px;">
            <div style="display: inline-block; width: 45%; border-top: 1px solid #000; text-align: center; margin-right: 10%;">
              <div style="margin-top: 5px;"><strong>Realizado por</strong></div>
            </div>
            <div style="display: inline-block; width: 45%; border-top: 1px solid #000; text-align: center;">
              <div style="margin-top: 5px;"><strong>Supervisado por</strong></div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                // Send message to parent window to close inventory
                window.opener.postMessage('inventory_printed', '*');
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  const totalVariances = Object.values(inventoryData).filter(item => 
    selectedProducts.includes(item.productId) && item.variance !== 0
  ).length;

  // Show error state if there are critical errors
  if (hasErrors) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Inventario Físico</h2>
            <p className="text-muted-foreground">
              Gestión de conteo físico de inventario y control de varianzas
            </p>
          </div>
        </div>
        
        {/* Error Display */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error al cargar datos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {productsError && (
                <div className="text-red-700">
                  <strong>Error de productos:</strong> {productsError.message}
                </div>
              )}
              {warehousesError && (
                <div className="text-red-700">
                  <strong>Error de almacenes:</strong> {warehousesError.message}
                </div>
              )}
              {categoriesError && (
                <div className="text-red-700">
                  <strong>Error de categorías:</strong> {categoriesError.message}
                </div>
              )}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800">
                  <strong>Solución:</strong> Actualiza la página o verifica tu conexión a internet.
                </p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="mt-2"
                  variant="outline"
                >
                  Actualizar página
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventario Físico</h2>
          <p className="text-muted-foreground">
            Gestión de conteo físico de inventario y control de varianzas
          </p>
        </div>
      </div>

      {/* Warehouse Selection Warning */}
      {selectedWarehouse && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-800">
              <Warehouse className="h-5 w-5" />
              <span className="font-medium">
                Inventario filtrado por almacén: {warehouses.find((w: any) => w.id === selectedWarehouse)?.name}
              </span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Las operaciones de inventario se aplicarán únicamente a este almacén específico.
            </p>
          </CardContent>
        </Card>
      )}

      {!selectedWarehouse && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-800">
              <Warehouse className="h-5 w-5" />
              <span className="font-medium">
                Inventario global (Todos los almacenes)
              </span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              El stock mostrado es la suma de todos los almacenes. Las operaciones afectarán el stock total.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros y Configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Productos</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Date Range From */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Desde</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Range To */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Hasta</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Warehouse Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Almacén</label>
              <Select 
                value={selectedWarehouse?.toString() || "all"} 
                onValueChange={(value) => {
                  const warehouseId = value === "all" ? null : parseInt(value);
                  setSelectedWarehouse(warehouseId);
                  // Reset inventory data when warehouse changes
                  setInventoryData({});
                  setSelectedProducts([]);
                  setSelectAll(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar almacén" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      Todos los almacenes (Global)
                    </div>
                  </SelectItem>
                  {warehouses.map((warehouse: any) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4" />
                        {warehouse.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show Variances Only */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtros</label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-variances"
                  checked={showVariancesOnly}
                  onCheckedChange={(checked) => setShowVariancesOnly(checked === true)}
                />
                <label htmlFor="show-variances" className="text-sm">
                  Solo mostrar varianzas
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Seleccionar todos ({filteredProducts.length})
                </label>
              </div>
              <Badge variant="secondary">
                {selectedProducts.length} productos seleccionados
              </Badge>
              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                <Package className="h-3 w-3 mr-1" />
                {searchTerm ? `Stock total filtrado: ${formatStock(totalFilteredStock)}` : `Stock total: ${formatStock(totalFilteredStock)}`}
              </Badge>
              {totalVariances > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {totalVariances} varianzas detectadas
                </Badge>
              )}
            </div>
            <Button 
              onClick={handleSaveInventory}
              disabled={selectedProducts.length === 0 || saveInventoryMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Guardar Inventario
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Productos para Inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="text-center py-8">Cargando productos...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Almacén</TableHead>
                    <TableHead>Stock Sistema</TableHead>
                    <TableHead>Conteo Físico</TableHead>
                    <TableHead>Merma</TableHead>
                    <TableHead>Nota Merma</TableHead>
                    <TableHead>Varianza</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const inventoryItem = inventoryData[product.id];
                    const isSelected = selectedProducts.includes(product.id);
                    
                    return (
                      <TableRow key={product.id} className={isSelected ? "bg-blue-50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleProductSelect(product.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categories.find(cat => cat.id === (product as any).categoryId)?.name || 'Sin categoría'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-blue-600" />
                            <Badge variant="secondary" className="bg-blue-50 border-blue-200 text-blue-700">
                              {selectedWarehouse ? 
                                warehouses.find((w: any) => w.id === selectedWarehouse)?.name || 'Almacén' : 
                                'Todos los almacenes'
                              }
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              {(() => {
                                if (selectedWarehouse) {
                                  const warehouseStock = (product as any).warehouseStocks?.find((ws: any) => ws.warehouseId === selectedWarehouse);
                                  return formatStock(parseFloat(warehouseStock?.stock) || 0);
                                } else {
                                  const warehouseStocks = (product as any).warehouseStocks || [];
                                  const totalStock = warehouseStocks.reduce((total: number, ws: any) => total + (parseFloat(ws.stock) || 0), 0);
                                  return formatStock(totalStock || parseFloat((product as any).stock || 0));
                                }
                              })()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={inventoryItem?.physicalCount || ''}
                            onChange={(e) => handlePhysicalCountChange(product.id, e.target.value)}
                            className="w-24"
                            disabled={!isSelected}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={inventoryItem?.shrinkage || ''}
                            onChange={(e) => handleShrinkageChange(product.id, e.target.value)}
                            className="w-24"
                            disabled={!isSelected}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            placeholder="Razón de la merma..."
                            value={inventoryItem?.shrinkageNotes || ''}
                            onChange={(e) => handleShrinkageNotesChange(product.id, e.target.value)}
                            className="w-40"
                            disabled={!isSelected || !(inventoryItem?.shrinkage > 0)}
                          />
                        </TableCell>
                        <TableCell>
                          {inventoryItem ? (
                            <span className={cn(
                              "font-medium",
                              inventoryItem.variance === 0 ? "text-green-600" :
                              inventoryItem.variance < 0 ? "text-red-600" : "text-blue-600"
                            )}>
                              {inventoryItem.variance === 0 ? '0' : 
                               (inventoryItem.variance > 0 ? '+' : '') + inventoryItem.variance}
                            </span>
                          ) : (
                            <Minus className="h-4 w-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell>
                          {inventoryItem ? getVarianceDisplay(inventoryItem) : (
                            <Badge variant="outline" className="text-gray-400">
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Report Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Inventario Guardado - {currentInventory?.id}
            </DialogTitle>
          </DialogHeader>
          {currentInventory && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <div className="font-semibold text-green-800">Inventario completado exitosamente</div>
                  <div className="text-sm text-green-600">
                    {currentInventory.totalProducts} productos procesados, {currentInventory.totalVariances} varianzas detectadas
                  </div>
                </div>
                <Button onClick={printInventoryReport} className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir Reporte
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {currentInventory.products.filter(i => i.variance === 0).length}
                    </div>
                    <div className="text-sm text-gray-600">Productos Exactos</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {currentInventory.products.filter(i => i.variance < 0).length}
                    </div>
                    <div className="text-sm text-gray-600">Faltantes</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {currentInventory.products.filter(i => i.variance > 0).length}
                    </div>
                    <div className="text-sm text-gray-600">Sobrantes</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}