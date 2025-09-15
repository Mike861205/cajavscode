// Ejecutar esto desde la consola del navegador después de hacer login
const testPromotionData = {
  name: "NAVIDAD",
  type: "percentage", 
  description: "PRUEBA",
  value: "20",
  startDate: "2025-01-07",
  endDate: "2025-01-31",
  applyTo: "all",
  isActive: true,
  stackable: false,
  priority: 1,
  selectedProducts: [],
  selectedCategories: []
};

console.log("Testing promotion creation...");

fetch("/api/promotions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(testPromotionData)
})
.then(response => {
  console.log("Response status:", response.status);
  return response.json();
})
.then(data => {
  console.log("Response data:", data);
  if (data.id) {
    console.log("✅ Promotion created successfully with ID:", data.id);
  } else {
    console.log("❌ Error creating promotion:", data);
  }
})
.catch(error => {
  console.error("❌ Request failed:", error);
});