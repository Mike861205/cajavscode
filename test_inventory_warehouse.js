// Test script to verify inventory warehouse functionality
const testInventoryWarehouse = async () => {
  // Simulate frontend data
  const testData = {
    warehouseId: 4, // Diana's first warehouse
    products: [
      {
        productId: 1,
        systemStock: 100,
        physicalCount: 150,
        shrinkage: 0,
        variance: 50,
        varianceType: 'sobrante',
        shrinkageNotes: ''
      }
    ],
    dateRange: {
      from: new Date().toISOString(),
      to: new Date().toISOString()
    },
    notes: 'Test inventory - Almacén: Asadero La Joya'
  };

  console.log('🔧 Test data to send:', JSON.stringify(testData, null, 2));

  // Test the API endpoint
  try {
    const response = await fetch('http://localhost:5000/api/inventory/physical', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'sessionId=your-session-id' // Would need actual session
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('🔧 API Response:', result);
  } catch (error) {
    console.error('🔧 API Error:', error);
  }
};

// Run the test
testInventoryWarehouse();