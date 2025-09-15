import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2, User, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeleteUserModalProps {
  user: {
    id: string;
    username: string;
    email: string;
    plan?: string;
    status?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteUserModal({ user, isOpen, onClose }: DeleteUserModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/delete-license/${userId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Error al eliminar la licencia");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuario eliminado exitosamente",
        description: `La licencia de ${user?.username} ha sido eliminada permanentemente`,
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      onClose();
      setConfirmText("");
      setIsDeleting(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar usuario",
        description: error.message || "No se pudo eliminar la licencia",
        variant: "destructive",
      });
      setIsDeleting(false);
    },
  });

  const handleDelete = () => {
    if (user && confirmText === "ELIMINAR") {
      deleteUserMutation.mutate(user.id);
    }
  };

  const isConfirmValid = confirmText === "ELIMINAR";

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                Eliminar Licencia
              </DialogTitle>
              <p className="text-red-100 text-sm mt-1">
                Esta acción no se puede deshacer
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Información del usuario */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{user.username}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                {user.plan && (
                  <p className="text-xs text-gray-500 mt-1">
                    Plan: {user.plan} • Estado: {user.status}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Advertencia */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 mb-2">
                  ⚠️ Advertencia Importante
                </p>
                <ul className="text-yellow-700 space-y-1 text-xs">
                  <li>• Se eliminará toda la información del tenant</li>
                  <li>• Se borrarán todos los productos, ventas y datos</li>
                  <li>• Se liberará el espacio de la licencia</li>
                  <li>• Esta acción es <strong>irreversible</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmación */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Para confirmar, escribe <span className="font-bold text-red-600">ELIMINAR</span>
              </label>
              <Input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Escribe ELIMINAR para confirmar"
                className="w-full"
                disabled={isDeleting}
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Eliminando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Trash2 className="h-4 w-4" />
                <span>Eliminar Licencia</span>
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}