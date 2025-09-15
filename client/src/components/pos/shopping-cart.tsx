import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart as CartIcon, CreditCard, Minus, Plus, Trash2, Receipt, Percent, Tag, X, User, UserCheck, Gift } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { type Customer } from "@shared/schema";
import PaymentModal from "./payment-modal";
import { PaymentConfirmationModal } from "./payment-confirmation-modal";
import { PrintOptionsModal } from "./print-options-modal";
import { printReceipt } from "./receipt-generator";
import CustomerSearch from "./customer-search";
import { PromotionService, type PromotionCalculationResult } from "@/services/promotionService";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  unitType?: string;
  allowDecimals?: boolean;
  saleUnitPrice?: number;
  saleUnit?: string;
  saleUnitName?: string;
}

interface ShoppingCartProps {
  items: CartItem[];
  onUpdateItem: (id: number, quantity: number, variantName?: string) => void;
  onClear: () => void;
  customerInfo?: {
    name: string;
    phone: string;
    appointmentId: number;
  } | null;
  preselectedProducts?: Array<{
    productName: string;
    quantity: number;
  }>;
}

interface PaymentData {
  method: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  reference?: string;
  change?: number;
  ticketTitle?: string;
  payments?: any[];
}

export default function ShoppingCart({ items, onUpdateItem, onClear, customerInfo, preselectedProducts }: ShoppingCartProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isPrintOptionsModalOpen, setIsPrintOptionsModalOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [receiptDataForPrint, setReceiptDataForPrint] = useState<any>(null);
  const [taxRate, setTaxRate] = useState<number | "NA">(() => {
    // Load tax rate from localStorage, default to 10% IVA
    const savedTaxRate = localStorage.getItem("pos-tax-rate");
    return savedTaxRate ? (savedTaxRate === "NA" ? "NA" : parseFloat(savedTaxRate)) : 10;
  });
  const [discountRate, setDiscountRate] = useState(0); // Default 0% discount
  const [selectedCreditCustomer, setSelectedCreditCustomer] = useState<Customer | null>(null);
  const [promotionResult, setPromotionResult] = useState<PromotionCalculationResult | null>(null);
  const [isCalculatingPromotions, setIsCalculatingPromotions] = useState(false);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);

  // Persist tax rate to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("pos-tax-rate", taxRate.toString());
  }, [taxRate]);

  // Calculate promotions automatically when cart changes
  useEffect(() => {
    if (items.length > 0 && user?.tenantId) {
      calculatePromotions();
    } else {
      setPromotionResult(null);
    }
  }, [items, user?.tenantId]);

  const calculatePromotions = async () => {
    if (!user?.tenantId || items.length === 0) return;
    
    setIsCalculatingPromotions(true);
    try {
      const cartForCalculation = items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        cost: 0 // Not needed for promotion calculation
      }));

      const result = await PromotionService.calculatePromotions(cartForCalculation, user.tenantId);
      setPromotionResult(result);
    } catch (error) {
      console.error("Error calculating promotions:", error);
      setPromotionResult(null);
    } finally {
      setIsCalculatingPromotions(false);
    }
  };

  // Get user's warehouse information for receipts
  const { data: userWarehouse } = useQuery<any>({
    queryKey: ["/api/user/warehouse"],
    enabled: !!user,
    retry: 2,
  });

  const subtotal = items.reduce((sum, item) => {
    if (item.saleUnitPrice && item.saleUnit) {
      // For products with custom unit pricing, the saleUnitPrice is for the specific saleUnit amount
      // We need to calculate the price proportionally based on the actual quantity
      const unitAmount = parseFloat(item.saleUnit);
      const pricePerUnitAmount = item.saleUnitPrice;
      const totalPrice = (item.quantity / unitAmount) * pricePerUnitAmount;
      return sum + totalPrice;
    } else {
      // Regular products: multiply price by quantity
      return sum + (item.price * item.quantity);
    }
  }, 0);
  const discount = subtotal * (discountRate / 100);
  const discountedSubtotal = subtotal - discount;
  const tax = taxRate === "NA" ? 0 : discountedSubtotal * ((taxRate as number) / 100);
  const total = discountedSubtotal + tax;

  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentData) => {
      const saleData = {
        sale: {
          total: total.toFixed(2),
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          discount: discount.toFixed(2),
          paymentMethod: paymentData.method,
          ticketTitle: paymentData.ticketTitle || "",
          status: "completed"
        },
        items: items.map(item => {
          // For products with custom unit pricing (variants), use the actual quantity
          // and calculate the correct price based on the sale unit
          if (item.saleUnitPrice && item.saleUnit) {
            const unitAmount = parseFloat(item.saleUnit);
            const actualQuantity = item.quantity; // This is the actual quantity to deduct from stock
            const pricePerUnit = item.saleUnitPrice; // This is the price for the sale unit
            const totalPrice = (actualQuantity / unitAmount) * pricePerUnit;
            
            console.log(`DEBUG: Processing variant item - Product: ${item.name}, Quantity: ${actualQuantity}, Sale Unit: ${item.saleUnit}, Price per unit: ${pricePerUnit}, Total: ${totalPrice}`);
            
            return {
              productId: item.id,
              quantity: actualQuantity.toString(), // Use actual quantity for stock deduction
              price: (totalPrice / actualQuantity).toFixed(2), // Unit price for this transaction
              total: totalPrice.toFixed(2)
            };
          } else {
            // Regular products: multiply price by quantity
            return {
              productId: item.id,
              quantity: item.quantity.toString(),
              price: item.price.toFixed(2),
              total: (item.price * item.quantity).toFixed(2)
            };
          }
        }),
        payments: paymentData.payments || [] // Support for multiple payments
      };

      console.log("Sending sale data:", JSON.stringify(saleData, null, 2));
      
      try {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(saleData)
        });

        console.log("Response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server error response:", errorText);
          throw new Error(`Server error ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log("Sale created successfully:", result);
        return { ...result, paymentData };
      } catch (error) {
        console.error("Sale processing failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      const receiptData = {
        items,
        subtotal,
        discount,
        tax,
        total,
        payment: data.paymentData,
        saleId: `V${Date.now()}`,
        timestamp: new Date(),
        cashier: user?.fullName || user?.username || "Cajero",
        businessName: "Caja SAS Enterprise",
        ticketTitle: data.paymentData.ticketTitle,
        warehouse: userWarehouse ? {
          name: userWarehouse.name,
          address: userWarehouse.address,
          phone: userWarehouse.phone,
          rfc: userWarehouse.rfc,
          taxRegime: userWarehouse.taxRegime
        } : {
          name: user?.username === 'MIGUELITO' ? 'Lomas del Sol' : 'Centro Principal',
          address: user?.username === 'MIGUELITO' ? 'lomas del sol' : 'Dirección Principal',
          phone: user?.username === 'MIGUELITO' ? '6242474279' : '555-0000',
          rfc: user?.username === 'MIGUELITO' ? 'PAMM861205AB1' : 'RFC000000000',
          taxRegime: 'Régimen General'
        }
      };

      // Store receipt data for print options modal
      setReceiptDataForPrint({
        ...receiptData,
        saleId: data.id || Math.floor(Math.random() * 10000)
      });

      // Open print options modal instead of auto-printing
      setIsPrintOptionsModalOpen(true);
      
      onClear();
      // Use centralized cache invalidation for immediate POS updates
      const cashRegisterId = 154; // This should be dynamic from the active cash register
      CachePatterns.onSaleCreated(cashRegisterId);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al procesar pago",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProcessPayment = () => {
    if (items.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos antes de procesar el pago",
        variant: "destructive",
      });
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handlePaymentComplete = (paymentData: PaymentData) => {
    processPaymentMutation.mutate(paymentData);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCreditCustomer(customer);
  };

  const handleCreditSale = async () => {
    if (!selectedCreditCustomer) return;

    try {
      const payload = {
        sale: {
          total: total.toString(),
          tax: tax.toString(),
          subtotal: subtotal.toString(),
          discount: discount.toString(),
          paymentMethod: "credito_fiador",
          customerName: selectedCreditCustomer.name,
          ticketTitle: `${selectedCreditCustomer.name} - Crédito Fiador`,
          customerId: selectedCreditCustomer.id,
          status: "completed"
        },
        items: items.map(item => ({
          productId: item.id,
          quantity: item.quantity.toString(),
          price: item.price.toString(),
          total: (item.price * item.quantity).toString()
        })),
        payments: []
      };

      console.log("Payload enviado para crédito fiador:", JSON.stringify(payload, null, 2));

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error en la venta a crédito");
      }

      const saleData = await response.json();

      toast({
        title: "Venta a Crédito Completada",
        description: `Venta registrada para ${selectedCreditCustomer.name} por $${total.toFixed(2)}`,
        variant: "default",
      });

      // Limpiar carrito y cliente seleccionado
      onClear();
      setSelectedCreditCustomer(null);

      // CRITICAL: Complete cache invalidation for immediate credit sale updates
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/credit-eligible"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      // FORCE: Remove and invalidate ALL cash register queries (including dynamic IDs)
      queryClient.removeQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith("/api/cash-register")
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith("/api/cash-register")
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/chart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/top-products"] });

    } catch (error) {
      console.error("Error en venta a crédito:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar la venta a crédito",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-4">
        <CardTitle className="flex items-center text-lg">
          <CartIcon className="mr-2 h-5 w-5" />
          Orden Actual
        </CardTitle>
        {customerInfo && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-1">Cliente desde Cita</h4>
            <p className="text-sm text-blue-700 font-medium">{customerInfo.name}</p>
            <p className="text-xs text-blue-600">{customerInfo.phone}</p>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex-1 mb-6 overflow-hidden relative">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <CartIcon className="mx-auto h-12 w-12 mb-4 text-gray-300" />
              <p>Selecciona productos para comenzar</p>
            </div>
          ) : (
            <>
              {items.length > 3 && (
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>
              )}
              <div className="space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 smooth-scroll cart-items-container" style={{ maxHeight: 'calc(100vh - 450px)', minHeight: '200px' }}>
              {items.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg touch-manipulation">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.name}</h4>
                    <p className="text-primary font-semibold text-sm">
                      ${(item.saleUnitPrice || item.price || 0).toFixed(2)}
                      {item.saleUnitPrice && item.saleUnitName && (
                        <span className="text-xs text-gray-500 ml-1">/ {item.saleUnitName}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 touch-manipulation"
                      onClick={() => onUpdateItem(item.id, Math.max(0, item.quantity - (item.allowDecimals ? 0.1 : 1)), item.name)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        step={item.allowDecimals ? "0.001" : "1"}
                        min="0"
                        value={item.quantity}
                        onChange={(e) => onUpdateItem(item.id, parseFloat(e.target.value) || 0, item.name)}
                        className="text-sm font-medium w-16 text-center border rounded px-1 py-1 touch-manipulation"
                        style={{ minHeight: '32px' }}
                      />
                      {item.unitType && item.unitType !== "piece" && (
                        <span className="text-xs text-gray-500 mt-1">{item.unitType}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 touch-manipulation"
                      onClick={() => onUpdateItem(item.id, item.quantity + (item.allowDecimals ? 0.1 : 1), item.name)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-2 h-8 w-8 p-0 text-red-500 hover:text-red-700 touch-manipulation"
                    onClick={() => onUpdateItem(item.id, 0, item.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
        
        <div className="border-t pt-4 flex-shrink-0">
          {/* Tax and Discount Controls */}
          {/* Promociones Aplicadas */}
          {promotionResult && promotionResult.appliedPromotions.length > 0 && (
            <div className="space-y-2 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Promociones Aplicadas</span>
                {isCalculatingPromotions && <span className="text-xs text-green-600">(Calculando...)</span>}
              </div>
              {promotionResult.appliedPromotions.map((promotion, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-green-700">{promotion.name}</span>
                  <span className="font-medium text-green-800">-${promotion.discountAmount.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-green-200 pt-2 flex justify-between font-bold text-sm">
                <span className="text-green-800">Total Descuento:</span>
                <span className="text-green-800">-${promotionResult.totalDiscount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-blue-600" />
                <Label htmlFor="tax-rate" className="text-sm font-medium">IVA (%)</Label>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={taxRate === "NA" ? "default" : "outline"}
                  className={`px-3 py-1 text-xs ${
                    taxRate === "NA" 
                      ? "bg-red-500 hover:bg-red-600 text-white border-red-500" 
                      : "bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                  }`}
                  onClick={() => setTaxRate("NA")}
                >
                  <X className="h-3 w-3 mr-1" />
                  NA
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={taxRate === 10 ? "default" : "outline"}
                  className="px-3 py-1 text-xs"
                  onClick={() => setTaxRate(10)}
                >
                  10%
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={taxRate === 16 ? "default" : "outline"}
                  className="px-3 py-1 text-xs"
                  onClick={() => setTaxRate(16)}
                >
                  16%
                </Button>
                {taxRate !== "NA" && (
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-16 h-8 text-xs"
                  />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-orange-600" />
                <Label htmlFor="discount-rate" className="text-sm font-medium">Descuento (%)</Label>
              </div>
              <Input
                id="discount-rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={discountRate}
                onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                className="w-20 h-8 text-xs"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>Descuento ({discountRate}%):</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Impuestos ({taxRate === "NA" ? "Sin IVA" : `${taxRate}%`}):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Sección de Cliente para Crédito */}
          <div className="border rounded-lg p-3 mb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-800 flex items-center gap-2">
                <User className="h-4 w-4" />
                Crédito Fiador
              </h4>
              {selectedCreditCustomer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCreditCustomer(null)}
                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {selectedCreditCustomer ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-gray-900">{selectedCreditCustomer.name}</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Elegible
                  </Badge>
                </div>
                {selectedCreditCustomer.phone && (
                  <p className="text-sm text-gray-600">{selectedCreditCustomer.phone}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Crédito disponible:</span>
                  <span className="font-semibold text-green-600">
                    ${parseFloat(selectedCreditCustomer.creditAvailable || "0").toFixed(2)}
                  </span>
                </div>
                {parseFloat(selectedCreditCustomer.creditAvailable || "0") < total && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
                    ⚠️ El total (${total.toFixed(2)}) excede el crédito disponible
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={() => setIsCustomerSearchOpen(true)}
                disabled={items.length === 0}
              >
                <User className="mr-2 h-4 w-4" />
                Seleccionar Cliente
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <Button 
              className="w-full bg-green-600 hover:bg-green-700" 
              size="lg"
              onClick={handleProcessPayment}
              disabled={processPaymentMutation.isPending || items.length === 0}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {processPaymentMutation.isPending ? "Procesando..." : "Procesar Pago"}
            </Button>
            
            {selectedCreditCustomer && (
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                size="lg"
                onClick={handleCreditSale}
                disabled={processPaymentMutation.isPending || items.length === 0 || parseFloat(selectedCreditCustomer.creditAvailable || "0") < total}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Vender a Crédito Fiador
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onClear}
              disabled={items.length === 0}
            >
              Limpiar Orden
            </Button>
          </div>
        </div>
      </CardContent>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={total}
        onPaymentComplete={handlePaymentComplete}
        defaultTicketTitle={customerInfo ? `${customerInfo.name} - ${customerInfo.phone}` : ""}
      />

      <PaymentConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => {
          setIsConfirmationModalOpen(false);
          setConfirmationData(null);
        }}
        paymentData={confirmationData}
      />

      <PrintOptionsModal
        isOpen={isPrintOptionsModalOpen}
        onClose={() => {
          setIsPrintOptionsModalOpen(false);
          setReceiptDataForPrint(null);
        }}
        receiptData={receiptDataForPrint}
        saleId={receiptDataForPrint?.saleId?.toString() || ""}
      />

      <CustomerSearch
        isOpen={isCustomerSearchOpen}
        onClose={() => setIsCustomerSearchOpen(false)}
        onSelectCustomer={handleSelectCustomer}
      />
    </Card>
  );
}
