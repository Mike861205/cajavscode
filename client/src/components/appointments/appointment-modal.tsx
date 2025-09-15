import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Phone, Calendar, Clock, User, FileText, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Product, InsertAppointment } from "@shared/schema";

const appointmentSchema = z.object({
  customerName: z.string().min(1, "El nombre del cliente es requerido"),
  customerPhone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  subject: z.string().min(1, "El asunto es requerido"),
  appointmentDate: z.string().min(1, "La fecha es requerida"),
  appointmentTime: z.string().min(1, "La hora es requerida"),
  status: z.string().min(1, "El estado es requerido"),
  notes: z.string().optional(),
  productIds: z.array(z.number()).optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentModalProps {
  selectedDate?: Date | null;
  appointmentId?: number;
  onClose: () => void;
  onSave?: () => void;
}

export default function AppointmentModal({ 
  selectedDate, 
  appointmentId, 
  onClose,
  onSave 
}: AppointmentModalProps) {
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get products for selection
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Get appointment data if editing
  const { data: appointmentData } = useQuery({
    queryKey: [`/api/appointments/${appointmentId}`],
    enabled: !!appointmentId,
  });

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      subject: "",
      appointmentDate: selectedDate ? 
        selectedDate.toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0],
      appointmentTime: "09:00",
      status: "scheduled",
      notes: "",
      productIds: [],
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const response = await apiRequest("POST", "/api/appointments", {
        ...data,
        appointmentDate: new Date(data.appointmentDate).toISOString(),
        productIds: selectedProducts,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Éxito",
        description: "Cita creada exitosamente",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al crear la cita",
        variant: "destructive",
      });
    },
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const response = await apiRequest("PATCH", `/api/appointments/${appointmentId}`, {
        ...data,
        appointmentDate: new Date(data.appointmentDate).toISOString(),
        productIds: selectedProducts,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/${appointmentId}`] });
      toast({
        title: "Éxito",
        description: "Cita actualizada exitosamente",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al actualizar la cita",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    if (appointmentId) {
      updateAppointmentMutation.mutate(data);
    } else {
      createAppointmentMutation.mutate(data);
    }
  };

  const handleProductToggle = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Generate time options
  const timeOptions: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {appointmentId ? "Editar Cita" : "Nueva Cita"}
          </DialogTitle>
          <DialogDescription>
            {appointmentId 
              ? "Modifica los detalles de la cita existente"
              : "Completa los datos para agendar una nueva cita"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Name */}
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nombre del Cliente
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer Phone */}
              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Teléfono
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(000) 000-0000" 
                        type="tel"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Appointment Date */}
              <FormField
                control={form.control}
                name="appointmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Fecha
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Appointment Time */}
              <FormField
                control={form.control}
                name="appointmentTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Hora
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar hora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeOptions.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Subject */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Asunto
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Motivo de la cita" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Estado
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Programada</SelectItem>
                      <SelectItem value="confirmed">Confirmada</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Products Selection */}
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Productos de Interés (Opcional)
              </FormLabel>
              <div className="max-h-32 overflow-y-auto border rounded-md p-3 space-y-2">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`product-${product.id}`}
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => handleProductToggle(product.id)}
                    />
                    <label
                      htmlFor={`product-${product.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {product.name} - ${parseFloat(product.price).toFixed(2)}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Adicionales</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Información adicional sobre la cita..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createAppointmentMutation.isPending || updateAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending || updateAppointmentMutation.isPending
                  ? "Guardando..."
                  : appointmentId
                  ? "Actualizar Cita"
                  : "Crear Cita"
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}