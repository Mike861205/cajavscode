import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { type Category } from '@shared/schema';

const productConjuntoSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  sku: z.string().min(1, "El SKU es requerido"),
  categoryId: z.string().optional(),
  imageUrl: z.string().optional(),
  unitType: z.string().default("kg"),
  isConjunto: z.boolean().default(true),
  variants: z.array(z.object({
    weight: z.string().min(1, "El peso es requerido"),
    label: z.string().min(1, "La etiqueta es requerida"),
    price: z.string().min(1, "El precio es requerido"),
    cost: z.string().min(1, "El costo es requerido"),
    discount: z.string().optional().default("0"),
    unit: z.string().default("kg"),
    sortOrder: z.number().default(0),
  })).min(1, "Debe agregar al menos una variante de peso"),
});

type ProductConjuntoData = z.infer<typeof productConjuntoSchema>;

interface ProductConjuntoFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductConjuntoForm({ onSuccess, onCancel }: ProductConjuntoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const form = useForm<ProductConjuntoData>({
    resolver: zodResolver(productConjuntoSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      categoryId: 'none',
      imageUrl: '',
      unitType: 'kg',
      isConjunto: true,
      variants: [
        {
          weight: '1',
          label: '1 kg',
          price: '',
          cost: '',
          discount: '0',
          unit: 'kg',
          sortOrder: 0,
        }
      ]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants',
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductConjuntoData) => {
      const response = await apiRequest('POST', '/api/products', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Éxito",
        description: "Producto conjunto creado exitosamente",
      });
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Error creating product conjunto:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el producto conjunto",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ProductConjuntoData) => {
    setIsSubmitting(true);
    try {
      await createProductMutation.mutateAsync(data);
    } catch (error) {
      console.error('Error in form submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addVariant = () => {
    append({
      weight: '',
      label: '',
      price: '',
      cost: '',
      discount: '0',
      unit: 'kg',
      sortOrder: fields.length,
    });
  };

  const removeVariant = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Información básica del producto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Ej: Sirlo Premium"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  {...form.register('sku')}
                  placeholder="Ej: SIRLO-001"
                />
                {form.formState.errors.sku && (
                  <p className="text-sm text-red-500">{form.formState.errors.sku.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoría</Label>
                <Select
                  value={form.watch('categoryId') || 'none'}
                  onValueChange={(value) => form.setValue('categoryId', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitType">Unidad de Medida</Label>
                <Select
                  value={form.watch('unitType') || 'kg'}
                  onValueChange={(value) => form.setValue('unitType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                    <SelectItem value="gram">Gramos (g)</SelectItem>
                    <SelectItem value="liter">Litros (L)</SelectItem>
                    <SelectItem value="ml">Mililitros (ml)</SelectItem>
                    <SelectItem value="piece">Piezas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Descripción del producto conjunto"
                  rows={3}
                />
              </div>
            </div>

            {/* Variantes de peso */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Variantes de Peso</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariant}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Variante
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline">Variante {index + 1}</Badge>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariant(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Peso *</Label>
                        <Input
                          {...form.register(`variants.${index}.weight`)}
                          placeholder="Ej: 0.5"
                          type="number"
                          step="0.001"
                        />
                        {form.formState.errors.variants?.[index]?.weight && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.variants[index]?.weight?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Etiqueta *</Label>
                        <Input
                          {...form.register(`variants.${index}.label`)}
                          placeholder="Ej: Medio kilo"
                        />
                        {form.formState.errors.variants?.[index]?.label && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.variants[index]?.label?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Precio *</Label>
                        <Input
                          {...form.register(`variants.${index}.price`)}
                          placeholder="Ej: 240.00"
                          type="number"
                          step="0.01"
                        />
                        {form.formState.errors.variants?.[index]?.price && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.variants[index]?.price?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Costo *</Label>
                        <Input
                          {...form.register(`variants.${index}.cost`)}
                          placeholder="Ej: 140.00"
                          type="number"
                          step="0.01"
                        />
                        {form.formState.errors.variants?.[index]?.cost && (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.variants[index]?.cost?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Descuento (%)</Label>
                        <Input
                          {...form.register(`variants.${index}.discount`)}
                          placeholder="Ej: 5"
                          type="number"
                          step="0.01"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Unidad</Label>
                        <Select
                          value={form.watch(`variants.${index}.unit`) || 'kg'}
                          onValueChange={(value) => form.setValue(`variants.${index}.unit`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="L">L</SelectItem>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="pz">pz</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isSubmitting ? 'Creando...' : 'Crear Producto Conjunto'}
              </Button>
            </div>
    </form>
  );
}