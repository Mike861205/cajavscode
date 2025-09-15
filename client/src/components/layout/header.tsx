import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Calendar } from "lucide-react";

interface Warehouse {
  id: number;
  name: string;
  address?: string;
}

export function Header() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar fecha y hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Obtener información del warehouse del usuario
  const { data: userWarehouse } = useQuery<Warehouse>({
    queryKey: ["/api/warehouses/user"],
    enabled: !!user,
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const words = name.split(" ");
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (!user) return null;

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Usuario y Warehouse */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12 border-2 border-blue-200 dark:border-blue-800">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-lg">
                {getInitials(user.fullName || user.username)}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {capitalizeFirst(user.fullName || user.username || "Usuario")}
                </h2>
              </div>
              
              {userWarehouse && (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                    📍 {userWarehouse.name}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="flex items-center space-x-6">
            {/* Fecha */}
            <div className="text-right space-y-1">
              <div className="flex items-center justify-end space-x-2">
                <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Fecha
                </span>
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                {capitalizeFirst(formatDate(currentTime))}
              </div>
            </div>

            {/* Separador visual */}
            <div className="hidden sm:block w-px h-12 bg-gray-200 dark:bg-gray-700"></div>

            {/* Hora */}
            <div className="text-right space-y-1">
              <div className="flex items-center justify-end space-x-2">
                <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Hora Local
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 tracking-wide">
                {formatTime(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}