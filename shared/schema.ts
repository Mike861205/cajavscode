import { pgTable, text, serial, integer, boolean, decimal, numeric, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenants table for multi-tenancy
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  plan: text("plan").notNull().default("trial"), // trial, basic, pro, professional, enterprise
  status: text("status").notNull().default("trial"), // trial, active, suspended, cancelled, expired
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Manual renewals table for tracking revenue
export const manualRenewals = pgTable("manual_renewals", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  planType: text("plan_type").notNull(), // basic, pro, professional, enterprise
  planDuration: text("plan_duration").notNull(), // monthly, yearly
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  period: text("period").notNull(), // Original period string like 'basic_monthly'
  notes: text("notes"),
  renewedBy: text("renewed_by").notNull(),
  renewalDate: timestamp("renewal_date").defaultNow().notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System settings for timezone and currency configuration
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  timezone: text("timezone").notNull().default("America/Mexico_City"), // IANA timezone identifier
  country: text("country").notNull().default("MX"), // ISO country code
  currency: text("currency").notNull().default("MXN"), // ISO currency code
  currencySymbol: text("currency_symbol").notNull().default("$"), // Currency symbol
  currencyName: text("currency_name").notNull().default("Peso Mexicano"), // Full currency name
  dateFormat: text("date_format").notNull().default("DD/MM/YYYY"), // Date display format
  timeFormat: text("time_format").notNull().default("24h"), // 12h or 24h
  decimalPlaces: integer("decimal_places").notNull().default(2), // Currency decimal places
  thousandsSeparator: text("thousands_separator").notNull().default(","), // Thousands separator
  decimalSeparator: text("decimal_separator").notNull().default("."), // Decimal separator
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Available currencies master table
export const currencies = pgTable("currencies", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // ISO currency code (USD, EUR, MXN, VES)
  name: text("name").notNull(), // Full currency name
  symbol: text("symbol").notNull(), // Currency symbol ($, €, Bs.)
  symbolPosition: text("symbol_position").notNull().default("before"), // before or after
  decimalPlaces: integer("decimal_places").notNull().default(2),
  country: text("country").notNull(), // Primary country
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User roles definition
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // super_admin, admin, manager, sales
  displayName: text("display_name").notNull(),
  description: text("description"),
  permissions: text("permissions").array().notNull(), // Array of permission strings
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  isSystemRole: boolean("is_system_role").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table with enhanced role management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  businessName: text("business_name").notNull(),
  businessSlug: text("business_slug").notNull().unique(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  roleId: integer("role_id").references(() => userRoles.id),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  isActive: boolean("is_active").notNull().default(true),
  isOwner: boolean("is_owner").notNull().default(false), // True for the tenant owner
  lastLogin: timestamp("last_login"),
  passwordChangedAt: timestamp("password_changed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Product categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Products table with decimal quantity support and unit types
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  stock: decimal("stock", { precision: 10, scale: 3 }).notNull().default("0"), // Changed to decimal for fractional quantities
  realStock: decimal("real_stock", { precision: 10, scale: 3 }).notNull().default("0"), // Changed to decimal
  minStock: decimal("min_stock", { precision: 10, scale: 3 }).notNull().default("5"), // Changed to decimal
  unitType: text("unit_type").notNull().default("piece"), // piece, kg, gram, liter, ml, meter, cm, etc.
  allowDecimals: boolean("allow_decimals").notNull().default(false), // true allows fractional quantities
  saleUnit: decimal("sale_unit", { precision: 10, scale: 3 }).notNull().default("1"), // Unit of sale (e.g., 0.5 kg when stock is in kg)
  saleUnitName: text("sale_unit_name").default("unidad"), // Name for the sale unit (e.g., "medio kilo", "gramo", etc.)
  saleUnitPrice: decimal("sale_unit_price", { precision: 10, scale: 2 }), // Price for the sale unit (e.g., $200 for 0.5 kg)
  categoryId: integer("category_id").references(() => categories.id),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("active"), // active, inactive, deleted
  isComposite: boolean("is_composite").notNull().default(false), // true if product is composite
  isConjunto: boolean("is_conjunto").notNull().default(false), // true if product has weight variants
  sortOrder: integer("sort_order").notNull().default(0), // Para ordenamiento manual en POS
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Product weight variants table for conjunto products
export const productWeightVariants = pgTable("product_weight_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  weight: decimal("weight", { precision: 10, scale: 3 }).notNull(), // 1.000, 0.500, 0.250
  unit: text("unit").notNull().default("kg"), // kg, g, lb, oz
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // $390, $240, $140
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(), // Cost for this weight
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"), // Discount amount
  label: text("label").notNull(), // "1 kg", "0.500 kg", "0.250 kg"
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Product costs table for detailed cost analysis
export const productCosts = pgTable("product_costs", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  materialCost: decimal("material_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  laborCost: decimal("labor_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  overheadCost: decimal("overhead_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  packagingCost: decimal("packaging_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  otherCosts: decimal("other_costs", { precision: 10, scale: 2 }).notNull().default("0"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product cost ingredients table for detailed ingredient analysis
export const productCostIngredients = pgTable("product_cost_ingredients", {
  id: serial("id").primaryKey(),
  productCostId: integer("product_cost_id").references(() => productCosts.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull(), // kg, g, pcs, ml, l
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  category: text("category").default("ingredient"), // ingredient, packaging, labor, overhead
  notes: text("notes"),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Product nutrition table for nutritional information
export const productNutrition = pgTable("product_nutrition", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  calories: decimal("calories", { precision: 10, scale: 2 }).default("0"),
  protein: decimal("protein", { precision: 10, scale: 2 }).default("0"), // grams
  carbs: decimal("carbs", { precision: 10, scale: 2 }).default("0"), // grams
  fat: decimal("fat", { precision: 10, scale: 2 }).default("0"), // grams
  fiber: decimal("fiber", { precision: 10, scale: 2 }).default("0"), // grams
  sugar: decimal("sugar", { precision: 10, scale: 2 }).default("0"), // grams
  sodium: decimal("sodium", { precision: 10, scale: 2 }).default("0"), // mg
  servingSize: text("serving_size").default("100g"),
  additionalInfo: text("additional_info"),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Product preparation process table
export const productPreparation = pgTable("product_preparation", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  stepNumber: integer("step_number").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").default(0), // minutes
  temperature: integer("temperature").default(0), // celsius
  equipment: text("equipment"),
  notes: text("notes"),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueProductStep: unique().on(table.productId, table.stepNumber, table.tenantId),
}));

// Product components table for composite products with decimal support
export const productComponents = pgTable("product_components", {
  id: serial("id").primaryKey(),
  parentProductId: integer("parent_product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  componentProductId: integer("component_product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull().default("1"), // Changed to decimal
  cost: decimal("cost", { precision: 10, scale: 2 }),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueParentComponent: unique().on(table.parentProductId, table.componentProductId),
}));

// Sales transactions - EXACT DB STRUCTURE
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id"),
  customerName: text("customer_name"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  ticketTitle: text("ticket_title"), // For identifying customer/order
  cashRegisterId: integer("cash_register_id"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: integer("user_id"),
  status: text("status").default("completed"),
  notes: text("notes"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  warehouseId: integer("warehouse_id"),
});

// Sale items with decimal quantity support
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id"),
  productId: integer("product_id"),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(), // Changed to decimal
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  tenantId: uuid("tenant_id"),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
});

// Sale payments table for multiple payment methods per sale
export const salePayments = pgTable("sale_payments", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
  paymentMethod: text("payment_method").notNull(), // cash, card, transfer, credit, etc.
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("MXN"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }).notNull().default("1"),
  reference: text("reference"), // Authorization number, reference, etc.
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Suppliers for purchases module
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Purchase orders
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, received, cancelled
  supplierId: integer("supplier_id").references(() => suppliers.id),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Purchase items with decimal quantity support
export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id").references(() => purchases.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(), // Changed to decimal
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  products: many(products),
  categories: many(categories),
  sales: many(sales),
  suppliers: many(suppliers),
  purchases: many(purchases),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  sales: many(sales),
  purchases: many(purchases),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  tenant: one(tenants, { fields: [categories.tenantId], references: [tenants.id] }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, { fields: [products.tenantId], references: [tenants.id] }),
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems),
  components: many(productComponents, { relationName: "parentProduct" }),
  parentProducts: many(productComponents, { relationName: "componentProduct" }),
  weightVariants: many(productWeightVariants),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  tenant: one(tenants, { fields: [sales.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [sales.userId], references: [users.id] }),
  items: many(saleItems),
  payments: many(salePayments),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

export const salePaymentsRelations = relations(salePayments, ({ one }) => ({
  sale: one(sales, { fields: [salePayments.saleId], references: [sales.id] }),
  tenant: one(tenants, { fields: [salePayments.tenantId], references: [tenants.id] }),
}));

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  tenant: one(tenants, { fields: [suppliers.tenantId], references: [tenants.id] }),
  purchases: many(purchases),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  tenant: one(tenants, { fields: [purchases.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [purchases.userId], references: [users.id] }),
  supplier: one(suppliers, { fields: [purchases.supplierId], references: [suppliers.id] }),
  items: many(purchaseItems),
}));

export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, { fields: [purchaseItems.purchaseId], references: [purchases.id] }),
  product: one(products, { fields: [purchaseItems.productId], references: [products.id] }),
}));

export const productComponentsRelations = relations(productComponents, ({ one }) => ({
  parentProduct: one(products, { 
    fields: [productComponents.parentProductId], 
    references: [products.id],
    relationName: "parentProduct"
  }),
  componentProduct: one(products, { 
    fields: [productComponents.componentProductId], 
    references: [products.id],
    relationName: "componentProduct"
  }),
  tenant: one(tenants, { fields: [productComponents.tenantId], references: [tenants.id] }),
}));

// Product weight variants relations
export const productWeightVariantsRelations = relations(productWeightVariants, ({ one }) => ({
  product: one(products, {
    fields: [productWeightVariants.productId],
    references: [products.id],
  }),
  tenant: one(tenants, {
    fields: [productWeightVariants.tenantId],
    references: [tenants.id],
  }),
}));

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export const insertLegacyUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  tenantId: true,
  businessSlug: true,
}).extend({
  businessName: z.string().min(2, "El nombre del negocio debe tener al menos 2 caracteres").max(100),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

// Unit type enum for products
export const unitTypeEnum = [
  'piece', 'kg', 'gram', 'liter', 'ml', 'meter', 'cm', 'pound', 'ounce', 'box', 'pack'
] as const;

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
}).extend({
  unitType: z.enum(unitTypeEnum).default('piece'),
  allowDecimals: z.boolean().default(false),
  stock: z.string().optional().default("0"),
  realStock: z.string().optional().default("0"),
  minStock: z.string().optional().default("5"),
  saleUnit: z.string().optional().default("1"),
  saleUnitName: z.string().optional().default("unidad"),
  price: z.string().min(1, "El precio es requerido"),
  cost: z.string().optional(),
  sku: z.string().min(1, "El SKU es requerido"),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  categoryId: z.number().optional(),
  imageUrl: z.string().optional(),
  status: z.string().optional().default("active"),
  isComposite: z.boolean().optional().default(false),
  sortOrder: z.number().optional().default(0),
  isConjunto: z.boolean().optional().default(false),
});

// Product weight variants schema
export const insertProductWeightVariantSchema = createInsertSchema(productWeightVariants).omit({
  id: true,
  createdAt: true,
  tenantId: true,
}).extend({
  weight: z.string().min(1, "El peso es requerido"),
  price: z.string().min(1, "El precio es requerido"),
  cost: z.string().min(1, "El costo es requerido"),
  discount: z.string().optional().default("0"),
  label: z.string().min(1, "La etiqueta es requerida"),
  unit: z.string().default("kg"),
  sortOrder: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const insertProductComponentSchema = createInsertSchema(productComponents).omit({
  id: true,
  createdAt: true,
}).extend({
  quantity: z.string().transform(val => val || "1"),
});

export const insertProductCostSchema = createInsertSchema(productCosts).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductCostIngredientSchema = createInsertSchema(productCostIngredients).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertProductNutritionSchema = createInsertSchema(productNutrition).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertProductPreparationSchema = createInsertSchema(productPreparation).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({
  id: true,
}).extend({
  quantity: z.string().transform(val => val || "1"),
});

export const insertSalePaymentSchema = createInsertSchema(salePayments).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
});

export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({
  id: true,
}).extend({
  quantity: z.string().transform(val => val || "1"),
});

// Cash register tables
export const cashRegisters = pgTable("cash_registers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  openingAmount: decimal("opening_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 10, scale: 2 }).default("0"),
  closingAmount: decimal("closing_amount", { precision: 10, scale: 2 }).default("0"),
  isOpen: boolean("is_open").default(false),
  status: text("status").notNull().default("closed"), // open, closed
  openedAt: timestamp("opened_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cashTransactions = pgTable("cash_transactions", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  cashRegisterId: integer("cash_register_id").references(() => cashRegisters.id).notNull(),
  type: text("type").notNull(), // opening, expense, withdrawal, sale
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reference: text("reference"),
  category: text("category"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cashRegisterRelations = relations(cashRegisters, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [cashRegisters.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [cashRegisters.userId],
    references: [users.id],
  }),
  transactions: many(cashTransactions),
}));

export const cashTransactionRelations = relations(cashTransactions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [cashTransactions.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [cashTransactions.userId],
    references: [users.id],
  }),
  cashRegister: one(cashRegisters, {
    fields: [cashTransactions.cashRegisterId],
    references: [cashRegisters.id],
  }),
}));

export const insertCashRegisterSchema = createInsertSchema(cashRegisters).omit({
  id: true,
  openedAt: true,
  closedAt: true,
  createdAt: true,
});

export const insertCashTransactionSchema = createInsertSchema(cashTransactions).omit({
  id: true,
  createdAt: true,
});

// Inventory Records table
export const inventoryRecords = pgTable("inventory_records", {
  id: text("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull().defaultNow(),
  products: text("products").notNull(),
  totalProducts: integer("total_products").notNull().default(0),
  totalVariances: integer("total_variances").notNull().default(0),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  warehouseId: integer("warehouse_id").references(() => warehouses.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventoryRecordsRelations = relations(inventoryRecords, ({ one }) => ({
  tenant: one(tenants, {
    fields: [inventoryRecords.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [inventoryRecords.userId],
    references: [users.id],
  }),
}));

export const insertInventoryRecordSchema = createInsertSchema(inventoryRecords);

// Subscriptions table for tracking payment history
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  plan: text("plan").notNull(), // basic, pro, professional, enterprise
  interval: text("interval").notNull(), // month, year
  status: text("status").notNull().default("active"), // active, cancelled, past_due
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, { fields: [subscriptions.tenantId], references: [tenants.id] }),
}));

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;



// User roles relations
export const userRolesRelations = relations(userRoles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [userRoles.tenantId],
    references: [tenants.id],
  }),
  users: many(users),
}));



// User roles schemas
export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true,
});

export const updateUserRoleSchema = insertUserRoleSchema.partial();

// Enhanced user schemas (corrected position)
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
  passwordChangedAt: true,
});

export const updateUserSchema = insertUserSchema.partial().omit({
  password: true,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Contraseña actual requerida"),
  newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmación de contraseña requerida"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

// Types
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductComponent = typeof productComponents.$inferSelect;
export type InsertProductComponent = z.infer<typeof insertProductComponentSchema>;

// TIENDA ONLINE TABLES
// Store settings for each tenant's online store
export const storeSettings = pgTable("store_settings", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  storeName: text("store_name").notNull(),
  storeSubdomain: text("store_subdomain").notNull().unique(), // ejemplo: daddypollo
  customDomain: text("custom_domain"), // opcional: daddypollo.com
  storeDescription: text("store_description"),
  storeTheme: text("store_theme").notNull().default("default"), // default, modern, minimal
  isActive: boolean("is_active").notNull().default(true),
  allowOnlineOrders: boolean("allow_online_orders").notNull().default(true),
  
  // Payment gateway settings
  stripeEnabled: boolean("stripe_enabled").notNull().default(false),
  stripePublicKey: text("stripe_public_key"),
  stripeSecretKey: text("stripe_secret_key"),
  
  paypalEnabled: boolean("paypal_enabled").notNull().default(false),
  paypalClientId: text("paypal_client_id"),
  paypalClientSecret: text("paypal_client_secret"),
  
  mercadopagoEnabled: boolean("mercadopago_enabled").notNull().default(false),
  mercadopagoAccessToken: text("mercadopago_access_token"),
  mercadopagoPublicKey: text("mercadopago_public_key"),
  
  bankTransferEnabled: boolean("bank_transfer_enabled").notNull().default(true),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountHolder: text("bank_account_holder"),
  
  // Store contact info
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  storeAddress: text("store_address"),
  
  // WhatsApp configuration
  whatsappEnabled: boolean("whatsapp_enabled").notNull().default(false),
  whatsappNumber: text("whatsapp_number"),
  whatsappMessage: text("whatsapp_message").default("¡Hola! Me interesa conocer más sobre sus productos."),
  
  // Store branding and design
  storeLogo: text("store_logo"), // URL to logo image
  storeBanner: text("store_banner"), // URL to banner image
  storeBackgroundImage: text("store_background_image"), // URL to background image
  backgroundOpacity: integer("background_opacity").default(80), // Background opacity 0-100%
  favicon: text("favicon"), // URL to favicon image
  primaryColor: text("primary_color").default("#3b82f6"), // Store primary color
  secondaryColor: text("secondary_color").default("#64748b"), // Store secondary color
  
  // Advanced design options
  headerStyle: text("header_style").default("modern"), // modern, classic, minimal
  layoutStyle: text("layout_style").default("grid"), // grid, list, card
  showBrandOnFavicon: boolean("show_brand_on_favicon").default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Online store customers (different from POS customers)
export const storeCustomers = pgTable("store_customers", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  
  // Shipping address
  shippingAddress: text("shipping_address"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingZipCode: text("shipping_zip_code"),
  shippingCountry: text("shipping_country").notNull().default("MX"),
  
  // Billing address (opcional)
  billingAddress: text("billing_address"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZipCode: text("billing_zip_code"),
  billingCountry: text("billing_country"),
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueEmailPerTenant: unique().on(table.tenantId, table.email),
}));

// Online store orders
export const storeOrders = pgTable("store_orders", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  customerId: integer("customer_id").references(() => storeCustomers.id).notNull(),
  orderNumber: text("order_number").notNull().unique(), // ORD-2025-0001
  
  // Order totals
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  shipping: decimal("shipping", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  
  // Order status
  status: text("status").notNull().default("pending"), // pending, paid, processing, shipped, delivered, cancelled
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, failed, refunded
  paymentMethod: text("payment_method"), // stripe, paypal, mercadopago, bank_transfer
  paymentReference: text("payment_reference"), // Transaction ID from payment gateway
  
  // Shipping info
  shippingMethod: text("shipping_method").notNull().default("pickup"), // pickup, delivery, shipping
  shippingAddress: text("shipping_address"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingZipCode: text("shipping_zip_code"),
  shippingCountry: text("shipping_country").notNull().default("MX"),
  trackingNumber: text("tracking_number"),
  
  // Customer notes
  customerNotes: text("customer_notes"),
  internalNotes: text("internal_notes"),
  
  // Timestamps
  orderDate: timestamp("order_date").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Online store order items
export const storeOrderItems = pgTable("store_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => storeOrders.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  
  productName: text("product_name").notNull(), // Snapshot del nombre del producto
  productSku: text("product_sku"), // Snapshot del SKU
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for store tables
export const storeSettingsRelations = relations(storeSettings, ({ one }) => ({
  tenant: one(tenants, {
    fields: [storeSettings.tenantId],
    references: [tenants.id],
  }),
}));

export const storeCustomersRelations = relations(storeCustomers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [storeCustomers.tenantId],
    references: [tenants.id],
  }),
  orders: many(storeOrders),
}));

export const storeOrdersRelations = relations(storeOrders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [storeOrders.tenantId],
    references: [tenants.id],
  }),
  customer: one(storeCustomers, {
    fields: [storeOrders.customerId],
    references: [storeCustomers.id],
  }),
  items: many(storeOrderItems),
}));

export const storeOrderItemsRelations = relations(storeOrderItems, ({ one }) => ({
  order: one(storeOrders, {
    fields: [storeOrderItems.orderId],
    references: [storeOrders.id],
  }),
  product: one(products, {
    fields: [storeOrderItems.productId],
    references: [products.id],
  }),
  tenant: one(tenants, {
    fields: [storeOrderItems.tenantId],
    references: [tenants.id],
  }),
}));

// Zod schemas for store tables
export const insertStoreSettingsSchema = createInsertSchema(storeSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreCustomerSchema = createInsertSchema(storeCustomers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreOrderSchema = createInsertSchema(storeOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreOrderItemSchema = createInsertSchema(storeOrderItems).omit({
  id: true,
  createdAt: true,
});

// Types for store tables
export type StoreSettings = typeof storeSettings.$inferSelect;
export type InsertStoreSettings = z.infer<typeof insertStoreSettingsSchema>;

// Store products - Para gestionar qué productos aparecen en la tienda online
export const storeProducts = pgTable("store_products", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueTenantProduct: unique().on(table.tenantId, table.productId),
}));

// Store categories - Para gestionar qué categorías aparecen en la tienda online
export const storeCategories = pgTable("store_categories", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  categoryName: text("category_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueTenantCategory: unique().on(table.tenantId, table.categoryName),
}));

// Store products relations
export const storeProductsRelations = relations(storeProducts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [storeProducts.tenantId],
    references: [tenants.id],
  }),
  product: one(products, {
    fields: [storeProducts.productId],
    references: [products.id],
  }),
}));

// Store categories relations
export const storeCategoriesRelations = relations(storeCategories, ({ one }) => ({
  tenant: one(tenants, {
    fields: [storeCategories.tenantId],
    references: [tenants.id],
  }),
}));

// Store products schemas
export const insertStoreProductSchema = createInsertSchema(storeProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Store categories schemas
export const insertStoreCategorySchema = createInsertSchema(storeCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type StoreProduct = typeof storeProducts.$inferSelect;
export type InsertStoreProduct = z.infer<typeof insertStoreProductSchema>;
export type StoreCategory = typeof storeCategories.$inferSelect;
export type InsertStoreCategory = z.infer<typeof insertStoreCategorySchema>;

export type StoreCustomer = typeof storeCustomers.$inferSelect;
export type InsertStoreCustomer = z.infer<typeof insertStoreCustomerSchema>;

export type StoreOrder = typeof storeOrders.$inferSelect;
export type InsertStoreOrder = z.infer<typeof insertStoreOrderSchema>;

export type StoreOrderItem = typeof storeOrderItems.$inferSelect;
export type InsertStoreOrderItem = z.infer<typeof insertStoreOrderItemSchema>;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;

export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;

export type CashRegister = typeof cashRegisters.$inferSelect;
export type InsertCashRegister = z.infer<typeof insertCashRegisterSchema>;

export type CashTransaction = typeof cashTransactions.$inferSelect;
export type InsertCashTransaction = z.infer<typeof insertCashTransactionSchema>;

export type InventoryRecord = typeof inventoryRecords.$inferSelect;
export type InsertInventoryRecord = z.infer<typeof insertInventoryRecordSchema>;

// Customers table for Clientes module
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  state: text("state"), // Estado
  rfc: text("rfc"),
  creditAvailable: decimal("credit_available", { precision: 10, scale: 2 }).default("0.00").notNull(), // Crédito disponible
  creditUsed: decimal("credit_used", { precision: 10, scale: 2 }).default("0.00").notNull(), // Crédito usado
  creditEligible: boolean("credit_eligible").default(true).notNull(), // Elegibilidad para crédito
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customersRelations = relations(customers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
}));

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// Warehouses table for Sucursales module
export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  rfc: text("rfc"),
  taxRegime: text("tax_regime"), // Regimen Fiscal
  commercialName: text("commercial_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const warehousesRelations = relations(warehouses, ({ one }) => ({
  tenant: one(tenants, {
    fields: [warehouses.tenantId],
    references: [tenants.id],
  }),
}));

export const insertWarehouseSchema = createInsertSchema(warehouses).omit({
  id: true,
  createdAt: true,
});

export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;

// Product warehouse stock table
export const productWarehouseStock = pgTable("product_warehouse_stock", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  warehouseId: integer("warehouse_id").references(() => warehouses.id, { onDelete: "cascade" }).notNull(),
  stock: numeric("stock", { precision: 10, scale: 3 }).notNull().default("0"),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueProductWarehouse: unique().on(table.productId, table.warehouseId),
}));

export const productWarehouseStockRelations = relations(productWarehouseStock, ({ one }) => ({
  product: one(products, {
    fields: [productWarehouseStock.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [productWarehouseStock.warehouseId],
    references: [warehouses.id],
  }),
  tenant: one(tenants, {
    fields: [productWarehouseStock.tenantId],
    references: [tenants.id],
  }),
}));

export const insertProductWarehouseStockSchema = createInsertSchema(productWarehouseStock).omit({
  id: true,
  createdAt: true,
});

export type ProductWarehouseStock = typeof productWarehouseStock.$inferSelect;
export type InsertProductWarehouseStock = z.infer<typeof insertProductWarehouseStockSchema>;

export type ProductWeightVariant = typeof productWeightVariants.$inferSelect;
export type InsertProductWeightVariant = z.infer<typeof insertProductWeightVariantSchema>;

export type SalePayment = typeof salePayments.$inferSelect;
export type InsertSalePayment = z.infer<typeof insertSalePaymentSchema>;

// Departments table for organizational structure
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Job positions table for HR management
export const jobPositions = pgTable("job_positions", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  name: text("name").notNull(),
  description: text("description"),
  level: text("level"), // junior, mid, senior, manager, director, etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employees table for payroll management
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  employeeNumber: text("employee_number").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  rfc: text("rfc"), // RFC (Registro Federal de Contribuyentes)
  curp: text("curp"), // CURP (Clave Única de Registro de Población)
  nss: text("nss"), // NSS (Número de Seguridad Social)
  position: text("position").notNull(),
  department: text("department"),
  birthDate: timestamp("birth_date"),
  hireDate: timestamp("hire_date").notNull(),
  terminationDate: timestamp("termination_date"),
  salary: decimal("salary", { precision: 10, scale: 2 }).notNull(),
  salaryType: text("salary_type").notNull().default("monthly"), // monthly, biweekly, weekly, daily
  bankAccount: text("bank_account"),
  bankName: text("bank_name"),
  clabe: text("clabe"), // CLABE interbancaria
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueEmployeeNumber: unique().on(table.tenantId, table.employeeNumber),
}));

// Payroll periods table
export const payrollPeriods = pgTable("payroll_periods", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(), // e.g., "Enero 2025 - Primera Quincena"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  payDate: timestamp("pay_date").notNull(),
  periodType: text("period_type").notNull().default("biweekly"), // monthly, biweekly, weekly
  status: text("status").notNull().default("draft"), // draft, calculated, paid, closed
  totalGross: decimal("total_gross", { precision: 12, scale: 2 }).default("0"),
  totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 }).default("0"),
  totalNet: decimal("total_net", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Individual payroll records
export const payrollRecords = pgTable("payroll_records", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  payrollPeriodId: integer("payroll_period_id").references(() => payrollPeriods.id).notNull(),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  overtime: decimal("overtime", { precision: 10, scale: 2 }).default("0"),
  bonuses: decimal("bonuses", { precision: 10, scale: 2 }).default("0"),
  commissions: decimal("commissions", { precision: 10, scale: 2 }).default("0"),
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }).notNull(),
  taxDeductions: decimal("tax_deductions", { precision: 10, scale: 2 }).default("0"),
  socialSecurityDeductions: decimal("social_security_deductions", { precision: 10, scale: 2 }).default("0"),
  otherDeductions: decimal("other_deductions", { precision: 10, scale: 2 }).default("0"),
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).default("0"),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  daysWorked: integer("days_worked").default(0),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
  status: text("status").notNull().default("calculated"), // calculated, paid
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tabla para registros de nómina timbrados
export const payrollStamps = pgTable("payroll_stamps", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  payrollDate: timestamp("payroll_date").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  absences: integer("absences").default(0),
  permissions: integer("permissions").default(0),
  vacations: integer("vacations").default(0),
  // Percepciones
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  overtime: decimal("overtime", { precision: 10, scale: 2 }).default("0"),
  bonuses: decimal("bonuses", { precision: 10, scale: 2 }).default("0"),
  commissions: decimal("commissions", { precision: 10, scale: 2 }).default("0"),
  // Deducciones
  imss: decimal("imss", { precision: 10, scale: 2 }).default("0"),
  isr: decimal("isr", { precision: 10, scale: 2 }).default("0"),
  loans: decimal("loans", { precision: 10, scale: 2 }).default("0"),
  advances: decimal("advances", { precision: 10, scale: 2 }).default("0"),
  otherDeductions: decimal("other_deductions", { precision: 10, scale: 2 }).default("0"),
  // Totales
  totalPerceptions: decimal("total_perceptions", { precision: 10, scale: 2 }).notNull(),
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).notNull(),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations for departments
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [departments.tenantId],
    references: [tenants.id],
  }),
  jobPositions: many(jobPositions),
  employees: many(employees),
}));

// Relations for job positions
export const jobPositionsRelations = relations(jobPositions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [jobPositions.tenantId],
    references: [tenants.id],
  }),
  department: one(departments, {
    fields: [jobPositions.departmentId],
    references: [departments.id],
  }),
  employees: many(employees),
}));

// Relations for employees
export const employeesRelations = relations(employees, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [employees.tenantId],
    references: [tenants.id],
  }),
  department: one(departments, {
    fields: [employees.department],
    references: [departments.name],
  }),
  jobPosition: one(jobPositions, {
    fields: [employees.position],
    references: [jobPositions.name],
  }),
  payrollRecords: many(payrollRecords),
}));

// Relations for payroll periods
export const payrollPeriodsRelations = relations(payrollPeriods, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [payrollPeriods.tenantId],
    references: [tenants.id],
  }),
  payrollRecords: many(payrollRecords),
}));

// Relations for payroll records
export const payrollRecordsRelations = relations(payrollRecords, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payrollRecords.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [payrollRecords.employeeId],
    references: [employees.id],
  }),
  payrollPeriod: one(payrollPeriods, {
    fields: [payrollRecords.payrollPeriodId],
    references: [payrollPeriods.id],
  }),
}));

// Relations for payroll stamps
export const payrollStampsRelations = relations(payrollStamps, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payrollStamps.tenantId],
    references: [tenants.id],
  }),
  employee: one(employees, {
    fields: [payrollStamps.employeeId],
    references: [employees.id],
  }),
}));

// Zod schemas for departments
export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Zod schemas for job positions  
export const insertJobPositionSchema = createInsertSchema(jobPositions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Zod schemas for employees
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayrollPeriodSchema = createInsertSchema(payrollPeriods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayrollRecordSchema = createInsertSchema(payrollRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayrollStampSchema = createInsertSchema(payrollStamps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type JobPosition = typeof jobPositions.$inferSelect;
export type InsertJobPosition = z.infer<typeof insertJobPositionSchema>;

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type InsertPayrollPeriod = z.infer<typeof insertPayrollPeriodSchema>;

export type PayrollRecord = typeof payrollRecords.$inferSelect;
export type InsertPayrollRecord = z.infer<typeof insertPayrollRecordSchema>;

export type PayrollStamp = typeof payrollStamps.$inferSelect;
export type InsertPayrollStamp = z.infer<typeof insertPayrollStampSchema>;

// Appointments table for booking system
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  subject: text("subject").notNull(),
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentTime: text("appointment_time").notNull(), // Format: "HH:MM"
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Appointment products (many-to-many relationship)
export const appointmentProducts = pgTable("appointment_products", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  appointmentId: integer("appointment_id").references(() => appointments.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for appointments
export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [appointments.tenantId],
    references: [tenants.id],
  }),
  appointmentProducts: many(appointmentProducts),
}));

// Relations for appointment products
export const appointmentProductsRelations = relations(appointmentProducts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [appointmentProducts.tenantId],
    references: [tenants.id],
  }),
  appointment: one(appointments, {
    fields: [appointmentProducts.appointmentId],
    references: [appointments.id],
  }),
  product: one(products, {
    fields: [appointmentProducts.productId],
    references: [products.id],
  }),
}));

// Zod schemas for appointments
export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppointmentProductSchema = createInsertSchema(appointmentProducts).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

// Types
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type AppointmentProduct = typeof appointmentProducts.$inferSelect;
export type InsertAppointmentProduct = z.infer<typeof insertAppointmentProductSchema>;

// Manual renewal types
export const insertManualRenewalSchema = createInsertSchema(manualRenewals).omit({
  id: true,
  createdAt: true,
});
export type InsertManualRenewal = z.infer<typeof insertManualRenewalSchema>;
export type ManualRenewal = typeof manualRenewals.$inferSelect;

// Loan clients table for loan management system
export const loanClients = pgTable("loan_clients", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  company: text("company"),
  yearsExperience: integer("years_experience"), // Antigüedad laboral
  monthlyIncome: decimal("monthly_income", { precision: 10, scale: 2 }), // Sueldo mensual aproximado
  monthlyExpenses: decimal("monthly_expenses", { precision: 10, scale: 2 }), // Gastos mensuales aproximados
  personalReferences: text("personal_references"), // JSON string with personal references
  status: text("status").notNull().default("active"), // active, inactive
  creditStatus: text("credit_status").default("pending"), // pending, approved, rejected
  approvedAmount: decimal("approved_amount", { precision: 10, scale: 2 }),
  loanTermMonths: integer("loan_term_months"),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  monthlyPayment: decimal("monthly_payment", { precision: 10, scale: 2 }),
  debtToIncomeRatio: decimal("debt_to_income_ratio", { precision: 5, scale: 2 }),
  creditScore: integer("credit_score"),
  approvalNotes: text("approval_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Personal references table (normalized approach for better querying)
export const personalReferences = pgTable("personal_references", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  loanClientId: integer("loan_client_id").references(() => loanClients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Amortization table for loan payment schedules
export const amortizationSchedules = pgTable("amortization_schedules", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  loanClientId: integer("loan_client_id").references(() => loanClients.id, { onDelete: "cascade" }).notNull(),
  paymentNumber: integer("payment_number").notNull(),
  paymentDate: text("payment_date").notNull(),
  beginningBalance: decimal("beginning_balance", { precision: 10, scale: 2 }).notNull(),
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }).notNull(),
  principalAmount: decimal("principal_amount", { precision: 10, scale: 2 }).notNull(),
  interestAmount: decimal("interest_amount", { precision: 10, scale: 2 }).notNull(),
  endingBalance: decimal("ending_balance", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for loan clients
export const loanClientsRelations = relations(loanClients, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [loanClients.tenantId],
    references: [tenants.id],
  }),
  references: many(personalReferences),
  amortizationSchedule: many(amortizationSchedules),
}));

// Relations for personal references
export const personalReferencesRelations = relations(personalReferences, ({ one }) => ({
  tenant: one(tenants, {
    fields: [personalReferences.tenantId],
    references: [tenants.id],
  }),
  loanClient: one(loanClients, {
    fields: [personalReferences.loanClientId],
    references: [loanClients.id],
  }),
}));

// Relations for amortization schedules
export const amortizationSchedulesRelations = relations(amortizationSchedules, ({ one }) => ({
  tenant: one(tenants, {
    fields: [amortizationSchedules.tenantId],
    references: [tenants.id],
  }),
  loanClient: one(loanClients, {
    fields: [amortizationSchedules.loanClientId],
    references: [loanClients.id],
  }),
}));

// Zod schemas for loan clients
export const insertLoanClientSchema = createInsertSchema(loanClients).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPersonalReferenceSchema = createInsertSchema(personalReferences).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

// Types
export type LoanClient = typeof loanClients.$inferSelect;
export type InsertLoanClient = z.infer<typeof insertLoanClientSchema>;

export type PersonalReference = typeof personalReferences.$inferSelect;
export type InsertPersonalReference = z.infer<typeof insertPersonalReferenceSchema>;

// Zod schemas for amortization schedules
export const insertAmortizationScheduleSchema = createInsertSchema(amortizationSchedules).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export type AmortizationSchedule = typeof amortizationSchedules.$inferSelect;
export type InsertAmortizationSchedule = z.infer<typeof insertAmortizationScheduleSchema>;

// Promotions table
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // 'percentage', 'fixed_amount', 'buy_x_get_y', '2x1', 'bulk_discount'
  value: decimal("value", { precision: 10, scale: 2 }), // Percentage or fixed amount
  minQuantity: integer("min_quantity").default(1), // Minimum quantity to apply promotion
  maxQuantity: integer("max_quantity"), // Maximum quantity for promotion
  buyQuantity: integer("buy_quantity"), // For buy X get Y promotions
  getQuantity: integer("get_quantity"), // For buy X get Y promotions
  startDate: timestamp("start_date", { mode: 'string' }),
  endDate: timestamp("end_date", { mode: 'string' }),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(1), // Higher number = higher priority
  maxUses: integer("max_uses"), // Maximum uses of this promotion
  usedCount: integer("used_count").notNull().default(0),
  applyTo: text("apply_to").notNull().default("products"), // 'products', 'categories', 'all'
  stackable: boolean("stackable").notNull().default(false), // Can be combined with other promotions
  minPurchaseAmount: decimal("min_purchase_amount", { precision: 10, scale: 2 }).default("0"), // Minimum purchase amount to apply promotion
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Promotion products table (many-to-many relationship)
export const promotionProducts = pgTable("promotion_products", {
  id: serial("id").primaryKey(),
  promotionId: integer("promotion_id").references(() => promotions.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniquePromotionProduct: unique().on(table.promotionId, table.productId),
}));

// Promotion categories table (many-to-many relationship)
export const promotionCategories = pgTable("promotion_categories", {
  id: serial("id").primaryKey(),
  promotionId: integer("promotion_id").references(() => promotions.id, { onDelete: "cascade" }).notNull(),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniquePromotionCategory: unique().on(table.promotionId, table.categoryId),
}));

// Promotion usage history
export const promotionUsages = pgTable("promotion_usages", {
  id: serial("id").primaryKey(),
  promotionId: integer("promotion_id").references(() => promotions.id, { onDelete: "cascade" }).notNull(),
  saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(),
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Promotion relations
export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [promotions.tenantId],
    references: [tenants.id],
  }),
  promotionProducts: many(promotionProducts),
  promotionCategories: many(promotionCategories),
  promotionUsages: many(promotionUsages),
}));

export const promotionProductsRelations = relations(promotionProducts, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionProducts.promotionId],
    references: [promotions.id],
  }),
  product: one(products, {
    fields: [promotionProducts.productId],
    references: [products.id],
  }),
  tenant: one(tenants, {
    fields: [promotionProducts.tenantId],
    references: [tenants.id],
  }),
}));

export const promotionCategoriesRelations = relations(promotionCategories, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionCategories.promotionId],
    references: [promotions.id],
  }),
  category: one(categories, {
    fields: [promotionCategories.categoryId],
    references: [categories.id],
  }),
  tenant: one(tenants, {
    fields: [promotionCategories.tenantId],
    references: [tenants.id],
  }),
}));

export const promotionUsagesRelations = relations(promotionUsages, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionUsages.promotionId],
    references: [promotions.id],
  }),
  sale: one(sales, {
    fields: [promotionUsages.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [promotionUsages.productId],
    references: [products.id],
  }),
  tenant: one(tenants, {
    fields: [promotionUsages.tenantId],
    references: [tenants.id],
  }),
}));

// Promotion schemas
export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
  usedCount: true,
}).extend({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  value: z.string().optional(),
  minQuantity: z.number().min(1).optional(),
  maxQuantity: z.number().optional(),
  buyQuantity: z.number().optional(),
  getQuantity: z.number().optional(),
  maxUses: z.number().optional(),
  priority: z.number().default(1),
  minPurchaseAmount: z.number().min(0).optional(),
});

export const insertPromotionProductSchema = createInsertSchema(promotionProducts).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertPromotionCategorySchema = createInsertSchema(promotionCategories).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

export const insertPromotionUsageSchema = createInsertSchema(promotionUsages).omit({
  id: true,
  tenantId: true,
  createdAt: true,
});

// Product costs types
export type ProductCost = typeof productCosts.$inferSelect;
export type InsertProductCost = z.infer<typeof insertProductCostSchema>;
export type ProductCostIngredient = typeof productCostIngredients.$inferSelect;
export type InsertProductCostIngredient = z.infer<typeof insertProductCostIngredientSchema>;
export type ProductNutrition = typeof productNutrition.$inferSelect;
export type InsertProductNutrition = z.infer<typeof insertProductNutritionSchema>;
export type ProductPreparation = typeof productPreparation.$inferSelect;
export type InsertProductPreparation = z.infer<typeof insertProductPreparationSchema>;

// Promotion types
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type PromotionProduct = typeof promotionProducts.$inferSelect;
export type InsertPromotionProduct = z.infer<typeof insertPromotionProductSchema>;
export type PromotionCategory = typeof promotionCategories.$inferSelect;
export type InsertPromotionCategory = z.infer<typeof insertPromotionCategorySchema>;
export type PromotionUsage = typeof promotionUsages.$inferSelect;
export type InsertPromotionUsage = z.infer<typeof insertPromotionUsageSchema>;

// System settings and currency types
export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;

export const insertCurrencySchema = createInsertSchema(currencies).omit({ id: true, createdAt: true });
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;
export type Currency = typeof currencies.$inferSelect;
