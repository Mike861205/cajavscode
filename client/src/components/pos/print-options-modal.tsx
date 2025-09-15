import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Bluetooth, Monitor, CheckCircle } from "lucide-react";
import { ThermalPrinter } from "./thermal-printer";
import { printReceipt } from "./receipt-generator";

interface PrintOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: any;
  saleId: string;
}

export function PrintOptionsModal({ isOpen, onClose, receiptData, saleId }: PrintOptionsModalProps) {
  const [showThermalPrinter, setShowThermalPrinter] = useState(false);
  const [bluetoothSupported, setBluetoothSupported] = useState('bluetooth' in navigator);

  const handleTraditionalPrint = () => {
    if (receiptData) {
      printReceipt(receiptData);
    }
    onClose();
  };

  const handleThermalPrint = () => {
    setShowThermalPrinter(true);
  };

  const handleCloseThermalPrinter = () => {
    setShowThermalPrinter(false);
    onClose();
  };

  const handleSkipPrint = () => {
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen && !showThermalPrinter && receiptData} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              ¡Pago Procesado!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Success Message */}
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-green-800">Venta #{saleId}</h3>
              <p className="text-sm text-green-700">Transacción completada exitosamente</p>
              <p className="text-lg font-bold text-green-800 mt-1">
                Total: ${receiptData?.total?.toFixed(2) || '0.00'}
              </p>
            </div>

            {/* Print Options */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Selecciona una opción de impresión:</h4>
              
              {/* Traditional Print */}
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={handleTraditionalPrint}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-600" />
                    Impresión Tradicional
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-gray-600">
                    Usa la impresora conectada por USB o red (compatible con todas las impresoras)
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Disponible en todos los dispositivos</span>
                  </div>
                </CardContent>
              </Card>

              {/* Thermal Bluetooth Print */}
              <Card 
                className={`cursor-pointer transition-colors ${
                  bluetoothSupported 
                    ? 'hover:bg-blue-50 border-blue-200' 
                    : 'opacity-50 cursor-not-allowed bg-gray-50'
                }`}
                onClick={bluetoothSupported ? handleThermalPrint : undefined}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bluetooth className="h-4 w-4 text-blue-600" />
                    Impresora Térmica Bluetooth
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-gray-600">
                    Conecta directamente con impresoras térmicas como Bluedreamer 58mm
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <div className={`w-2 h-2 rounded-full ${bluetoothSupported ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                    <span className={`text-xs ${bluetoothSupported ? 'text-blue-600' : 'text-gray-500'}`}>
                      {bluetoothSupported ? 'Compatible con iPad y dispositivos modernos' : 'No soportado en este navegador'}
                    </span>
                  </div>
                  {bluetoothSupported && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      💡 Ideal para iPad con impresoras portátiles Bluetooth
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={handleSkipPrint}
                className="flex-1"
              >
                Continuar sin Imprimir
              </Button>
              <Button 
                onClick={handleTraditionalPrint}
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium mb-1">💡 Recomendaciones:</p>
              <ul className="space-y-1">
                <li>• <strong>PC/Laptop:</strong> Usa impresión tradicional para impresoras USB/red</li>
                <li>• <strong>iPad/Tablet:</strong> Conecta una impresora térmica Bluetooth (ej: Bluedreamer 58mm)</li>
                <li>• <strong>Sin impresora:</strong> Puedes continuar y reimprimir después desde el historial de ventas</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thermal Printer Modal */}
      <ThermalPrinter
        isOpen={showThermalPrinter}
        onClose={handleCloseThermalPrinter}
        receiptData={receiptData}
      />
    </>
  );
}