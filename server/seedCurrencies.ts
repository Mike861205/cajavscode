import { db } from "./db";
import { currencies } from "@shared/schema";

const defaultCurrencies = [
  {
    code: "MXN",
    name: "Peso Mexicano",
    symbol: "$",
    symbolPosition: "before",
    decimalPlaces: 2,
    country: "México",
    isActive: true
  },
  {
    code: "USD",
    name: "Dólar Estadounidense",
    symbol: "$",
    symbolPosition: "before",
    decimalPlaces: 2,
    country: "Estados Unidos",
    isActive: true
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    symbolPosition: "before",
    decimalPlaces: 2,
    country: "España",
    isActive: true
  },
  {
    code: "VES",
    name: "Bolívar Soberano",
    symbol: "Bs.",
    symbolPosition: "before",
    decimalPlaces: 2,
    country: "Venezuela",
    isActive: true
  },
  {
    code: "COP",
    name: "Peso Colombiano",
    symbol: "$",
    symbolPosition: "before",
    decimalPlaces: 2,
    country: "Colombia",
    isActive: true
  },
  {
    code: "ARS",
    name: "Peso Argentino",
    symbol: "$",
    symbolPosition: "before",
    decimalPlaces: 2,
    country: "Argentina",
    isActive: true
  }
];

export async function seedCurrencies() {
  try {
    console.log("🌱 Seeding default currencies...");
    
    for (const currency of defaultCurrencies) {
      await db
        .insert(currencies)
        .values(currency)
        .onConflictDoNothing();
    }
    
    console.log("✅ Default currencies seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding currencies:", error);
  }
}