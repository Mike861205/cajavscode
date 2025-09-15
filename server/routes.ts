import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { AIChatService } from "./ai-chat.js";
import { insertProductSchema, insertSaleSchema, insertSaleItemSchema, insertCategorySchema, insertPurchaseSchema, insertSupplierSchema, insertCashRegisterSchema, insertCashTransactionSchema, insertWarehouseSchema, employees, payrollStamps, appointments, appointmentProducts, insertAppointmentSchema, products, customers, insertCustomerSchema, loanClients, personalReferences, insertLoanClientSchema, insertPersonalReferenceSchema, storeOrders, storeOrderItems, tenants } from "@shared/schema";
import settingsRoutes from "./routes/settings";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import sgMail from "@sendgrid/mail";


// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_multer,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Configuración específica para archivos Excel
const uploadExcel = multer({
  storage: storage_multer,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for Excel files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export function registerRoutes(app: Express): Server {
  // Setup authentication routes FIRST - CRITICAL PRIORITY
  setupAuth(app);

  // Health check endpoint for deployment monitoring - NO AUTH REQUIRED
  app.get("/health", async (req, res) => {
    try {
      // Check database connectivity
      await db.select().from(tenants).limit(1);
      
      res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected",
        uptime: process.uptime()
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Explicit logout endpoint override to prevent Vite middleware interference
  app.post("/api/logout", (req: any, res) => {
    console.log("🔥 LOGOUT ENDPOINT HIT - Processing logout request");
    req.logout((err: any) => {
      if (err) {
        console.error("🔥 Logout error:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      console.log("🔥 Logout successful - Clearing session");
      res.status(200).json({ message: "Logout successful" });
    });
  });



  // Settings routes
  app.use("/api/settings", settingsRoutes);

  // === INVENTORY ROUTES - PRIORITY PLACEMENT ===
  // Simplified middleware to check tenant access
  const requireTenant = async (req: any, res: any, next: any) => {
    console.log("🔥 requireTenant middleware - Start");
    console.log("🔥 requireTenant middleware - authenticated:", req.isAuthenticated?.());
    console.log("🔥 requireTenant middleware - user:", req.user?.username);
    console.log("🔥 requireTenant middleware - tenantId:", req.user?.tenantId);
    
    if (!req.isAuthenticated()) {
      console.error("🔥 Authentication failed");
      return res.status(401).json({ message: "Authentication required" });
    }
    
    if (!req.user || !req.user.tenantId) {
      console.error(`🔥 Access denied - User missing tenantId: ${req.user?.username}`);
      return res.status(403).json({ 
        message: "Tenant access required - Invalid tenant configuration" 
      });
    }

    console.log(`🔥 Access granted - User: ${req.user.username}, Tenant: ${req.user.tenantId}`);
    next();
  };

  // Product Sales Report endpoint
  app.get("/api/sales/product-sales", requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate, productId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const productSalesData = await storage.getProductSalesReport(
        req.user.tenantId,
        startDate as string,
        endDate as string,
        productId ? parseInt(productId as string) : undefined
      );

      res.json(productSalesData);
    } catch (error) {
      console.error("Error fetching product sales report:", error);
      res.status(500).json({ message: "Error al obtener reporte de ventas por producto" });
    }
  });

  // Save physical inventory count - PRIORITY ROUTE
  app.post("/api/inventory/physical", requireTenant, async (req: any, res) => {
    console.log("🔧 ENDPOINT HIT: /api/inventory/physical");
    try {
      const inventoryCountSchema = z.object({
        products: z.array(z.object({
          productId: z.number(),
          systemStock: z.number(),
          physicalCount: z.number(),
          shrinkage: z.number(),
          shrinkageNotes: z.string().optional(),
          variance: z.number(),
          varianceType: z.enum(['faltante', 'sobrante', 'exacto'])
        })),
        dateRange: z.object({
          from: z.string(),
          to: z.string()
        }),
        notes: z.string().optional(),
        warehouseId: z.union([z.number(), z.null()]).optional()
      });

      console.log("🔧 Physical inventory request body:", JSON.stringify(req.body, null, 2));
      console.log("🔧 RAW warehouseId from body:", req.body.warehouseId);
      console.log("🔧 RAW warehouseId type:", typeof req.body.warehouseId);
      const validatedData = inventoryCountSchema.parse(req.body);
      console.log("🔧 Parsed warehouseId:", validatedData.warehouseId);
      console.log("🔧 Parsed warehouseId type:", typeof validatedData.warehouseId);
      
      // Ensure warehouseId is a valid number or null
      const warehouseId = validatedData.warehouseId && !isNaN(validatedData.warehouseId) ? validatedData.warehouseId : null;
      console.log("🔧 Final warehouseId to save:", warehouseId);
      
      // Get product names for the inventory products
      const productIds = validatedData.products.map(p => p.productId);
      const products = await storage.getProducts(req.user.tenantId);
      const productMap = new Map(products.map(p => [p.id, p.name]));
      
      // Enrich products with names
      const enrichedProducts = validatedData.products.map(p => ({
        ...p,
        productName: productMap.get(p.productId) || `Producto ${p.productId}`
      }));
      
      const inventoryCount = {
        id: `INV-${Date.now()}`,
        tenantId: req.user.tenantId,
        userId: req.user.id,
        date: new Date().toISOString(),
        warehouseId: warehouseId, // Use the cleaned warehouseId
        dateRange: validatedData.dateRange,
        notes: validatedData.notes,
        products: enrichedProducts, // Use enriched products with names
        status: 'completed',
        totalProducts: validatedData.products.length,
        totalVariances: validatedData.products.filter(p => p.variance !== 0).length
      };

      console.log("🔧 Final inventoryCount object:", JSON.stringify(inventoryCount, null, 2));

      // Save inventory record to database
      await storage.saveInventoryRecord(inventoryCount);

      res.status(201).json(inventoryCount);
    } catch (error) {
      console.error("Error saving physical inventory:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save physical inventory" });
    }
  });

  // Image integrity management endpoints
  app.get("/api/images/integrity/:tenantId", requireTenant, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      
      // Verificar que el usuario tenga acceso al tenant
      if (req.user.tenantId !== tenantId) {
        return res.status(403).json({ message: "Acceso denegado al tenant" });
      }
      
      console.log(`🔍 Generando reporte de integridad para tenant: ${tenantId}`);
      
      const { ImageIntegrityManager } = await import('./utils/image-integrity');
      const report = await ImageIntegrityManager.generateIntegrityReport(tenantId);
      
      console.log(`📊 Reporte generado - Total: ${report.totalProducts}, Con imágenes: ${report.withImages}, Rotas detectadas: ${report.imagesBroken}`);
      
      res.json(report);
    } catch (error) {
      console.error("Error generando reporte de integridad:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/images/migrate/:tenantId", requireTenant, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      
      if (req.user.tenantId !== tenantId) {
        return res.status(403).json({ message: "Acceso denegado al tenant" });
      }
      
      console.log(`🔄 Iniciando migración de imágenes para tenant: ${tenantId}`);
      
      const { ImageIntegrityManager } = await import('./utils/image-integrity');
      
      // Primero, crear respaldo por seguridad
      const { ImageBackupManager } = await import('./utils/image-backup');
      await ImageBackupManager.createTenantBackup(tenantId);
      
      const migratedCount = await ImageIntegrityManager.migrateLegacyImages(tenantId);
      
      console.log(`✅ Migración completada: ${migratedCount} imágenes procesadas`);
      
      res.json({ 
        success: true, 
        migratedCount,
        message: migratedCount > 0 ? 
          `${migratedCount} imágenes migradas exitosamente` : 
          `Todas las imágenes ya están correctamente organizadas`
      });
    } catch (error) {
      console.error("Error migrando imágenes:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/images/clean/:tenantId", requireTenant, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      
      if (req.user.tenantId !== tenantId) {
        return res.status(403).json({ message: "Acceso denegado al tenant" });
      }
      
      console.log(`🧹 Iniciando limpieza de URLs rotas para tenant: ${tenantId}`);
      
      const { ImageIntegrityManager } = await import('./utils/image-integrity');
      const cleanedCount = await ImageIntegrityManager.cleanBrokenImageUrls(tenantId);
      
      console.log(`✅ Limpieza completada: ${cleanedCount} URLs procesadas`);
      
      res.json({ 
        success: true,
        cleanedCount,
        message: cleanedCount > 0 ? 
          `${cleanedCount} URLs rotas limpiadas exitosamente` : 
          `No se encontraron URLs rotas para limpiar`
      });
    } catch (error) {
      console.error("Error limpiando URLs rotas:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/images/clean/:tenantId", requireTenant, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      
      if (req.user.tenantId !== tenantId) {
        return res.status(403).json({ message: "Acceso denegado al tenant" });
      }
      
      const { ImageIntegrityManager } = await import('./utils/image-integrity');
      const cleanedCount = await ImageIntegrityManager.cleanBrokenImageUrls(tenantId);
      
      res.json({ 
        success: true, 
        cleanedCount,
        message: `${cleanedCount} URLs rotas limpiadas exitosamente` 
      });
    } catch (error) {
      console.error("Error limpiando URLs:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Serve uploaded images
  app.use('/uploads', express.static(uploadDir));

  // Middleware already defined above - removing duplicate

  // === PRODUCT IMPORT/EXPORT ROUTES (moved to top for priority) ===
  
  // Descargar plantilla de productos
  app.get("/api/products/template", requireTenant, async (req: any, res) => {
    try {
      console.log("🔄 Generating product template for tenant:", req.user.tenantId);
      const filePath = await storage.generateProductTemplate();
      console.log("✅ Template generated at:", filePath);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla_productos.xlsx"');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Limpiar archivo temporal después de enviarlo
      fileStream.on('end', () => {
        fs.unlinkSync(filePath);
      });
    } catch (error) {
      console.error("❌ Error generating product template:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Error al generar plantilla de productos" });
    }
  });

  // Importar productos desde Excel
  app.post("/api/products/import", requireTenant, uploadExcel.single('file'), async (req: any, res) => {
    try {
      console.log("🔄 Importing products from Excel for tenant:", req.user.tenantId);
      
      if (!req.file) {
        return res.status(400).json({ message: "No se ha enviado ningún archivo" });
      }

      const result = await storage.importProductsFromExcel(req.file.path, req.user.tenantId);
      console.log("✅ Import result:", result);
      
      // Limpiar archivo temporal
      fs.unlinkSync(req.file.path);
      
      res.json(result);
    } catch (error) {
      console.error("❌ Error importing products:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Error al importar productos" });
    }
  });

  // Exportar productos a Excel
  app.get("/api/products/export/excel", requireTenant, async (req: any, res) => {
    try {
      console.log("🔄 Exporting products to Excel for tenant:", req.user.tenantId);
      const filePath = await storage.exportProductsToExcel(req.user.tenantId);
      console.log("✅ Excel export generated at:", filePath);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="productos_${new Date().toISOString().split('T')[0]}.xlsx"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Limpiar archivo temporal después de enviarlo
      fileStream.on('end', () => {
        fs.unlinkSync(filePath);
      });
    } catch (error) {
      console.error("❌ Error exporting products to Excel:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Error al exportar productos a Excel" });
    }
  });

  // Exportar productos a PDF
  app.get("/api/products/export/pdf", requireTenant, async (req: any, res) => {
    try {
      console.log("🔄 Exporting products to PDF for tenant:", req.user.tenantId);
      const filePath = await storage.exportProductsToPDF(req.user.tenantId);
      console.log("✅ PDF export generated at:", filePath);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="productos_${new Date().toISOString().split('T')[0]}.pdf"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Limpiar archivo temporal después de enviarlo
      fileStream.on('end', () => {
        fs.unlinkSync(filePath);
      });
    } catch (error) {
      console.error("❌ Error exporting products to PDF:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Error al exportar productos a PDF" });
    }
  });

  // === PROMOTIONS ROUTES (moved to top for priority) ===
  
  // Test endpoint to verify promotions functionality
  app.get("/api/test-promotion", requireTenant, async (req: any, res) => {
    try {
      console.log("🔥 TEST PROMOTION ENDPOINT - GET");
      console.log("🔥 User:", req.user?.username);
      console.log("🔥 TenantId:", req.user?.tenantId);
      
      // Create test promotion data
      const testPromotionData = {
        name: "TEST PROMOTION " + Date.now(),
        type: "percentage",
        description: "Test promotion from endpoint",
        value: "15",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        applyTo: "all",
        isActive: true,
        stackable: false,
        priority: 1,
        tenantId: req.user.tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log("🔥 Creating test promotion:", JSON.stringify(testPromotionData, null, 2));
      
      const promotion = await storage.createPromotion(testPromotionData);
      console.log("🔥 Test promotion created successfully:", promotion.id);
      
      res.json({ success: true, promotion, message: "Test promotion created successfully!" });
    } catch (error) {
      console.error("🔥 Error in test promotion endpoint:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Toggle promotion active status
  app.patch("/api/promotions/:id/toggle", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const tenantId = req.user?.tenantId;
      
      const promotion = await storage.updatePromotionStatus(parseInt(id), isActive, tenantId);
      res.json(promotion);
    } catch (error) {
      console.error("Error toggling promotion status:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get all promotions with session support
  app.get("/api/promotions", requireTenant, async (req: any, res) => {
    try {
      console.log("🔥 GET /api/promotions - Session check");
      console.log("🔥 User:", req.user?.username, "TenantId:", req.user?.tenantId);
      
      const promotions = await storage.getPromotions(req.user.tenantId);
      console.log("🔥 Found", promotions.length, "promotions");
      console.log("🔥 Route handler - Sending promotions to frontend:", JSON.stringify(promotions, null, 2));
      return res.json(promotions);
    } catch (error) {
      console.error("🔥 Error fetching promotions:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get promotions stats
  app.get("/api/promotions/stats", requireTenant, async (req: any, res) => {
    try {
      const stats = await storage.getPromotionStats(req.user.tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching promotion stats:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get products associated with a specific promotion
  app.get("/api/promotions/:id/products", requireTenant, async (req: any, res) => {
    try {
      const promotionId = parseInt(req.params.id);
      const products = await storage.getPromotionProducts(promotionId, req.user.tenantId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching promotion products:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get categories associated with a specific promotion
  app.get("/api/promotions/:id/categories", requireTenant, async (req: any, res) => {
    try {
      const promotionId = parseInt(req.params.id);
      const categories = await storage.getPromotionCategories(promotionId, req.user.tenantId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching promotion categories:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get active promotions for POS
  app.get("/api/promotions/active", requireTenant, async (req: any, res) => {
    try {
      const activePromotions = await storage.getActivePromotions(req.user.tenantId);
      res.json(activePromotions);
    } catch (error) {
      console.error("Error fetching active promotions:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Create new promotion with enhanced validation
  app.post("/api/promotions", requireTenant, async (req: any, res) => {
    try {
      console.log("🔥 Creating promotion - Session check");
      console.log("🔥 User:", req.user?.username, "TenantId:", req.user?.tenantId);
      console.log("🔥 Received promotion data:", JSON.stringify(req.body, null, 2));
      
      const { selectedProducts, selectedCategories, ...promotionData } = req.body;
      
      // Validate required fields
      if (!promotionData.name || !promotionData.type || !promotionData.startDate || !promotionData.endDate) {
        return res.status(400).json({ 
          message: "Campos requeridos faltantes: nombre, tipo, fecha de inicio y fecha de fin son obligatorios" 
        });
      }
      
      // Helper function to safely parse dates
      const parseDate = (dateStr: string): Date => {
        if (!dateStr) return new Date();
        
        // If date already includes time, use as-is
        if (dateStr.includes('T')) {
          return new Date(dateStr);
        }
        
        // If only date (YYYY-MM-DD), add time
        return new Date(dateStr + 'T00:00:00.000Z');
      };

      // Prepare promotion data with proper type conversion
      const formattedPromotionData = {
        ...promotionData,
        tenantId: req.user.tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: parseDate(promotionData.startDate),
        endDate: parseDate(promotionData.endDate),
        // Ensure numeric fields are properly converted
        minQuantity: promotionData.minQuantity ? Number(promotionData.minQuantity) : 0,
        maxQuantity: promotionData.maxQuantity ? Number(promotionData.maxQuantity) : 0,
        minPurchaseAmount: promotionData.minPurchaseAmount ? Number(promotionData.minPurchaseAmount) : 0,
        maxUses: promotionData.maxUses ? Number(promotionData.maxUses) : 0,
        buyQuantity: promotionData.buyQuantity ? Number(promotionData.buyQuantity) : 1,
        getQuantity: promotionData.getQuantity ? Number(promotionData.getQuantity) : 1,
        priority: promotionData.priority ? Number(promotionData.priority) : 1,
      };
      
      console.log("🔥 Formatted promotion data:", JSON.stringify(formattedPromotionData, null, 2));
      
      // Create the promotion
      const promotion = await storage.createPromotion(formattedPromotionData);
      console.log("🔥 Promotion created with ID:", promotion.id);
      
      // Add selected products if any
      if (selectedProducts && selectedProducts.length > 0) {
        console.log("🔥 Adding products to promotion:", selectedProducts);
        await storage.addPromotionProducts(promotion.id, selectedProducts, req.user.tenantId);
      }
      
      // Add selected categories if any
      if (selectedCategories && selectedCategories.length > 0) {
        console.log("🔥 Adding categories to promotion:", selectedCategories);
        await storage.addPromotionCategories(promotion.id, selectedCategories, req.user.tenantId);
      }
      
      res.status(201).json(promotion);
    } catch (error) {
      console.error("🔥 Error creating promotion:", error);
      res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
  });

  // Update promotion
  app.put("/api/promotions/:id", async (req: any, res) => {
    try {
      console.log("🔥 Updating promotion:", req.params.id);
      
      if (!req.user || !req.user.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { selectedProducts, selectedCategories, ...promotionData } = req.body;
      
      // Helper function to safely parse dates
      const parseDate = (dateStr: string): Date => {
        if (!dateStr) return new Date();
        
        // If date already includes time, use as-is
        if (dateStr.includes('T')) {
          return new Date(dateStr);
        }
        
        // If only date (YYYY-MM-DD), add time
        return new Date(dateStr + 'T00:00:00.000Z');
      };

      const formattedPromotionData = {
        ...promotionData,
        tenantId: req.user.tenantId,
        updatedAt: new Date(),
        startDate: promotionData.startDate ? parseDate(promotionData.startDate) : undefined,
        endDate: promotionData.endDate ? parseDate(promotionData.endDate) : undefined,
        // Ensure numeric fields are properly converted
        minQuantity: promotionData.minQuantity ? Number(promotionData.minQuantity) : 0,
        maxQuantity: promotionData.maxQuantity ? Number(promotionData.maxQuantity) : 0,
        minPurchaseAmount: promotionData.minPurchaseAmount ? Number(promotionData.minPurchaseAmount) : 0,
        maxUses: promotionData.maxUses ? Number(promotionData.maxUses) : 0,
        buyQuantity: promotionData.buyQuantity ? Number(promotionData.buyQuantity) : 1,
        getQuantity: promotionData.getQuantity ? Number(promotionData.getQuantity) : 1,
        priority: promotionData.priority ? Number(promotionData.priority) : 1,
      };

      const promotion = await storage.updatePromotion(
        parseInt(req.params.id), 
        formattedPromotionData,
        req.user.tenantId
      );

      if (!promotion) {
        return res.status(404).json({ message: "Promotion not found" });
      }

      // Update associated products and categories
      await storage.removeAllPromotionProducts(promotion.id, req.user.tenantId);
      await storage.removeAllPromotionCategories(promotion.id, req.user.tenantId);

      if (selectedProducts && selectedProducts.length > 0) {
        await storage.addPromotionProducts(promotion.id, selectedProducts, req.user.tenantId);
      }

      if (selectedCategories && selectedCategories.length > 0) {
        await storage.addPromotionCategories(promotion.id, selectedCategories, req.user.tenantId);
      }

      res.json(promotion);
    } catch (error) {
      console.error("🔥 Error updating promotion:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Delete promotion
  app.delete("/api/promotions/:id", async (req: any, res) => {
    try {
      console.log("🔥 Deleting promotion:", req.params.id);
      
      if (!req.user || !req.user.tenantId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const success = await storage.deletePromotion(
        parseInt(req.params.id),
        req.user.tenantId
      );

      if (!success) {
        return res.status(404).json({ message: "Promotion not found" });
      }

      res.json({ message: "Promotion deleted successfully" });
    } catch (error) {
      console.error("🔥 Error deleting promotion:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Serve static uploaded files
  app.use('/uploads', express.static(uploadDir));

  // Image upload routes (both variants for compatibility)
  app.post("/api/upload/image", requireTenant, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        console.log("No file received in upload request");
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const { ImageIntegrityManager } = await import('./utils/image-integrity');
      const tenantId = req.user.tenantId;
      
      // Generar nueva ruta organizada por tenant
      const filename = req.file.filename;
      const tenantImageUrl = ImageIntegrityManager.generateTenantImagePath(tenantId, filename);
      
      // Mover archivo a estructura por tenant
      const fs = await import('fs');
      const path = await import('path');
      
      const oldPath = req.file.path;
      const newPath = path.join(process.cwd(), tenantImageUrl.replace(/^\/+/, ''));
      
      fs.renameSync(oldPath, newPath);
      
      console.log(`✅ Image uploaded for tenant ${tenantId}: ${filename} -> ${tenantImageUrl}`);
      res.json({ imageUrl: tenantImageUrl });
    } catch (error) {
      console.error("Error in image upload:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Alternative upload route for compatibility with tenant organization
  app.post("/api/upload", requireTenant, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        console.log("No file received in upload request");
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const tenantId = req.user.tenantId;
      const filename = req.file.filename;
      
      // Usar el nuevo middleware de persistencia
      const { ImagePersistenceMiddleware } = await import('./middleware/image-persistence');
      const imageUrl = ImagePersistenceMiddleware.processUploadWithPersistence(
        tenantId, 
        filename, 
        req.file.path
      );
      
      console.log(`✅ Imagen subida con persistencia para tenant ${tenantId}: ${filename} -> ${imageUrl}`);
      res.json({ url: imageUrl, imageUrl: imageUrl });
    } catch (error) {
      console.error("Error en subida de imagen:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  // Products routes
  app.get("/api/products", requireTenant, async (req: any, res) => {
    try {
      console.log(`Getting products for user: ${req.user.username}, tenantId: ${req.user.tenantId}`);
      const products = await storage.getProducts(req.user.tenantId, req.user.id);
      console.log(`Returning ${products.length} products for tenant ${req.user.tenantId}`);
      
      // Add cache control headers to prevent stale data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'ETag': `"products-${req.user.tenantId}-${Date.now()}"`
      });
      
      // Force JSON response with explicit content type
      res.setHeader('Content-Type', 'application/json');
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", requireTenant, async (req: any, res) => {
    try {
      const { warehouseStocks, components, variants, ...productData } = req.body;
      
      console.log(`Creating product for tenant: ${req.user.tenantId}`);
      console.log(`Raw product data:`, JSON.stringify(req.body, null, 2));
      
      // Clean and validate product data
      const cleanedProductData = {
        name: productData.name || "",
        description: productData.description || "",
        sku: productData.sku || "",
        price: productData.price ? productData.price.toString() : "0",
        cost: productData.cost ? productData.cost.toString() : "0",
        stock: productData.stock ? productData.stock.toString() : "0",
        minStock: productData.minStock ? productData.minStock.toString() : "0",
        realStock: productData.stock ? productData.stock.toString() : "0",
        status: productData.status || "active",
        isComposite: Boolean(productData.isComposite),
        isConjunto: Boolean(productData.isConjunto),
        imageUrl: productData.imageUrl || "",
        unitType: productData.unitType || "piece",
        allowDecimals: Boolean(productData.allowDecimals),
        saleUnit: productData.saleUnit || "1",
        saleUnitName: productData.saleUnitName || "unidad",
        categoryId: productData.categoryId ? parseInt(productData.categoryId) : null,
        sortOrder: productData.sortOrder ? parseInt(productData.sortOrder) : 0,
        tenantId: req.user.tenantId
      };
      
      console.log(`Cleaned product data:`, cleanedProductData);
      console.log(`Warehouse stocks:`, warehouseStocks);
      console.log(`Components:`, components);
      console.log(`Variants:`, variants);
      
      // Skip strict schema validation and use cleaned data directly
      const product = await storage.createProduct(cleanedProductData, warehouseStocks, components, variants);
      console.log(`✓ Product created successfully for tenant: ${req.user.tenantId}, ID: ${product.id}`);
      res.status(201).json(product);
    } catch (error) {
      console.error("Product creation error:", error);
      console.error("Error details:", error.message);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product", error: error.message });
    }
  });

  app.put("/api/products/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { warehouseStocks, components, ...productData } = req.body;
      
      // Map costPrice to cost if present
      if (productData.costPrice !== undefined) {
        productData.cost = productData.costPrice.toString();
        delete productData.costPrice;
      }

      const updates = insertProductSchema.partial().parse(productData);
      console.log(`Updating product ${id} with data:`, updates);
      console.log(`Warehouse stocks:`, warehouseStocks);
      
      const product = await storage.updateProduct(id, updates, req.user.tenantId, warehouseStocks, components);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Product update error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Update product image route with tenant organization
  app.patch("/api/products/:id/image", requireTenant, upload.single('image'), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const { ImageIntegrityManager } = await import('./utils/image-integrity');
      const tenantId = req.user.tenantId;
      
      // Generar nueva ruta organizada por tenant
      const filename = req.file.filename;
      const tenantImageUrl = ImageIntegrityManager.generateTenantImagePath(tenantId, filename);
      
      // Mover archivo a estructura por tenant
      const fs = await import('fs');
      const path = await import('path');
      
      const oldPath = req.file.path;
      const newPath = path.join(process.cwd(), tenantImageUrl.replace(/^\/+/, ''));
      
      fs.renameSync(oldPath, newPath);

      const product = await storage.updateProduct(id, { imageUrl: tenantImageUrl }, req.user.tenantId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      console.log(`✅ Product image updated for tenant ${tenantId}: ${product.name} -> ${tenantImageUrl}`);
      res.json({ 
        message: "Product image updated successfully",
        imageUrl: tenantImageUrl,
        product 
      });
    } catch (error) {
      console.error("Product image update error:", error);
      res.status(500).json({ message: "Failed to update product image" });
    }
  });

  app.delete("/api/products/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id, req.user.tenantId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Upload product image with tenant organization
  app.post("/api/products/upload-image", requireTenant, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const { ImageIntegrityManager } = await import('./utils/image-integrity');
      const tenantId = req.user.tenantId;
      
      // Generar nueva ruta organizada por tenant
      const filename = req.file.filename;
      const tenantImageUrl = ImageIntegrityManager.generateTenantImagePath(tenantId, filename);
      
      // Mover archivo a estructura por tenant
      const fs = await import('fs');
      const path = await import('path');
      
      const oldPath = req.file.path;
      const newPath = path.join(process.cwd(), tenantImageUrl.replace(/^\/+/, ''));
      
      fs.renameSync(oldPath, newPath);
      
      console.log(`✅ Product image uploaded for tenant ${tenantId}: ${filename} -> ${tenantImageUrl}`);
      res.json({ 
        imageUrl: tenantImageUrl,
        message: "Image uploaded successfully" 
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Update product weight sale configuration
  app.patch("/api/products/:id/weight-sale", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { saleUnit, saleUnitName, saleUnitPrice, allowDecimals } = req.body;

      if (!saleUnit || !saleUnitName) {
        return res.status(400).json({ message: "saleUnit and saleUnitName are required" });
      }

      const updates = {
        saleUnit: saleUnit.toString(),
        saleUnitName: saleUnitName.toString(),
        saleUnitPrice: saleUnitPrice ? parseFloat(saleUnitPrice).toString() : null,
        allowDecimals: Boolean(allowDecimals)
      };

      const product = await storage.updateProduct(id, updates, req.user.tenantId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json({ 
        message: "Weight sale configuration updated successfully",
        product 
      });
    } catch (error) {
      console.error("Weight sale configuration update error:", error);
      res.status(500).json({ message: "Failed to update weight sale configuration" });
    }
  });

  app.get("/api/products/:id/components", requireTenant, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const components = await storage.getProductComponents(productId, req.user.tenantId);
      res.json(components);
    } catch (error) {
      console.error("Error fetching product components:", error);
      res.status(500).json({ message: "Failed to fetch product components" });
    }
  });



  // Endpoint para actualizar el orden de productos en POS
  app.patch("/api/products/reorder", requireTenant, async (req: any, res) => {
    try {
      const { productOrders } = req.body; // Array de { id: number, sortOrder: number }
      
      if (!Array.isArray(productOrders)) {
        return res.status(400).json({ message: "productOrders must be an array" });
      }

      const results = await Promise.all(
        productOrders.map(async ({ id, sortOrder }) => {
          return await storage.updateProductSortOrder(id, sortOrder, req.user.tenantId);
        })
      );

      res.json({ 
        message: "Product order updated successfully",
        updatedCount: results.filter(Boolean).length 
      });
    } catch (error) {
      console.error("Error reordering products:", error);
      res.status(500).json({ message: "Failed to reorder products" });
    }
  });

  // ==================== PRODUCT WEIGHT VARIANTS ROUTES ====================

  // Get weight variants for a product
  app.get("/api/products/:id/weight-variants", requireTenant, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const variants = await storage.getProductWeightVariants(productId, req.user.tenantId);
      
      res.json(variants);
    } catch (error) {
      console.error("Error fetching weight variants:", error);
      res.status(500).json({ message: "Failed to fetch weight variants" });
    }
  });

  // Create weight variant for a product
  app.post("/api/products/:id/weight-variants", requireTenant, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const variantData = {
        ...req.body,
        productId,
        tenantId: req.user.tenantId
      };
      
      const variant = await storage.createProductWeightVariant(variantData);
      res.status(201).json(variant);
    } catch (error) {
      console.error("Error creating weight variant:", error);
      res.status(500).json({ message: "Failed to create weight variant" });
    }
  });

  // Update weight variant
  app.put("/api/weight-variants/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const variant = await storage.updateProductWeightVariant(id, req.body, req.user.tenantId);
      
      if (!variant) {
        return res.status(404).json({ message: "Weight variant not found" });
      }
      
      res.json(variant);
    } catch (error) {
      console.error("Error updating weight variant:", error);
      res.status(500).json({ message: "Failed to update weight variant" });
    }
  });

  // Delete weight variant
  app.delete("/api/weight-variants/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProductWeightVariant(id, req.user.tenantId);
      
      if (!success) {
        return res.status(404).json({ message: "Weight variant not found" });
      }
      
      res.json({ message: "Weight variant deleted successfully" });
    } catch (error) {
      console.error("Error deleting weight variant:", error);
      res.status(500).json({ message: "Failed to delete weight variant" });
    }
  });

  // Categories routes
  app.get("/api/categories", requireTenant, async (req: any, res) => {
    try {
      console.log(`Getting categories for user: ${req.user.username}, tenantId: ${req.user.tenantId}`);
      const categories = await storage.getCategories(req.user.tenantId);
      console.log(`Returning ${categories.length} categories for tenant ${req.user.tenantId}`);
      
      // Add cache control headers to prevent stale data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'ETag': `"categories-${req.user.tenantId}-${Date.now()}"`
      });
      
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", requireTenant, async (req: any, res) => {
    try {
      const categoryData = { ...req.body, tenantId: req.user.tenantId };
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/categories/:id", requireTenant, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const categoryData = { ...req.body, tenantId: req.user.tenantId };
      const category = await storage.updateCategory(categoryId, categoryData, req.user.tenantId);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", requireTenant, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const success = await storage.deleteCategory(categoryId, req.user.tenantId);
      
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });



  // Sales routes - Fixed multi-tenant isolation
  app.get("/api/sales", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      console.log(`Getting sales for user: ${req.user.username}, tenantId: ${tenantId}`);
      
      // Check if user is super_admin
      const userRole = await storage.getUserRole(userId, tenantId);
      const isSuperAdmin = userRole?.name === 'super_admin';
      
      const { period, startDate, endDate, userId: filterUserId, warehouseId } = req.query;
      
      let dateFilter: any = {};
      
      // Apply date filtering based on period or specific dates
      // NOTE: Frontend now sends timezone-aware dates, so we use them directly
      if (startDate || endDate) {
        if (startDate) dateFilter.startDate = new Date(startDate);
        if (endDate) dateFilter.endDate = new Date(endDate);
      } else if (period) {
        // Fallback for direct API calls without timezone-aware dates
        const now = new Date();
        switch (period) {
          case 'today':
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(now);
            todayEnd.setHours(23, 59, 59, 999);
            dateFilter = { startDate: todayStart, endDate: todayEnd };
            break;
          case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);
            weekStart.setHours(0, 0, 0, 0);
            dateFilter = { startDate: weekStart, endDate: now };
            break;
          case 'month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            monthStart.setHours(0, 0, 0, 0);
            dateFilter = { startDate: monthStart, endDate: now };
            break;
        }
      }
      
      // Super admin sees all sales unless specific user filter is applied
      let finalUserId = undefined;
      if (filterUserId && filterUserId !== 'all') {
        finalUserId = parseInt(filterUserId);
      } else if (!isSuperAdmin) {
        finalUserId = userId; // Regular users only see their own sales
      }
      
      const sales = await storage.getSalesWithFilters(tenantId, {
        ...dateFilter,
        userId: finalUserId,
        warehouseId: warehouseId ? parseInt(warehouseId) : undefined
      }, userId);
      
      // Log credit sales for debugging
      const creditSales = sales.filter(sale => sale.paymentMethod === "credit");
      console.log(`DEBUG: Found ${creditSales.length} credit sales:`, creditSales.map(s => ({ id: s.id, paymentMethod: s.paymentMethod, status: s.status })));
      
      console.log(`User ${req.user.username} (super_admin: ${isSuperAdmin}) retrieved ${sales.length} sales`);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching sales:", error);
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.post("/api/sales", requireTenant, async (req: any, res) => {
    try {
      const { sale, items, payments } = req.body;
      
      console.log("🔥 ENDPOINT POST /api/sales - INICIO");
      console.log("🔥 Received sale data:", JSON.stringify({ sale, items, payments }, null, 2));
      console.log("🔥 User context:", { id: req.user.id, tenantId: req.user.tenantId, warehouseId: req.user.warehouseId });
      
      // Ensure tenant isolation in sale creation
      const saleData = {
        ...sale,
        userId: req.user.id,
        tenantId: req.user.tenantId,
        warehouseId: req.user.warehouseId || null
      };
      
      console.log("🔥 Sale data to validate:", JSON.stringify(saleData, null, 2));
      console.log("🔥 Items to process:", JSON.stringify(items, null, 2));
      
      // Verificar si hay productos conjunto antes de la venta
      for (const item of items || []) {
        console.log(`🔥 PRE-VENTA: Checking product ID ${item.productId} for conjunto status`);
      }
      
      console.log("🔥 CALLING storage.createSale...");
      // Create sale with payments support
      const newSale = await storage.createSale(saleData, items || [], payments || []);
      console.log(`🔥 ✓ Sale created successfully for tenant: ${req.user.tenantId}, ID: ${newSale.id}`);
      console.log("🔥 ENDPOINT POST /api/sales - FIN EXITOSO");
      res.status(201).json(newSale);
    } catch (error) {
      console.error("🔥 ❌ ENDPOINT POST /api/sales - ERROR:", error);
      console.error("🔥 Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to create sale", 
        error: error.message,
        details: error.stack?.split('\n')[0] 
      });
    }
  });

  app.patch("/api/sales/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const updatedSale = await storage.updateSaleStatus(id, status, req.user.tenantId);
      
      if (!updatedSale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      
      res.json(updatedSale);
    } catch (error) {
      console.error("Error updating sale:", error);
      res.status(500).json({ message: "Failed to update sale" });
    }
  });

  // Update payment method for credit sales
  app.patch("/api/sales/:id/payment", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { paymentMethod, paymentMethods } = req.body;
      
      const updatedSale = await storage.updateSalePaymentMethod(
        id, 
        paymentMethod, 
        paymentMethods, 
        req.user.tenantId
      );
      
      if (!updatedSale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      
      res.json(updatedSale);
    } catch (error) {
      console.error("Error updating sale payment method:", error);
      res.status(500).json({ message: "Failed to update payment method" });
    }
  });

  app.delete("/api/sales/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      console.log(`🔥 ENDPOINT DELETE /api/sales/${id} - Iniciando cancelación`);
      console.log(`   - Usuario: ${req.user.username}`);
      console.log(`   - Tenant ID: ${req.user.tenantId}`);
      
      const deleted = await storage.deleteSale(id, req.user.tenantId);
      
      console.log(`✅ ENDPOINT DELETE /api/sales/${id} - Cancelación completada exitosamente`);
      
      if (!deleted) {
        return res.status(404).json({ message: "Sale not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`❌ ENDPOINT DELETE /api/sales/${id} - Error:`, error);
      res.status(500).json({ message: "Failed to delete sale" });
    }
  });

  // WEB SALES ROUTES - for online store sales management
  app.get("/api/web-sales", requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const webSales = await storage.getWebSales(req.user.tenantId, startDate as string, endDate as string);
      res.json(webSales);
    } catch (error) {
      console.error("Error fetching web sales:", error);
      res.status(500).json({ message: "Failed to fetch web sales" });
    }
  });

  app.get("/api/web-sales/stats", requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const stats = await storage.getWebSalesStats(req.user.tenantId, startDate as string, endDate as string);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching web sales stats:", error);
      res.status(500).json({ message: "Failed to fetch web sales stats" });
    }
  });

  // Web sales actions - mark as paid, cancel, delete
  app.patch("/api/web-sales/:id/mark-paid", requireTenant, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      const updatedOrder = await storage.updateStoreOrder(orderId, {
        paymentStatus: 'paid',
        paidAt: new Date()
      }, req.user.tenantId);

      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json({ message: "Order marked as paid", order: updatedOrder });
    } catch (error) {
      console.error("Error marking order as paid:", error);
      res.status(500).json({ message: "Failed to mark order as paid" });
    }
  });

  app.patch("/api/web-sales/:id/cancel", requireTenant, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      const updatedOrder = await storage.updateStoreOrder(orderId, {
        status: 'cancelled'
      }, req.user.tenantId);

      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json({ message: "Order cancelled", order: updatedOrder });
    } catch (error) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ message: "Failed to cancel order" });
    }
  });

  app.delete("/api/web-sales/:id", requireTenant, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      // Delete order items first due to foreign key constraint
      await db.delete(storeOrderItems).where(and(
        eq(storeOrderItems.orderId, orderId),
        eq(storeOrderItems.tenantId, req.user.tenantId)
      ));

      // Delete the order
      const deletedOrder = await db.delete(storeOrders).where(and(
        eq(storeOrders.id, orderId),
        eq(storeOrders.tenantId, req.user.tenantId)
      )).returning();

      if (!deletedOrder.length) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  app.get("/api/web-sales/export", requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate, format } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const webSales = await storage.getWebSales(req.user.tenantId, startDate as string, endDate as string);

      if (format === 'excel') {
        // TODO: Implement Excel export using xlsx library
        res.status(501).json({ message: "Excel export not implemented yet" });
      } else if (format === 'pdf') {
        // TODO: Implement PDF export using jsPDF library  
        res.status(501).json({ message: "PDF export not implemented yet" });
      } else {
        res.status(400).json({ message: "Invalid format. Use 'excel' or 'pdf'" });
      }
    } catch (error) {
      console.error("Error exporting web sales:", error);
      res.status(500).json({ message: "Failed to export web sales" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      
      // Check if user is super_admin using getUserRole
      const userRole = await storage.getUserRole(userId, tenantId);
      const isSuperAdmin = userRole?.name === 'super_admin';
      
      console.log(`Dashboard stats for user ${userId} (${userRole?.name}): super_admin=${isSuperAdmin}`);
      
      // Super admin sees ALL tenant stats (no userId filter), regular users see only their own
      const filterUserId = isSuperAdmin ? undefined : userId;
      
      const stats = await storage.getSalesStats(tenantId, filterUserId);
      const products = await storage.getProducts(tenantId);
      const lowStockProducts = products.filter(p => p.stock <= p.minStock);
      
      res.json({
        ...stats,
        totalProducts: products.length,
        lowStockProducts: lowStockProducts.length
      });
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Sales chart data
  app.get("/api/dashboard/sales-chart", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const days = parseInt(req.query.days as string) || 7;
      
      // Get date range parameters
      const dateRangeType = req.query.dateRangeType || 'week';
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      
      // Check if user is super_admin
      const userRole = await storage.getUserRole(userId, tenantId);
      const isSuperAdmin = userRole?.name === 'super_admin';
      
      console.log(`Dashboard chart for user ${userId} (${userRole?.name}): super_admin=${isSuperAdmin}`);
      
      // Super admin sees ALL tenant chart data, regular users see only their own
      const filterUserId = isSuperAdmin ? undefined : userId;
      
      const chartData = await storage.getSalesChart(tenantId, days, filterUserId, dateRangeType, startDate, endDate);
      res.json(chartData);
    } catch (error) {
      console.error("Error getting sales chart:", error);
      res.status(500).json({ message: "Failed to get sales chart data" });
    }
  });

  // Custom date range stats
  app.get("/api/dashboard/custom-stats", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const dateRangeType = req.query.dateRangeType as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      // Check if user is super_admin
      const userRole = await storage.getUserRole(userId, tenantId);
      const isSuperAdmin = userRole?.name === 'super_admin';
      
      console.log(`Custom stats for user ${userId} (${userRole?.name}): super_admin=${isSuperAdmin}, type=${dateRangeType}`);
      
      // Super admin sees ALL tenant stats, regular users see only their own
      const filterUserId = isSuperAdmin ? undefined : userId;
      
      const customStats = await storage.getCustomDateRangeStats(
        tenantId, 
        filterUserId, 
        dateRangeType, 
        startDate, 
        endDate
      );
      
      res.json(customStats);
    } catch (error) {
      console.error("Error getting custom stats:", error);
      res.status(500).json({ message: "Failed to get custom stats data" });
    }
  });

  // Top selling products for dashboard
  app.get("/api/dashboard/top-products", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      
      // Get date range parameters
      const dateRangeType = req.query.dateRangeType || 'week';
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      
      // Check if user is super_admin
      const userRole = await storage.getUserRole(userId, tenantId);
      const isSuperAdmin = userRole?.name === 'super_admin';
      
      console.log(`Dashboard top products for user ${userId} (${userRole?.name}): super_admin=${isSuperAdmin}`);
      
      // Super admin sees ALL tenant top products, regular users see only their own
      const filterUserId = isSuperAdmin ? undefined : userId.toString();
      
      const topProducts = await storage.getTopSellingProducts(tenantId, filterUserId, dateRangeType, startDate, endDate);
      res.json(topProducts);
    } catch (error) {
      console.error("Error getting top selling products:", error);
      res.status(500).json({ message: "Failed to get top selling products" });
    }
  });

  // Sales analytics for product dashboard
  app.get("/api/sales/analytics", requireTenant, async (req: any, res) => {
    try {
      const { productId, startDate, endDate, storeId } = req.query;
      const analytics = await storage.getSalesAnalytics(req.user.tenantId, {
        productId: productId ? parseInt(productId as string) : undefined,
        startDate: startDate as string,
        endDate: endDate as string,
        storeId: storeId as string
      });
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching sales analytics:", error);
      res.status(500).json({ message: "Failed to fetch sales analytics" });
    }
  });

  // Purchases routes
  app.get("/api/purchases", requireTenant, async (req: any, res) => {
    try {
      const purchases = await storage.getPurchases(req.user.tenantId);
      res.json(purchases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  app.post("/api/purchases", requireTenant, async (req: any, res) => {
    try {
      const { purchase, items } = req.body;
      console.log("Purchase data received:", JSON.stringify(req.body, null, 2));
      
      const validatedPurchase = insertPurchaseSchema.parse({
        ...purchase,
        tenantId: req.user.tenantId,
        userId: req.user.id
      });
      console.log(`Creating purchase for tenant: ${req.user.tenantId}, warehouse: ${purchase.warehouseId}`);
      
      // Validate and transform items to match schema
      const validatedItems = items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price, // Must match schema field name
        total: item.total,
        unitCost: item.price // Explicitly map unitCost to price
      }));
      
      const newPurchase = await storage.createPurchase(validatedPurchase, validatedItems);
      console.log(`✓ Purchase created successfully for tenant: ${req.user.tenantId}, ID: ${newPurchase.id}`);
      res.status(201).json(newPurchase);
    } catch (error) {
      console.error("Purchase creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid purchase data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  // Statistics routes MUST come before :id routes to avoid conflicts
  app.get("/api/purchases/stats", requireTenant, async (req: any, res) => {
    try {
      console.log(`Getting purchase stats for tenant: ${req.user.tenantId}`);
      const stats = await storage.getPurchaseStats(req.user.tenantId);
      console.log("Purchase stats result:", stats);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching purchase stats:", error);
      res.status(500).json({ message: "Failed to fetch purchase statistics" });
    }
  });

  app.get("/api/purchases/chart", requireTenant, async (req: any, res) => {
    try {
      const period = req.query.period as string || 'month';
      console.log(`Getting purchase chart for tenant: ${req.user.tenantId}, period: ${period}`);
      const chart = await storage.getPurchaseChart(req.user.tenantId, period);
      console.log("Purchase chart result:", chart);
      res.json(chart);
    } catch (error) {
      console.error("Error fetching purchase chart:", error);
      res.status(500).json({ message: "Failed to fetch purchase chart data" });
    }
  });

  app.get("/api/purchases/top-products", requireTenant, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      console.log(`Getting top purchased products for tenant: ${req.user.tenantId}, limit: ${limit}`);
      const topProducts = await storage.getTopPurchasedProducts(req.user.tenantId, limit);
      console.log("Top purchased products result:", topProducts);
      res.json(topProducts);
    } catch (error) {
      console.error("Error fetching top purchased products:", error);
      res.status(500).json({ message: "Failed to fetch top purchased products" });
    }
  });

  // Individual purchase routes (must come AFTER specific routes)
  app.get("/api/purchases/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid purchase ID" });
      }
      
      const purchase = await storage.getPurchaseWithItems(id, req.user.tenantId);
      
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }
      
      res.json(purchase);
    } catch (error) {
      console.error("Error fetching purchase details:", error);
      res.status(500).json({ message: "Failed to fetch purchase details" });
    }
  });

  app.put("/api/purchases/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const updated = await storage.updatePurchaseStatus(id, status, req.user.tenantId);
      
      if (!updated) {
        return res.status(404).json({ message: "Purchase not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating purchase:", error);
      res.status(500).json({ message: "Failed to update purchase" });
    }
  });

  app.delete("/api/purchases/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const deleted = await storage.deletePurchase(id, req.user.tenantId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Purchase not found" });
      }
      
      res.json({ message: "Purchase deleted successfully" });
    } catch (error) {
      console.error("Error deleting purchase:", error);
      res.status(500).json({ message: "Failed to delete purchase" });
    }
  });

  // Suppliers routes
  app.get("/api/suppliers", requireTenant, async (req: any, res) => {
    try {
      const suppliers = await storage.getSuppliers(req.user.tenantId);
      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", requireTenant, async (req: any, res) => {
    try {
      const supplierData = insertSupplierSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      
      const supplier = await storage.createSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid supplier data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.get("/api/suppliers/stats", requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const stats = await storage.getSuppliersWithStats(req.user.tenantId, startDate, endDate);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching supplier stats:", error);
      res.status(500).json({ message: "Failed to fetch supplier statistics" });
    }
  });

  app.get("/api/suppliers/dashboard", requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const dashboard = await storage.getSuppliersDashboard(req.user.tenantId, startDate, endDate);
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching suppliers dashboard:", error);
      res.status(500).json({ message: "Failed to fetch suppliers dashboard" });
    }
  });

  app.get("/api/reports/sales", requireTenant, async (req: any, res) => {
    try {
      const { month, userId, warehouseId } = req.query;
      console.log(`Getting sales report for user: ${req.user.username}, tenantId: ${req.user.tenantId}`);
      
      const report = await storage.getSalesReport(req.user.tenantId, month, userId, undefined, warehouseId);
      console.log(`Returning sales report for tenant ${req.user.tenantId}`);
      res.json(report);
    } catch (error) {
      console.error("Error fetching sales report:", error);
      res.status(500).json({ message: "Failed to fetch sales report" });
    }
  });

  // Users API routes
  app.get("/api/users", requireTenant, async (req: any, res) => {
    try {
      const users = await storage.getUsers(req.user.tenantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireTenant, async (req: any, res) => {
    try {
      const userData = req.body;
      const newUser = await storage.createUser({
        ...userData,
        tenantId: req.user.tenantId
      });
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id/toggle-status", requireTenant, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;
      const updatedUser = await storage.updateUserStatus(userId, isActive, req.user.tenantId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // User roles API routes
  app.get("/api/user-roles", requireTenant, async (req: any, res) => {
    try {
      const roles = await storage.getUserRoles(req.user.tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ message: "Failed to fetch user roles" });
    }
  });

  app.post("/api/user-roles", requireTenant, async (req: any, res) => {
    try {
      const roleData = req.body;
      const newRole = await storage.createUserRole({
        ...roleData,
        tenantId: req.user.tenantId
      });
      res.status(201).json(newRole);
    } catch (error) {
      console.error("Error creating user role:", error);
      res.status(500).json({ message: "Failed to create user role" });
    }
  });

  app.post("/api/user-roles/initialize", requireTenant, async (req: any, res) => {
    try {
      await storage.initializeSystemRoles(req.user.tenantId);
      res.json({ message: "System roles initialized successfully" });
    } catch (error) {
      console.error("Error initializing system roles:", error);
      res.status(500).json({ message: "Failed to initialize system roles" });
    }
  });

  app.put("/api/user-roles/:id", requireTenant, async (req: any, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const roleData = req.body;
      const updatedRole = await storage.updateUserRole(roleId, roleData, req.user.tenantId);
      res.json(updatedRole);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete("/api/user-roles/:id", requireTenant, async (req: any, res) => {
    try {
      const roleId = parseInt(req.params.id);
      const success = await storage.deleteUserRole(roleId, req.user.tenantId);
      if (success) {
        res.json({ message: "User role deleted successfully" });
      } else {
        res.status(404).json({ message: "User role not found" });
      }
    } catch (error) {
      console.error("Error deleting user role:", error);
      res.status(500).json({ message: "Failed to delete user role" });
    }
  });

  app.delete("/api/suppliers/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSupplier(id, req.user.tenantId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json({ message: "Supplier deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting supplier:", error);
      
      // Check if it's a foreign key constraint error
      if (error.message && error.message.includes("compras asociadas")) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Cash register routes
  app.get("/api/cash-register/active", requireTenant, async (req: any, res) => {
    try {
      const register = await storage.getActiveCashRegister(req.user.tenantId, req.user.id);
      res.json(register);
    } catch (error) {
      console.error("Error fetching active cash register:", error);
      res.status(500).json({ message: "Failed to fetch active cash register" });
    }
  });

  app.post("/api/cash-register/open", requireTenant, async (req: any, res) => {
    try {
      console.log("🔥 Opening cash register for user:", req.user.username);
      console.log("🔥 Request body:", req.body);
      console.log("🔥 User data:", {
        id: req.user.id,
        username: req.user.username,
        tenantId: req.user.tenantId
      });
      
      const registerData = insertCashRegisterSchema.parse({
        name: `Caja Principal ${req.user.username}`,
        tenantId: req.user.tenantId,
        userId: req.user.id,
        openingAmount: req.body.openingAmount.toString(),
        status: "open"
      });
      
      console.log("🔥 Validated register data:", registerData);
      
      const register = await storage.openCashRegister(registerData);
      console.log("🔥 Cash register opened successfully:", register);
      res.status(201).json(register);
    } catch (error) {
      console.error("🔥 Error opening cash register:", error);
      if (error instanceof z.ZodError) {
        console.error("🔥 Zod validation error:", error.errors);
        return res.status(400).json({ message: "Invalid cash register data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to open cash register" });
    }
  });

  app.post("/api/cash-register/:id/close", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { closingAmount } = req.body;
      
      if (isNaN(id) || !closingAmount) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      
      const register = await storage.closeCashRegister(id, parseFloat(closingAmount), req.user.tenantId);
      
      if (!register) {
        return res.status(404).json({ message: "Cash register not found" });
      }
      
      res.json(register);
    } catch (error) {
      console.error("Error closing cash register:", error);
      res.status(500).json({ message: "Failed to close cash register" });
    }
  });

  app.get("/api/cash-register/:id/summary", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cash register ID" });
      }
      
      const summary = await storage.getCashRegisterSummary(req.user.tenantId, id);
      console.log("Cash register summary:", JSON.stringify(summary, null, 2));
      res.json(summary);
    } catch (error) {
      console.error("Error fetching cash register summary:", error);
      res.status(500).json({ message: "Failed to fetch cash register summary" });
    }
  });

  // Operations routes
  app.get("/api/operations/expenses", requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate, warehouseId } = req.query;
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        warehouseId: warehouseId ? parseInt(warehouseId as string) : undefined,
      };
      
      const expenses = await storage.getCashTransactionsByTypeWithFilters(
        req.user.tenantId, 
        'expense', 
        req.user.id,
        filters
      );
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/operations/expenses", requireTenant, async (req: any, res) => {
    try {
      const activeCashRegister = await storage.getActiveCashRegister(req.user.tenantId, req.user.id);
      if (!activeCashRegister) {
        return res.status(400).json({ message: "No active cash register found" });
      }

      const expenseData = {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        cashRegisterId: activeCashRegister.id,
        type: 'expense',
        amount: req.body.amount,
        reference: req.body.reference || `Gasto - ${req.body.category}`,
        category: req.body.category,
        description: req.body.description,
      };

      const expense = await storage.createCashTransaction(expenseData);
      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  app.delete("/api/operations/expenses/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCashTransaction(id, req.user.tenantId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting expense:", error);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  app.get("/api/operations/income", requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate, warehouseId } = req.query;
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        warehouseId: warehouseId ? parseInt(warehouseId as string) : undefined,
      };
      
      const income = await storage.getCashTransactionsByTypeWithFilters(
        req.user.tenantId, 
        'income', 
        req.user.id,
        filters
      );
      res.json(income);
    } catch (error) {
      console.error("Error fetching income:", error);
      res.status(500).json({ message: "Failed to fetch income" });
    }
  });

  app.post("/api/operations/income", requireTenant, async (req: any, res) => {
    try {
      const activeCashRegister = await storage.getActiveCashRegister(req.user.tenantId, req.user.id);
      if (!activeCashRegister) {
        return res.status(400).json({ message: "No active cash register found" });
      }

      const incomeData = {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        cashRegisterId: activeCashRegister.id,
        type: 'income',
        amount: req.body.amount,
        reference: req.body.reference || `Ingreso - ${req.body.category}`,
        category: req.body.category,
        description: req.body.description,
      };

      const income = await storage.createCashTransaction(incomeData);
      res.json(income);
    } catch (error) {
      console.error("Error creating income:", error);
      res.status(500).json({ message: "Failed to create income" });
    }
  });

  app.delete("/api/operations/income/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCashTransaction(id, req.user.tenantId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Income not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting income:", error);
      res.status(500).json({ message: "Failed to delete income" });
    }
  });

  app.get("/api/operations/withdrawals", requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate, warehouseId } = req.query;
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        warehouseId: warehouseId ? parseInt(warehouseId as string) : undefined,
      };
      
      const withdrawals = await storage.getCashTransactionsByTypeWithFilters(
        req.user.tenantId, 
        'withdrawal', 
        req.user.id,
        filters
      );
      res.json(withdrawals);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });

  app.post("/api/operations/withdrawals", requireTenant, async (req: any, res) => {
    try {
      const activeCashRegister = await storage.getActiveCashRegister(req.user.tenantId, req.user.id);
      if (!activeCashRegister) {
        return res.status(400).json({ message: "No active cash register found" });
      }

      const withdrawalData = {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        cashRegisterId: activeCashRegister.id,
        type: 'withdrawal',
        amount: req.body.amount,
        reference: req.body.reference || `Retiro - ${req.body.category}`,
        category: req.body.category,
        description: req.body.description,
      };

      const withdrawal = await storage.createCashTransaction(withdrawalData);
      res.json(withdrawal);
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ message: "Failed to create withdrawal" });
    }
  });

  app.delete("/api/operations/withdrawals/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCashTransaction(id, req.user.tenantId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Withdrawal not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting withdrawal:", error);
      res.status(500).json({ message: "Failed to delete withdrawal" });
    }
  });

  // Get all active cash registers (for showing who's currently open)
  app.get("/api/cash-register/all-active", requireTenant, async (req: any, res) => {
    try {
      const activeCashRegisters = await storage.getAllActiveCashRegisters(req.user.tenantId);
      res.json(activeCashRegisters);
    } catch (error) {
      console.error("Error fetching all active cash registers:", error);
      res.status(500).json({ message: "Failed to fetch active cash registers" });
    }
  });

  // Update user warehouse
  app.patch("/api/users/:id/warehouse", requireTenant, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { warehouseId } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      await storage.updateUserWarehouse(userId, warehouseId, req.user.tenantId);
      res.json({ message: "User warehouse updated successfully" });
    } catch (error) {
      console.error("Error updating user warehouse:", error);
      res.status(500).json({ message: "Failed to update user warehouse" });
    }
  });

  // Get subscription status
  app.get("/api/subscription/status", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const subscriptionStatus = await storage.getSubscriptionStatus(tenantId);
      res.json(subscriptionStatus);
    } catch (error) {
      console.error("Error getting subscription status:", error);
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });



  // Helper function to get price amounts in cents
  function getPriceAmount(stripePriceId: string): number {
    const priceMap: { [key: string]: number } = {
      'price_1RdGFjBrS7UtssxxOeUyYcNR': 2700, // Basic Monthly $27
      'price_1RdGGIBrS7UtssxxBi3Cvcd6': 27000, // Basic Yearly $270
      'price_1RdDoMBrS7UtssxxFdfbibaI': 4400, // Pro Monthly $44
      'price_1RdDnRBrS7UtssxxegGJHq81': 44000, // Pro Yearly $440
      'price_1Rd3byBrS7Utssxx96QCKxQ2': 6300, // Professional Monthly $63
      'price_1RdGHcBrS7UtssxxFfv9FspO': 63000, // Professional Yearly $630
      'price_1RdGIDBrS7Utssxx3GyvqCJi': 8900, // Enterprise Monthly $89
      'price_1RdGIcBrS7Utssxx6YDYEJea': 83300  // Enterprise Yearly $833
    };
    return priceMap[stripePriceId] || 2700; // Default to basic monthly
  }

  // Stripe subscription routes
  app.post("/api/create-subscription", async (req: any, res) => {
    try {
      console.log('Creating subscription with data:', req.body);
      const { planId, stripePriceId, interval } = req.body;
      
      if (!planId || !stripePriceId || !interval) {
        return res.status(400).json({ message: 'Missing required fields: planId, stripePriceId, interval' });
      }

      // Validate Price ID format
      if (!stripePriceId.startsWith('price_')) {
        return res.status(400).json({ message: 'Invalid Stripe Price ID format' });
      }

      console.log('Validating Stripe Price ID:', stripePriceId);

      // First, verify the price exists
      try {
        await stripe.prices.retrieve(stripePriceId);
        console.log('Price ID validated successfully');
      } catch (priceError: any) {
        console.error('Invalid price ID:', priceError.message);
        return res.status(400).json({ 
          message: 'Invalid Stripe Price ID. Please check your subscription configuration.',
          error: priceError.message 
        });
      }

      // Create a customer with proper metadata
      const customer = await stripe.customers.create({
        email: 'cliente@ejemplo.com', // Will be updated during payment
        name: 'Cliente Nuevo',
        metadata: {
          planId,
          interval,
          source: 'caja_sas_enterprise'
        }
      });

      console.log('Stripe customer created:', customer.id);

      // Create payment intent first for immediate payment
      const paymentIntent = await stripe.paymentIntents.create({
        customer: customer.id,
        amount: getPriceAmount(stripePriceId),
        currency: 'usd',
        payment_method_types: ['card'],
        setup_future_usage: 'off_session',
        metadata: {
          planId,
          interval,
          stripePriceId,
          source: 'caja_sas_enterprise'
        }
      });

      console.log('Payment intent created:', paymentIntent.id);
      console.log('Client secret:', paymentIntent.client_secret);

      
      res.json({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id,
        status: 'requires_payment_method',
        isTrial: false,
        trialEnd: null,
        amount: getPriceAmount(stripePriceId),
        currency: 'usd'
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      
      // Enhanced error handling
      let errorMessage = "Failed to create subscription";
      if (error.type === 'StripeInvalidRequestError') {
        errorMessage = `Stripe error: ${error.message}`;
      } else if (error.code === 'resource_missing') {
        errorMessage = "Invalid subscription plan. Please try a different plan.";
      }
      
      res.status(500).json({ 
        message: errorMessage,
        details: error.message,
        type: error.type || 'unknown'
      });
    }
  });

  // Get user's active subscriptions
  app.get("/api/subscriptions", requireTenant, async (req: any, res) => {
    try {
      if (!req.user.stripeCustomerId) {
        return res.json([]);
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: req.user.stripeCustomerId,
        status: 'active',
      });

      res.json(subscriptions.data);
    } catch (error: any) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Cancel subscription
  app.delete("/api/subscriptions/:id", requireTenant, async (req: any, res) => {
    try {
      const subscriptionId = req.params.id;
      
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      res.json(subscription);
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Stripe webhook for payment notifications
  app.post("/api/stripe/webhook", async (req: any, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle successful payment
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any;
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      
      if (subscription.metadata) {
        const { planId, interval, userId } = subscription.metadata;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        // Send email notification
        if (process.env.SENDGRID_API_KEY) {
          try {
            const planNames = {
              'basic': 'Unisucursal Básico',
              'pro': 'Unisucursal Pro', 
              'professional': 'Profesional',
              'enterprise': 'Empresarial'
            };
            
            const planName = planNames[planId as keyof typeof planNames] || planId;
            const periodText = interval === 'month' ? 'Mensual' : 'Anual';
            const amount = invoice.amount_paid / 100; // Convert from cents
            const customerEmail = (customer as any).email;
            const customerName = (customer as any).name || 'No especificado';
            
            const emailContent = {
              to: 'miguel.palomera1986@gmail.com',
              from: 'miguel.palomera1986@gmail.com', // Usar el mismo email verificado
              subject: `🎉 Nueva Suscripción - ${planName} (${periodText})`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Nueva Suscripción Activada</h2>
                  
                  <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Detalles del Cliente:</h3>
                    <p><strong>Nombre:</strong> ${customerName}</p>
                    <p><strong>Email:</strong> ${customerEmail}</p>
                    <p><strong>Teléfono:</strong> No disponible en Stripe</p>
                  </div>
                  
                  <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #059669;">Detalles de la Suscripción:</h3>
                    <p><strong>Plan:</strong> ${planName}</p>
                    <p><strong>Tipo:</strong> ${periodText}</p>
                    <p><strong>Monto:</strong> $${amount} USD</p>
                    <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
                  </div>
                  
                  <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Estado:</strong> ✅ Pago procesado exitosamente con Stripe</p>
                  </div>
                  
                  <hr style="margin: 30px 0;">
                  <p style="color: #6b7280; font-size: 14px;">
                    Este email fue generado automáticamente por el sistema Caja SAS Enterprise.
                  </p>
                </div>
              `
            };

            await sgMail.send(emailContent);
            console.log('Email notification sent successfully to miguel.palomera1986@gmail.com');
          } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
          }
        }
      }
    }

    res.json({ received: true });
  });

  app.get("/api/cash-transactions", requireTenant, async (req: any, res) => {
    try {
      const cashRegisterId = req.query.cashRegisterId ? parseInt(req.query.cashRegisterId) : undefined;
      const transactions = await storage.getCashTransactions(req.user.tenantId, cashRegisterId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching cash transactions:", error);
      res.status(500).json({ message: "Failed to fetch cash transactions" });
    }
  });

  app.post("/api/cash-transactions", requireTenant, async (req: any, res) => {
    try {
      const transactionData = insertCashTransactionSchema.parse({
        tenantId: req.user.tenantId,
        userId: req.user.id,
        cashRegisterId: req.body.cashRegisterId,
        type: req.body.type,
        amount: req.body.amount.toString(),
        reference: req.body.reference,
        category: req.body.category,
        description: req.body.description
      });
      
      const transaction = await storage.createCashTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating cash transaction:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create cash transaction" });
    }
  });

  // Cash register closures route
  app.get("/api/cash-register/closures", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      
      console.log(`Getting cash register closures for user: ${req.user.username}, tenantId: ${tenantId}`);
      
      // Check if user is super_admin using getUserRole
      const userRole = await storage.getUserRole(userId, tenantId);
      const isSuperAdmin = userRole?.name === 'super_admin';
      
      console.log(`User ${userId} (${userRole?.name}) is super_admin: ${isSuperAdmin}`);
      
      // Super admin sees ALL closures, regular users see only their own
      const filterUserId = isSuperAdmin ? null : userId;
      
      const closures = await storage.getCashRegisterClosures(tenantId, filterUserId);
      console.log(`Returning ${closures.length} cash register closures for tenant ${tenantId} (super_admin: ${isSuperAdmin})`);
      res.json(closures);
    } catch (error) {
      console.error("Error fetching cash register closures:", error);
      res.status(500).json({ message: "Failed to fetch cash register closures" });
    }
  });

  // Physical Inventory Routes
  
  // Get inventory data with sales/purchase impact for date range
  app.get("/api/inventory/analysis", requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate, productIds } = req.query;
      
      // Get base products data
      const products = await storage.getProducts(req.user.tenantId);
      
      // Filter by selected products if specified
      const filteredProducts = productIds 
        ? products.filter(p => productIds.split(',').includes(p.id.toString()))
        : products;

      // Get sales and purchase impact for date range
      const salesImpact = await storage.getSalesAnalytics(req.user.tenantId, {
        startDate,
        endDate,
        productId: productIds ? parseInt(productIds.split(',')[0]) : undefined
      });

      const inventoryAnalysis = filteredProducts.map(product => ({
        ...product,
        systemStock: (product as any).realStock || (product as any).real_stock || 0,
        salesImpact: salesImpact.topProducts.find(sp => sp.id === product.id)?.soldQuantity || 0,
        purchasesImpact: 0 // Will be calculated based on purchase data
      }));

      res.json(inventoryAnalysis);
    } catch (error) {
      console.error("Error fetching inventory analysis:", error);
      res.status(500).json({ message: "Failed to fetch inventory analysis" });
    }
  });

  // Duplicate endpoint removed - using priority placement version

  // Close physical inventory - transfers physical count to system stock
  app.post("/api/inventory/physical/:id/close", requireTenant, async (req: any, res) => {
    console.log("🔧 ENDPOINT HIT: /api/inventory/physical/:id/close");
    try {
      const inventoryId = req.params.id;
      const { products: inventoryProducts } = req.body;
      
      console.log("🔧 Close inventory request - inventoryId:", inventoryId);
      console.log("🔧 Close inventory request - products:", JSON.stringify(inventoryProducts, null, 2));
      
      // Get the inventory record to retrieve warehouseId
      const inventoryRecord = await storage.getInventoryRecord(inventoryId, req.user.tenantId);
      const warehouseId = inventoryRecord?.warehouseId || null;
      
      console.log("🔧 Retrieved inventory record warehouseId:", warehouseId);
      console.log("🔧 Retrieved inventory record warehouseId type:", typeof warehouseId);
      
      // Update each product's real_stock with the physical count
      const success = await storage.closePhysicalInventory(
        inventoryId, 
        inventoryProducts.map((p: any) => ({
          productId: p.productId,
          physicalCount: p.physicalCount
        })), 
        req.user.tenantId,
        warehouseId
      );
      
      if (success) {
        const result = {
          inventoryId,
          status: 'closed',
          closedAt: new Date().toISOString(),
          closedBy: req.user.id,
          message: 'Inventory closed successfully. Stock values updated.',
          warehouseId: warehouseId
        };
        console.log("🔧 Close inventory success result:", JSON.stringify(result, null, 2));
        res.json(result);
      } else {
        res.status(500).json({ message: "Failed to close inventory" });
      }
    } catch (error) {
      console.error("Error closing physical inventory:", error);
      res.status(500).json({ message: "Failed to close physical inventory" });
    }
  });

  // Get inventory history
  app.get("/api/inventory/history", requireTenant, async (req: any, res) => {
    console.log("🔧 ENDPOINT HIT: /api/inventory/history");
    try {
      console.log("🔧 Getting inventory history for tenant:", req.user.tenantId);
      const inventoryRecords = await storage.getInventoryHistory(req.user.tenantId);
      console.log(`🔧 Found ${inventoryRecords.length} inventory records for tenant ${req.user.tenantId}`);
      res.json(inventoryRecords);
    } catch (error) {
      console.error("Error fetching inventory history:", error);
      res.status(500).json({ message: "Failed to fetch inventory history" });
    }
  });

  // Delete inventory record
  app.delete("/api/inventory/history/:id", requireTenant, async (req: any, res) => {
    try {
      const recordId = req.params.id;
      const deleted = await storage.deleteInventoryRecord(recordId, req.user.tenantId);
      
      if (deleted) {
        res.json({ message: "Inventory record deleted successfully" });
      } else {
        res.status(404).json({ message: "Inventory record not found" });
      }
    } catch (error) {
      console.error("Error deleting inventory record:", error);
      res.status(500).json({ message: "Failed to delete inventory record" });
    }
  });

  // Update inventory stock - recalculates real stock from inventory record
  app.post("/api/inventory/history/:id/update-stock", requireTenant, async (req: any, res) => {
    console.log("🔧 ENDPOINT HIT: /api/inventory/history/:id/update-stock");
    try {
      const recordId = req.params.id;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const username = req.user.username;
      
      console.log(`🔧 [INVENTORY UPDATE] Starting stock update for record: ${recordId}`);
      console.log(`🔧 [INVENTORY UPDATE] User: ${username} (ID: ${userId}), Tenant: ${tenantId}`);
      
      // Get the inventory record to retrieve warehouseId
      const inventoryRecord = await storage.getInventoryRecord(recordId, tenantId);
      const warehouseId = inventoryRecord?.warehouseId || null;
      
      console.log(`🔧 [INVENTORY UPDATE] Retrieved warehouseId: ${warehouseId}`);
      console.log(`🔧 [INVENTORY UPDATE] Retrieved warehouseId type: ${typeof warehouseId}`);
      
      const updated = await storage.updateInventoryStock(recordId, tenantId);
      
      if (updated) {
        console.log(`🔧 [INVENTORY UPDATE] Successfully updated stock for record: ${recordId}`);
        res.json({ 
          message: "Inventory stock updated successfully",
          recordId,
          tenantId,
          username,
          warehouseId
        });
      } else {
        console.log(`🔧 [INVENTORY UPDATE] Record not found: ${recordId} for tenant: ${tenantId}`);
        res.status(404).json({ message: "Inventory record not found" });
      }
    } catch (error) {
      console.error(`🔧 [INVENTORY UPDATE ERROR] Failed to update record: ${req.params.id}`, error);
      res.status(500).json({ message: "Failed to update inventory stock", error: error.message });
    }
  });

  // Update/refresh inventory record
  app.patch("/api/inventory/history/:id/refresh", requireTenant, async (req: any, res) => {
    console.log("🔧 ENDPOINT HIT: /api/inventory/history/:id/refresh");
    try {
      const recordId = req.params.id;
      const tenantId = req.user.tenantId;
      
      console.log(`🔧 [INVENTORY REFRESH] Starting refresh for record: ${recordId}`);
      console.log(`🔧 [INVENTORY REFRESH] Tenant: ${tenantId}`);
      
      // Get the inventory record to retrieve warehouseId
      const inventoryRecord = await storage.getInventoryRecord(recordId, tenantId);
      const warehouseId = inventoryRecord?.warehouseId || null;
      
      console.log(`🔧 [INVENTORY REFRESH] Retrieved warehouseId: ${warehouseId}`);
      console.log(`🔧 [INVENTORY REFRESH] Retrieved warehouseId type: ${typeof warehouseId}`);
      
      const updated = await storage.refreshInventoryRecord(recordId, tenantId);
      
      if (updated) {
        console.log(`🔧 [INVENTORY REFRESH] Successfully refreshed record: ${recordId}`);
        res.json({ 
          message: "Inventory record refreshed successfully",
          recordId,
          tenantId,
          warehouseId
        });
      } else {
        console.log(`🔧 [INVENTORY REFRESH] Record not found: ${recordId}`);
        res.status(404).json({ message: "Inventory record not found" });
      }
    } catch (error) {
      console.error("🔧 [INVENTORY REFRESH ERROR] Failed to refresh record:", error);
      res.status(500).json({ message: "Failed to refresh inventory record" });
    }
  });

  // Unified inventory statistics endpoint - uses real product data
  app.get("/api/inventory/unified-stats", requireTenant, async (req: any, res) => {
    try {
      const products = await storage.getProducts(req.user.tenantId);
      
      // Calculate unified statistics from actual product data
      const totalStock = products.reduce((sum, p) => sum + (p.realStock || 0), 0);
      const totalValueCost = products.reduce((sum, p) => {
        const cost = parseFloat(p.cost?.toString() || '0');
        const stock = p.realStock || 0;
        return sum + (cost * stock);
      }, 0);
      const totalValuePrice = products.reduce((sum, p) => {
        const price = parseFloat(p.price?.toString() || '0');
        const stock = p.realStock || 0;
        return sum + (price * stock);
      }, 0);
      
      // Calculate average profit margin
      const totalMargin = products.reduce((sum, p) => {
        const price = parseFloat(p.price?.toString() || '0');
        const cost = parseFloat(p.cost?.toString() || '0');
        return sum + (price > 0 ? ((price - cost) / price) * 100 : 0);
      }, 0);
      const averageMargin = products.length > 0 ? totalMargin / products.length : 0;
      
      const unifiedStats = {
        totalProducts: products.length,
        stockTotal: totalStock,
        valueTotalCostos: totalValueCost,
        valueTotalVenta: totalValuePrice,
        utilidadTotal: averageMargin,
        // Additional fields for compatibility
        totalStock: totalStock,
        totalValueCost: totalValueCost,
        totalValuePrice: totalValuePrice,
        averageMargin: averageMargin
      };
      
      res.json(unifiedStats);
    } catch (error) {
      console.error("Error fetching unified inventory stats:", error);
      res.status(500).json({ message: "Failed to fetch unified inventory statistics" });
    }
  });

  // Inventory statistics endpoint (existing for physical inventory records)
  app.get("/api/inventory/stats", requireTenant, async (req: any, res) => {
    try {
      const { startDate, endDate, userId, branchId } = req.query;
      const stats = await storage.getInventoryStats(req.user.tenantId, {
        startDate,
        endDate,
        userId: userId ? parseInt(userId) : undefined,
        branchId
      });
      res.json(stats);
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
      res.status(500).json({ message: "Failed to fetch inventory statistics" });
    }
  });

  // Warehouse routes
  app.get("/api/warehouses", requireTenant, async (req: any, res) => {
    try {
      console.log(`Getting warehouses for user: ${req.user.username}, tenantId: ${req.user.tenantId}`);
      const warehouses = await storage.getWarehouses(req.user.tenantId);
      console.log(`Returning ${warehouses.length} warehouses for tenant ${req.user.tenantId}`);
      res.json(warehouses);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      res.status(500).json({ message: "Failed to fetch warehouses" });
    }
  });

  app.get("/api/warehouse-stocks", requireTenant, async (req: any, res) => {
    try {
      const warehouseStocks = await storage.getWarehouseStocks(req.user.tenantId);
      res.json(warehouseStocks);
    } catch (error) {
      console.error("Error fetching warehouse stocks:", error);
      res.status(500).json({ message: "Failed to fetch warehouse stocks" });
    }
  });

  app.post("/api/warehouses", requireTenant, async (req: any, res) => {
    try {
      const warehouseData = insertWarehouseSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });

      console.log(`Creating warehouse for user: ${req.user.username}, tenantId: ${req.user.tenantId}`);
      const warehouse = await storage.createWarehouse(warehouseData);
      console.log(`Created warehouse ${warehouse.id} for tenant ${req.user.tenantId}`);
      
      res.status(201).json(warehouse);
    } catch (error: any) {
      console.error("Error creating warehouse:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ message: "Invalid warehouse data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create warehouse" });
      }
    }
  });

  app.get("/api/warehouses/:id", requireTenant, async (req: any, res) => {
    try {
      const warehouseId = parseInt(req.params.id);
      const warehouse = await storage.getWarehouse(req.user.tenantId, warehouseId);
      
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      
      res.json(warehouse);
    } catch (error) {
      console.error("Error fetching warehouse:", error);
      res.status(500).json({ message: "Failed to fetch warehouse" });
    }
  });

  app.put("/api/warehouses/:id", requireTenant, async (req: any, res) => {
    try {
      const warehouseId = parseInt(req.params.id);
      const warehouseData = insertWarehouseSchema.partial().parse(req.body);

      console.log(`Updating warehouse ${warehouseId} with data:`, warehouseData);
      const warehouse = await storage.updateWarehouse(warehouseId, warehouseData, req.user.tenantId);
      
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }
      
      console.log("Warehouse updated successfully:", warehouse);
      res.json(warehouse);
    } catch (error: any) {
      console.error("Error updating warehouse:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ message: "Invalid warehouse data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update warehouse" });
      }
    }
  });

  app.delete("/api/warehouses/:id", requireTenant, async (req: any, res) => {
    try {
      const warehouseId = parseInt(req.params.id);
      await storage.deleteWarehouse(req.user.tenantId, warehouseId);
      res.json({ message: "Warehouse deleted successfully" });
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      res.status(500).json({ message: "Failed to delete warehouse" });
    }
  });

  // Branches statistics route
  app.get("/api/branches/statistics", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      
      console.log(`Getting branches statistics for user: ${req.user.username}, tenantId: ${tenantId}`);
      
      // Parse query parameters
      const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
      const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId) : undefined;
      
      // Check if user is super admin
      const userRole = await storage.getUserRole(userId, tenantId);
      const isSuperAdmin = userRole?.name === 'super_admin';
      
      console.log(`User ${userId} (${userRole?.name}) is super_admin: ${isSuperAdmin}`);
      
      // Super admin sees all data, regular users see filtered data
      const filterUserId = isSuperAdmin ? undefined : userId;
      
      const statistics = await storage.getBranchesStatistics(
        tenantId, 
        filterUserId, 
        startDate, 
        endDate, 
        warehouseId
      );
      
      console.log(`Returning branches statistics for tenant ${tenantId} (super_admin: ${isSuperAdmin})`);
      res.json(statistics);
    } catch (error) {
      console.error("Error getting branches statistics:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Suppliers statistics route
  app.get("/api/suppliers/statistics", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      
      console.log(`Getting suppliers statistics for user: ${req.user.username}, tenantId: ${tenantId}`);
      
      // Parse query parameters
      const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
      const supplierId = req.query.supplierId ? parseInt(req.query.supplierId) : undefined;
      
      // Check if user is super admin
      const userRole = await storage.getUserRole(userId, tenantId);
      const isSuperAdmin = userRole?.name === 'super_admin';
      
      console.log(`User ${userId} (${userRole?.name}) is super_admin: ${isSuperAdmin}`);
      
      // Super admin sees all data, regular users see filtered data
      const filterUserId = isSuperAdmin ? undefined : userId;
      
      const statistics = await storage.getSuppliersStatistics(
        tenantId, 
        filterUserId, 
        startDate, 
        endDate, 
        supplierId
      );
      
      console.log(`Returning suppliers statistics for tenant ${tenantId} (super_admin: ${isSuperAdmin})`);
      res.json(statistics);
    } catch (error) {
      console.error("Error getting suppliers statistics:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Enhanced User Management Routes
  app.get("/api/users", requireTenant, async (req: any, res) => {
    try {
      const users = await storage.getUsersWithWarehouse(req.user.tenantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Assign warehouse to user (super_admin only)
  app.patch("/api/users/:userId/assign-warehouse", requireTenant, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { warehouseId } = req.body;
      
      // Check if user has super_admin role
      const userRole = await storage.getUserRole(req.user.id, req.user.tenantId);
      if (!userRole || userRole.name !== "super_admin") {
        return res.status(403).json({ message: "Only super administrators can assign warehouses" });
      }

      // Validate warehouse exists and belongs to the same tenant
      const warehouses = await storage.getWarehouses(req.user.tenantId);
      const warehouse = warehouses.find(w => w.id === parseInt(warehouseId));
      if (!warehouse) {
        return res.status(404).json({ message: "Warehouse not found" });
      }

      // Update user's warehouse assignment
      await storage.updateUser(parseInt(userId), { warehouseId: parseInt(warehouseId) }, req.user.tenantId);
      
      res.json({ message: "Warehouse assigned successfully" });
    } catch (error) {
      console.error("Error assigning warehouse:", error);
      res.status(500).json({ message: "Failed to assign warehouse" });
    }
  });

  app.post("/api/users", requireTenant, async (req: any, res) => {
    try {
      const userData = insertUserSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id/toggle-status", requireTenant, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      const user = await storage.updateUser(userId, { isActive }, req.user.tenantId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.post("/api/users/:id/reset-password", requireTenant, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const newPassword = Math.random().toString(36).slice(-8);
      
      // In a real implementation, you would hash the password
      const user = await storage.updateUser(userId, { password: newPassword }, req.user.tenantId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ newPassword });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // User Roles Routes
  app.get("/api/user-roles", requireTenant, async (req: any, res) => {
    try {
      const roles = await storage.getUserRoles(req.user.tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.post("/api/user-roles", requireTenant, async (req: any, res) => {
    try {
      const roleData = insertUserRoleSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId
      });
      
      const role = await storage.createUserRole(roleData);
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid role data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.post("/api/user-roles/initialize", requireTenant, async (req: any, res) => {
    try {
      await storage.initializeSystemRoles(req.user.tenantId);
      res.json({ message: "System roles initialized successfully" });
    } catch (error) {
      console.error("Error initializing roles:", error);
      res.status(500).json({ message: "Failed to initialize system roles" });
    }
  });

  // Get current user's role information
  app.get("/api/user-role", requireTenant, async (req: any, res) => {
    try {
      if (!req.user.roleId) {
        return res.status(404).json({ message: "User has no role assigned" });
      }
      
      const roles = await storage.getUserRoles(req.user.tenantId);
      const userRole = roles.find(role => role.id === req.user.roleId);
      
      if (!userRole) {
        return res.status(404).json({ message: "User role not found" });
      }
      
      res.json(userRole);
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ message: "Failed to fetch user role" });
    }
  });

  // User warehouse route
  app.get("/api/user/warehouse", requireTenant, async (req: any, res) => {
    try {
      const user = req.user;
      console.log("Getting warehouse for user:", user.username, "warehouseId:", user.warehouseId);
      
      if (!user) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      // If user doesn't have a warehouse assigned, return null
      if (!user.warehouseId) {
        console.log("User has no warehouse assigned");
        return res.json(null);
      }

      const warehouses = await storage.getWarehouses(user.tenantId);
      const warehouse = warehouses.find(w => w.id === user.warehouseId);

      console.log("Found warehouse:", warehouse?.name || "none");
      res.json(warehouse || null);
    } catch (error) {
      console.error("Error getting user warehouse:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Admin authentication routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Hardcoded admin credentials
      if (username === "mike" && password === "elcerrito1986") {
        req.session.adminUser = { username: "mike", isAdmin: true };
        res.json({ message: "Admin login successful" });
      } else {
        res.status(401).json({ message: "Credenciales incorrectas" });
      }
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/admin/auth", (req, res) => {
    if (req.session.adminUser?.isAdmin) {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    delete req.session.adminUser;
    res.json({ message: "Admin logged out successfully" });
  });

  // Admin direct login - allows admin to login as any user for support
  app.post("/api/admin/direct-login", async (req, res) => {
    try {
      if (!req.session.adminUser?.isAdmin) {
        return res.status(401).json({ message: "Unauthorized - Admin access required" });
      }

      const { username } = req.body;
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Store admin session info for return capability
      req.session.adminDirectLogin = {
        originalAdmin: req.session.adminUser,
        targetUser: username
      };

      // Login as the target user
      req.login(user, (err) => {
        if (err) {
          console.error("Direct login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ 
          message: "Direct login successful", 
          user: {
            id: user.id,
            username: user.username,
            tenantId: user.tenantId
          }
        });
      });
    } catch (error) {
      console.error("Admin direct login error:", error);
      res.status(500).json({ message: "Direct login failed" });
    }
  });

  // Admin dashboard routes
  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (!req.session.adminUser?.isAdmin) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting admin stats:", error);
      res.status(500).json({ message: "Error getting statistics" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.session.adminUser?.isAdmin) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const users = await storage.getAllUsersForAdmin();
      res.json(users);
    } catch (error) {
      console.error("Error getting admin users:", error);
      res.status(500).json({ message: "Error getting users" });
    }
  });

  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      if (!req.session.adminUser?.isAdmin) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { userId } = req.body;
      const newPassword = await storage.resetUserPassword(userId);
      res.json({ message: "Password reset successful", newPassword });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Error resetting password" });
    }
  });

  // License management routes
  app.post("/api/admin/pause-license", async (req, res) => {
    try {
      // Enhanced admin authentication check
      const isAdmin = req.session.adminUser?.isAdmin || 
                     (req.session.user?.username === "mike" && req.session.user?.email === "mike@gmail.com");
      
      if (!isAdmin) {
        console.log("Admin auth failed - session:", {
          adminUser: req.session.adminUser,
          regularUser: req.session.user?.username
        });
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { tenantId } = req.body;
      console.log("Pausing license for tenant:", tenantId);
      await storage.updateTenantStatus(tenantId, "suspended");
      res.json({ message: "License paused successfully" });
    } catch (error) {
      console.error("Error pausing license:", error);
      res.status(500).json({ message: "Error pausing license" });
    }
  });

  app.post("/api/admin/activate-license", async (req, res) => {
    try {
      // Enhanced admin authentication check
      const isAdmin = req.session.adminUser?.isAdmin || 
                     (req.session.user?.username === "mike" && req.session.user?.email === "mike@gmail.com");
      
      if (!isAdmin) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { tenantId } = req.body;
      console.log("Activating license for tenant:", tenantId);
      await storage.updateTenantStatus(tenantId, "active");
      res.json({ message: "License activated successfully" });
    } catch (error) {
      console.error("Error activating license:", error);
      res.status(500).json({ message: "Error activating license" });
    }
  });

  app.delete("/api/admin/delete-license/:userId", async (req, res) => {
    try {
      // Enhanced admin authentication check
      const isAdmin = req.session.adminUser?.isAdmin || 
                     (req.session.user?.username === "mike" && req.session.user?.email === "mike@gmail.com");
      
      if (!isAdmin) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { userId } = req.params;
      console.log("Deleting license for user ID:", userId);
      
      // Get user's tenant ID first
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("Deleting tenant:", user.tenantId);
      await storage.deleteTenant(user.tenantId);
      res.json({ message: "License deleted successfully" });
    } catch (error) {
      console.error("Error deleting license:", error);
      res.status(500).json({ message: "Error deleting license" });
    }
  });

  app.post("/api/admin/manual-renewal", async (req, res) => {
    try {
      // Enhanced admin authentication check
      const isAdmin = req.session.adminUser?.isAdmin || 
                     (req.session.user?.username === "mike" && req.session.user?.email === "mike@gmail.com");
      
      if (!isAdmin) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { tenantId, period, notes, renewedBy } = req.body;
      console.log("Manual renewal for tenant:", tenantId, "period:", period);
      
      // Calculate new expiration date based on plan type
      const now = new Date();
      const newExpirationDate = new Date(now);
      
      // Determine if it's monthly or yearly and set appropriate plan
      let planType = 'basic';
      let planDuration = 'monthly';
      
      if (period.includes('_monthly')) {
        newExpirationDate.setMonth(newExpirationDate.getMonth() + 1);
        planDuration = 'monthly';
      } else if (period.includes('_yearly')) {
        newExpirationDate.setFullYear(newExpirationDate.getFullYear() + 1);
        planDuration = 'yearly';
      }

      // Extract plan type
      if (period.includes('basic')) planType = 'basic';
      else if (period.includes('pro')) planType = 'pro';
      else if (period.includes('professional')) planType = 'professional';
      else if (period.includes('enterprise')) planType = 'enterprise';

      // Update tenant with new expiration and active status
      await storage.manualRenewalLicense(tenantId, {
        expirationDate: newExpirationDate,
        period,
        planType,
        planDuration,
        notes,
        renewedBy,
        renewalDate: now
      });

      res.json({ 
        message: "License renewed successfully",
        newExpirationDate: newExpirationDate.toISOString(),
        period,
        notes
      });
    } catch (error) {
      console.error("Error renewing license manually:", error);
      res.status(500).json({ message: "Error renewing license" });
    }
  });

  // Employee routes
  app.get("/api/employees", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const employees = await storage.getEmployees(tenantId);
      
      // Debug logging
      console.log("=== EMPLEADOS DESDE BASE DE DATOS ===");
      employees.forEach(emp => {
        console.log(`${emp.fullName}: hireDate = ${emp.hireDate}, birthDate = ${emp.birthDate}`);
      });
      
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Error fetching employees" });
    }
  });

  app.get("/api/employees/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user.tenantId;
      const employee = await storage.getEmployee(id, tenantId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Error fetching employee" });
    }
  });

  app.post("/api/employees", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      
      // Validate that employee number is unique
      const existingEmployee = await storage.getEmployeeByNumber(req.body.employeeNumber, tenantId);
      if (existingEmployee) {
        return res.status(400).json({ message: "Employee number already exists" });
      }

      // Validate and format dates properly
      let birthDate = null;
      let hireDate = null;
      let terminationDate = null;

      if (req.body.birthDate) {
        birthDate = new Date(req.body.birthDate + 'T00:00:00.000Z');
      }
      
      if (req.body.hireDate) {
        hireDate = new Date(req.body.hireDate + 'T00:00:00.000Z');
      }
      
      if (req.body.terminationDate) {
        terminationDate = new Date(req.body.terminationDate + 'T00:00:00.000Z');
      }

      const employeeData = {
        ...req.body,
        tenantId,
        fullName: `${req.body.firstName} ${req.body.lastName}`,
        birthDate,
        hireDate,
        terminationDate,
      };

      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Error creating employee" });
    }
  });

  app.put("/api/employees/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user.tenantId;
      
      const employeeData = {
        ...req.body,
        fullName: `${req.body.firstName} ${req.body.lastName}`,
      };
      
      const employee = await storage.updateEmployee(id, employeeData, tenantId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Error updating employee" });
    }
  });

  app.delete("/api/employees/:id", requireTenant, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user.tenantId;
      
      const success = await storage.deleteEmployee(id, tenantId);
      if (!success) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Error deleting employee" });
    }
  });

  // Payroll statistics endpoint
  app.get("/api/payroll/stats", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const stats = await storage.getPayrollStats(tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching payroll stats:", error);
      res.status(500).json({ message: "Error fetching payroll stats" });
    }
  });

  // Birthdays and anniversaries endpoint
  app.get("/api/payroll/birthdays-anniversaries", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const data = await storage.getUpcomingBirthdaysAndAnniversaries(tenantId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching birthdays and anniversaries:", error);
      res.status(500).json({ message: "Error fetching birthdays and anniversaries" });
    }
  });

  // Department endpoints
  app.get("/api/departments", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const departments = await storage.getDepartments(tenantId);
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Error fetching departments" });
    }
  });

  app.post("/api/departments", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const departmentData = { ...req.body, tenantId };
      const department = await storage.createDepartment(departmentData);
      res.status(201).json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(500).json({ message: "Error creating department" });
    }
  });

  app.patch("/api/departments/:id", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const department = await storage.updateDepartment(parseInt(id), req.body);
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(department);
    } catch (error) {
      console.error("Error updating department:", error);
      res.status(500).json({ message: "Error updating department" });
    }
  });

  app.delete("/api/departments/:id", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteDepartment(parseInt(id));
      if (!success) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ message: "Error deleting department" });
    }
  });

  // Job position endpoints
  app.get("/api/job-positions", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const positions = await storage.getJobPositions(tenantId);
      res.json(positions);
    } catch (error) {
      console.error("Error fetching job positions:", error);
      res.status(500).json({ message: "Error fetching job positions" });
    }
  });

  app.post("/api/job-positions", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const positionData = { ...req.body, tenantId };
      const position = await storage.createJobPosition(positionData);
      res.status(201).json(position);
    } catch (error) {
      console.error("Error creating job position:", error);
      res.status(500).json({ message: "Error creating job position" });
    }
  });

  app.patch("/api/job-positions/:id", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const position = await storage.updateJobPosition(parseInt(id), req.body);
      if (!position) {
        return res.status(404).json({ message: "Job position not found" });
      }
      res.json(position);
    } catch (error) {
      console.error("Error updating job position:", error);
      res.status(500).json({ message: "Error updating job position" });
    }
  });

  app.delete("/api/job-positions/:id", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteJobPosition(parseInt(id));
      if (!success) {
        return res.status(404).json({ message: "Job position not found" });
      }
      res.json({ message: "Job position deleted successfully" });
    } catch (error) {
      console.error("Error deleting job position:", error);
      res.status(500).json({ message: "Error deleting job position" });
    }
  });

  // Payroll Period routes
  app.get("/api/payroll-periods", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const periods = await storage.getPayrollPeriods(tenantId);
      res.json(periods);
    } catch (error) {
      console.error("Error fetching payroll periods:", error);
      res.status(500).json({ message: "Error fetching payroll periods" });
    }
  });

  app.post("/api/payroll-periods", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const periodData = {
        ...req.body,
        tenantId,
      };
      const period = await storage.createPayrollPeriod(periodData);
      res.status(201).json(period);
    } catch (error) {
      console.error("Error creating payroll period:", error);
      res.status(500).json({ message: "Error creating payroll period" });
    }
  });

  // Payroll Record routes
  app.get("/api/payroll-records", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const periodId = req.query.periodId ? parseInt(req.query.periodId) : undefined;
      const records = await storage.getPayrollRecords(tenantId, periodId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching payroll records:", error);
      res.status(500).json({ message: "Error fetching payroll records" });
    }
  });

  app.post("/api/payroll-records", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const recordData = {
        ...req.body,
        tenantId,
      };
      const record = await storage.createPayrollRecord(recordData);
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating payroll record:", error);
      res.status(500).json({ message: "Error creating payroll record" });
    }
  });

  // Payroll Stamping routes
  app.post("/api/payroll/stamp", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      
      // Validate required fields
      const { 
        employeeId, 
        payrollDate, 
        periodStart, 
        periodEnd, 
        absences = 0, 
        permissions = 0, 
        vacations = 0,
        baseSalary,
        overtime = 0,
        bonuses = 0,
        commissions = 0,
        imss = 0,
        isr = 0,
        loans = 0,
        advances = 0,
        otherDeductions = 0,
        totalPerceptions,
        totalDeductions,
        netPay
      } = req.body;

      if (!employeeId || !payrollDate || !periodStart || !periodEnd || !baseSalary) {
        return res.status(400).json({ 
          message: "Campos requeridos: employeeId, payrollDate, periodStart, periodEnd, baseSalary" 
        });
      }

      const stampData = {
        tenantId,
        employeeId,
        payrollDate: new Date(payrollDate),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        absences,
        permissions,
        vacations,
        baseSalary: baseSalary.toString(),
        overtime: overtime.toString(),
        bonuses: bonuses.toString(),
        commissions: commissions.toString(),
        imss: imss.toString(),
        isr: isr.toString(),
        loans: loans.toString(),
        advances: advances.toString(),
        otherDeductions: otherDeductions.toString(),
        totalPerceptions: totalPerceptions.toString(),
        totalDeductions: totalDeductions.toString(),
        netPay: netPay.toString()
      };

      const stamp = await storage.createPayrollStamp(stampData, tenantId);
      
      // Generate receipt HTML for printing
      const employee = await storage.getEmployee(employeeId, tenantId);
      const receiptHtml = generatePayrollReceipt(stamp, employee);
      
      res.status(201).json({ 
        stamp, 
        receiptHtml,
        message: "Nómina timbrada exitosamente" 
      });
    } catch (error) {
      console.error("Error creating payroll stamp:", error);
      res.status(500).json({ message: "Error al timbrar nómina" });
    }
  });

  app.get("/api/payroll/stamps", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const stamps = await storage.getPayrollStamps(tenantId);
      res.json(stamps);
    } catch (error) {
      console.error("Error fetching payroll stamps:", error);
      res.status(500).json({ message: "Error al obtener timbrados de nómina" });
    }
  });

  app.get("/api/payroll/stamps/employee/:employeeId", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { employeeId } = req.params;
      const stamps = await storage.getPayrollStampsByEmployee(parseInt(employeeId), tenantId);
      res.json(stamps);
    } catch (error) {
      console.error("Error fetching employee payroll stamps:", error);
      res.status(500).json({ message: "Error al obtener historial de nóminas del empleado" });
    }
  });

  // Payroll history endpoint with advanced filtering
  app.get("/api/payroll/history", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { month, employeeId, status } = req.query;
      
      console.log(`Getting payroll history for tenant: ${tenantId}, filters:`, { month, employeeId, status });
      
      // Query actual payroll stamps from database with employee information
      const payrollStampsQuery = db
        .select({
          id: payrollStamps.id,
          employeeId: payrollStamps.employeeId,
          employeeName: employees.firstName,
          employeeLastName: employees.lastName,
          employeeNumber: employees.employeeNumber,
          department: employees.department,
          payPeriodStart: payrollStamps.periodStart,
          payPeriodEnd: payrollStamps.periodEnd,
          baseSalary: payrollStamps.baseSalary,
          overtime: payrollStamps.overtime,
          bonuses: payrollStamps.bonuses,
          commissions: payrollStamps.commissions,
          imss: payrollStamps.imss,
          isr: payrollStamps.isr,
          loans: payrollStamps.loans,
          advances: payrollStamps.advances,
          otherDeductions: payrollStamps.otherDeductions,
          totalPerceptions: payrollStamps.totalPerceptions,
          totalDeductions: payrollStamps.totalDeductions,
          netPay: payrollStamps.netPay,
          payrollDate: payrollStamps.payrollDate,
          createdAt: payrollStamps.createdAt,
          absences: payrollStamps.absences,
          permissions: payrollStamps.permissions,
          vacations: payrollStamps.vacations
        })
        .from(payrollStamps)
        .innerJoin(employees, eq(payrollStamps.employeeId, employees.id))
        .where(eq(payrollStamps.tenantId, tenantId));

      const allPayrollStamps = await payrollStampsQuery;

      console.log(`Found ${allPayrollStamps.length} real payroll stamps for tenant ${tenantId}`);

      // Transform the data to match frontend expectations
      let payrollHistory = allPayrollStamps.map(stamp => ({
        id: stamp.id,
        employeeId: stamp.employeeId,
        employeeName: `${stamp.employeeName} ${stamp.employeeLastName}`,
        employeeNumber: stamp.employeeNumber,
        department: stamp.department || 'Administración',
        payPeriodStart: stamp.payPeriodStart.toISOString().split('T')[0],
        payPeriodEnd: stamp.payPeriodEnd.toISOString().split('T')[0],
        basicSalary: parseFloat(stamp.baseSalary || "0"),
        overtimeHours: 0, // Calculate from overtime pay if needed
        overtimePay: parseFloat(stamp.overtime || "0"),
        bonuses: parseFloat(stamp.bonuses || "0"),
        commissions: parseFloat(stamp.commissions || "0"),
        deductions: parseFloat(stamp.otherDeductions || "0"), // Map to deductions field expected by frontend
        imssDeduction: parseFloat(stamp.imss || "0"),
        isrDeduction: parseFloat(stamp.isr || "0"),
        loans: parseFloat(stamp.loans || "0"),
        advances: parseFloat(stamp.advances || "0"),
        totalPerceptions: parseFloat(stamp.totalPerceptions || "0"),
        totalDeductions: parseFloat(stamp.totalDeductions || "0"),
        netPay: parseFloat(stamp.netPay || "0"),
        paymentDate: stamp.payrollDate.toISOString().split('T')[0],
        stampingDate: stamp.createdAt.toISOString().split('T')[0],
        status: 'timbrado', // All records in database are stamped
        absences: stamp.absences || 0,
        permissions: stamp.permissions || 0,
        vacations: stamp.vacations || 0
      }));

      // Apply filters
      if (month && month !== 'all') {
        const [year, monthNum] = month.split('-');
        payrollHistory = payrollHistory.filter(record => {
          const recordMonth = record.payPeriodStart.split('-');
          return recordMonth[0] === year && recordMonth[1] === monthNum;
        });
      }

      if (employeeId && employeeId !== 'all') {
        payrollHistory = payrollHistory.filter(record => record.employeeId === parseInt(employeeId as string));
      }

      if (status && status !== 'all') {
        payrollHistory = payrollHistory.filter(record => record.status === status);
      }

      // Sort by most recent first
      const result = payrollHistory.sort((a, b) => new Date(b.stampingDate).getTime() - new Date(a.stampingDate).getTime());
      
      console.log(`Returning ${result.length} payroll records after filtering`);
      res.json(result);
      
    } catch (error) {
      console.error("Error fetching payroll history:", error);
      res.status(500).json({ message: "Error al obtener historial de timbrado" });
    }
  });

  // ===== APPOINTMENTS API ROUTES =====
  
  // Get all appointments for tenant
  app.get("/api/appointments", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { date, customerName } = req.query;
      
      let appointmentsQuery = db
        .select({
          id: appointments.id,
          customerName: appointments.customerName,
          customerPhone: appointments.customerPhone,
          subject: appointments.subject,
          appointmentDate: appointments.appointmentDate,
          appointmentTime: appointments.appointmentTime,
          status: appointments.status,
          notes: appointments.notes,
          createdAt: appointments.createdAt,
        })
        .from(appointments)
        .where(eq(appointments.tenantId, tenantId));

      const allAppointments = await appointmentsQuery;

      // Apply filters
      let filteredAppointments = allAppointments;

      if (date) {
        const filterDate = new Date(date as string);
        filteredAppointments = filteredAppointments.filter(apt => {
          const aptDate = new Date(apt.appointmentDate);
          return aptDate.toDateString() === filterDate.toDateString();
        });
      }

      if (customerName) {
        filteredAppointments = filteredAppointments.filter(apt =>
          apt.customerName.toLowerCase().includes((customerName as string).toLowerCase())
        );
      }

      // Get products for each appointment
      const appointmentsWithProducts = await Promise.all(
        filteredAppointments.map(async (appointment) => {
          const appointmentProductsList = await db
            .select({
              productName: products.name,
              quantity: appointmentProducts.quantity,
            })
            .from(appointmentProducts)
            .innerJoin(products, eq(appointmentProducts.productId, products.id))
            .where(and(eq(appointmentProducts.appointmentId, appointment.id), eq(appointmentProducts.tenantId, tenantId)));

          return {
            ...appointment,
            products: appointmentProductsList,
          };
        })
      );

      res.json(appointmentsWithProducts);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Error al obtener citas" });
    }
  });

  // Get single appointment with products
  app.get("/api/appointments/:id", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const appointmentId = parseInt(req.params.id);

      // Get appointment details
      const appointment = await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)))
        .limit(1);

      if (appointment.length === 0) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }

      // Get appointment products
      const appointmentProductsList = await db
        .select({
          id: appointmentProducts.id,
          productId: appointmentProducts.productId,
          quantity: appointmentProducts.quantity,
          productName: products.name,
          productPrice: products.price,
        })
        .from(appointmentProducts)
        .innerJoin(products, eq(appointmentProducts.productId, products.id))
        .where(and(eq(appointmentProducts.appointmentId, appointmentId), eq(appointmentProducts.tenantId, tenantId)));

      res.json({
        ...appointment[0],
        products: appointmentProductsList,
      });
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Error al obtener cita" });
    }
  });

  // Create new appointment
  app.post("/api/appointments", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { productIds, ...appointmentData } = req.body;
      
      // Convert date string to Date object if needed
      if (appointmentData.appointmentDate && typeof appointmentData.appointmentDate === 'string') {
        appointmentData.appointmentDate = new Date(appointmentData.appointmentDate);
      }
      
      const validatedData = insertAppointmentSchema.parse(appointmentData);

      // Create appointment
      const newAppointment = await db
        .insert(appointments)
        .values({
          ...validatedData,
          tenantId,
        })
        .returning();

      const appointmentId = newAppointment[0].id;

      // Add products if any
      if (productIds && productIds.length > 0) {
        const productInserts = productIds.map((productId: number) => ({
          tenantId,
          appointmentId,
          productId,
          quantity: 1,
        }));

        await db.insert(appointmentProducts).values(productInserts);
      }

      res.status(201).json(newAppointment[0]);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Error al crear cita" });
    }
  });

  // Update appointment
  app.patch("/api/appointments/:id", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const appointmentId = parseInt(req.params.id);
      const { productIds, ...updateData } = req.body;
      
      // Convert date string to Date object if needed
      if (updateData.appointmentDate && typeof updateData.appointmentDate === 'string') {
        updateData.appointmentDate = new Date(updateData.appointmentDate);
      }

      // Update appointment
      const updatedAppointment = await db
        .update(appointments)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)))
        .returning();

      if (updatedAppointment.length === 0) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }

      // Update products if provided
      if (productIds !== undefined) {
        // Delete existing products
        await db
          .delete(appointmentProducts)
          .where(and(eq(appointmentProducts.appointmentId, appointmentId), eq(appointmentProducts.tenantId, tenantId)));

        // Add new products
        if (productIds.length > 0) {
          const productInserts = productIds.map((productId: number) => ({
            tenantId,
            appointmentId,
            productId,
            quantity: 1,
          }));

          await db.insert(appointmentProducts).values(productInserts);
        }
      }

      res.json(updatedAppointment[0]);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Error al actualizar cita" });
    }
  });

  // Delete appointment
  app.delete("/api/appointments/:id", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const appointmentId = parseInt(req.params.id);

      const deletedAppointment = await db
        .delete(appointments)
        .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)))
        .returning();

      if (deletedAppointment.length === 0) {
        return res.status(404).json({ message: "Cita no encontrada" });
      }

      res.json({ message: "Cita eliminada exitosamente" });
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Error al eliminar cita" });
    }
  });

  const httpServer = createServer(app);
  // Inicializar el servicio de chat IA
  const aiChatService = new AIChatService(storage);

  // AI Chat routes
  app.post("/api/ai-chat", requireTenant, async (req: any, res) => {
    try {
      const { query } = req.body;
      const tenantId = req.user.tenantId;
      const userId = req.user.id;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }

      const response = await aiChatService.processUserQuery(query, tenantId, userId.toString());
      res.json({ response });
    } catch (error) {
      console.error('Error in AI chat:', error);
      res.status(500).json({ error: "Error processing your query" });
    }
  });

  app.get("/api/ai-chat/context", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      
      // Obtener contexto básico del negocio para el chat
      const products = await storage.getProducts(tenantId);
      const warehouses = await storage.getWarehouses(tenantId);
      const salesStats = await storage.getSalesStats(tenantId);
      
      const context = {
        productsCount: products.length,
        warehousesCount: warehouses.length,
        todaySales: salesStats?.todaySales || 0,
        monthSales: salesStats?.monthSales || 0
      };
      
      res.json(context);
    } catch (error) {
      console.error('Error getting AI chat context:', error);
      res.status(500).json({ error: "Error getting chat context" });
    }
  });

  // Product costs endpoints
  app.get('/api/product-costs/:id', requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const productId = parseInt(id);
      
      if (isNaN(productId) || productId <= 0) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      
      const tenantId = req.user.tenantId;
      const productCost = await storage.getProductCost(productId, tenantId);
      res.json(productCost);
    } catch (error) {
      console.error('Error getting product cost:', error);
      res.status(500).json({ error: 'Failed to get product cost' });
    }
  });

  app.post('/api/product-costs', requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const productCostData = { ...req.body, tenantId };
      const productCost = await storage.createProductCost(productCostData);
      res.status(201).json(productCost);
    } catch (error) {
      console.error('Error creating product cost:', error);
      res.status(500).json({ error: 'Failed to create product cost' });
    }
  });

  app.put('/api/product-costs/:id', requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.user.tenantId;
      const productCost = await storage.updateProductCost(parseInt(id), req.body, tenantId);
      res.json(productCost);
    } catch (error) {
      console.error('Error updating product cost:', error);
      res.status(500).json({ error: 'Failed to update product cost' });
    }
  });

  // Product cost ingredients endpoints
  app.get('/api/product-costs/ingredients/:productId', requireTenant, async (req: any, res) => {
    try {
      const { productId } = req.params;
      const id = parseInt(productId);
      
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      
      const tenantId = req.user.tenantId;
      const ingredients = await storage.getProductCostIngredients(id, tenantId);
      res.json(ingredients);
    } catch (error) {
      console.error('Error getting product cost ingredients:', error);
      res.status(500).json({ error: 'Failed to get product cost ingredients' });
    }
  });

  app.post('/api/product-costs/ingredients', requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const ingredientData = { ...req.body, tenantId };
      const ingredient = await storage.createProductCostIngredient(ingredientData);
      res.status(201).json(ingredient);
    } catch (error) {
      console.error('Error creating product cost ingredient:', error);
      res.status(500).json({ error: 'Failed to create product cost ingredient' });
    }
  });

  // Product nutrition endpoints
  app.get('/api/product-costs/nutrition/:productId', requireTenant, async (req: any, res) => {
    try {
      const { productId } = req.params;
      const id = parseInt(productId);
      
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      
      const tenantId = req.user.tenantId;
      const nutrition = await storage.getProductNutrition(id, tenantId);
      res.json(nutrition);
    } catch (error) {
      console.error('Error getting product nutrition:', error);
      res.status(500).json({ error: 'Failed to get product nutrition' });
    }
  });

  app.post('/api/product-costs/nutrition', requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const nutritionData = { ...req.body, tenantId };
      const nutrition = await storage.createProductNutrition(nutritionData);
      res.status(201).json(nutrition);
    } catch (error) {
      console.error('Error creating product nutrition:', error);
      res.status(500).json({ error: 'Failed to create product nutrition' });
    }
  });

  // Product preparation endpoints
  app.get('/api/product-costs/preparation/:productId', requireTenant, async (req: any, res) => {
    try {
      const { productId } = req.params;
      const id = parseInt(productId);
      
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }
      
      const tenantId = req.user.tenantId;
      const preparation = await storage.getProductPreparation(id, tenantId);
      res.json(preparation);
    } catch (error) {
      console.error('Error getting product preparation:', error);
      res.status(500).json({ error: 'Failed to get product preparation' });
    }
  });

  app.post('/api/product-costs/preparation', requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const preparationData = { ...req.body, tenantId };
      const preparation = await storage.createProductPreparation(preparationData);
      res.status(201).json(preparation);
    } catch (error) {
      console.error('Error creating product preparation:', error);
      res.status(500).json({ error: 'Failed to create product preparation' });
    }
  });

  // Customer Routes
  app.get("/api/customers", requireTenant, async (req: any, res) => {
    try {
      console.log("🔍 GET /api/customers - Request received");
      console.log("User:", req.user?.username, "Tenant:", req.user?.tenantId);
      
      const customers = await storage.getCustomers(req.user.tenantId);
      console.log("✅ Customers found:", customers.length);
      console.log("Customer IDs:", customers.map(c => ({ id: c.id, name: c.name })));
      
      res.json(customers);
    } catch (error) {
      console.error("❌ Error fetching customers:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Customer statistics endpoint - MUST be before the generic :id route
  app.get("/api/customers/stats", requireTenant, async (req: any, res) => {
    try {
      console.log("📊 GET /api/customers/stats - Request received");
      console.log("User:", req.user?.username, "Tenant:", req.user?.tenantId);
      
      const stats = await storage.getCustomerStats(req.user.tenantId);
      res.json(stats);
    } catch (error) {
      console.error("❌ Error fetching customer statistics:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.get("/api/customers/:id", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Validate ID parameter
      const customerId = parseInt(id);
      if (isNaN(customerId) || customerId <= 0) {
        console.error(`❌ Invalid customer ID: ${id}`);
        return res.status(400).json({ message: "ID de cliente inválido" });
      }
      
      const customer = await storage.getCustomer(customerId, req.user.tenantId);
      if (!customer) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.post("/api/customers", requireTenant, async (req: any, res) => {
    try {
      console.log("🔵 POST /api/customers - Request received");
      console.log("User:", req.user?.username, "Tenant:", req.user?.tenantId);
      console.log("Request body:", req.body);
      
      const customerData = insertCustomerSchema.parse({
        ...req.body,
        tenantId: req.user.tenantId,
      });
      
      console.log("✅ Customer data validated:", customerData);
      
      const customer = await storage.createCustomer(customerData);
      
      console.log("✅ Customer created successfully:", customer);
      res.status(201).json(customer);
    } catch (error) {
      console.error("❌ Error creating customer:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Datos inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.put("/api/customers/:id", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(parseInt(id), customerData, req.user.tenantId);
      if (!customer) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.delete("/api/customers/:id", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCustomer(parseInt(id), req.user.tenantId);
      if (!success) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      res.json({ message: "Cliente eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Customer credit endpoints
  app.post("/api/customers/:id/add-credit", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      
      // Validate ID parameter
      const customerId = parseInt(id);
      if (isNaN(customerId) || customerId <= 0) {
        console.error(`❌ Invalid customer ID: ${id}`);
        return res.status(400).json({ message: "ID de cliente inválido" });
      }
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Monto inválido" });
      }

      console.log(`🔵 Adding ${amount} credit to customer ${customerId} for tenant ${req.user.tenantId}`);
      
      const customer = await storage.addCustomerCredit(customerId, parseFloat(amount), req.user.tenantId);
      if (!customer) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      
      res.json({ 
        message: "Crédito agregado exitosamente",
        customer: customer
      });
    } catch (error) {
      console.error("Error adding customer credit:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });



  // Customer credit eligibility endpoint
  app.patch("/api/customers/:id/credit-eligibility", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { creditEligible } = req.body;
      
      // Validate ID parameter
      const customerId = parseInt(id);
      if (isNaN(customerId) || customerId <= 0) {
        console.error(`❌ Invalid customer ID: ${id}`);
        return res.status(400).json({ message: "ID de cliente inválido" });
      }
      
      if (typeof creditEligible !== 'boolean') {
        return res.status(400).json({ message: "Valor de elegibilidad inválido" });
      }

      console.log(`🔵 Updating credit eligibility for customer ${id} to ${creditEligible} for tenant ${req.user.tenantId}`);
      
      const customer = await storage.updateCustomerCreditEligibility(customerId, creditEligible, req.user.tenantId);
      if (!customer) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      
      res.json({ 
        message: "Elegibilidad de crédito actualizada exitosamente",
        customer: customer
      });
    } catch (error) {
      console.error("Error updating customer credit eligibility:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get customers eligible for credit (for POS credit system) - temporary no-auth version
  app.get("/api/credit-customers", async (req: any, res) => {
    try {
      console.log(`🔍 GET /api/credit-customers - Start`);
      
      // For now, use the tenant ID directly since we know it from the database
      const tenantId = "3ecf677e-5f5e-4dd2-9f3a-0585bb2b87f7";
      console.log(`🔍 Using tenant: ${tenantId}`);
      
      // Direct database query to get credit-eligible customers
      const eligibleCustomers = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.tenantId, tenantId),
            eq(customers.creditEligible, true)
          )
        );
      
      console.log(`✅ Found ${eligibleCustomers.length} credit-eligible customers`);
      console.log(`📋 Customer names:`, eligibleCustomers.map(c => c.name));
      
      res.json(eligibleCustomers);
    } catch (error) {
      console.error("❌ Error fetching credit-eligible customers:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // === DELETED DUPLICATE PROMOTIONS ROUTES ===
  // (moved to top of file for priority)
  
  // Test POST endpoint without authentication
  app.post("/api/test-promotion", async (req: any, res) => {
    try {
      console.log("🔥 POST /api/test-promotion - Testing without auth");
      console.log("🔥 Received data:", JSON.stringify(req.body, null, 2));
      
      // Use jade's tenant for testing
      const tenantId = "e141cbe9-6c29-483b-a064-4df14d7a8787";
      
      const { selectedProducts, selectedCategories, ...promotionData } = req.body;
      
      const formattedPromotionData = {
        ...promotionData,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: new Date(promotionData.startDate),
        endDate: new Date(promotionData.endDate)
      };
      
      console.log("🔥 Formatted promotion data:", JSON.stringify(formattedPromotionData, null, 2));
      
      const promotion = await storage.createPromotion(formattedPromotionData);
      console.log("🔥 Promotion created:", promotion.id);
      
      // Add selected products if any
      if (selectedProducts && selectedProducts.length > 0) {
        await storage.addPromotionProducts(promotion.id, selectedProducts, tenantId);
      }
      
      // Add selected categories if any
      if (selectedCategories && selectedCategories.length > 0) {
        await storage.addPromotionCategories(promotion.id, selectedCategories, tenantId);
      }
      
      res.status(201).json(promotion);
    } catch (error) {
      console.error("🔥 Error creating promotion:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });
  


  // Get single promotion
  app.get("/api/promotions/:id", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const promotionId = parseInt(id);
      
      if (isNaN(promotionId) || promotionId <= 0) {
        return res.status(400).json({ message: "ID de promoción inválido" });
      }
      
      const promotion = await storage.getPromotion(promotionId, req.user.tenantId);
      if (!promotion) {
        return res.status(404).json({ message: "Promoción no encontrada" });
      }
      
      res.json(promotion);
    } catch (error) {
      console.error("Error fetching promotion:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });



  // Update promotion
  app.put("/api/promotions/:id", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const promotionId = parseInt(id);
      
      if (isNaN(promotionId) || promotionId <= 0) {
        return res.status(400).json({ message: "ID de promoción inválido" });
      }
      
      const promotionData = {
        ...req.body,
        updatedAt: new Date()
      };
      
      const promotion = await storage.updatePromotion(promotionId, promotionData, req.user.tenantId);
      if (!promotion) {
        return res.status(404).json({ message: "Promoción no encontrada" });
      }
      
      res.json(promotion);
    } catch (error) {
      console.error("Error updating promotion:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Delete promotion
  app.delete("/api/promotions/:id", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const promotionId = parseInt(id);
      
      if (isNaN(promotionId) || promotionId <= 0) {
        return res.status(400).json({ message: "ID de promoción inválido" });
      }
      
      const success = await storage.deletePromotion(promotionId, req.user.tenantId);
      if (!success) {
        return res.status(404).json({ message: "Promoción no encontrada" });
      }
      
      res.json({ message: "Promoción eliminada exitosamente" });
    } catch (error) {
      console.error("Error deleting promotion:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get active promotions
  app.get("/api/promotions/active", requireTenant, async (req: any, res) => {
    try {
      const promotions = await storage.getActivePromotions(req.user.tenantId);
      res.json(promotions);
    } catch (error) {
      console.error("Error fetching active promotions:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get promotion products
  app.get("/api/promotions/:id/products", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const promotionId = parseInt(id);
      
      if (isNaN(promotionId) || promotionId <= 0) {
        return res.status(400).json({ message: "ID de promoción inválido" });
      }
      
      const products = await storage.getPromotionProducts(promotionId, req.user.tenantId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching promotion products:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Add products to promotion
  app.post("/api/promotions/:id/products", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { productIds } = req.body;
      const promotionId = parseInt(id);
      
      if (isNaN(promotionId) || promotionId <= 0) {
        return res.status(400).json({ message: "ID de promoción inválido" });
      }
      
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "IDs de productos inválidos" });
      }
      
      const products = await storage.addPromotionProducts(promotionId, productIds, req.user.tenantId);
      res.json(products);
    } catch (error) {
      console.error("Error adding promotion products:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Remove products from promotion
  app.delete("/api/promotions/:id/products", requireTenant, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { productIds } = req.body;
      const promotionId = parseInt(id);
      
      if (isNaN(promotionId) || promotionId <= 0) {
        return res.status(400).json({ message: "ID de promoción inválido" });
      }
      
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "IDs de productos inválidos" });
      }
      
      const success = await storage.removePromotionProducts(promotionId, productIds, req.user.tenantId);
      res.json({ success });
    } catch (error) {
      console.error("Error removing promotion products:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Calculate promotion price
  app.post("/api/promotions/calculate-price", requireTenant, async (req: any, res) => {
    try {
      const { productId, quantity } = req.body;
      
      if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ message: "Datos de producto y cantidad inválidos" });
      }
      
      const result = await storage.calculatePromotionPrice(productId, quantity, req.user.tenantId);
      res.json(result);
    } catch (error) {
      console.error("Error calculating promotion price:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Get promotion usage statistics
  app.get("/api/promotions/stats", requireTenant, async (req: any, res) => {
    try {
      const stats = await storage.getPromotionUsageStats(req.user.tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching promotion stats:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // === LOAN CLIENTS ROUTES ===
  
  // Get all loan clients
  app.get("/api/loan-clients", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      
      const loanClientsList = await db
        .select()
        .from(loanClients)
        .where(eq(loanClients.tenantId, tenantId))
        .orderBy(loanClients.createdAt);
      
      res.json(loanClientsList);
    } catch (error) {
      console.error("Error fetching loan clients:", error);
      res.status(500).json({ message: "Error al obtener clientes de préstamos" });
    }
  });

  // Get single loan client with references
  app.get("/api/loan-clients/:id", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const loanClientId = parseInt(req.params.id);

      // Get loan client
      const loanClient = await db
        .select()
        .from(loanClients)
        .where(and(eq(loanClients.id, loanClientId), eq(loanClients.tenantId, tenantId)))
        .limit(1);

      if (loanClient.length === 0) {
        return res.status(404).json({ message: "Cliente de préstamo no encontrado" });
      }

      // Get personal references
      const references = await db
        .select()
        .from(personalReferences)
        .where(and(eq(personalReferences.loanClientId, loanClientId), eq(personalReferences.tenantId, tenantId)));

      res.json({
        ...loanClient[0],
        references: references,
      });
    } catch (error) {
      console.error("Error fetching loan client:", error);
      res.status(500).json({ message: "Error al obtener cliente de préstamo" });
    }
  });

  // Create new loan client with references
  app.post("/api/loan-clients", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { references, ...loanClientData } = req.body;
      
      console.log("Received loan client data:", loanClientData);
      console.log("Received references:", references);

      // Create loan client with direct values
      const newLoanClient = await db
        .insert(loanClients)
        .values({
          name: loanClientData.name,
          phone: loanClientData.phone,
          email: loanClientData.email || null,
          company: loanClientData.company || null,
          yearsExperience: loanClientData.yearsExperience || null,
          monthlyIncome: loanClientData.monthlyIncome || null,
          monthlyExpenses: loanClientData.monthlyExpenses || null,
          personalReferences: null, // Not using this field anymore
          status: 'active',
          tenantId,
        })
        .returning();

      const loanClientId = newLoanClient[0].id;

      // Add personal references if any
      if (references && references.length > 0) {
        const referencesInserts = references.map((reference: any) => ({
          tenantId,
          loanClientId,
          name: reference.name,
          phone: reference.phone,
          address: reference.address || null,
        }));

        await db.insert(personalReferences).values(referencesInserts);
      }

      res.status(201).json(newLoanClient[0]);
    } catch (error) {
      console.error("Error creating loan client:", error);
      res.status(500).json({ message: "Error al crear cliente de préstamo" });
    }
  });

  // Update loan client
  app.put("/api/loan-clients/:id", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const loanClientId = parseInt(req.params.id);
      const { references, ...updateData } = req.body;

      // Update loan client
      const updatedLoanClient = await db
        .update(loanClients)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(loanClients.id, loanClientId), eq(loanClients.tenantId, tenantId)))
        .returning();

      if (updatedLoanClient.length === 0) {
        return res.status(404).json({ message: "Cliente de préstamo no encontrado" });
      }

      // Update references if provided
      if (references !== undefined) {
        // Delete existing references
        await db
          .delete(personalReferences)
          .where(and(eq(personalReferences.loanClientId, loanClientId), eq(personalReferences.tenantId, tenantId)));

        // Add new references
        if (references.length > 0) {
          const referencesInserts = references.map((reference: any) => ({
            tenantId,
            loanClientId,
            name: reference.name,
            phone: reference.phone,
            address: reference.address || null,
          }));

          await db.insert(personalReferences).values(referencesInserts);
        }
      }

      res.json(updatedLoanClient[0]);
    } catch (error) {
      console.error("Error updating loan client:", error);
      res.status(500).json({ message: "Error al actualizar cliente de préstamo" });
    }
  });

  // Delete loan client
  app.delete("/api/loan-clients/:id", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const loanClientId = parseInt(req.params.id);

      const deletedLoanClient = await db
        .delete(loanClients)
        .where(and(eq(loanClients.id, loanClientId), eq(loanClients.tenantId, tenantId)))
        .returning();

      if (deletedLoanClient.length === 0) {
        return res.status(404).json({ message: "Cliente de préstamo no encontrado" });
      }

      res.json({ message: "Cliente de préstamo eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting loan client:", error);
      res.status(500).json({ message: "Error al eliminar cliente de préstamo" });
    }
  });

  // Credit evaluation endpoint - Mexican standards
  app.post("/api/loan-clients/:id/evaluate", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const loanClientId = parseInt(req.params.id);
      
      // Get client data
      const [client] = await db
        .select()
        .from(loanClients)
        .where(
          and(
            eq(loanClients.id, loanClientId),
            eq(loanClients.tenantId, tenantId)
          )
        );

      if (!client) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }

      const monthlyIncome = parseFloat(client.monthlyIncome || "0");
      const monthlyExpenses = parseFloat(client.monthlyExpenses || "0");
      const yearsExperience = client.yearsExperience || 0;

      // Calculate debt-to-income ratio
      const availableIncome = monthlyIncome - monthlyExpenses;
      const debtToIncomeRatio = monthlyExpenses / monthlyIncome * 100;

      // Mexican credit evaluation criteria
      let creditScore = 300; // Base score
      let approvedAmount = 0;
      let creditStatus = "rejected";
      let approvalNotes = "";

      // Income evaluation
      if (monthlyIncome >= 8000) creditScore += 100;
      else if (monthlyIncome >= 5000) creditScore += 70;
      else if (monthlyIncome >= 3000) creditScore += 40;

      // Debt-to-income ratio evaluation
      if (debtToIncomeRatio <= 30) creditScore += 150;
      else if (debtToIncomeRatio <= 40) creditScore += 100;
      else if (debtToIncomeRatio <= 50) creditScore += 50;

      // Work experience evaluation
      if (yearsExperience >= 3) creditScore += 100;
      else if (yearsExperience >= 2) creditScore += 70;
      else if (yearsExperience >= 1) creditScore += 40;

      // Available income evaluation
      if (availableIncome >= 5000) creditScore += 100;
      else if (availableIncome >= 3000) creditScore += 70;
      else if (availableIncome >= 1500) creditScore += 40;

      // Approval criteria
      if (creditScore >= 600 && availableIncome >= 1500 && debtToIncomeRatio <= 50) {
        creditStatus = "approved";
        // Mexican standard: maximum 6x monthly available income for personal loans
        approvedAmount = Math.min(availableIncome * 6, 150000); // Cap at 150k MXN
        approvalNotes = "Cliente aprobado según criterios crediticios mexicanos";
      } else {
        let reasons = [];
        if (creditScore < 600) reasons.push("Score crediticio insuficiente");
        if (availableIncome < 1500) reasons.push("Ingresos disponibles insuficientes");
        if (debtToIncomeRatio > 50) reasons.push("Relación deuda-ingreso muy alta");
        approvalNotes = `Cliente rechazado: ${reasons.join(", ")}`;
      }

      // Update client record with evaluation
      const [updatedClient] = await db
        .update(loanClients)
        .set({
          creditStatus,
          approvedAmount: approvedAmount.toString(),
          debtToIncomeRatio: debtToIncomeRatio.toFixed(2),
          creditScore,
          approvalNotes,
        })
        .where(
          and(
            eq(loanClients.id, loanClientId),
            eq(loanClients.tenantId, tenantId)
          )
        )
        .returning();

      res.json({
        client: updatedClient,
        evaluation: {
          creditScore,
          debtToIncomeRatio: debtToIncomeRatio.toFixed(2),
          availableIncome,
          creditStatus,
          approvedAmount,
          approvalNotes
        }
      });
    } catch (error) {
      console.error("Error evaluating credit:", error);
      res.status(500).json({ message: "Error al evaluar crédito" });
    }
  });

  // Authorize loan with custom terms
  app.post("/api/loan-clients/:id/authorize", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const loanClientId = parseInt(req.params.id);
      const { approvedAmount, loanTermMonths, interestRate } = req.body;

      // Calculate monthly payment using Mexican amortization formula
      const principal = parseFloat(approvedAmount);
      const monthlyRate = parseFloat(interestRate) / 100 / 12;
      const numPayments = parseInt(loanTermMonths);
      
      const monthlyPayment = principal * 
        (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
        (Math.pow(1 + monthlyRate, numPayments) - 1);

      // Update client with authorization
      const [updatedClient] = await db
        .update(loanClients)
        .set({
          approvedAmount: approvedAmount.toString(),
          loanTermMonths: numPayments,
          interestRate: interestRate.toString(),
          monthlyPayment: monthlyPayment.toFixed(2),
          creditStatus: "approved"
        })
        .where(
          and(
            eq(loanClients.id, loanClientId),
            eq(loanClients.tenantId, tenantId)
          )
        )
        .returning();

      res.json({
        client: updatedClient,
        calculation: {
          principal,
          monthlyRate: (monthlyRate * 100).toFixed(4),
          monthlyPayment: monthlyPayment.toFixed(2),
          totalPayment: (monthlyPayment * numPayments).toFixed(2),
          totalInterest: (monthlyPayment * numPayments - principal).toFixed(2)
        }
      });
    } catch (error) {
      console.error("Error authorizing loan:", error);
      res.status(500).json({ message: "Error al autorizar préstamo" });
    }
  });

  // Generate loan contract
  app.get("/api/loan-clients/:id/contract", requireTenant, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      const loanClientId = parseInt(req.params.id);
      
      // Get client with references
      const [client] = await db
        .select()
        .from(loanClients)
        .where(
          and(
            eq(loanClients.id, loanClientId),
            eq(loanClients.tenantId, tenantId)
          )
        );

      if (!client) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }

      if (client.creditStatus !== "approved") {
        return res.status(400).json({ message: "Cliente no aprobado para préstamo" });
      }

      const references = await db
        .select()
        .from(personalReferences)
        .where(
          and(
            eq(personalReferences.loanClientId, loanClientId),
            eq(personalReferences.tenantId, tenantId)
          )
        );

      // Generate Mexican loan contract
      const contractDate = new Date().toLocaleDateString('es-MX');
      const principal = parseFloat(client.approvedAmount || "0");
      const monthlyPayment = parseFloat(client.monthlyPayment || "0");
      const totalPayment = monthlyPayment * (client.loanTermMonths || 1);
      const totalInterest = totalPayment - principal;

      // Helper function to convert number to words (simplified)
      const numeroALetras = (num: number): string => {
        // Simplified conversion - in production use a proper library
        if (num === 0) return "CERO";
        return num.toLocaleString('es-MX').toUpperCase();
      };

      const contractHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Contrato de Préstamo Personal</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
            .clause { margin-bottom: 15px; text-align: justify; }
            .signature-section { margin-top: 50px; }
            .signature-line { border-bottom: 1px solid #000; width: 200px; display: inline-block; }
            .amount { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">CONTRATO DE PRÉSTAMO PERSONAL</div>
            <p><strong>CAJA SAS ENTERPRISE</strong></p>
            <p>Fecha: ${contractDate}</p>
          </div>

          <div class="clause">
            <strong>PRIMERA.- PARTES:</strong> Celebran el presente contrato de préstamo personal por una parte 
            <strong>CAJA SAS ENTERPRISE</strong>, quien en lo sucesivo se denominará "EL ACREEDOR", y por la otra parte 
            <strong>${client.name?.toUpperCase()}</strong>, quien en lo sucesivo se denominará "EL DEUDOR".
          </div>

          <div class="clause">
            <strong>SEGUNDA.- DATOS DEL DEUDOR:</strong>
            <br>Nombre: ${client.name}
            <br>Teléfono: ${client.phone}
            <br>Email: ${client.email || 'No proporcionado'}
            <br>Empresa: ${client.company || 'No especificada'}
            <br>Ingresos mensuales: $${parseFloat(client.monthlyIncome || "0").toLocaleString('es-MX')} MXN
          </div>

          <div class="clause">
            <strong>TERCERA.- OBJETO:</strong> EL ACREEDOR otorga a EL DEUDOR un préstamo personal por la cantidad de 
            <span class="amount">$${principal.toLocaleString('es-MX')} MXN (${numeroALetras(principal)} PESOS MEXICANOS)</span>.
          </div>

          <div class="clause">
            <strong>CUARTA.- CONDICIONES FINANCIERAS:</strong>
            <table>
              <tr><th>Concepto</th><th>Importe</th></tr>
              <tr><td>Monto del préstamo</td><td>$${principal.toLocaleString('es-MX')} MXN</td></tr>
              <tr><td>Plazo</td><td>${client.loanTermMonths} meses</td></tr>
              <tr><td>Tasa de interés anual</td><td>${client.interestRate}%</td></tr>
              <tr><td>Pago mensual</td><td>$${monthlyPayment.toLocaleString('es-MX')} MXN</td></tr>
              <tr><td>Total a pagar</td><td>$${totalPayment.toLocaleString('es-MX')} MXN</td></tr>
              <tr><td>Intereses totales</td><td>$${totalInterest.toLocaleString('es-MX')} MXN</td></tr>
            </table>
          </div>

          <div class="clause">
            <strong>QUINTA.- FORMA DE PAGO:</strong> EL DEUDOR se obliga a pagar el préstamo mediante 
            ${client.loanTermMonths} pagos mensuales consecutivos de $${monthlyPayment.toLocaleString('es-MX')} MXN, 
            venciendo el primer pago el día _____ del mes de _______ de 2025.
          </div>

          <div class="clause">
            <strong>SEXTA.- INTERESES MORATORIOS:</strong> En caso de mora en el pago de cualquier mensualidad, 
            EL DEUDOR pagará intereses moratorios del 3% mensual sobre el saldo vencido no pagado.
          </div>

          <div class="clause">
            <strong>SÉPTIMA.- REFERENCIAS PERSONALES:</strong>
            ${references.map((ref, index) => `
              <br>Referencia ${index + 1}: ${ref.name} - Tel: ${ref.phone} - Dir: ${ref.address || 'No proporcionada'}
            `).join('')}
          </div>

          <div class="clause">
            <strong>OCTAVA.- VENCIMIENTO ANTICIPADO:</strong> EL ACREEDOR podrá dar por vencido anticipadamente 
            el plazo del presente contrato en caso de: a) Falta de pago de dos mensualidades consecutivas, 
            b) Proporcionar información falsa, c) Cambio de domicilio sin previo aviso.
          </div>

          <div class="clause">
            <strong>NOVENA.- JURISDICCIÓN:</strong> Para la interpretación y cumplimiento del presente contrato, 
            las partes se someten a la jurisdicción de los tribunales competentes de México, 
            renunciando expresamente a cualquier otro fuero que pudiera corresponderles.
          </div>

          <div class="clause">
            <strong>DÉCIMA.- CONFORMIDAD:</strong> Leído que fue el presente contrato por las partes contratantes 
            y enteradas de su contenido, valor y consecuencias legales, lo firman de conformidad.
          </div>

          <div class="signature-section">
            <table style="border: none; margin-top: 50px;">
              <tr style="border: none;">
                <td style="border: none; text-align: center; width: 50%;">
                  <div class="signature-line"></div>
                  <br><strong>EL ACREEDOR</strong>
                  <br>CAJA SAS ENTERPRISE
                </td>
                <td style="border: none; text-align: center; width: 50%;">
                  <div class="signature-line"></div>
                  <br><strong>EL DEUDOR</strong>
                  <br>${client.name}
                </td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 30px; text-align: center; font-size: 10px;">
            <p>Este contrato se rige por las disposiciones del Código Civil y las leyes aplicables en México.</p>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(contractHtml);
    } catch (error) {
      console.error("Error generating contract:", error);
      res.status(500).json({ message: "Error al generar contrato" });
    }
  });

  // Store settings routes
  app.get("/api/store/settings", requireTenant, async (req, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const settings = await storage.getStoreSettings(tenantId);
      res.json(settings);
    } catch (error: any) {
      console.error("Error fetching store settings:", error);
      res.status(500).json({ message: "Failed to fetch store settings" });
    }
  });

  app.post("/api/store/settings", requireTenant, async (req, res) => {
    try {
      const tenantId = req.user!.tenantId;
      
      // Check if settings already exist for this tenant
      const existingSettings = await storage.getStoreSettings(tenantId);
      
      let settings;
      if (existingSettings) {
        // Preservar datos existentes y solo actualizar los campos enviados
        const updateData = {
          ...req.body,
          updatedAt: new Date()
        };
        console.log(`🔄 Updating store settings for tenant ${tenantId}:`, updateData);
        settings = await storage.updateStoreSettings(tenantId, updateData);
      } else {
        // Crear nuevos settings con valores por defecto seguros
        const settingsData = { 
          ...req.body, 
          tenantId,
          whatsappEnabled: req.body.whatsappEnabled || false,
          primaryColor: req.body.primaryColor || '#3B82F6',
          secondaryColor: req.body.secondaryColor || '#EF4444'
        };
        console.log(`✨ Creating new store settings for tenant ${tenantId}:`, settingsData);
        settings = await storage.createStoreSettings(settingsData);
      }
      
      console.log(`✅ Store settings saved successfully for tenant ${tenantId}`);
      res.json(settings);
    } catch (error: any) {
      console.error("Error saving store settings:", error);
      res.status(500).json({ message: "Failed to save store settings" });
    }
  });

  // Store data API (no authentication required)
  app.get("/api/store/:subdomain", async (req, res) => {
    try {
      const { subdomain } = req.params;
      const settings = await storage.getStoreSettingsBySubdomain(subdomain);
      
      if (!settings || !settings.isActive) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      // Get active store products only
      const activeProducts = await storage.getActiveStoreProducts(settings.tenantId);
      
      res.json({
        store: settings,
        products: activeProducts
      });
    } catch (error: any) {
      console.error("Error fetching store:", error);
      res.status(500).json({ message: "Failed to fetch store" });
    }
  });

  // Store products management routes
  app.get('/api/store-products', requireTenant, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId as string;
      const products = await storage.getStoreProducts(tenantId);
      res.json(products);
    } catch (error) {
      console.error('Error fetching store products:', error);
      res.status(500).json({ message: 'Failed to fetch store products' });
    }
  });

  app.get('/api/store-categories', requireTenant, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId as string;
      const categories = await storage.getStoreCategories(tenantId);
      res.json(categories);
    } catch (error) {
      console.error('Error fetching store categories:', error);
      res.status(500).json({ message: 'Failed to fetch store categories' });
    }
  });

  app.post('/api/store-products/:productId/toggle', requireTenant, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId as string;
      const productId = parseInt(req.params.productId);
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive must be a boolean' });
      }

      await storage.toggleStoreProduct(tenantId, productId, isActive);
      res.json({ success: true });
    } catch (error) {
      console.error('Error toggling store product:', error);
      res.status(500).json({ message: 'Failed to toggle store product' });
    }
  });

  app.post('/api/store-categories/:categoryName/toggle', requireTenant, async (req, res) => {
    try {
      const tenantId = req.user?.tenantId as string;
      const categoryName = decodeURIComponent(req.params.categoryName);
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive must be a boolean' });
      }

      await storage.toggleStoreCategory(tenantId, categoryName, isActive);
      res.json({ success: true });
    } catch (error) {
      console.error('Error toggling store category:', error);
      res.status(500).json({ message: 'Failed to toggle store category' });
    }
  });

  // STORE ONLINE ROUTES - for public store frontend
  app.post("/store/:subdomain/orders", async (req: any, res) => {
    console.log("📦 Store order received:", { subdomain: req.params.subdomain, body: req.body });
    
    try {
      const { subdomain } = req.params;
      const { customer, items, totals, paymentMethod, shippingMethod } = req.body;

      // Get store settings by subdomain
      const storeSettings = await storage.getStoreSettingsBySubdomain(subdomain);
      if (!storeSettings) {
        return res.status(404).json({ message: "Store not found" });
      }

      // Create or get customer
      let storeCustomer = await storage.getStoreCustomerByEmail(customer.email, storeSettings.tenantId);
      if (!storeCustomer) {
        storeCustomer = await storage.createStoreCustomer({
          tenantId: storeSettings.tenantId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone || "",
          shippingAddress: customer.shippingAddress,
          shippingCity: customer.shippingCity,
          shippingState: customer.shippingState,
          shippingZipCode: customer.shippingZipCode,
          shippingCountry: customer.shippingCountry || "MX"
        });
      }

      // Generate order number
      const orderNumber = `WEB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create store order
      const order = await storage.createStoreOrder({
        tenantId: storeSettings.tenantId,
        customerId: storeCustomer.id,
        orderNumber,
        total: totals.total,
        subtotal: totals.subtotal,
        tax: totals.tax || "0",
        shipping: totals.shipping || "0",
        discount: totals.discount || "0",
        status: "pending",
        paymentStatus: "pending",
        paymentMethod: paymentMethod,
        shippingMethod: shippingMethod,
        orderDate: new Date()
      });

      // Create order items
      for (const item of items) {
        await storage.createStoreOrderItem({
          tenantId: storeSettings.tenantId,
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku || "",
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice,
          total: item.total
        });
      }

      // Determine order status based on payment method
      const orderStatus = (paymentMethod === "stripe" || paymentMethod === "paypal") ? "confirmed" : "pending";
      const paymentStatus = (paymentMethod === "stripe" || paymentMethod === "paypal") ? "paid" : "pending";

      res.status(201).json({
        success: true,
        orderNumber: order.orderNumber,
        orderId: order.id,
        status: orderStatus,
        paymentStatus: paymentStatus,
        whatsappNumber: storeSettings.whatsappNumber,
        whatsappMessage: `¡Hola! He realizado un pedido en ${storeSettings.storeName}. Mi número de orden es: ${order.orderNumber}. Total: $${totals.total}. Método de pago: ${paymentMethod}.`,
        message: "Order created successfully"
      });

    } catch (error) {
      console.error("🚨 Error creating store order:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to create order",
        error: (error as any)?.message || "Unknown error"
      });
    }
  });

  // DALL-E Image Generation endpoint for products
  app.post("/api/generate-product-image", requireTenant, async (req: any, res) => {
    try {
      const { productName, description } = req.body;
      
      if (!productName) {
        return res.status(400).json({ message: "Product name is required" });
      }

      // Import OpenAI
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Create a detailed prompt for the product image
      const basePrompt = `A professional, high-quality product photograph of ${productName}`;
      const detailedPrompt = description 
        ? `${basePrompt}. ${description}. Clean white background, studio lighting, commercial photography style, sharp focus, realistic, appetizing if food, professional product shot`
        : `${basePrompt}. Clean white background, studio lighting, commercial photography style, sharp focus, realistic, appetizing if food, professional product shot`;

      console.log('Generating image with DALL-E prompt:', detailedPrompt);

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: detailedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      });

      const imageUrl = response.data[0].url;
      
      res.json({ 
        imageUrl,
        prompt: detailedPrompt 
      });

    } catch (error) {
      console.error("Error generating image with DALL-E:", error);
      res.status(500).json({ 
        message: "Failed to generate image", 
        error: error.message 
      });
    }
  });

  return httpServer;
}
function generatePayrollReceipt(stamp: any, employee: any): string {
  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(parseFloat(amount.toString()));
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-MX');
  };

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recibo de Nómina</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .company-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .receipt-title { font-size: 16px; font-weight: bold; margin-bottom: 20px; }
        .employee-info { margin-bottom: 20px; }
        .period-info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .amount { text-align: right; }
        .total-row { background-color: #f9f9f9; font-weight: bold; }
        .net-pay { background-color: #e8f5e8; font-weight: bold; font-size: 14px; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">CAJA SAS ENTERPRISE</div>
        <div class="receipt-title">RECIBO DE NÓMINA</div>
      </div>

      <div class="employee-info">
        <strong>Empleado:</strong> ${employee?.fullName || 'N/A'}<br>
        <strong>Número de Empleado:</strong> ${employee?.employeeNumber || 'N/A'}<br>
        <strong>RFC:</strong> ${employee?.rfc || 'N/A'}
      </div>

      <div class="period-info">
        <strong>Fecha de Nómina:</strong> ${formatDate(stamp.payrollDate)}<br>
        <strong>Período:</strong> ${formatDate(stamp.periodStart)} - ${formatDate(stamp.periodEnd)}
      </div>

      <table>
        <thead>
          <tr>
            <th colspan="2">PERCEPCIONES</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Salario Base</td>
            <td class="amount">${formatCurrency(stamp.baseSalary)}</td>
          </tr>
          <tr>
            <td>Tiempo Extra</td>
            <td class="amount">${formatCurrency(stamp.overtime)}</td>
          </tr>
          <tr>
            <td>Bonos</td>
            <td class="amount">${formatCurrency(stamp.bonuses)}</td>
          </tr>
          <tr>
            <td>Comisiones</td>
            <td class="amount">${formatCurrency(stamp.commissions)}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL PERCEPCIONES</td>
            <td class="amount">${formatCurrency(stamp.totalPerceptions)}</td>
          </tr>
        </tbody>
      </table>

      <table>
        <thead>
          <tr>
            <th colspan="2">DEDUCCIONES</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>IMSS</td>
            <td class="amount">${formatCurrency(stamp.imss)}</td>
          </tr>
          <tr>
            <td>ISR</td>
            <td class="amount">${formatCurrency(stamp.isr)}</td>
          </tr>
          <tr>
            <td>Préstamos</td>
            <td class="amount">${formatCurrency(stamp.loans)}</td>
          </tr>
          <tr>
            <td>Adelantos</td>
            <td class="amount">${formatCurrency(stamp.advances)}</td>
          </tr>
          <tr>
            <td>Otras Deducciones</td>
            <td class="amount">${formatCurrency(stamp.otherDeductions)}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL DEDUCCIONES</td>
            <td class="amount">${formatCurrency(stamp.totalDeductions)}</td>
          </tr>
        </tbody>
      </table>

      <table>
        <tbody>
          <tr class="net-pay">
            <td>NETO A PAGAR</td>
            <td class="amount">${formatCurrency(stamp.netPay)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 20px;">
        <strong>Asistencia del Período:</strong><br>
        Faltas: ${stamp.absences} días<br>
        Permisos: ${stamp.permissions} días<br>
        Vacaciones: ${stamp.vacations} días
      </div>

      <div class="footer">
        <p>Este recibo fue generado electrónicamente el ${formatDate(new Date())}</p>
        <p>CAJA SAS ENTERPRISE - Sistema de Gestión de Nóminas</p>
      </div>
    </body>
    </html>
  `;
}
