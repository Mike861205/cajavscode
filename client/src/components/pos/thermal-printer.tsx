import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Bluetooth, Wifi, Usb, Settings, Check, X, RefreshCw, Share2, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ESC/POS Commands for thermal printers
const ESC = '\x1B';
const GS = '\x1D';

const THERMAL_COMMANDS = {
  INIT: ESC + '@',
  RESET: ESC + '@',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  CUT_PAPER: GS + 'V' + '\x41' + '\x03',
  LINE_FEED: '\n',
  DOUBLE_HEIGHT: ESC + '!' + '\x10',
  NORMAL_SIZE: ESC + '!' + '\x00',
  SMALL_FONT: ESC + '!' + '\x01',
  PRINT_AND_FEED: ESC + 'd' + '\x03'
};

interface ThermalPrinterDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'usb' | 'network';
  connected: boolean;
  device?: any; // BluetoothDevice
  characteristic?: any; // BluetoothRemoteGATTCharacteristic
}

interface ReceiptData {
  items: any[];
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
  payment: any;
  saleId: string;
  timestamp: Date;
  cashier: string;
  businessName: string;
  ticketTitle?: string;
  warehouse?: {
    name: string;
    address: string;
    phone?: string;
    rfc?: string;
    taxRegime?: string;
  };
}

interface ThermalPrinterProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
}

export function ThermalPrinter({ isOpen, onClose, receiptData }: ThermalPrinterProps) {
  const [devices, setDevices] = useState<ThermalPrinterDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [bluetoothSupported, setBluetoothSupported] = useState(false);

  useEffect(() => {
    // Detect Safari and iOS devices
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check if Web Bluetooth is supported (Safari on iOS doesn't support it well)
    const hasBluetoothAPI = (navigator as any).bluetooth && !isSafari;
    setBluetoothSupported(hasBluetoothAPI);
    
    // Load saved devices from localStorage
    const savedDevices = localStorage.getItem('thermalPrinterDevices');
    if (savedDevices && hasBluetoothAPI) {
      setDevices(JSON.parse(savedDevices));
    }

    // Always add mobile/Safari fallback options for iOS/iPad devices
    if (isSafari || isMobile) {
      const mobileOptions: ThermalPrinterDevice[] = [
        {
          id: 'mobile-share',
          name: 'Compartir Ticket (AirDrop/WhatsApp/Mensaje)',
          type: 'network',
          connected: true
        },
        {
          id: 'mobile-print',
          name: 'Imprimir con AirPrint (iOS)',
          type: 'network',
          connected: true
        }
      ];
      setDevices(prev => {
        // Remove existing mobile options to avoid duplicates
        const filtered = prev.filter(d => !d.id.startsWith('mobile-'));
        return [...filtered, ...mobileOptions];
      });
    }
  }, []);

  const scanForBluetoothPrinters = async () => {
    if (!bluetoothSupported) {
      toast({
        title: "Bluetooth no compatible",
        description: "Tu dispositivo no soporta Web Bluetooth API",
        variant: "destructive"
      });
      return;
    }

    setIsScanning(true);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Generic Access
          { namePrefix: 'Blue' }, // Bluedreamer devices
          { namePrefix: 'POS' },  // POS printers
          { namePrefix: 'Thermal' }, // Thermal printers
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery service
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Common printer service
        ]
      });

      const newDevice: ThermalPrinterDevice = {
        id: device.id,
        name: device.name || 'Impresora Térmica',
        type: 'bluetooth',
        connected: false,
        device
      };

      const updatedDevices = [...devices.filter(d => d.id !== device.id), newDevice];
      setDevices(updatedDevices);
      localStorage.setItem('thermalPrinterDevices', JSON.stringify(updatedDevices));

      toast({
        title: "Impresora encontrada",
        description: `${device.name} agregada a la lista de dispositivos`,
      });

    } catch (error) {
      console.error('Error scanning for Bluetooth devices:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo escanear dispositivos Bluetooth",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const connectToDevice = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device || !device.device) return;

    try {
      const server = await device.device.gatt?.connect();
      if (!server) throw new Error('No se pudo conectar al servidor GATT');

      // Try to find the printer service
      let service;
      const serviceUUIDs = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000ff00-0000-1000-8000-00805f9b34fb'
      ];

      for (const uuid of serviceUUIDs) {
        try {
          service = await server.getPrimaryService(uuid);
          break;
        } catch (e) {
          continue;
        }
      }

      if (!service) {
        // Try to get all services and use the first available
        const services = await server.getPrimaryServices();
        service = services[0];
      }

      if (!service) throw new Error('No se encontró servicio de impresión');

      const characteristics = await service.getCharacteristics();
      const writeCharacteristic = characteristics.find((c: any) => 
        c.properties.write || c.properties.writeWithoutResponse
      );

      if (!writeCharacteristic) throw new Error('No se encontró característica de escritura');

      // Update device with connection info
      setDevices(prev => prev.map(d => 
        d.id === deviceId 
          ? { ...d, connected: true, characteristic: writeCharacteristic }
          : d
      ));

      toast({
        title: "Conexión exitosa",
        description: `Conectado a ${device.name}`,
      });

    } catch (error) {
      console.error('Error connecting to device:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar a la impresora",
        variant: "destructive"
      });
    }
  };

  const generateThermalReceipt = (data: ReceiptData): string => {
    if (!data) return '';
    
    let receipt = '';
    
    // Initialize printer
    receipt += THERMAL_COMMANDS.INIT;
    
    // Header - Business Name (Bold, Center)
    receipt += THERMAL_COMMANDS.ALIGN_CENTER;
    receipt += THERMAL_COMMANDS.BOLD_ON;
    receipt += THERMAL_COMMANDS.DOUBLE_HEIGHT;
    receipt += data.businessName + THERMAL_COMMANDS.LINE_FEED;
    receipt += THERMAL_COMMANDS.NORMAL_SIZE;
    receipt += THERMAL_COMMANDS.BOLD_OFF;
    
    // Warehouse info
    if (data.warehouse) {
      receipt += data.warehouse.name + THERMAL_COMMANDS.LINE_FEED;
      receipt += data.warehouse.address + THERMAL_COMMANDS.LINE_FEED;
      if (data.warehouse.phone) receipt += `Tel: ${data.warehouse.phone}` + THERMAL_COMMANDS.LINE_FEED;
      if (data.warehouse.rfc) receipt += `RFC: ${data.warehouse.rfc}` + THERMAL_COMMANDS.LINE_FEED;
    }
    
    receipt += THERMAL_COMMANDS.LINE_FEED;
    
    // Sale info
    receipt += THERMAL_COMMANDS.ALIGN_LEFT;
    receipt += `Ticket #${data.saleId}` + THERMAL_COMMANDS.LINE_FEED;
    receipt += `Fecha: ${data.timestamp.toLocaleDateString()}` + THERMAL_COMMANDS.LINE_FEED;
    receipt += `Hora: ${data.timestamp.toLocaleTimeString()}` + THERMAL_COMMANDS.LINE_FEED;
    receipt += `Cajero: ${data.cashier}` + THERMAL_COMMANDS.LINE_FEED;
    
    if (data.ticketTitle) {
      receipt += THERMAL_COMMANDS.BOLD_ON;
      receipt += `Cliente: ${data.ticketTitle}` + THERMAL_COMMANDS.LINE_FEED;
      receipt += THERMAL_COMMANDS.BOLD_OFF;
    }
    
    receipt += THERMAL_COMMANDS.LINE_FEED;
    receipt += '================================' + THERMAL_COMMANDS.LINE_FEED;
    
    // Items
    data.items.forEach(item => {
      receipt += `${item.name}` + THERMAL_COMMANDS.LINE_FEED;
      receipt += `${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}` + THERMAL_COMMANDS.LINE_FEED;
    });
    
    receipt += '================================' + THERMAL_COMMANDS.LINE_FEED;
    
    // Totals
    receipt += THERMAL_COMMANDS.ALIGN_RIGHT;
    receipt += `Subtotal: $${data.subtotal.toFixed(2)}` + THERMAL_COMMANDS.LINE_FEED;
    if (data.discount && data.discount > 0) {
      receipt += `Descuento: -$${data.discount.toFixed(2)}` + THERMAL_COMMANDS.LINE_FEED;
    }
    receipt += `Impuestos: $${data.tax.toFixed(2)}` + THERMAL_COMMANDS.LINE_FEED;
    
    receipt += THERMAL_COMMANDS.BOLD_ON;
    receipt += `TOTAL: $${data.total.toFixed(2)}` + THERMAL_COMMANDS.LINE_FEED;
    receipt += THERMAL_COMMANDS.BOLD_OFF;
    
    receipt += THERMAL_COMMANDS.LINE_FEED;
    receipt += THERMAL_COMMANDS.ALIGN_LEFT;
    receipt += `Pago: ${getPaymentMethodName(data.payment.method)}` + THERMAL_COMMANDS.LINE_FEED;
    receipt += `Recibido: $${data.payment.amount.toFixed(2)}` + THERMAL_COMMANDS.LINE_FEED;
    if (data.payment.change && data.payment.change > 0) {
      receipt += `Cambio: $${data.payment.change.toFixed(2)}` + THERMAL_COMMANDS.LINE_FEED;
    }
    
    receipt += THERMAL_COMMANDS.LINE_FEED;
    receipt += THERMAL_COMMANDS.ALIGN_CENTER;
    receipt += '********************************' + THERMAL_COMMANDS.LINE_FEED;
    receipt += 'GRACIAS POR SU COMPRA' + THERMAL_COMMANDS.LINE_FEED;
    receipt += '********************************' + THERMAL_COMMANDS.LINE_FEED;
    receipt += THERMAL_COMMANDS.LINE_FEED;
    receipt += THERMAL_COMMANDS.LINE_FEED;
    
    // Cut paper
    receipt += THERMAL_COMMANDS.CUT_PAPER;
    
    return receipt;
  };

  const printToThermalPrinter = async () => {
    const device = devices.find(d => d.id === selectedDevice);
    if (!device) {
      toast({
        title: "Sin dispositivo",
        description: "Selecciona un método de impresión",
        variant: "destructive"
      });
      return;
    }

    setIsPrinting(true);
    try {
      // Handle mobile fallback options
      if (device.id === 'mobile-share') {
        await handleMobileShare();
      } else if (device.id === 'mobile-print') {
        await handleMobilePrint();
      } else {
        // Handle Bluetooth printer
        if (!device.characteristic) {
          toast({
            title: "Sin conexión",
            description: "Conecta la impresora térmica primero",
            variant: "destructive"
          });
          return;
        }

        const thermalReceiptData = generateThermalReceipt(receiptData);
        const encoder = new TextEncoder();
        const data = encoder.encode(thermalReceiptData);
        
        // Split data into chunks if needed (some devices have limited write sizes)
        const chunkSize = 20;
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          await device.characteristic.writeValue(chunk);
          // Small delay between chunks
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        toast({
          title: "Impresión exitosa",
          description: "Ticket enviado a la impresora térmica",
        });
      }

      onClose();

    } catch (error) {
      console.error('Error printing:', error);
      toast({
        title: "Error de impresión",
        description: "No se pudo imprimir el ticket",
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const generatePlainTextReceipt = (data: ReceiptData): string => {
    if (!data) return '';
    
    let receipt = '';
    
    // Header
    receipt += `${data.businessName}\n`;
    receipt += `================================\n`;
    
    // Warehouse info
    if (data.warehouse) {
      receipt += `${data.warehouse.name}\n`;
      receipt += `${data.warehouse.address}\n`;
      if (data.warehouse.phone) receipt += `Tel: ${data.warehouse.phone}\n`;
      if (data.warehouse.rfc) receipt += `RFC: ${data.warehouse.rfc}\n`;
    }
    
    receipt += `\n`;
    
    // Sale info
    receipt += `Ticket #${data.saleId}\n`;
    receipt += `Fecha: ${data.timestamp.toLocaleDateString()}\n`;
    receipt += `Hora: ${data.timestamp.toLocaleTimeString()}\n`;
    receipt += `Cajero: ${data.cashier}\n`;
    
    if (data.ticketTitle) {
      receipt += `Cliente: ${data.ticketTitle}\n`;
    }
    
    receipt += `\n`;
    receipt += `================================\n`;
    
    // Items
    data.items.forEach(item => {
      receipt += `${item.name}\n`;
      receipt += `${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}\n`;
    });
    
    receipt += `================================\n`;
    
    // Totals
    receipt += `Subtotal: $${data.subtotal.toFixed(2)}\n`;
    if (data.discount && data.discount > 0) {
      receipt += `Descuento: -$${data.discount.toFixed(2)}\n`;
    }
    receipt += `Impuestos: $${data.tax.toFixed(2)}\n`;
    receipt += `TOTAL: $${data.total.toFixed(2)}\n`;
    
    receipt += `\n`;
    receipt += `Pago: ${getPaymentMethodName(data.payment.method)}\n`;
    receipt += `Recibido: $${data.payment.amount.toFixed(2)}\n`;
    if (data.payment.change && data.payment.change > 0) {
      receipt += `Cambio: $${data.payment.change.toFixed(2)}\n`;
    }
    
    receipt += `\n`;
    receipt += `********************************\n`;
    receipt += `GRACIAS POR SU COMPRA\n`;
    receipt += `********************************\n`;
    
    return receipt;
  };

  const handleMobileShare = async () => {
    const receiptText = generatePlainTextReceipt(receiptData);
    
    if ((navigator as any).share) {
      // Use Web Share API if available
      try {
        await (navigator as any).share({
          title: `Ticket #${receiptData.saleId}`,
          text: receiptText
        });
        
        toast({
          title: "Ticket compartido",
          description: "Se abrió el menú para compartir el ticket",
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(receiptText);
        toast({
          title: "Ticket copiado",
          description: "El ticket se copió al portapapeles. Pégalo en WhatsApp o cualquier app",
        });
      } catch (error) {
        // Create a text blob and download
        const blob = new Blob([receiptText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${receiptData.saleId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: "Ticket descargado",
          description: "Se descargó el archivo del ticket",
        });
      }
    }
  };

  const handleMobilePrint = async () => {
    const receiptText = generatePlainTextReceipt(receiptData);
    
    // Create a printable HTML version
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket #${receiptData.saleId}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          @media print {
            @page { margin: 0; size: 58mm auto; }
            body { margin: 0; font-family: monospace; font-size: 12px; }
          }
          body { 
            font-family: monospace; 
            font-size: 14px; 
            line-height: 1.2; 
            max-width: 58mm; 
            margin: 0 auto; 
            padding: 10px;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>${receiptText}</body>
      </html>
    `;
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHTML);
      printWindow.document.close();
      
      // Auto-print after a brief delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
      toast({
        title: "Ventana de impresión abierta",
        description: "Se abrió la ventana para imprimir con AirPrint",
      });
    } else {
      toast({
        title: "Error",
        description: "No se pudo abrir la ventana de impresión",
        variant: "destructive"
      });
    }
  };

  const getPaymentMethodName = (method: string): string => {
    const methods: { [key: string]: string } = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      credit: 'Crédito',
      voucher: 'Vale Despensa',
      giftcard: 'Tarjeta Regalo'
    };
    return methods[method] || method;
  };

  const removeDevice = (deviceId: string) => {
    const updatedDevices = devices.filter(d => d.id !== deviceId);
    setDevices(updatedDevices);
    localStorage.setItem('thermalPrinterDevices', JSON.stringify(updatedDevices));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Impresión Térmica
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bluetooth Support Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Bluetooth className="h-4 w-4" />
              <span className="text-sm">Bluetooth Web API</span>
            </div>
            <Badge variant={bluetoothSupported ? "default" : "destructive"}>
              {bluetoothSupported ? "Soportado" : "No Soportado"}
            </Badge>
          </div>

          {/* Scan for devices */}
          <div className="space-y-2">
            <Button 
              onClick={scanForBluetoothPrinters}
              disabled={!bluetoothSupported || isScanning}
              className="w-full"
              variant="outline"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Buscando impresoras...
                </>
              ) : (
                <>
                  <Bluetooth className="h-4 w-4 mr-2" />
                  Buscar Impresoras Bluetooth
                </>
              )}
            </Button>
          </div>

          {/* Device List */}
          {devices.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Impresoras Encontradas:</label>
              {devices.map(device => (
                <Card key={device.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {device.type === 'bluetooth' && <Bluetooth className="h-4 w-4 text-blue-500" />}
                      {device.id === 'mobile-share' && <Share2 className="h-4 w-4 text-green-500" />}
                      {device.id === 'mobile-print' && <FileText className="h-4 w-4 text-purple-500" />}
                      <div>
                        <p className="text-sm font-medium">{device.name}</p>
                        <p className="text-xs text-gray-500">
                          {device.type === 'bluetooth' ? `Bluetooth • ${device.id.slice(0, 8)}...` : 
                           device.id === 'mobile-share' ? 'AirDrop/WhatsApp/Mensaje' :
                           device.id === 'mobile-print' ? 'AirPrint/Impresión Sistema' : 
                           'Red/Wi-Fi'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={device.connected ? "default" : "secondary"}>
                        {device.connected ? "Disponible" : "Desconectada"}
                      </Badge>
                      {device.type === 'bluetooth' && !device.connected ? (
                        <Button 
                          size="sm" 
                          onClick={() => connectToDevice(device.id)}
                          className="text-xs"
                        >
                          Conectar
                        </Button>
                      ) : device.type === 'bluetooth' && device.connected ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                      {device.type === 'bluetooth' && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => removeDevice(device.id)}
                          className="text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Device Selection */}
          {devices.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar Método de Impresión:</label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un método de impresión..." />
                </SelectTrigger>
                <SelectContent>
                  {devices.map(device => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Print Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              onClick={printToThermalPrinter}
              disabled={!selectedDevice || isPrinting}
              className="flex-1"
            >
              {isPrinting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Imprimiendo...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Ticket
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="font-medium mb-2 text-orange-800">⚠️ Limitaciones de Safari en iOS/iPad:</p>
            <ul className="space-y-1 text-orange-700">
              <li>• <strong>Safari NO soporta</strong> Web Bluetooth API en dispositivos iOS</li>
              <li>• Para impresoras Bluedreamer 58mm en iPad, usa las opciones móviles:</li>
              <li className="ml-4">- "Compartir Ticket" → AirDrop, WhatsApp, Mensaje</li>
              <li className="ml-4">- "Imprimir con AirPrint" → Si tu impresora tiene Wi-Fi</li>
              <li>• Para Bluetooth directo, usa Chrome en computadora de escritorio</li>
              <li>• Alternativa: Conecta la impresora a Wi-Fi para usar AirPrint</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}