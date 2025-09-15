import { useSettings } from "@/contexts/SettingsContext";

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

export function generateReceipt(data: ReceiptData, formatCurrency?: (amount: number) => string): string {
  // Default fallback formatter if no context is available
  const defaultFormatter = (amount: number) => `$${amount.toFixed(2)}`;
  const currencyFormatter = formatCurrency || defaultFormatter;
  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket de Venta</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          margin: 0;
          padding: 20px;
          font-size: 12px;
          line-height: 1.4;
          max-width: 300px;
        }
        .receipt {
          border: 1px solid #000;
          padding: 10px;
        }
        .header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .business-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .items {
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .item-details {
          flex: 1;
        }
        .item-price {
          text-align: right;
          min-width: 60px;
        }
        .totals {
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .total-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .total-line.final {
          font-weight: bold;
          font-size: 14px;
          border-top: 1px solid #000;
          padding-top: 5px;
        }
        .payment-info {
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .footer {
          text-align: center;
          font-size: 10px;
        }
        .no-print {
          display: none;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="business-name">${data.businessName}</div>
          ${data.warehouse ? `
            <div>${data.warehouse.name}</div>
            <div>${data.warehouse.address}</div>
            ${data.warehouse.phone ? `<div>Tel: ${data.warehouse.phone}</div>` : ''}
            ${data.warehouse.rfc ? `<div>RFC: ${data.warehouse.rfc}</div>` : ''}
            ${data.warehouse.taxRegime ? `<div>Régimen: ${data.warehouse.taxRegime}</div>` : ''}
          ` : ''}
          <div>Ticket #${data.saleId}</div>
          <div>${data.timestamp.toLocaleDateString()} ${data.timestamp.toLocaleTimeString()}</div>
          <div>Cajero: ${data.cashier}</div>
          ${data.ticketTitle ? `<div style="font-weight: bold; margin-top: 5px;">Cliente/Pedido: ${data.ticketTitle}</div>` : ''}
        </div>

        <div class="items">
          <div style="font-weight: bold; margin-bottom: 5px;">PRODUCTOS</div>
          ${data.items.map(item => `
            <div class="item">
              <div class="item-details">
                <div>${item.name}</div>
                <div>${item.quantity} x ${currencyFormatter(item.price)}</div>
              </div>
              <div class="item-price">${currencyFormatter(item.quantity * item.price)}</div>
            </div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>${currencyFormatter(data.subtotal)}</span>
          </div>
          ${data.discount && data.discount > 0 ? `
            <div class="total-line" style="color: #d97706;">
              <span>Descuento:</span>
              <span>-${currencyFormatter(data.discount)}</span>
            </div>
          ` : ''}
          <div class="total-line">
            <span>Impuestos:</span>
            <span>${currencyFormatter(data.tax)}</span>
          </div>
          <div class="total-line final">
            <span>TOTAL:</span>
            <span>${currencyFormatter(data.total)}</span>
          </div>
        </div>

        <div class="payment-info">
          <div style="font-weight: bold; margin-bottom: 5px;">PAGO</div>
          <div class="total-line">
            <span>Método:</span>
            <span>${getPaymentMethodName(data.payment.method)}</span>
          </div>
          ${data.payment.currency !== 'USD' ? `
            <div class="total-line">
              <span>Moneda:</span>
              <span>${data.payment.currency}</span>
            </div>
            <div class="total-line">
              <span>Tasa cambio:</span>
              <span>${data.payment.exchangeRate}</span>
            </div>
          ` : ''}
          <div class="total-line">
            <span>Recibido:</span>
            <span>${currencyFormatter(data.payment.amount)}</span>
          </div>
          ${data.payment.change && data.payment.change > 0 ? `
            <div class="total-line">
              <span>Cambio:</span>
              <span>${currencyFormatter(data.payment.change)}</span>
            </div>
          ` : ''}
          ${data.payment.reference ? `
            <div class="total-line">
              <span>Referencia:</span>
              <span>${data.payment.reference}</span>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <div>¡Gracias por su compra!</div>
          <div>Caja SAS Enterprise</div>
          <div>www.cajasas.com</div>
        </div>
      </div>

      <div class="no-print" style="margin-top: 20px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px;">
          Imprimir Ticket
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; margin-left: 10px;">
          Cerrar
        </button>
      </div>
    </body>
    </html>
  `;

  return receiptHtml;
}

function getPaymentMethodName(method: string): string {
  const methods: { [key: string]: string } = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    credit: 'Crédito',
    voucher: 'Vale Despensa',
    giftcard: 'Tarjeta Regalo'
  };
  return methods[method] || method;
}

export function printReceipt(receiptData: ReceiptData): void {
  const receiptHtml = generateReceipt(receiptData);
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  
  if (printWindow) {
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    
    // Auto print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}