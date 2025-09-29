import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

import { seedCurrencies } from "./seedCurrencies";

(async () => {
  try {
    log("🚀 Starting application initialization...");
    
    // Initialize default currencies
    log("💰 Initializing default currencies...");
    await seedCurrencies();
    log("✅ Default currencies initialized successfully");
    
    // Initialize image persistence system
    log("🖼️ Initializing image persistence system...");
    const { ImagePersistenceMiddleware } = await import("./middleware/image-persistence");
    await ImagePersistenceMiddleware.initializePersistence();
    log("✅ Image persistence system initialized successfully");
    
    // Register routes and setup server
    log("🛣️ Registering routes and setting up server...");
    const server = await registerRoutes(app);
    log("✅ Routes registered successfully");

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log(`❌ Application error: ${status} - ${message}`);
      log(`📍 Error stack: ${err.stack || 'No stack trace available'}`);
      
      if (!res.headersSent) {
        res.status(status).json({ message });
      }
      
      // Log error but don't rethrow to prevent process crashes
    });

    // Setup Vite or static serving
    if (app.get("env") === "development") {
      log("🔧 Setting up Vite development server...");
      await setupVite(app, server);
      log("✅ Vite development server ready");
    } else {
      log("📦 Setting up static file serving...");
      serveStatic(app);
      log("✅ Static file serving ready");
    }

    // Start the server
    const port = parseInt(process.env.PORT || '4000', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    log(`🌍 Starting server on ${host}:${port}...`);
    log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    server.listen(port, host, () => {
      log(`✅ Server successfully started and listening on port ${port}`);
      log(`🌟 Application is now ready to accept connections`);
      log(`🔗 Health check available at: http://${host}:${port}/health`);
      log(`🏠 Application URL: http://${host}:${port}`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      log(`💥 Server error: ${error.message}`);
      if (error.code === 'EADDRINUSE') {
        log(`❌ Port ${port} is already in use. Please free the port and restart.`);
      } else if (error.code === 'EACCES') {
        log(`❌ Permission denied. Cannot bind to port ${port}.`);
      }
      throw error;
    });

  } catch (error) {
    log(`💥 Fatal error during application startup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    log(`📍 Stack trace: ${error instanceof Error ? error.stack : 'No stack trace available'}`);
    process.exit(1);
  }
})();
