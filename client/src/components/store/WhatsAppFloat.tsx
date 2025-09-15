import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppFloatProps {
  phoneNumber: string;
  message: string;
  storeName?: string;
}

export default function WhatsAppFloat({ phoneNumber, message, storeName }: WhatsAppFloatProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  useEffect(() => {
    // Mostrar el botón después de 2 segundos
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    // Ocultar tooltip después de 10 segundos
    const tooltipTimer = setTimeout(() => {
      setShowTooltip(false);
    }, 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(tooltipTimer);
    };
  }, []);

  const handleWhatsAppClick = () => {
    // Limpiar el número de teléfono (solo números y +)
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setShowTooltip(false);
  };

  if (!phoneNumber || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Botón flotante de WhatsApp */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute bottom-16 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64 animate-in slide-in-from-bottom-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">¡Contáctanos por WhatsApp!</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTooltip(false)}
                  className="p-1 h-auto"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {storeName ? `Hola, soy de ${storeName}. ` : ''}¿En qué podemos ayudarte?
              </p>
              <Button
                onClick={handleWhatsAppClick}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                size="sm"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar mensaje
              </Button>
              {/* Flecha del tooltip */}
              <div className="absolute bottom-[-8px] right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
            </div>
          )}

          {/* Botón principal */}
          <Button
            onClick={handleWhatsAppClick}
            className="w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110"
            size="sm"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>

          {/* Indicador de pulsación */}
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-25"></div>
        </div>
      </div>
    </>
  );
}