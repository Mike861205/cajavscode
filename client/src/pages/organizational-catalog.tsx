import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users } from "lucide-react";
import { DepartmentManager, JobPositionManager } from "@/components/payroll";

export default function OrganizationalCatalog() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Catálogos Organizacionales</h1>
        <p className="text-muted-foreground">
          Gestiona la estructura organizacional de tu empresa
        </p>
      </div>

      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Departamentos
          </TabsTrigger>
          <TabsTrigger value="positions" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Puestos de Trabajo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Departamentos
              </CardTitle>
              <CardDescription>
                Organiza tu empresa en departamentos para una mejor gestión del personal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DepartmentManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Puestos de Trabajo
              </CardTitle>
              <CardDescription>
                Define los puestos de trabajo disponibles en cada departamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobPositionManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}