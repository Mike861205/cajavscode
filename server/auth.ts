import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if the stored password contains a salt (new format)
  if (stored.includes(".")) {
    const [hashed, salt] = stored.split(".");
    if (!salt) {
      return false; // Invalid format
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } else {
    // Legacy password format - direct comparison (not recommended for production)
    // You may want to upgrade these passwords on successful login
    return supplied === stored;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'default-session-secret-for-demo',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // First create tenant with trial period
      const tenant = await storage.createTenant({
        name: req.body.businessName || req.body.fullName,
        subdomain: (req.body.businessName || req.body.fullName).toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
      });

      // Initialize system roles for the new tenant
      await storage.initializeSystemRoles(tenant.id);
      
      // Get the super admin role ID for the new tenant
      const roles = await storage.getUserRoles(tenant.id);
      const superAdminRole = roles.find(role => role.name === 'super_admin');

      // Generate business slug from business name
      const businessSlug = (req.body.businessName || req.body.fullName).toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now();

      const user = await storage.createUser({
        ...req.body,
        tenantId: tenant.id,
        roleId: superAdminRole?.id, // Assign super admin role to the first user
        isOwner: true, // Mark the first user as the tenant owner
        password: await hashPassword(req.body.password),
        phone: req.body.phone,
        country: req.body.country,
        businessSlug: businessSlug,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    try {
      // Check tenant status after successful authentication
      if (req.user && req.user.tenantId) {
        const tenant = await storage.getTenant(req.user.tenantId);
        
        if (tenant && tenant.status === 'suspended') {
          // Logout the user immediately
          req.logout((err) => {
            if (err) console.error("Error during logout:", err);
          });
          
          return res.status(403).json({ 
            message: "Licencia pausada por falta de pago. Serás redireccionado a los planes de pagos para actualizar tu licencia activa.",
            redirectTo: "/subscription-plans",
            suspended: true
          });
        }
      }
      
      res.status(200).json(req.user);
    } catch (error) {
      console.error("Error checking tenant status during login:", error);
      res.status(200).json(req.user); // Continue with login if check fails
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}
