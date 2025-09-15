import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Calculator, DollarSign, Banknote } from "lucide-react";
import { printCashClosingReceipt } from "./cash-closing-receipt";

interface CashClosingModalProps {
  summary: any;
  activeCashRegister: any;
  onClose: () => void;
}

const billDenominations = [
  { value: 1000, label: "1.000", color: "bg-orange-100" },
  { value: 500, label: "500", color: "bg-red-100" },
  { value: 200, label: "200", color: "bg-pink-100" },
  { value: 100, label: "100", color: "bg-yellow-100" },
  { value: 50, label: "50", color: "bg-green-100" },
  { value: 20, label: "20", color: "bg-blue-100" },
];

export default function CashClosingModal({ summary, activeCashRegister, onClose }: CashClosingModalProps) {
  const [billCounts, setBillCounts] = useState<{ [key: number]: number }>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's warehouse information
  const { data: userWarehouse } = useQuery<any>({
    queryKey: ["/api/user/warehouse"],
  });
  const [coinsTotal, setCoinsTotal] = useState<number>(0);

  const billsTotal = billDenominations.reduce((sum, denom) => {
    return sum + (billCounts[denom.value] || 0) * denom.value;
  }, 0);

  const totalCounted = billsTotal + coinsTotal;
  const expectedBalance = summary?.expectedBalance || 0;
  const difference = totalCounted - expectedBalance;

  const closeCashMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/cash-register/${activeCashRegister.id}/close`, {
        closingAmount: totalCounted,
        billCounts,
        coinsTotal
      });
      return response.json();
    },
    onSuccess: () => {
      // Generate and print cash closing receipt
      const receiptData = {
        cashRegisterId: activeCashRegister.id,
        openingAmount: summary?.openingAmount || 0,
        totalSales: summary?.totalSales || 0,
        totalIncome: summary?.totalIncome || 0,
        totalExpenses: summary?.totalExpenses || 0,
        totalWithdrawals: summary?.totalWithdrawals || 0,
        expectedBalance: expectedBalance,
        actualBalance: totalCounted,
        difference: difference,
        billCounts,
        coinsTotal,
        salesByMethod: summary?.salesByMethod || [],
        cashier: user?.username || "Cajero",
        supervisor: "", // Can be filled manually or set via form
        branch: (userWarehouse?.name) || (user?.username === 'MIGUELITO' ? 'Lomas del Sol' : 'Sucursal Principal'),
        openTime: new Date(activeCashRegister.createdAt),
        closeTime: new Date(),
      };

      printCashClosingReceipt(receiptData);

      toast({
        title: "Caja cerrada exitosamente",
        description: `Balance final: $${totalCounted.toFixed(2)} - Reporte impreso. El turno ha finalizado.`,
        duration: 8000,
      });
      
      // Invalidate all relevant queries to force refresh
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-register/closures"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      onClose();
      
      // Force a small delay to ensure state updates
      setTimeout(() => {
        // Redirect to POS to show the new state
        window.location.reload();
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error al cerrar caja",
        description: error.message || "No se pudo cerrar la caja",
        variant: "destructive",
      });
    },
  });

  const handleBillCountChange = (denomination: number, count: string) => {
    const numCount = parseInt(count) || 0;
    setBillCounts(prev => ({
      ...prev,
      [denomination]: numCount
    }));
  };

  const handleCoinsChange = (amount: string) => {
    setCoinsTotal(parseFloat(amount) || 0);
  };

  const handleCloseCash = () => {
    if (totalCounted === 0) {
      toast({
        title: "Error",
        description: "Debe contar al menos una denominación",
        variant: "destructive",
      });
      return;
    }
    closeCashMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Balance Esperado</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              ${expectedBalance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium">Total Contado</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              ${totalCounted.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Difference */}
      {difference !== 0 && (
        <Card className={`border-2 ${difference > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {difference > 0 ? 'Sobrante vs Sistema:' : 'Faltante vs Sistema:'}
              </span>
              <span className={`text-xl font-bold ${difference > 0 ? 'text-green-700' : 'text-red-700'}`}>
                {difference > 0 ? '+' : ''}${difference.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Denomination Counter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Conteo de Denominaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Bills */}
            <div>
              <h4 className="font-medium mb-3 text-gray-700">Billetes</h4>
              <div className="space-y-3">
                {billDenominations.map((denom) => (
                  <div key={denom.value} className={`p-3 rounded-lg ${denom.color} border`}>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-medium">
                        ${denom.label}
                      </Label>
                      <span className="text-sm text-gray-600">
                        = ${((billCounts[denom.value] || 0) * denom.value).toLocaleString()}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={billCounts[denom.value] || ''}
                      onChange={(e) => handleBillCountChange(denom.value, e.target.value)}
                      placeholder="0"
                      className="bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Coins */}
            <div>
              <h4 className="font-medium mb-3 text-gray-700">Monedas</h4>
              <div className="p-3 rounded-lg bg-gray-100 border">
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-medium">
                    Total en Monedas
                  </Label>
                  <span className="text-sm text-gray-600">
                    Suma general
                  </span>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={coinsTotal || ''}
                  onChange={(e) => handleCoinsChange(e.target.value)}
                  placeholder="0.00"
                  className="bg-white"
                />
              </div>
            </div>
          </div>
          
          {/* Payment Methods Summary */}
          {summary?.salesByMethod && summary.salesByMethod.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium mb-3 text-gray-700">Ventas por Método de Pago (Informativo)</h4>
              <div className="grid grid-cols-2 gap-2">
                {summary.salesByMethod.map((method: any) => (
                  <div key={method.method} className="flex items-center justify-between p-2 bg-blue-50 rounded border">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        method.method === 'cash' ? 'bg-green-500' :
                        method.method === 'card' ? 'bg-blue-500' :
                        method.method === 'transfer' ? 'bg-purple-500' :
                        method.method === 'credit' ? 'bg-orange-500' :
                        'bg-gray-500'
                      }`} />
                      <span className="text-sm font-medium">
                        {method.method === 'cash' ? 'Efectivo' :
                         method.method === 'card' ? 'Tarjeta' :
                         method.method === 'transfer' ? 'Transferencia' :
                         method.method === 'credit' ? 'Crédito' :
                         method.method}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">${method.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleCloseCash}
          disabled={closeCashMutation.isPending || totalCounted === 0}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {closeCashMutation.isPending ? "Cerrando..." : "Cerrar Caja"}
        </Button>
      </div>
    </div>
  );
}