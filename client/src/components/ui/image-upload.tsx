import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  value?: string;
  onChange: (imageUrl: string) => void;
  onFileSelect?: (file: File) => void;
  label?: string;
  className?: string;
  productName?: string;
  productDescription?: string;
  enableAiGeneration?: boolean;
}

export function ImageUpload({ 
  value, 
  onChange, 
  onFileSelect, 
  label = "Imagen del Producto", 
  className = "",
  productName = "",
  productDescription = "",
  enableAiGeneration = false
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de imagen válido.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error", 
        description: "La imagen debe ser menor a 10MB.",
        variant: "destructive",
      });
      return;
    }

    // If onFileSelect is provided, use it for custom handling
    if (onFileSelect) {
      onFileSelect(file);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al subir la imagen');
      }

      const result = await response.json();
      onChange(result.imageUrl);
      
      toast({
        title: "Éxito",
        description: "Imagen subida correctamente.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "No se pudo subir la imagen. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = () => {
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateWithAI = async () => {
    if (!productName.trim()) {
      toast({
        title: "Error",
        description: "Se necesita un nombre de producto para generar la imagen con IA.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingAi(true);

    try {
      const response = await apiRequest("POST", "/api/generate-product-image", {
        productName,
        description: productDescription
      });
      
      const result = await response.json();
      
      if (result.imageUrl) {
        onChange(result.imageUrl);
        toast({
          title: "¡Imagen Generada!",
          description: "La imagen se ha generado exitosamente con IA.",
        });
      }
    } catch (error) {
      console.error('Error generating AI image:', error);
      toast({
        title: "Error",
        description: "No se pudo generar la imagen con IA. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setGeneratingAi(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      
      <div className="space-y-4">
        {/* Image Preview */}
        {value && (
          <div className="relative inline-block">
            <img
              src={value}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemoveImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <div className="space-y-2">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <div className="space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {value ? "Cambiar imagen" : "Subir imagen del producto"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                PNG, JPG, GIF hasta 10MB
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleButtonClick}
                disabled={uploading || generatingAi}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {value ? "Cambiar imagen" : "Seleccionar imagen"}
                  </>
                )}
              </Button>
              
              {enableAiGeneration && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateWithAI}
                  disabled={uploading || generatingAi || !productName.trim()}
                  className="flex-1 bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                >
                  {generatingAi ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generar con IA
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}