// Test promociones endpoint
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

console.log("Testing promotion creation with data:", JSON.stringify(testPromotionData, null, 2));

// Test the endpoint
fetch("http://localhost:5000/api/promotions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Cookie": "connect.sid=s%3AgG_bLJ6_hCBqNdBw5fJFWwNXy1nNZdqV.xIqkqCcZnqLckqrIcqhZqHqwQqCdLqJqKqLqM" // Replace with actual session cookie
  },
  body: JSON.stringify(testPromotionData)
})
.then(response => response.json())
.then(data => {
  console.log("Response:", data);
})
.catch(error => {
  console.error("Error:", error);
});