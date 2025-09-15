import { useState, useEffect } from "react";
import { X } from "lucide-react";
import promoImage from "@assets/20250622_2220_Caja Sas Enterprise Logo_simple_compose_01jydkkxm9e1b98jpdvmw5p3vz_1751645848242.png";

export default function PromotionFloat() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  useEffect(() => {
    // Mostrar la promoción cada 5 segundos
    const interval = setInterval(() => {
      setIsVisible(true);
      setHasBeenShown(true);
      
      // Auto-ocultar después de 8 segundos si no se interactúa
      setTimeout(() => {
        setIsVisible(false);
      }, 8000);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = "526241370820";
    const message = "Me gustaría adquirir el sistema por año con la promoción, me das más informes";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed bottom-20 left-6 z-50 transform transition-all duration-500 ${
        isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}
    >
      <div className="relative">
        {/* Botón de cerrar */}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-all duration-200 hover:scale-110"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Contenedor principal de la promoción */}
        <div 
          onClick={handleWhatsAppClick}
          className="bg-white rounded-2xl shadow-2xl border-4 border-yellow-400 p-3 cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-3xl max-w-xs w-64"
        >
          {/* Título PROMOCIÓN */}
          <div className="bg-gradient-to-r from-sky-400 to-blue-500 text-white text-center py-2 px-3 rounded-lg font-bold text-base mb-3 shadow-md">
            🎯 PROMOCIÓN
          </div>

          {/* Imagen de la caja */}
          <div className="relative overflow-hidden rounded-xl mb-3">
            <img 
              src={promoImage} 
              alt="Caja SAS Enterprise - Sistema Punto de Venta"
              className="w-full h-36 object-cover object-center transform hover:scale-110 transition-transform duration-300"
            />
            {/* Overlay con gradiente */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>

          {/* Texto promocional */}
          <div className="text-center space-y-2">
            <h3 className="font-bold text-gray-800 text-base">
              Sistema Punto de Venta
            </h3>
            <p className="text-gray-600 text-xs">
              ¡Adquiere el sistema completo por año!
            </p>
            <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-2 mt-2">
              <p className="text-yellow-800 font-semibold text-xs">
                💬 Click para más información
              </p>
            </div>
          </div>

          {/* Animación de pulso */}
          <div className="absolute inset-0 rounded-2xl border-4 border-yellow-400 animate-pulse opacity-50"></div>
        </div>

        {/* Sombra adicional para profundidad */}
        <div className="absolute inset-0 bg-black/10 rounded-2xl transform translate-x-1 translate-y-1 -z-10"></div>
      </div>
    </div>
  );
}