// Test script to create inventory for Mike's tenant
const { Pool } = require('pg');

const testInventory = async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Test data for Mike's tenant
    const inventoryData = {
      id: `INV-TEST-${Date.now()}`,
      tenant_id: '3ecf677e-5f5e-4dd2-9f3a-0585bb2b87f7',
      user_id: 2, // Mike's user ID
      date: new Date(),
      products: JSON.stringify([
        {
          productId: 37,
          productName: 'AGUA BONAFON',
          systemStock: 99,
          physicalCount: 120,
          shrinkage: 0,
          variance: 21,
          varianceType: 'sobrante',
          shrinkageNotes: ''
        }
      ]),
      total_products: 1,
      total_variances: 1,
      status: 'completed',
      notes: 'Test inventory - Almacén: Sistema',
      warehouse_id: 1 // Testing with warehouse ID 1 (Sistema)
    };

    console.log('🔧 Creating test inventory with data:', JSON.stringify(inventoryData, null, 2));

    // Insert test inventory
    const insertQuery = `
      INSERT INTO inventory_records 
      (id, tenant_id, user_id, date, products, total_products, total_variances, status, notes, warehouse_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    await pool.query(insertQuery, [
      inventoryData.id,
      inventoryData.tenant_id,
      inventoryData.user_id,
      inventoryData.date,
      inventoryData.products,
      inventoryData.total_products,
      inventoryData.total_variances,
      inventoryData.status,
      inventoryData.notes,
      inventoryData.warehouse_id
    ]);

    console.log('✅ Test inventory created successfully:', inventoryData.id);

    // Verify the record was created
    const selectQuery = `
      SELECT id, warehouse_id, notes 
      FROM inventory_records 
      WHERE id = $1
    `;
    
    const result = await pool.query(selectQuery, [inventoryData.id]);
    console.log('🔧 Verification - Record in database:', result.rows[0]);

  } catch (error) {
    console.error('❌ Error creating test inventory:', error);
  } finally {
    await pool.end();
  }
};

testInventory();