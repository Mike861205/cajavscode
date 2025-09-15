import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, CreditCard, Banknote, Smartphone, Gift, Printer } from "lucide-react";
import { PrintOptionsModal } from "./print-options-modal";

interface PaymentConfirmationData {
  saleId: number;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: PaymentConfirmationData | null;
  onPrintRequest?: () => void;
}

const getPaymentMethodInfo = (method: string) => {
  switch (method) {
    case 'cash':
      return { label: 'Efectivo', icon: Banknote, color: 'text-green-600' };
    case 'card':
      return { label: 'Tarjeta', icon: CreditCard, color: 'text-blue-600' };
    case 'transfer':
      return { label: 'Transferencia', icon: Smartphone, color: 'text-purple-600' };
    case 'giftcard':
      return { label: 'Tarjeta de Regalo', icon: Gift, color: 'text-orange-600' };
    case 'credit':
      return { label: 'Crédito', icon: CreditCard, color: 'text-red-600' };
    default:
      return { label: method, icon: Banknote, color: 'text-gray-600' };
  }
};

export function PaymentConfirmationModal({ isOpen, onClose, paymentData, onPrintRequest }: PaymentConfirmationModalProps) {
  const [showModal, setShowModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && paymentData) {
      setShowModal(true);
      // Auto-open print modal after 1 second
      const printTimer = setTimeout(() => {
        setShowPrintModal(true);
      }, 1000);
      
      // Auto-close after 7 seconds (giving time for print modal to show)
      const timer = setTimeout(() => {
        handleClose();
      }, 7000);
      
      setAutoCloseTimer(timer);
      return () => {
        clearTimeout(printTimer);
        clearTimeout(timer);
      };
    }
  }, [isOpen, paymentData]);

  const handleClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
    setShowModal(false);
    setShowPrintModal(false);
    onClose();
  };

  const handlePrintOptions = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }
    setShowPrintModal(true);
  };

  const handlePrintComplete = () => {
    setShowPrintModal(false);
    handleClose();
  };

  if (!paymentData) return null;

  const paymentMethodInfo = getPaymentMethodInfo(paymentData.paymentMethod);
  const PaymentIcon = paymentMethodInfo.icon;

  return (
    <>
      <Dialog open={showModal} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md mx-auto">
          <DialogHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-green-600">
              ¡Pago Procesado!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Payment Method */}
            <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
              <PaymentIcon className={`w-6 h-6 ${paymentMethodInfo.color}`} />
              <span className="text-lg font-semibold text-gray-800">
                {paymentMethodInfo.label}
              </span>
            </div>

            {/* Transaction Details */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Ticket #:</span>
                <span className="font-semibold">#{paymentData.saleId}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">${paymentData.subtotal.toFixed(2)}</span>
              </div>

              {paymentData.discount > 0 && (
                <div className="flex justify-between items-center py-2 border-b text-orange-600">
                  <span>Descuento:</span>
                  <span className="font-semibold">-${paymentData.discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Impuestos:</span>
                <span className="font-semibold">${paymentData.tax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b-2 border-gray-300">
                <span className="text-xl font-bold">Total:</span>
                <span className="text-xl font-bold text-green-600">
                  ${paymentData.total.toFixed(2)}
                </span>
              </div>

              {/* Cash Payment Details */}
              {paymentData.paymentMethod === 'cash' && paymentData.amountReceived && (
                <>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Recibido:</span>
                    <span className="font-semibold">${paymentData.amountReceived.toFixed(2)}</span>
                  </div>
                  
                  {paymentData.change !== undefined && paymentData.change > 0 && (
                    <div className="flex justify-between items-center py-2 bg-yellow-50 px-3 rounded-lg">
                      <span className="text-yellow-700 font-semibold">Cambio:</span>
                      <span className="text-xl font-bold text-yellow-600">
                        ${paymentData.change.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Items Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-gray-800">Resumen de Productos:</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {paymentData.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="font-semibold">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handlePrintOptions}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Continuar sin Imprimir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Options Modal */}
      {showPrintModal && (
        <PrintOptionsModal 
          isOpen={showPrintModal}
          onClose={handlePrintComplete}
          saleId={paymentData?.saleId?.toString() || '0'}
          receiptData={{
            saleId: paymentData?.saleId || 0,
            timestamp: new Date(),
            total: paymentData?.total || 0,
            subtotal: paymentData?.subtotal || 0,
            tax: paymentData?.tax || 0,
            discount: paymentData?.discount || 0,
            paymentMethod: paymentData?.paymentMethod || 'cash',
            amountReceived: paymentData?.amountReceived,
            change: paymentData?.change,
            items: paymentData?.items || [],
            businessName: "Caja SAS Enterprise",
            cashier: "Usuario",
            ticketTitle: null,
            warehouse: {
              name: "Sucursal Principal",
              address: "Dirección de la sucursal",
              phone: "Teléfono",
              rfc: "RFC123456789"
            }
          }}
        />
      )}
    </>
  );
}