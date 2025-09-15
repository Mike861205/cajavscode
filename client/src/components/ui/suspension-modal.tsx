import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard, Clock } from "lucide-react";

interface SuspensionModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
  onRedirect: () => void;
}

export function SuspensionModal({ open, message, onClose, onRedirect }: SuspensionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Licencia Suspendida
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-4">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-lg border border-red-200">
            <p className="text-gray-700 text-sm leading-relaxed">
              {message}
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-6 py-3">
            <div className="flex items-center space-x-2 text-gray-500">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Pago Vencido</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center space-x-2 text-gray-500">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Renovación Requerida</span>
            </div>
          </div>
          
          <div className="space-y-3 pt-2">
            <Button 
              onClick={onRedirect}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Ver Planes de Pago
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-lg transition-all duration-200"
            >
              Cerrar
            </Button>
          </div>
        </div>
        
        <div className="text-center pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            ¿Necesitas ayuda? Contacta a soporte técnico
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}