import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/contexts/SettingsContext";
import { Calculator, CreditCard, Banknote, Gift, Smartphone, Users } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onPaymentComplete: (paymentData: PaymentData) => void;
  defaultTicketTitle?: string;
}

interface PaymentMethod {
  method: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  reference?: string;
}

interface PaymentData {
  method: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  reference?: string;
  change?: number;
  payments?: PaymentMethod[]; // For multiple payment methods
  ticketTitle?: string; // For identifying customer/order
}

const currencies = [
  { code: "MXN", name: "Peso Mexicano", symbol: "$", rate: 1 },
];

const paymentMethods = [
  { id: "cash", name: "Efectivo", icon: Banknote, color: "bg-green-100 text-green-700", affectsCash: true, description: "Afecta el balance de caja" },
  { id: "card", name: "Tarjeta", icon: CreditCard, color: "bg-blue-100 text-blue-700", affectsCash: false, description: "No afecta el balance de caja" },
  { id: "transfer", name: "Transferencia", icon: Smartphone, color: "bg-purple-100 text-purple-700", affectsCash: false, description: "No afecta el balance de caja" },
  { id: "credit", name: "Crédito", icon: Users, color: "bg-orange-100 text-orange-700", affectsCash: false, description: "No afecta el balance de caja" },
  { id: "voucher", name: "Vale Despensa", icon: Gift, color: "bg-pink-100 text-pink-700", affectsCash: false, description: "No afecta el balance de caja" },
  { id: "giftcard", name: "Tarjeta Regalo", icon: Gift, color: "bg-yellow-100 text-yellow-700", affectsCash: false, description: "No afecta el balance de caja" },
];

export default function PaymentModal({ isOpen, onClose, total, onPaymentComplete, defaultTicketTitle = "" }: PaymentModalProps) {
  const { formatCurrency } = useSettings();
  const [selectedMethod, setSelectedMethod] = useState("cash");
  const [selectedCurrency, setSelectedCurrency] = useState("MXN");
  const [amountReceived, setAmountReceived] = useState("");
  const [reference, setReference] = useState("");
  const [ticketTitle, setTicketTitle] = useState(defaultTicketTitle);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [isMultiplePayments, setIsMultiplePayments] = useState(false);
  
  // Update ticket title when modal opens with new default
  useEffect(() => {
    if (isOpen && defaultTicketTitle) {
      setTicketTitle(defaultTicketTitle);
    }
  }, [isOpen, defaultTicketTitle]);
  
  const currentCurrency = currencies.find(c => c.code === selectedCurrency);
  const totalInSelectedCurrency = total; // No conversion, everything is in pesos
  const change = parseFloat(amountReceived) - totalInSelectedCurrency;
  
  // Calculate totals for multiple payments
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = total - totalPaid;
  const isPaymentComplete = remainingAmount <= 0;

  // Add payment to the list
  const addPayment = () => {
    const amount = parseFloat(amountReceived);
    if (!amount || amount <= 0) return;
    
    const maxAmount = remainingAmount > 0 ? Math.min(amount, remainingAmount) : amount;
    
    const newPayment: PaymentMethod = {
      method: selectedMethod,
      amount: maxAmount,
      currency: selectedCurrency,
      exchangeRate: 1,
      reference: reference,
    };

    setPayments(prev => [...prev, newPayment]);
    setAmountReceived("");
    setReference("");
  };

  // Remove payment from the list
  const removePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  // Process final payment
  const handlePayment = () => {
    if (isMultiplePayments && payments.length > 0) {
      // Multiple payments mode
      const totalChange = totalPaid - total;
      const paymentData: PaymentData = {
        method: "multiple",
        amount: total,
        currency: selectedCurrency,
        exchangeRate: 1,
        change: totalChange > 0 ? totalChange : 0,
        payments: payments,
        ticketTitle: ticketTitle,
      };
      onPaymentComplete(paymentData);
    } else {
      // Single payment mode
      const paymentData: PaymentData = {
        method: selectedMethod,
        amount: parseFloat(amountReceived) || totalInSelectedCurrency,
        currency: selectedCurrency,
        exchangeRate: 1,
        reference: reference,
        change: change > 0 ? change : 0,
        ticketTitle: ticketTitle,
      };
      onPaymentComplete(paymentData);
    }
    onClose();
  };

  // Reset all payments
  const resetPayments = () => {
    setPayments([]);
    setAmountReceived("");
    setReference("");
  };

  const addQuickAmount = (amount: number) => {
    setAmountReceived(amount.toString());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Procesamiento de Pago
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Payment Methods & Details */}
          <div className="space-y-6">
            
            {/* Toggle Multiple Payments Mode */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Modo de Pago</h3>
                <p className="text-sm text-gray-600">
                  {isMultiplePayments ? "Múltiples métodos de pago" : "Un solo método de pago"}
                </p>
              </div>
              <Button
                variant={isMultiplePayments ? "default" : "outline"}
                onClick={() => {
                  setIsMultiplePayments(!isMultiplePayments);
                  resetPayments();
                }}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                {isMultiplePayments ? "Modo Simple" : "Múltiples Pagos"}
              </Button>
            </div>

            {/* Multiple Payments Summary */}
            {isMultiplePayments && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    Resumen de Pagos
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetPayments}
                      className="text-red-600 hover:text-red-700"
                    >
                      Limpiar Todo
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total a Pagar:</span>
                      <span>{formatCurrency(total)} MXN</span>
                    </div>
                    <div className="flex justify-between items-center text-green-600">
                      <span>Total Pagado:</span>
                      <span>{formatCurrency(totalPaid)} MXN</span>
                    </div>
                    <div className="flex justify-between items-center text-blue-600 font-medium">
                      <span>Restante:</span>
                      <span>{formatCurrency(remainingAmount)} MXN</span>
                    </div>
                    
                    {payments.length > 0 && (
                      <div className="border-t pt-3 space-y-2">
                        <h4 className="font-medium text-sm">Pagos Agregados:</h4>
                        {payments.map((payment, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {paymentMethods.find(m => m.id === payment.method)?.name}
                              </span>
                              {payment.reference && (
                                <span className="text-xs text-gray-500">({payment.reference})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatCurrency(payment.amount)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePayment(index)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="relative">
                      <Button
                        variant={selectedMethod === method.id ? "default" : "outline"}
                        className={`w-full h-20 flex flex-col items-center justify-center space-y-1 ${
                          selectedMethod === method.id ? "" : method.color
                        }`}
                        onClick={() => setSelectedMethod(method.id)}
                      >
                        <method.icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{method.name}</span>
                        <span className={`text-xs ${method.affectsCash ? 'text-green-600' : 'text-gray-500'}`}>
                          {method.affectsCash ? '🏦 Caja' : '💳 Virtual'}
                        </span>
                      </Button>
                    </div>
                  ))}
                </div>
                
                {/* Payment Method Info */}
                {selectedMethod && (
                  <div className={`mt-3 p-3 rounded-lg border ${
                    paymentMethods.find(m => m.id === selectedMethod)?.affectsCash 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        paymentMethods.find(m => m.id === selectedMethod)?.affectsCash 
                          ? 'bg-green-500' 
                          : 'bg-blue-500'
                      }`} />
                      <span className="text-sm font-medium">
                        {paymentMethods.find(m => m.id === selectedMethod)?.description}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detalles del Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>
                    {isMultiplePayments ? "Monto Restante" : "Total a Pagar"}
                  </Label>
                  <div className="text-2xl font-bold text-primary">
                    ${isMultiplePayments ? remainingAmount.toFixed(2) : totalInSelectedCurrency.toFixed(2)} MXN
                  </div>
                </div>

                {selectedMethod !== "credit" && (
                  <div>
                    <Label>
                      {isMultiplePayments ? "Cantidad a Agregar" : "Cantidad Recibida"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder="0.00"
                      className="text-xl font-semibold"
                      max={isMultiplePayments ? remainingAmount : undefined}
                    />
                  </div>
                )}

                {selectedMethod === "card" || selectedMethod === "transfer" || selectedMethod === "giftcard" ? (
                  <div>
                    <Label>Referencia/Autorización</Label>
                    <Input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Número de referencia"
                    />
                  </div>
                ) : null}

                {/* Add Payment Button for Multiple Payments Mode */}
                {isMultiplePayments && (
                  <Button
                    onClick={addPayment}
                    disabled={!amountReceived || parseFloat(amountReceived) <= 0 || remainingAmount <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Agregar Pago ({paymentMethods.find(m => m.id === selectedMethod)?.name})
                  </Button>
                )}

                {!isMultiplePayments && change > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <Label className="text-green-700">Cambio a Devolver</Label>
                    <div className="text-xl font-bold text-green-700">
                      ${change.toFixed(2)} MXN
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Ticket Title & Quick Actions */}
          <div className="space-y-6">
            {/* Título Ticket */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Título Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Identificación Cliente/Pedido</Label>
                  <Input
                    value={ticketTitle}
                    onChange={(e) => setTicketTitle(e.target.value)}
                    placeholder="Ej: Cliente Juan, Mesa 5, Pedido #123"
                    className="text-lg"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Este texto aparecerá en el ticket impreso y en la lista de ventas
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Amount Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Importes Rápidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setAmountReceived(totalInSelectedCurrency.toString())}
                    className="h-12 font-semibold"
                  >
                    Exacto
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addQuickAmount(200)}
                    className="h-12 font-semibold bg-green-50 hover:bg-green-100"
                  >
                    +$200
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addQuickAmount(500)}
                    className="h-12 font-semibold bg-blue-50 hover:bg-blue-100"
                  >
                    +$500
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addQuickAmount(1000)}
                    className="h-12 font-semibold bg-purple-50 hover:bg-purple-100"
                  >
                    +$1000
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
                onClick={handlePayment}
                disabled={
                  isMultiplePayments 
                    ? !isPaymentComplete || payments.length === 0
                    : selectedMethod !== "credit" && (!amountReceived || parseFloat(amountReceived) < totalInSelectedCurrency)
                }
              >
                {isMultiplePayments 
                  ? `Procesar Pago - Afecta Caja (${payments.length} métodos)`
                  : (paymentMethods.find(m => m.id === selectedMethod)?.affectsCash 
                      ? 'Procesar Pago - Afecta Caja' 
                      : 'Procesar Pago - Virtual')}
              </Button>
              
              {isMultiplePayments && totalPaid > total && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <Label className="text-green-700">Cambio a Devolver</Label>
                  <div className="text-xl font-bold text-green-700">
                    ${(totalPaid - total).toFixed(2)} MXN
                  </div>
                </div>
              )}
              
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={onClose}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}