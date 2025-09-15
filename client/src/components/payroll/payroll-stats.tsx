import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Building } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useSettings } from "@/contexts/SettingsContext";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface PayrollStats {
  totalEmployees: number;
  averagePayroll: number;
  totalMonthlyPayroll: number;
  departmentDistribution: Array<{
    department: string;
    count: number;
    percentage: number;
  }>;
  salaryAverages: {
    daily: number;
    biweekly: number;
    monthly: number;
  };
  topEarners: Array<{
    id: number;
    fullName: string;
    position: string;
    department: string;
    monthlySalary: number;
    salaryType: string;
  }>;
  lowestEarners: Array<{
    id: number;
    fullName: string;
    position: string;
    department: string;
    monthlySalary: number;
    salaryType: string;
  }>;
}

export default function PayrollStats() {
  const { formatCurrency } = useSettings();
  const { data: stats, isLoading, error } = useQuery<PayrollStats>({
    queryKey: ["/api/payroll/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <CardContent>
          <p className="text-red-600">Error al cargar estadísticas de nómina</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalEmployees === 0) {
    return (
      <Card className="p-6">
        <CardContent className="text-center">
          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Sin empleados registrados</h3>
          <p className="text-gray-500">Registra empleados para ver estadísticas de nómina</p>
        </CardContent>
      </Card>
    );
  }



  return (
    <div className="space-y-6 p-6">
      {/* Tarjetas de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Empleados
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalEmployees}</div>
            <p className="text-xs text-gray-500">Empleados activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Nómina Total Mensual
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalMonthlyPayroll)}
            </div>
            <p className="text-xs text-gray-500">Suma total mensual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Promedio Salarial
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats.averagePayroll)}
            </div>
            <p className="text-xs text-gray-500">Promedio mensual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Departamentos
            </CardTitle>
            <Building className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.departmentDistribution.length}
            </div>
            <p className="text-xs text-gray-500">Áreas de trabajo</p>
          </CardContent>
        </Card>
      </div>

      {/* Promedios salariales por período */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Promedios Salariales por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800">Promedio Diario</h4>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.salaryAverages.daily)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800">Promedio Quincenal</h4>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.salaryAverages.biweekly)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-800">Promedio Mensual</h4>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.salaryAverages.monthly)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por departamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Empleados por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.departmentDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ department, percentage }) => `${department} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.departmentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 5 empleados mejor pagados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top 5 Empleados Mejor Pagados</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topEarners} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis 
                  type="category" 
                  dataKey="fullName" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Salario Mensual"]}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="monthlySalary" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 empleados menor pagados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Top 5 Empleados Menor Pagados</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.lowestEarners} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
              <YAxis 
                type="category" 
                dataKey="fullName" 
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), "Salario Mensual"]}
                labelFormatter={(label) => `${label}`}
              />
              <Bar dataKey="monthlySalary" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detalles de empleados top y bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-green-600">
              Empleados Mejor Remunerados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topEarners.map((employee, index) => (
                <div key={employee.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-green-800">
                      #{index + 1} {employee.fullName}
                    </p>
                    <p className="text-sm text-green-600">
                      {employee.position} - {employee.department}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700">
                      {formatCurrency(employee.monthlySalary)}
                    </p>
                    <p className="text-xs text-green-500 capitalize">
                      {employee.salaryType}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-orange-600">
              Empleados Menor Remunerados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.lowestEarners.map((employee, index) => (
                <div key={employee.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-orange-800">
                      #{index + 1} {employee.fullName}
                    </p>
                    <p className="text-sm text-orange-600">
                      {employee.position} - {employee.department}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-700">
                      {formatCurrency(employee.monthlySalary)}
                    </p>
                    <p className="text-xs text-orange-500 capitalize">
                      {employee.salaryType}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}