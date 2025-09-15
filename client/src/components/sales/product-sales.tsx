import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Search, Package, TrendingUp, DollarSign, BarChart3, ArrowUpDown, FileText, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { useSettings } from '@/contexts/SettingsContext';
import { createDateRangeWithTimezone } from '@/lib/timezone';

interface ProductSaleData {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  averagePrice: number;
  salesCount: number;
  lastSaleDate: string;
}

type SortField = 'productName' | 'totalQuantitySold' | 'totalRevenue' | 'totalProfit' | 'profitMargin';
type SortOrder = 'asc' | 'desc';
type DateFilter = 'today' | 'week' | 'month' | 'custom';

export default function ProductSales() {
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalRevenue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { settings } = useSettings();

  // Generate timezone-aware date range based on selected filter
  const getDateRange = () => {
    if (!settings) {
      // Fallback to UTC behavior
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      return { startDate: today, endDate: today };
    }

    const timezone = settings.timezone || 'UTC';
    
    try {
      if (dateFilter === 'custom' && customDateRange?.from && customDateRange?.to) {
        return createDateRangeWithTimezone(
          'custom',
          timezone,
          format(customDateRange.from, 'yyyy-MM-dd'),
          format(customDateRange.to, 'yyyy-MM-dd')
        );
      }
      
      const result = createDateRangeWithTimezone(dateFilter, timezone);
      
      // Date calculation debug removed - timezone system working correctly
      
      // Return full ISO strings for precise timestamp filtering
      return {
        startDate: result.startDate,
        endDate: result.endDate
      };
    } catch (error) {
      console.error('Error creating timezone-aware date range:', error);
      // Fallback to UTC
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      return { startDate: today, endDate: today };
    }
  };

  // Fetch product sales data
  const { data: productSalesData, isLoading: isLoadingProductSales } = useQuery({
    queryKey: ['/api/sales/product-sales', selectedProduct, getDateRange()],
    queryFn: async () => {
      const dateRange = getDateRange();
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(selectedProduct !== 'all' && { productId: selectedProduct })
      });
      
      const res = await fetch(`/api/sales/product-sales?${params}`);
      if (!res.ok) throw new Error('Error al cargar datos de ventas de productos');
      return res.json();
    }
  });

  // Export to Excel function
  const exportToExcel = () => {
    if (!filteredAndSortedData?.length) return;
    
    const exportData = filteredAndSortedData.map((item: ProductSaleData) => ({
      'Producto': item.productName,
      'SKU': item.sku,
      'Categoría': item.category,
      'Cantidad Vendida': item.totalQuantitySold,
      'Ingresos Totales': `$${item.totalRevenue.toFixed(2)}`,
      'Costo Total': `$${item.totalCost.toFixed(2)}`,
      'Utilidad Total': `$${item.totalProfit.toFixed(2)}`,
      'Margen (%)': `${item.profitMargin.toFixed(2)}%`,
      'Precio Promedio': `$${item.averagePrice.toFixed(2)}`,
      'Número de Ventas': item.salesCount,
      'Última Venta': item.lastSaleDate ? format(new Date(item.lastSaleDate), 'dd/MM/yyyy', { locale: es }) : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Venta Productos');
    
    const fileName = `reporte-venta-productos-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Export to PDF function
  const exportToPDF = () => {
    if (!filteredAndSortedData?.length) return;
    
    const pdf = new jsPDF();
    
    // Title
    pdf.setFontSize(16);
    pdf.text('Reporte de Venta por Productos', 20, 20);
    
    // Date range
    const dateRange = getDateRange();
    pdf.setFontSize(10);
    pdf.text(`Período: ${format(new Date(dateRange.startDate), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(dateRange.endDate), 'dd/MM/yyyy', { locale: es })}`, 20, 30);
    
    // Table headers and data
    const headers = [
      'Producto', 'SKU', 'Categoría', 'Cantidad', 'Ingresos', 'Costo', 'Utilidad', 'Margen %', 'Precio Prom.', 'Ventas'
    ];
    
    const data = filteredAndSortedData.map((item: ProductSaleData) => [
      item.productName,
      item.sku,
      item.category,
      item.totalQuantitySold,
      `$${item.totalRevenue.toFixed(2)}`,
      `$${item.totalCost.toFixed(2)}`,
      `$${item.totalProfit.toFixed(2)}`,
      `${item.profitMargin.toFixed(2)}%`,
      `$${item.averagePrice.toFixed(2)}`,
      item.salesCount
    ]);
    
    autoTable(pdf, {
      head: [headers],
      body: data,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
      },
    });
    
    const fileName = `reporte-venta-productos-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    pdf.save(fileName);
  };

  // Fetch products for filter dropdown
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Error al cargar productos');
      return res.json();
    }
  });

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!productSalesData) return [];
    
    let filtered = productSalesData.filter((item: ProductSaleData) =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort data
    filtered.sort((a: ProductSaleData, b: ProductSaleData) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortField === 'productName') {
        const aStr = String(aValue);
        const bStr = String(bValue);
        return sortOrder === 'asc' 
          ? aStr.localeCompare(bStr, 'es')
          : bStr.localeCompare(aStr, 'es');
      }
      
      const aNum = Number(aValue);
      const bNum = Number(bValue);
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    });

    return filtered;
  }, [productSalesData, searchTerm, sortField, sortOrder]);

  // Calculate totals
  const totals = useMemo(() => {
    if (!filteredAndSortedData) return {
      totalProducts: 0,
      totalQuantity: 0,
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      overallMargin: 0
    };

    const totalProducts = filteredAndSortedData.length;
    const totalQuantity = filteredAndSortedData.reduce((sum: number, item: ProductSaleData) => sum + item.totalQuantitySold, 0);
    const totalRevenue = filteredAndSortedData.reduce((sum: number, item: ProductSaleData) => sum + item.totalRevenue, 0);
    const totalCost = filteredAndSortedData.reduce((sum: number, item: ProductSaleData) => sum + item.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalProducts,
      totalQuantity,
      totalRevenue,
      totalCost,
      totalProfit,
      overallMargin
    };
  }, [filteredAndSortedData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatQuantity = (quantity: number) => {
    return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(2);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
            Venta Productos
          </h1>
          <p className="text-gray-600 mt-2">
            Reporte detallado de ventas por producto con análisis de costos y utilidades
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Filter */}
            <div className="space-y-2">
              <Label>Período de Tiempo</Label>
              <Select value={dateFilter} onValueChange={(value: DateFilter) => setDateFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mes</SelectItem>
                  <SelectItem value="custom">Rango Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="space-y-2">
                <Label>Rango de Fechas</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange?.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "d MMM", { locale: es })} -{" "}
                            {format(customDateRange.to, "d MMM y", { locale: es })}
                          </>
                        ) : (
                          format(customDateRange.from, "d MMM y", { locale: es })
                        )
                      ) : (
                        "Seleccionar fechas"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={customDateRange?.from}
                      selected={customDateRange}
                      onSelect={setCustomDateRange}
                      numberOfMonths={2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Product Filter */}
            <div className="space-y-2">
              <Label>Producto Específico</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Productos</SelectItem>
                  {products?.map((product: any) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label>Buscar Producto</Label>
              <Input
                placeholder="Nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Productos</p>
                <p className="text-2xl font-bold text-blue-700">{totals.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Cantidad Vendida</p>
                <p className="text-2xl font-bold text-green-700">{formatQuantity(totals.totalQuantity)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Ingresos</p>
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(totals.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Costos</p>
                <p className="text-2xl font-bold text-orange-700">{formatCurrency(totals.totalCost)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Utilidad</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totals.totalProfit)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">Margen</p>
                <p className="text-2xl font-bold text-indigo-700">{totals.overallMargin.toFixed(1)}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalle de Ventas por Producto
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingProductSales ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('productName')}
                    >
                      <div className="flex items-center gap-2">
                        Producto
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 text-right"
                      onClick={() => handleSort('totalQuantitySold')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Cantidad Vendida
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 text-right"
                      onClick={() => handleSort('totalRevenue')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Ingresos
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Costos</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 text-right"
                      onClick={() => handleSort('totalProfit')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Utilidad
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 text-right"
                      onClick={() => handleSort('profitMargin')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Margen %
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Precio Promedio</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Última Venta</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportToExcel}
                          disabled={!filteredAndSortedData?.length}
                          className="flex items-center gap-1"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                          Excel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportToPDF}
                          disabled={!filteredAndSortedData?.length}
                          className="flex items-center gap-1"
                        >
                          <FileText className="h-4 w-4" />
                          PDF
                        </Button>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedData?.map((item: ProductSaleData) => (
                    <TableRow key={item.productId} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.sku}</Badge>
                      </TableCell>
                      <TableCell>{item.category || 'Sin categoría'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatQuantity(item.totalQuantitySold)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-green-600">
                        {formatCurrency(item.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-orange-600">
                        {formatCurrency(item.totalCost)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-emerald-600">
                        {formatCurrency(item.totalProfit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <Badge 
                          variant={item.profitMargin > 20 ? "default" : item.profitMargin > 10 ? "secondary" : "destructive"}
                        >
                          {item.profitMargin.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.averagePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{item.salesCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-600">
                        {item.lastSaleDate ? format(new Date(item.lastSaleDate), 'dd/MM/yyyy', { locale: es }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredAndSortedData?.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron ventas de productos en el período seleccionado
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}