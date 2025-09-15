interface CashClosingReceiptData {
  cashRegisterId: number;
  openingAmount: number;
  totalSales: number;
  totalIncome: number;
  totalExpenses: number;
  totalWithdrawals: number;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  billCounts: { [key: number]: number };
  coinsTotal: number;
  salesByMethod: Array<{ method: string; total: number; count: number }>;
  cashier: string;
  supervisor?: string;
  branch: string;
  openTime: Date;
  closeTime: Date;
}

export function generateCashClosingReceipt(data: CashClosingReceiptData): string {
  const billDenominations = [
    { value: 1000, label: "1.000" },
    { value: 500, label: "500" },
    { value: 200, label: "200" },
    { value: 100, label: "100" },
    { value: 50, label: "50" },
    { value: 20, label: "20" },
  ];

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Cierre de Caja</title>
      <style>
        body {
          font-family: 'Courier New', monospace;
          margin: 0;
          padding: 5mm;
          font-size: 11px;
          line-height: 1.2;
          width: 80mm;
          max-width: 80mm;
        }
        .receipt {
          width: 100%;
          padding: 0;
        }
        .header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 5px;
          margin-bottom: 8px;
        }
        .business-name {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 3px;
        }
        .section {
          margin-bottom: 8px;
          border-bottom: 1px dashed #000;
          padding-bottom: 5px;
        }
        .section-title {
          font-weight: bold;
          text-align: center;
          margin-bottom: 4px;
          text-decoration: underline;
          font-size: 10px;
        }
        .line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1px;
          font-size: 10px;
        }
        .total-line {
          font-weight: bold;
          border-top: 1px dashed #000;
          padding-top: 2px;
          margin-top: 3px;
        }
        .denomination-grid {
          font-size: 8px;
          margin-bottom: 5px;
        }
        .denomination-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1px;
        }
        .signature-section {
          margin-top: 8px;
          padding-top: 5px;
          border-top: 1px dashed #000;
        }
        .signature-line {
          border-bottom: 1px solid #000;
          margin: 8px 0 3px 0;
          height: 15px;
        }
        .difference {
          font-size: 12px;
          font-weight: bold;
          text-align: center;
          padding: 3px;
          border: 1px dashed #000;
          margin: 5px 0;
        }
        .difference.positive {
          color: #000;
        }
        .difference.negative {
          color: #000;
        }
        @media print {
          body { 
            margin: 0; 
            padding: 2mm;
            width: 80mm;
            font-size: 10px;
          }
          .receipt {
            width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="business-name">CAJA SAS ENTERPRISE</div>
          <div>CIERRE DE CAJA #${data.cashRegisterId}</div>
          <div>Sucursal: ${data.branch}</div>
          <div>Fecha: ${data.closeTime.toLocaleDateString()}</div>
          <div>Hora: ${data.closeTime.toLocaleTimeString()}</div>
        </div>

        <div class="section">
          <div class="section-title">RESUMEN OPERATIVO</div>
          <div class="line">
            <span>Apertura:</span>
            <span>$${data.openingAmount.toFixed(2)}</span>
          </div>
          <div class="line">
            <span>Ingresos:</span>
            <span>$${data.totalIncome.toFixed(2)}</span>
          </div>
          <div class="line">
            <span>Gastos:</span>
            <span>$${data.totalExpenses.toFixed(2)}</span>
          </div>
          <div class="line">
            <span>Retiros:</span>
            <span>$${data.totalWithdrawals.toFixed(2)}</span>
          </div>
          <div class="line total-line">
            <span>Balance Esperado:</span>
            <span>$${data.expectedBalance.toFixed(2)}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">CONTEO FÍSICO</div>
          <div class="denomination-grid">
            ${billDenominations.map(denom => `
              <div class="denomination-row">
                <span>$${denom.label}:</span>
                <span>${data.billCounts[denom.value] || 0} = $${((data.billCounts[denom.value] || 0) * denom.value).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="line">
            <span>Total Billetes:</span>
            <span>$${billDenominations.reduce((sum, denom) => sum + (data.billCounts[denom.value] || 0) * denom.value, 0).toFixed(2)}</span>
          </div>
          <div class="line">
            <span>Total Monedas:</span>
            <span>$${data.coinsTotal.toFixed(2)}</span>
          </div>
          <div class="line total-line">
            <span>Total Contado:</span>
            <span>$${data.actualBalance.toFixed(2)}</span>
          </div>
        </div>

        ${data.difference !== 0 ? `
          <div class="difference ${data.difference > 0 ? 'positive' : 'negative'}">
            ${data.difference > 0 ? 'SOBRANTE' : 'FALTANTE'}: ${data.difference > 0 ? '+' : ''}$${data.difference.toFixed(2)}
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">VENTAS POR MÉTODO</div>
          ${data.salesByMethod.map(method => `
            <div class="line">
              <span>${method.method === 'cash' ? 'Efectivo' :
                     method.method === 'card' ? 'Tarjeta' :
                     method.method === 'transfer' ? 'Transferencia' :
                     method.method === 'credit' ? 'Crédito' :
                     method.method} (${method.count}):</span>
              <span>$${method.total.toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="line total-line">
            <span>Total Ventas:</span>
            <span>$${data.salesByMethod.reduce((sum, method) => sum + method.total, 0).toFixed(2)}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">HORARIOS</div>
          <div class="line">
            <span>Apertura:</span>
            <span>${data.openTime.toLocaleDateString()} ${data.openTime.toLocaleTimeString()}</span>
          </div>
          <div class="line">
            <span>Cierre:</span>
            <span>${data.closeTime.toLocaleDateString()} ${data.closeTime.toLocaleTimeString()}</span>
          </div>
        </div>

        <div class="signature-section">
          <div style="text-align: center; margin-bottom: 15px;">
            <strong>FIRMAS DE AUTORIZACIÓN</strong>
          </div>
          
          <div>
            <div>Cajero: ${data.cashier}</div>
            <div class="signature-line"></div>
            <div style="text-align: center; font-size: 10px;">Firma del Cajero</div>
          </div>
          
          <div style="margin-top: 10px;">
            <div>Encargado: ${data.supervisor || '_________________'}</div>
            <div class="signature-line"></div>
            <div style="text-align: center; font-size: 9px;">Firma del Encargado</div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 8px; font-size: 9px;">
          <p>================================</p>
          <p>Este documento certifica el cierre de caja</p>
          <p>Conservar para auditoría</p>
          <p>================================</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return receiptHtml;
}

export function printCashClosingReceipt(data: CashClosingReceiptData) {
  const receiptHtml = generateCashClosingReceipt(data);
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }
}