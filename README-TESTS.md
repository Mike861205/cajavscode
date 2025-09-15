# Cómo Ejecutar las Pruebas Automáticas en Replit

Este proyecto incluye pruebas automáticas para todos los módulos usando **Vitest** y **React Testing Library**.

## Comandos de Pruebas Disponibles

### 1. Ejecutar todas las pruebas
```bash
npm run test
```
Este comando ejecuta todas las pruebas en modo "watch" - se re-ejecutan automáticamente cuando cambias archivos.

### 2. Ejecutar pruebas una sola vez
```bash
npm run test:run
```
Ejecuta todas las pruebas una vez y termina.

### 3. Ejecutar pruebas con interfaz visual
```bash
npm run test:ui
```
Abre una interfaz web interactiva para ver y ejecutar pruebas.

### 4. Ejecutar pruebas con cobertura
```bash
npm run test:coverage
```
Ejecuta las pruebas y genera un reporte de cobertura de código.

### 5. Ejecutar pruebas específicas
```bash
npm run test:run -- Warehouses.test.tsx
```
Ejecuta solo las pruebas del archivo especificado.

## Estructura de las Pruebas

Cada módulo tiene su archivo de pruebas correspondiente:
- `client/src/pages/Warehouses.test.tsx` - Pruebas del módulo de Almacenes
- `client/src/setupTests.ts` - Configuración global de pruebas

## Qué Se Prueba

### Pruebas del Módulo Warehouses
- ✅ Renderizado correcto del componente
- ✅ Estados de carga y vacío
- ✅ Validación de formularios
- ✅ Creación de almacenes
- ✅ Manejo de errores
- ✅ Transformación de datos (RFC a mayúsculas)
- ✅ Interacciones de usuario (abrir/cerrar diálogo)

### Cobertura de Código
Las pruebas cubren:
- Lógica de componentes
- Validaciones de formulario
- Manejo de estados
- Interacciones con APIs
- Manejo de errores
- Transformaciones de datos

## Ejecutar en Replit

1. **Desde la consola de Replit:**
   - Abre la pestaña "Console" en Replit
   - Ejecuta cualquier comando de pruebas listado arriba

2. **Desde el editor:**
   - Ve a la carpeta `client/src/pages/`
   - Abre `Warehouses.test.tsx` para ver las pruebas
   - Usa el botón "Run" en la barra superior para ejecutar

3. **Configuración automática:**
   - Las pruebas están configuradas para usar jsdom (simula navegador)
   - Mocks automáticos para APIs y hooks
   - Configuración de TypeScript incluida

## Ejemplo de Salida
```
✓ renders the warehouses page with title and description
✓ shows loading state initially  
✓ displays empty state when no warehouses exist
✓ submits form with valid data
✓ handles form submission errors
✓ validates required fields in the form
```

## Agregar Nuevas Pruebas

Para crear pruebas para un nuevo módulo:

1. Crea un archivo `NombreModulo.test.tsx` en la misma carpeta
2. Importa las herramientas necesarias:
   ```typescript
   import { render, screen, fireEvent, waitFor } from "@testing-library/react";
   import { vi, describe, it, expect } from "vitest";
   ```
3. Crea un TestWrapper con QueryClient para pruebas
4. Escribe pruebas para cada funcionalidad del componente
5. Ejecuta `npm run test` para verificar que funcionen

Las pruebas se ejecutan automáticamente en cada cambio de código, ayudando a detectar errores temprano y mantener la calidad del código.