import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Trash2, UserPlus, Phone, Mail, Building, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

interface PersonalReference {
  name: string;
  phone: string;
  address: string;
}

const loanClientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  company: z.string().optional(),
  yearsExperience: z.number().min(0, "La antigüedad debe ser mayor a 0").optional(),
  monthlyIncome: z.number().min(0, "El ingreso debe ser mayor a 0").optional(),
  monthlyExpenses: z.number().min(0, "Los gastos deben ser mayor a 0").optional(),
});

const referenceSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos"),
  address: z.string().optional(),
});

export default function LoanClientRegistration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    yearsExperience: "",
    monthlyIncome: "",
    monthlyExpenses: "",
  });
  
  const [references, setReferences] = useState<PersonalReference[]>([
    { name: "", phone: "", address: "" }
  ]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const createLoanClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/loan-clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente registrado",
        description: "El cliente de préstamo ha sido registrado exitosamente.",
      });
      
      // Invalidate cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/loan-clients"] });
      
      // Reset form
      setFormData({
        name: "",
        phone: "",
        email: "",
        company: "",
        yearsExperience: "",
        monthlyIncome: "",
        monthlyExpenses: "",
      });
      setReferences([{ name: "", phone: "", address: "" }]);
      setErrors({});
      
      queryClient.invalidateQueries({ queryKey: ["/api/loan-clients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al registrar el cliente de préstamo.",
        variant: "destructive",
      });
    },
  });

  const addReference = () => {
    if (references.length < 5) {
      setReferences([...references, { name: "", phone: "", address: "" }]);
    }
  };

  const removeReference = (index: number) => {
    if (references.length > 1) {
      setReferences(references.filter((_, i) => i !== index));
    }
  };

  const updateReference = (index: number, field: keyof PersonalReference, value: string) => {
    const newReferences = [...references];
    newReferences[index] = { ...newReferences[index], [field]: value };
    setReferences(newReferences);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    try {
      loanClientSchema.parse({
        ...formData,
        yearsExperience: formData.yearsExperience ? parseInt(formData.yearsExperience) : undefined,
        monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : undefined,
        monthlyExpenses: formData.monthlyExpenses ? parseFloat(formData.monthlyExpenses) : undefined,
      });
    } catch (error: any) {
      error.errors?.forEach((err: any) => {
        newErrors[err.path[0]] = err.message;
      });
    }

    // Validate references
    references.forEach((ref, index) => {
      try {
        referenceSchema.parse(ref);
      } catch (error: any) {
        error.errors?.forEach((err: any) => {
          newErrors[`reference_${index}_${err.path[0]}`] = err.message;
        });
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submissionData = {
      ...formData,
      yearsExperience: formData.yearsExperience ? parseInt(formData.yearsExperience) : null,
      monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : null,
      monthlyExpenses: formData.monthlyExpenses ? parseFloat(formData.monthlyExpenses) : null,
      references: references.filter(ref => ref.name.trim() !== "" && ref.phone.trim() !== ""),
    };

    createLoanClientMutation.mutate(submissionData);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-green-500 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <UserPlus className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Alta Cliente - Préstamos</h1>
            <p className="text-purple-100">Registro de nuevo cliente para préstamos</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Personal */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
            <CardTitle className="text-blue-800 flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <Label htmlFor="phone" className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  Teléfono *
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Ej: 6241234567"
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@ejemplo.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Información Laboral */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 rounded-t-lg">
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Información Laboral
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Empresa/Empleador</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Nombre de la empresa"
                />
              </div>
              
              <div>
                <Label htmlFor="yearsExperience">Antigüedad Laboral (años)</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  min="0"
                  value={formData.yearsExperience}
                  onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value })}
                  placeholder="Ej: 5"
                  className={errors.yearsExperience ? "border-red-500" : ""}
                />
                {errors.yearsExperience && <p className="text-red-500 text-sm mt-1">{errors.yearsExperience}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Financiera */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-lg">
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Información Financiera
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthlyIncome">Sueldo Mensual Aproximado</Label>
                <Input
                  id="monthlyIncome"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthlyIncome}
                  onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                  placeholder="Ej: 15000.00"
                  className={errors.monthlyIncome ? "border-red-500" : ""}
                />
                {errors.monthlyIncome && <p className="text-red-500 text-sm mt-1">{errors.monthlyIncome}</p>}
              </div>
              
              <div>
                <Label htmlFor="monthlyExpenses">Gastos Mensuales Aproximados</Label>
                <Input
                  id="monthlyExpenses"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthlyExpenses}
                  onChange={(e) => setFormData({ ...formData, monthlyExpenses: e.target.value })}
                  placeholder="Ej: 8000.00"
                  className={errors.monthlyExpenses ? "border-red-500" : ""}
                />
                {errors.monthlyExpenses && <p className="text-red-500 text-sm mt-1">{errors.monthlyExpenses}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referencias Personales */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
            <CardTitle className="text-purple-800 flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Referencias Personales
              </div>
              <Button
                type="button"
                onClick={addReference}
                disabled={references.length >= 5}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {references.map((reference, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-800">Referencia {index + 1}</h4>
                  {references.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeReference(index)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`ref_name_${index}`}>Nombre Completo *</Label>
                    <Input
                      id={`ref_name_${index}`}
                      value={reference.name}
                      onChange={(e) => updateReference(index, 'name', e.target.value)}
                      placeholder="Nombre de la referencia"
                      className={errors[`reference_${index}_name`] ? "border-red-500" : ""}
                    />
                    {errors[`reference_${index}_name`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`reference_${index}_name`]}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor={`ref_phone_${index}`}>Teléfono *</Label>
                    <Input
                      id={`ref_phone_${index}`}
                      value={reference.phone}
                      onChange={(e) => updateReference(index, 'phone', e.target.value)}
                      placeholder="Teléfono de la referencia"
                      className={errors[`reference_${index}_phone`] ? "border-red-500" : ""}
                    />
                    {errors[`reference_${index}_phone`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`reference_${index}_phone`]}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`ref_address_${index}`}>Dirección</Label>
                  <Textarea
                    id={`ref_address_${index}`}
                    value={reference.address}
                    onChange={(e) => updateReference(index, 'address', e.target.value)}
                    placeholder="Dirección de la referencia"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Botón de envío */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={createLoanClientMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-2 text-lg"
          >
            {createLoanClientMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Registrando...
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 mr-2" />
                Registrar Cliente
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}