import { useSettings } from "@/contexts/SettingsContext";
import { generateReceipt } from "./receipt-generator";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface PaymentData {
  method: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  reference?: string;
  change?: number;
}

interface ReceiptData {
  items: CartItem[];
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
  payment: PaymentData;
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

export function useReceiptGenerator() {
  const { formatCurrency } = useSettings();
  
  return {
    generateReceipt: (data: ReceiptData) => generateReceipt(data, formatCurrency)
  };
}