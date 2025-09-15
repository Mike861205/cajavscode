// Test direct API call to inventory endpoint
const https = require('https');

const testApiCall = async () => {
  const data = JSON.stringify({
    warehouseId: 1,
    products: [
      {
        productId: 37,
        systemStock: 120,
        physicalCount: 140,
        shrinkage: 0,
        variance: 20,
        varianceType: 'sobrante',
        shrinkageNotes: ''
      }
    ],
    dateRange: {
      from: new Date().toISOString(),
      to: new Date().toISOString()
    },
    notes: 'Test API call - Almacén: Sistema'
  });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/inventory/physical',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Cookie': 'connect.sid=s%3A' // This would need a real session
    }
  };

  console.log('🔧 Making API call with data:', data);
  
  const req = https.request(options, (res) => {
    console.log('🔧 Status:', res.statusCode);
    console.log('🔧 Headers:', res.headers);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      console.log('🔧 Response:', responseData);
    });
  });

  req.on('error', (error) => {
    console.error('🔧 Error:', error);
  });

  req.write(data);
  req.end();
};

testApiCall();