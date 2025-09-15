import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calculator, TrendingUp, Award } from "lucide-react";
import PayrollStats from "@/components/payroll/payroll-stats";
import BirthdaysAnniversaries from "@/components/payroll/birthdays-anniversaries";

export default function PayrollDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Sistema de Nóminas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestión integral de empleados, estadísticas salariales y celebraciones
          </p>
        </div>
      </div>

      {/* Quick Actions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => window.location.href = "/dashboard/nominas/alta"}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Nuevo Empleado
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Registrar empleado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = "/dashboard/nominas/registro"}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Ver Empleados
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Lista completa
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => window.location.href = "/dashboard/nominas/estadisticas"}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Estadísticas
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Análisis detallado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Calculator className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Nómina
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Próximamente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Birthdays and Anniversaries Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-indigo-500" />
          Celebraciones del Personal
        </h2>
        <BirthdaysAnniversaries />
      </div>

      {/* Statistics Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Estadísticas de Nómina
        </h2>
        <PayrollStats />
      </div>
    </div>
  );
}