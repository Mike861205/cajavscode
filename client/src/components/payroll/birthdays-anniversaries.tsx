import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cake, Calendar, Award, Users } from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";

interface Birthday {
  id: number;
  fullName: string;
  position: string;
  department: string;
  birthDate: string;
  upcomingBirthday: string;
  daysUntilBirthday: number;
  age: number;
}

interface Anniversary {
  id: number;
  fullName: string;
  position: string;
  department: string;
  hireDate: string;
  upcomingAnniversary: string;
  daysUntilAnniversary: number;
  yearsOfService: number;
}

interface BirthdaysAnniversariesData {
  upcomingBirthdays: Birthday[];
  upcomingAnniversaries: Anniversary[];
}

const formatDaysMessage = (days: number): string => {
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days <= 7) return `En ${days} días`;
  if (days <= 30) return `En ${days} días`;
  return `En ${Math.ceil(days / 30)} meses`;
};

const getBadgeVariant = (days: number): "default" | "secondary" | "destructive" | "outline" => {
  if (days === 0) return "destructive";
  if (days <= 3) return "default";
  if (days <= 7) return "secondary";
  return "outline";
};

export default function BirthdaysAnniversaries() {
  const { data, isLoading, error } = useQuery<BirthdaysAnniversariesData>({
    queryKey: ["/api/payroll/birthdays-anniversaries"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500 text-center">Error cargando cumpleaños</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500 text-center">Error cargando aniversarios</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { upcomingBirthdays = [], upcomingAnniversaries = [] } = data || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Próximos Cumpleaños */}
      <Card className="shadow-sm border-l-4 border-l-pink-400">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
            <Cake className="h-5 w-5 text-pink-500" />
            Próximos Cumpleaños
            {upcomingBirthdays.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {upcomingBirthdays.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {upcomingBirthdays.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No hay cumpleaños próximos registrados
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Agrega fechas de nacimiento a los empleados
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {upcomingBirthdays.map((birthday) => (
                <div
                  key={birthday.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {birthday.fullName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {birthday.position} • {birthday.department}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Cumplirá {birthday.age} años
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={getBadgeVariant(birthday.daysUntilBirthday)}
                      className="mb-1"
                    >
                      {formatDaysMessage(birthday.daysUntilBirthday)}
                    </Badge>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {format(new Date(birthday.upcomingBirthday), "dd MMM", { locale: es })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximos Aniversarios Laborales */}
      <Card className="shadow-sm border-l-4 border-l-blue-400">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-200">
            <Award className="h-5 w-5 text-blue-500" />
            Aniversarios Laborales
            {upcomingAnniversaries.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {upcomingAnniversaries.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {upcomingAnniversaries.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No hay aniversarios próximos
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Los empleados con fechas de contratación aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {upcomingAnniversaries.map((anniversary) => (
                <div
                  key={anniversary.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {anniversary.fullName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {anniversary.position} • {anniversary.department}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {anniversary.yearsOfService === 1 
                        ? "Cumplirá 1 año" 
                        : `Cumplirá ${anniversary.yearsOfService} años`} en la empresa
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={getBadgeVariant(anniversary.daysUntilAnniversary)}
                      className="mb-1"
                    >
                      {formatDaysMessage(anniversary.daysUntilAnniversary)}
                    </Badge>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {format(new Date(anniversary.upcomingAnniversary), "dd MMM", { locale: es })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}