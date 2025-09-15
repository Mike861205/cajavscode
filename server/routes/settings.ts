import { Router } from "express";
import { storage } from "../storage";

const router = Router();

// Middleware to require authentication
const requireTenant = (req: any, res: any, next: any) => {
  if (!req.user || !req.user.tenantId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  req.tenantId = req.user.tenantId;
  next();
};

// Get system settings
router.get("/", requireTenant, async (req: any, res) => {
  try {
    const { tenantId } = req;
    console.log(`Getting system settings for tenant: ${tenantId}`);
    
    const settings = await storage.getSystemSettings(tenantId);
    res.json(settings);
  } catch (error) {
    console.error("Error getting system settings:", error);
    res.status(500).json({ error: "Failed to get system settings" });
  }
});

// Update system settings
router.put("/", requireTenant, async (req, res) => {
  try {
    const { tenantId } = req;
    console.log(`Updating system settings for tenant: ${tenantId}`, req.body);
    
    const settings = await storage.updateSystemSettings(tenantId, req.body);
    
    console.log(`✅ System settings updated for tenant: ${tenantId}`);
    res.json(settings);
  } catch (error) {
    console.error("Error updating system settings:", error);
    res.status(500).json({ error: "Failed to update system settings" });
  }
});

// Get available currencies
router.get("/currencies", async (req, res) => {
  try {
    console.log("Getting available currencies");
    const currencies = await storage.getCurrencies();
    res.json(currencies);
  } catch (error) {
    console.error("Error getting currencies:", error);
    res.status(500).json({ error: "Failed to get currencies" });
  }
});

// Create custom currency
router.post("/currencies", requireTenant, async (req, res) => {
  try {
    console.log("Adding custom currency:", req.body);
    
    const currency = await storage.createCurrency(req.body);
    
    console.log(`✅ Currency created: ${currency.code}`);
    res.json(currency);
  } catch (error) {
    console.error("Error creating currency:", error);
    res.status(500).json({ error: "Failed to create currency" });
  }
});

// Get timezones by country
router.get("/timezones/:country", async (req, res) => {
  try {
    const { country } = req.params;
    console.log(`Getting timezones for country: ${country}`);
    
    const timezones = await storage.getTimezonesByCountry(country);
    res.json(timezones);
  } catch (error) {
    console.error("Error getting timezones:", error);
    res.status(500).json({ error: "Failed to get timezones" });
  }
});

export default router;