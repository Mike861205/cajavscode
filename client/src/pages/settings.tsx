import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Globe, DollarSign, Save, RefreshCw } from "lucide-react";

interface SystemSettings {
  id: number;
  tenantId: string;
  timezone: string;
  country: string;
  currency: string;
  currencySymbol: string;
  currencyName: string;
  dateFormat: string;
  timeFormat: string;
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  createdAt: string;
  updatedAt: string;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  symbolPosition: string;
  decimalPlaces: number;
  country: string;
  isActive: boolean;
}

interface Timezone {
  value: string;
  label: string;
}

const countries = [
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "ES", name: "España", flag: "🇪🇸" }
];

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCountry, setSelectedCountry] = useState("MX");

  // Get system settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/settings"]
  });

  // Get available currencies
  const { data: currencies, isLoading: currenciesLoading } = useQuery({
    queryKey: ["/api/settings/currencies"]
  });

  // Get timezones for selected country
  const { data: timezones, isLoading: timezonesLoading } = useQuery({
    queryKey: ["/api/settings/timezones", selectedCountry],
    queryFn: () => fetch(`/api/settings/timezones/${selectedCountry}`).then(res => res.json())
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "✅ Configuración actualizada",
        description: "Los cambios se han guardado correctamente.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating settings:", error);
      toast({
        title: "❌ Error",
        description: "No se pudo actualizar la configuración.",
        variant: "destructive",
      });
    }
  });

  const handleTimezoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      timezone: formData.get('timezone'),
      country: selectedCountry
    };
    updateSettingsMutation.mutate(data);
  };

  const handleCurrencyChange = (currencyCode: string) => {
    console.log('Currency selected:', currencyCode);
    console.log('Available currencies:', currencies);
    const currency = Array.isArray(currencies) ? currencies.find((c: any) => c.code === currencyCode) : null;
    if (currency) {
      const data = {
        currency: currency.code,
        currencySymbol: currency.symbol,
        currencyName: currency.name,
        decimalPlaces: currency.decimalPlaces
      };
      console.log('Updating currency settings:', data);
      updateSettingsMutation.mutate(data);
    }
  };

  const handleRegionalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      dateFormat: formData.get('dateFormat'),
      timeFormat: formData.get('timeFormat'),
      thousandsSeparator: formData.get('thousandsSeparator'),
      decimalSeparator: formData.get('decimalSeparator')
    };
    updateSettingsMutation.mutate(data);
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Configuración del Sistema
          </h1>
          <p className="text-gray-600">
            Personaliza la configuración regional, zona horaria y moneda de tu negocio
          </p>
        </div>

        <Tabs defaultValue="timezone" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timezone" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Zona Horaria
            </TabsTrigger>
            <TabsTrigger value="currency" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Moneda
            </TabsTrigger>
            <TabsTrigger value="regional" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Regional
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timezone" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Configuración de Zona Horaria
                </CardTitle>
                <CardDescription>
                  Configura la zona horaria según tu ubicación geográfica
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTimezoneSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="country">País</Label>
                      <Select
                        value={selectedCountry}
                        onValueChange={setSelectedCountry}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona país" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              <div className="flex items-center space-x-2">
                                <span>{country.flag}</span>
                                <span>{country.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Zona Horaria</Label>
                      <Select
                        name="timezone"
                        defaultValue={settings?.timezone}
                        disabled={timezonesLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona zona horaria" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(timezones) ? timezones.map((tz: any) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          )) : (
                            <SelectItem value="America/Mexico_City">
                              Cargando zonas horarias...
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Vista Previa</h4>
                    <div className="space-y-1 text-sm text-blue-700">
                      <p>Fecha actual: {new Date().toLocaleDateString('es-ES', { 
                        timeZone: settings?.timezone || 'America/Mexico_City',
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric'
                      })}</p>
                      <p>Hora actual: {new Date().toLocaleTimeString('es-ES', { 
                        timeZone: settings?.timezone || 'America/Mexico_City',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateSettingsMutation.isPending}
                    className="w-full"
                  >
                    {updateSettingsMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Configuración
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="currency" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Configuración de Moneda
                </CardTitle>
                <CardDescription>
                  Selecciona la moneda principal de tu negocio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {currenciesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
                    <p className="text-gray-600">Cargando monedas disponibles...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.isArray(currencies) && currencies.length > 0 ? 
                      currencies.map((currency: any) => (
                        <Card 
                          key={currency.code}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            settings?.currency === currency.code 
                              ? 'ring-2 ring-blue-500 bg-blue-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleCurrencyChange(currency.code)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">{currency.code}</Badge>
                              <span className="text-2xl font-bold">{currency.symbol}</span>
                            </div>
                            <h4 className="font-semibold">{currency.name}</h4>
                            <p className="text-sm text-gray-600">{currency.country}</p>
                            <div className="mt-2 text-xs text-gray-500">
                              Decimales: {currency.decimalPlaces}
                            </div>
                          </CardContent>
                        </Card>
                      )) 
                    : (
                      <Card className="col-span-full">
                        <CardContent className="p-8 text-center">
                          <p className="text-gray-600">No hay monedas disponibles</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regional" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Configuración Regional
                </CardTitle>
                <CardDescription>
                  Personaliza el formato de fechas, números y separadores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegionalSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Formato de Fecha</Label>
                      <Select name="dateFormat" defaultValue={settings?.dateFormat}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona formato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timeFormat">Formato de Hora</Label>
                      <Select name="timeFormat" defaultValue={settings?.timeFormat}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona formato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24h">24h (14:30)</SelectItem>
                          <SelectItem value="12h">12h (2:30 PM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="thousandsSeparator">Separador de Miles</Label>
                      <Select name="thousandsSeparator" defaultValue={settings?.thousandsSeparator}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona separador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=",">Coma (1,000)</SelectItem>
                          <SelectItem value=".">Punto (1.000)</SelectItem>
                          <SelectItem value=" ">Espacio (1 000)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="decimalSeparator">Separador Decimal</Label>
                      <Select name="decimalSeparator" defaultValue={settings?.decimalSeparator}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona separador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=".">Punto (10.50)</SelectItem>
                          <SelectItem value=",">Coma (10,50)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Vista Previa</h4>
                    <div className="space-y-1 text-sm text-green-700">
                      <p>Número: 1{settings?.thousandsSeparator || ','}234{settings?.decimalSeparator || '.'}56</p>
                      <p>Moneda: {settings?.currencySymbol || '$'}1{settings?.thousandsSeparator || ','}234{settings?.decimalSeparator || '.'}56</p>
                      <p>Fecha: {new Date().toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateSettingsMutation.isPending}
                    className="w-full"
                  >
                    {updateSettingsMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Configuración
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}