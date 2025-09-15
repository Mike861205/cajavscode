import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import Warehouses from "./warehouses";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Mock the dependencies
vi.mock("@/hooks/use-toast");
vi.mock("@/lib/queryClient");

const mockToast = vi.fn();
const mockApiRequest = vi.mocked(apiRequest);
const mockUseToast = vi.mocked(useToast);

// Mock warehouse data
const mockWarehouses = [
  {
    id: 1,
    name: "Almacén Central",
    address: "Calle Principal 123",
    phone: "555-0123",
    rfc: "ABC123456789",
    taxRegime: "GENERAL",
    commercialName: "Mi Empresa",
    tenantId: "test-tenant",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  },
  {
    id: 2,
    name: "Almacén Norte",
    address: "Avenida Norte 456", 
    phone: "555-0456",
    rfc: "DEF987654321",
    taxRegime: "RESICO",
    commercialName: "Sucursal Norte",
    tenantId: "test-tenant",
    createdAt: new Date("2023-01-02"),
    updatedAt: new Date("2023-01-02"),
  },
];

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe("Warehouses Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseToast.mockReturnValue({ toast: mockToast });
  });

  it("renders the warehouses page with title and description", () => {
    mockApiRequest.mockResolvedValue([]);
    
    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    expect(screen.getByText("Almacenes")).toBeInTheDocument();
    expect(screen.getByText("Gestiona los almacenes de tu empresa")).toBeInTheDocument();
    expect(screen.getByText("Nuevo Almacén")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    mockApiRequest.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    expect(screen.getByText("Cargando almacenes...")).toBeInTheDocument();
  });

  it("displays empty state when no warehouses exist", async () => {
    mockApiRequest.mockResolvedValue([]);
    
    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("No hay almacenes registrados")).toBeInTheDocument();
      expect(screen.getByText("Comience registrando su primer almacén")).toBeInTheDocument();
      expect(screen.getByText("Crear Primer Almacén")).toBeInTheDocument();
    });
  });

  it("displays warehouse cards when warehouses exist", async () => {
    mockApiRequest.mockResolvedValue(mockWarehouses);
    
    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Almacén Central")).toBeInTheDocument();
      expect(screen.getByText("Almacén Norte")).toBeInTheDocument();
      expect(screen.getByText("Calle Principal 123")).toBeInTheDocument();
      expect(screen.getByText("Avenida Norte 456")).toBeInTheDocument();
    });
  });

  it("opens dialog when clicking 'Nuevo Almacén' button", async () => {
    mockApiRequest.mockResolvedValue([]);
    
    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Nuevo Almacén")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Nuevo Almacén"));
    
    expect(screen.getByText("Registrar Nuevo Almacén")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre del Almacén *")).toBeInTheDocument();
  });

  it("validates required fields in the form", async () => {
    mockApiRequest.mockResolvedValue([]);
    
    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText("Nuevo Almacén"));
    });

    // Try to submit empty form
    const submitButton = screen.getByText("Guardar Almacén");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("String must contain at least 1 character(s)")).toBeInTheDocument();
    });
  });

  it("submits form with valid data", async () => {
    const mockCreatedWarehouse = {
      id: 3,
      name: "Test Warehouse",
      address: "Test Address",
      phone: "555-0789",
      rfc: "TEST123456789",
      taxRegime: "GENERAL",
      commercialName: "Test Company",
      tenantId: "test-tenant",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockApiRequest
      .mockResolvedValueOnce([]) // Initial load
      .mockResolvedValueOnce(mockCreatedWarehouse) // Create mutation
      .mockResolvedValueOnce([mockCreatedWarehouse]); // Refetch after creation

    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText("Nuevo Almacén"));
    });

    // Fill out the form
    fireEvent.change(screen.getByLabelText("Nombre del Almacén *"), {
      target: { value: "Test Warehouse" },
    });
    fireEvent.change(screen.getByLabelText("Dirección Completa *"), {
      target: { value: "Test Address" },
    });
    fireEvent.change(screen.getByLabelText("Teléfono"), {
      target: { value: "555-0789" },
    });
    fireEvent.change(screen.getByLabelText("RFC"), {
      target: { value: "TEST123456789" },
    });
    fireEvent.change(screen.getByLabelText("Nombre Comercial"), {
      target: { value: "Test Company" },
    });

    // Submit the form
    fireEvent.click(screen.getByText("Guardar Almacén"));

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith("/api/warehouses", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Warehouse",
          address: "Test Address",
          phone: "555-0789",
          rfc: "TEST123456789",
          taxRegime: "",
          commercialName: "Test Company",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Almacén creado exitosamente",
        description: "El nuevo almacén ha sido registrado en el sistema",
      });
    });
  });

  it("handles form submission errors", async () => {
    const errorMessage = "Validation failed";
    
    mockApiRequest
      .mockResolvedValueOnce([]) // Initial load
      .mockRejectedValueOnce(new Error(errorMessage)); // Create mutation fails

    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText("Nuevo Almacén"));
    });

    // Fill out required fields
    fireEvent.change(screen.getByLabelText("Nombre del Almacén *"), {
      target: { value: "Test Warehouse" },
    });
    fireEvent.change(screen.getByLabelText("Dirección Completa *"), {
      target: { value: "Test Address" },
    });

    // Submit the form
    fireEvent.click(screen.getByText("Guardar Almacén"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error al crear almacén",
        description: errorMessage,
        variant: "destructive",
      });
    });
  });

  it("transforms RFC input to uppercase", async () => {
    mockApiRequest.mockResolvedValue([]);
    
    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText("Nuevo Almacén"));
    });

    const rfcInput = screen.getByLabelText("RFC");
    fireEvent.change(rfcInput, { target: { value: "test123456789" } });

    expect(rfcInput).toHaveValue("TEST123456789");
  });

  it("displays warehouse information correctly in cards", async () => {
    mockApiRequest.mockResolvedValue(mockWarehouses);
    
    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check warehouse names
      expect(screen.getByText("Almacén Central")).toBeInTheDocument();
      expect(screen.getByText("Almacén Norte")).toBeInTheDocument();
      
      // Check commercial names
      expect(screen.getByText("Mi Empresa")).toBeInTheDocument();
      expect(screen.getByText("Sucursal Norte")).toBeInTheDocument();
      
      // Check addresses
      expect(screen.getByText("Calle Principal 123")).toBeInTheDocument();
      expect(screen.getByText("Avenida Norte 456")).toBeInTheDocument();
      
      // Check phone numbers
      expect(screen.getByText("555-0123")).toBeInTheDocument();
      expect(screen.getByText("555-0456")).toBeInTheDocument();
      
      // Check RFC badges
      expect(screen.getByText("RFC: ABC123456789")).toBeInTheDocument();
      expect(screen.getByText("RFC: DEF987654321")).toBeInTheDocument();
    });
  });

  it("shows tax regime labels correctly", async () => {
    mockApiRequest.mockResolvedValue(mockWarehouses);
    
    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Régimen General de Ley")).toBeInTheDocument();
      expect(screen.getByText("Régimen Simplificado de Confianza")).toBeInTheDocument();
    });
  });

  it("closes dialog when clicking cancel", async () => {
    mockApiRequest.mockResolvedValue([]);
    
    render(
      <TestWrapper>
        <Warehouses />
      </TestWrapper>
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText("Nuevo Almacén"));
    });

    expect(screen.getByText("Registrar Nuevo Almacén")).toBeInTheDocument();
    
    fireEvent.click(screen.getByText("Cancelar"));
    
    await waitFor(() => {
      expect(screen.queryByText("Registrar Nuevo Almacén")).not.toBeInTheDocument();
    });
  });
});