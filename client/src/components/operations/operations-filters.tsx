import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Filter, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface OperationsFiltersProps {
  onFiltersChange: (filters: {
    startDate?: string;
    endDate?: string;
    warehouseId?: number;
  }) => void;
}

export default function OperationsFilters({ onFiltersChange }: OperationsFiltersProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");

  // Get warehouses for filter
  const { data: warehouses = [] } = useQuery({
    queryKey: ["/api/warehouses"],
  });

  const handleApplyFilters = () => {
    const filters: any = {};
    
    if (startDate) {
      filters.startDate = startDate;
    }
    
    if (endDate) {
      filters.endDate = endDate;
    }
    
    if (selectedWarehouseId && selectedWarehouseId !== "all") {
      filters.warehouseId = parseInt(selectedWarehouseId);
    }
    
    onFiltersChange(filters);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedWarehouseId("all");
    onFiltersChange({});
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros de Operaciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha Inicial</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Seleccionar fecha inicial"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="endDate">Fecha Final</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Seleccionar fecha final"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="warehouse">Almacén</Label>
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los almacenes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los almacenes</SelectItem>
                {(warehouses as any[]).map((warehouse: any) => (
                  <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleApplyFilters} className="flex-1">
              <Filter className="h-4 w-4 mr-2" />
              Aplicar
            </Button>
            <Button variant="outline" onClick={handleResetFilters}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}