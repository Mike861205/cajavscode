import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, Search, CreditCard, Phone, MapPin, X } from "lucide-react";

interface CustomerSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer) => void;
}

export default function CustomerSearch({ isOpen, onClose, onSelectCustomer }: CustomerSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: eligibleCustomers = [], isLoading, error } = useQuery<Customer[]>({
    queryKey: ["/api/credit-customers"],
    enabled: isOpen, // Solo cargar cuando el modal esté abierto
    staleTime: 0, // No usar cache
    cacheTime: 0, // No guardar en cache
  });

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log("🔍 CustomerSearch modal opened");
      console.log("📊 Query state:", { isLoading, error, customerCount: eligibleCustomers.length });
      console.log("👥 Eligible customers:", eligibleCustomers);
      
      // Debug credit amounts for each customer
      eligibleCustomers.forEach(customer => {
        console.log(`💳 ${customer.name}: creditAvailable="${customer.creditAvailable}", creditUsed="${customer.creditUsed}"`);
      });
    }
  }, [isOpen, isLoading, error, eligibleCustomers]);

  // Filtrar clientes por término de búsqueda
  const filteredCustomers = eligibleCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    onClose();
    setSearchTerm("");
  };

  const handleClose = () => {
    onClose();
    setSearchTerm("");
  };

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Seleccionar Cliente para Crédito Fiador
          </DialogTitle>
          <DialogDescription>
            Busca y selecciona un cliente elegible para realizar una venta a crédito
          </DialogDescription>
        </DialogHeader>

        {/* Buscador */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Lista de clientes */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="ml-2 text-gray-600">Cargando clientes...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {searchTerm ? (
                <p>No se encontraron clientes con "{searchTerm}"</p>
              ) : (
                <p>No hay clientes elegibles para crédito</p>
              )}
              <p className="text-sm mt-2">
                Configura la elegibilidad en el módulo de Clientes
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCustomers.map((customer) => {
                const availableCredit = parseFloat(customer.creditAvailable || "0");
                const usedCredit = parseFloat(customer.creditUsed || "0");
                const totalCredit = availableCredit + usedCredit;

                return (
                  <div
                    key={customer.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-gray-900">{customer.name}</h4>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Elegible
                          </Badge>
                        </div>
                        
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        
                        {customer.address && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <MapPin className="h-3 w-3" />
                            <span>{customer.address}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">Crédito disponible:</span>
                            <span className="font-semibold text-green-600">
                              ${availableCredit.toFixed(2)}
                            </span>
                          </div>
                          {totalCredit > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600">Total:</span>
                              <span className="font-medium text-gray-900">
                                ${totalCredit.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        className="ml-4 bg-blue-600 hover:bg-blue-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCustomer(customer);
                        }}
                      >
                        Seleccionar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer con estadísticas */}
        {!isLoading && eligibleCustomers.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {filteredCustomers.length} de {eligibleCustomers.length} clientes
              </span>
              <Button variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}