import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStats {
  todaySales: number;
  monthSales: number;
  totalTransactions: number;
  totalProducts: number;
  lowStockCount: number;
  recentSales: Array<{
    id: number;
    total: string;
    paymentMethod: string;
    createdAt: string;
    customerName?: string;
    userName?: string;
  }>;
  topProducts: Array<{
    id: number;
    name: string;
    soldQuantity: number;
    revenue: number;
  }>;
  salesChart: Array<{
    date: string;
    amount: number;
  }>;
}

export default function RecentActivity() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} minutos`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'voucher': 'Vale de Despensa',
      'credit': 'Crédito'
    };
    return methods[method] || method;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats?.recentSales && stats.recentSales.length > 0 ? (
            stats.recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Venta #{sale.id} completada
                  </p>
                  <p className="text-sm text-gray-500">
                    ${parseFloat(sale.total).toFixed(2)} - {getPaymentMethodLabel(sale.paymentMethod)}
                    {sale.userName && ` - ${sale.userName}`} - {formatTime(sale.createdAt)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No hay actividad reciente</p>
              <p className="text-xs text-gray-400 mt-1">Las ventas aparecerán aquí una vez procesadas</p>
            </div>
          )}
          
          {/* Show products with low stock */}
          {stats?.lowStockCount && stats.lowStockCount > 0 && (
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Stock bajo detectado</p>
                <p className="text-sm text-gray-500">
                  {stats.lowStockCount} producto{stats.lowStockCount > 1 ? 's' : ''} con stock bajo
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}