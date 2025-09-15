import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Percent,
  UserCheck,
  UserX
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface CustomerStats {
  totalCustomers: number;
  eligibleCustomers: number;
  ineligibleCustomers: number;
  totalCreditAvailable: number;
  totalCreditUsed: number;
  avgCreditAvailable: number;
  avgCreditUsed: number;
  creditUtilizationRate: number;
  topCreditCustomers: Array<{
    id: number;
    name: string;
    creditAvailable: number;
    creditUsed: number;
    utilizationRate: number;
  }>;
  topUsageCustomers: Array<{
    id: number;
    name: string;
    creditAvailable: number;
    creditUsed: number;
    utilizationRate: number;
  }>;
}

export default function CustomerDashboard() {
  const { formatCurrency } = useSettings();
  const { data: stats, isLoading } = useQuery<CustomerStats>({
    queryKey: ['/api/customers/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const eligibilityRate = stats.totalCustomers > 0 
    ? (stats.eligibleCustomers / stats.totalCustomers) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Dashboard de Clientes</h1>
            <p className="text-blue-100">Análisis integral de cartera de clientes y créditos</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.totalCustomers}</div>
            <div className="text-sm text-blue-100">Total Clientes</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold">${stats.totalCreditAvailable.toFixed(2)}</div>
            <div className="text-sm text-blue-100">Crédito Total</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.creditUtilizationRate.toFixed(1)}%</div>
            <div className="text-sm text-blue-100">Tasa Utilización</div>
          </div>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Clientes Elegibles
            </CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.eligibleCustomers}</div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={eligibilityRate} className="flex-1 h-2" />
              <span className="text-xs text-green-600">{eligibilityRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">
              Clientes No Elegibles
            </CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{stats.ineligibleCustomers}</div>
            <div className="flex items-center gap-2 mt-2">
              <Progress value={100 - eligibilityRate} className="flex-1 h-2" />
              <span className="text-xs text-red-600">{(100 - eligibilityRate).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Crédito Promedio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(stats.avgCreditAvailable)}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Línea promedio por cliente
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">
              Uso Promedio
            </CardTitle>
            <Percent className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              ${stats.avgCreditUsed.toFixed(2)}
            </div>
            <p className="text-xs text-purple-600 mt-1">
              Crédito usado promedio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clientes con Mayor Crédito */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top 5 - Mayor Crédito Disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topCreditCustomers.map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-400' : 'bg-green-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">
                        Usado: ${customer.creditUsed.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      ${customer.creditAvailable.toFixed(2)}
                    </p>
                    <Badge variant={customer.utilizationRate > 75 ? "destructive" : 
                                   customer.utilizationRate > 50 ? "secondary" : "default"}>
                      {customer.utilizationRate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Clientes con Mayor Uso de Crédito */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Top 5 - Mayor Crédito Utilizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topUsageCustomers.map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-red-500' : 
                      index === 1 ? 'bg-orange-500' : 
                      index === 2 ? 'bg-yellow-500' : 'bg-orange-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">
                        Disponible: ${customer.creditAvailable.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">
                      ${customer.creditUsed.toFixed(2)}
                    </p>
                    <Badge variant={customer.utilizationRate > 90 ? "destructive" : 
                                   customer.utilizationRate > 70 ? "secondary" : "outline"}>
                      {customer.utilizationRate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Resumen Analítico de Créditos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                ${(stats.totalCreditAvailable - stats.totalCreditUsed).toFixed(2)}
              </div>
              <p className="text-sm text-gray-600">Crédito Disponible Total</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${((stats.totalCreditAvailable - stats.totalCreditUsed) / stats.totalCreditAvailable) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                ${stats.totalCreditUsed.toFixed(2)}
              </div>
              <p className="text-sm text-gray-600">Crédito Utilizado Total</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${stats.creditUtilizationRate}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                ${stats.totalCreditAvailable.toFixed(2)}
              </div>
              <p className="text-sm text-gray-600">Línea Total Otorgada</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full w-full"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}