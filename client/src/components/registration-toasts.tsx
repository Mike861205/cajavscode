import { useState, useEffect } from "react";
import { CheckCircle, X } from "lucide-react";

interface ToastNotification {
  id: number;
  name: string;
  plan: string;
  action: string;
}

const notifications: ToastNotification[] = [
  { id: 1, name: "José Ramírez", plan: "Empresarial", action: "se acaba de registrar en el plan" },
  { id: 2, name: "Mariana López", plan: "Profesional", action: "activó su prueba gratuita del plan" },
  { id: 3, name: "Diego Hernández", plan: "Unisucursal Básico", action: "contrató el plan" },
  { id: 4, name: "Ana Torres", plan: "Unisucursal Pro", action: "eligió el plan" },
  { id: 5, name: "Luis Martínez", plan: "Profesional", action: "se suscribió al plan" },
  { id: 6, name: "Karla Sánchez", plan: "Empresarial", action: "acaba de activar su cuenta" },
  { id: 7, name: "Roberto Díaz", plan: "Profesional", action: "se unió con el plan" },
  { id: 8, name: "Fernanda Gómez", plan: "Unisucursal Básico", action: "eligió el plan" },
  { id: 9, name: "Miguel Castillo", plan: "Empresarial", action: "acaba de registrarse en el plan" },
  { id: 10, name: "Paola Ruiz", plan: "Unisucursal Pro", action: "contrató el plan" }
];

const planColors = {
  "Empresarial": "from-purple-500 to-purple-600",
  "Profesional": "from-blue-500 to-blue-600",
  "Unisucursal Básico": "from-green-500 to-green-600",
  "Unisucursal Pro": "from-orange-500 to-orange-600"
};

interface ActiveToast extends ToastNotification {
  timestamp: number;
}

export default function RegistrationToasts() {
  const [activeToasts, setActiveToasts] = useState<ActiveToast[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;
    
    // Iniciar las notificaciones después de 5 segundos de cargar la página
    timeoutId = setTimeout(() => {
      const showNextToast = () => {
        if (currentIndex < notifications.length) {
          const newToast: ActiveToast = {
            ...notifications[currentIndex],
            timestamp: Date.now() + currentIndex // Unique timestamp based on index
          };
          
          setActiveToasts(prev => [...prev, newToast]);
          setCurrentIndex(prev => prev + 1);
          
          // Auto-remover después de 5 segundos
          setTimeout(() => {
            setActiveToasts(prev => prev.filter(toast => toast.timestamp !== newToast.timestamp));
          }, 5000);
          
          // Programar siguiente notificación cada 15 segundos
          if (currentIndex + 1 < notifications.length) {
            interval = setTimeout(showNextToast, 15000); // 15 segundos entre notificaciones
          } else {
            // Reiniciar el ciclo después de completar todas las notificaciones (60 segundos de pausa)
            interval = setTimeout(() => {
              setCurrentIndex(0);
            }, 60000); // 1 minuto de pausa antes de reiniciar el ciclo
          }
        }
      };
      
      showNextToast();
    }, 5000); // Empezar después de 5 segundos

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(interval);
    };
  }, [currentIndex]);

  const removeToast = (timestamp: number) => {
    setActiveToasts(prev => prev.filter(toast => toast.timestamp !== timestamp));
  };

  return (
    <div className="fixed bottom-4 left-4 z-[9999] space-y-3 pointer-events-none">
      {activeToasts.map((toast, index) => (
        <div
          key={`toast-${toast.id}-${toast.timestamp}`}
          className="pointer-events-auto transform transition-all duration-500 ease-out animate-in slide-in-from-left-full"
          style={{
            animationDelay: `${index * 100}ms`,
            marginBottom: index > 0 ? '12px' : '0'
          }}
        >
          <div className={`
            bg-gradient-to-r ${planColors[toast.plan as keyof typeof planColors]}
            text-white rounded-xl shadow-2xl border border-white/20 
            backdrop-blur-sm p-4 min-w-[350px] max-w-[400px]
            transform transition-all duration-300 hover:scale-105
            relative overflow-hidden
          `}>
            {/* Brillo animado de fondo */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                          -skew-x-12 animate-pulse opacity-50"></div>
            
            <div className="relative flex items-start space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white animate-bounce" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white/95 leading-relaxed">
                  <span className="inline-block mr-1">✅</span>
                  <span className="font-semibold">{toast.name}</span>
                  <span className="mx-1">{toast.action}</span>
                  <span className="font-bold text-yellow-200">{toast.plan}</span>
                </div>
                
                <div className="mt-1 text-xs text-white/80">
                  Hace unos segundos
                </div>
              </div>
              
              <button
                onClick={() => removeToast(toast.timestamp)}
                className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 
                         transition-colors duration-200 group"
              >
                <X className="w-4 h-4 text-white/70 group-hover:text-white" />
              </button>
            </div>
            
            {/* Barra de progreso simplificada */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/30">
              <div 
                className="h-full bg-white animate-pulse"
                style={{
                  width: '100%',
                  animation: 'pulse 5s ease-in-out infinite'
                }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}