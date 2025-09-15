import { MessageCircle } from "lucide-react";

export function WhatsAppFloat() {
  const phoneNumber = "6241370820";
  const message = "Hola! A tus órdenes con tu compra de Caja SAS Enterprise. ¿En qué puedo ayudarte?";
  
  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(message);
    // Usar api.whatsapp.com para mejor compatibilidad
    const whatsappUrl = `https://api.whatsapp.com/send?phone=52${phoneNumber}&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
      {/* Mensaje siempre visible */}
      <div className="bg-white shadow-lg rounded-xl px-4 py-3 border border-gray-200 max-w-xs">
        <div className="text-sm font-medium text-gray-800 mb-1">
          💬 ¡A tus órdenes!
        </div>
        <div className="text-xs text-gray-600 mb-3">
          Escríbenos por WhatsApp para ayudarte con tu compra
        </div>
        
        {/* Fotos de perfil alineadas hacia arriba */}
        <div className="flex -space-x-2 justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-blue-500 flex items-center justify-center">
            <span className="text-xs font-semibold text-white">ME</span>
          </div>
          <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-green-500 flex items-center justify-center">
            <span className="text-xs font-semibold text-white">CM</span>
          </div>
          <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-purple-500 flex items-center justify-center">
            <span className="text-xs font-semibold text-white">AP</span>
          </div>
        </div>
      </div>
      
      {/* Botón WhatsApp más grande */}
      <button
        onClick={handleWhatsAppClick}
        className="bg-green-500 hover:bg-green-600 text-white rounded-full p-5 shadow-lg transition-all duration-300 transform hover:scale-110 animate-pulse"
        title="Contactar por WhatsApp"
      >
        <MessageCircle className="h-8 w-8" />
      </button>
    </div>
  );
}