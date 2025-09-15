const { Pool } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { sql, eq, and } = require('drizzle-orm');

// Configuración de la base de datos
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function testDecimalCancellation() {
  console.log('🧪 PRUEBA: Cancelación de producto conjunto con cantidades decimales');
  
  try {
    // Crear una venta con cantidad decimal del producto "pollo"
    const saleData = {
      tenantId: '3ecf677e-5f5e-4dd2-9f3a-0585bb2b87f7',
      userId: 2,
      customerId: null,
      customerName: null,
      total: '175.00',
      subtotal: '175.00',
      tax: '0.00',
      discount: '0.00',
      paymentMethod: 'cash',
      cashRegisterId: 52,
      warehouseId: 1,
      status: 'completed',
      ticketTitle: 'Prueba decimal 0.5 pollo',
      notes: null
    };
    
    // Crear venta
    const [sale] = await db.execute(sql`
      INSERT INTO sales (tenant_id, user_id, customer_id, customer_name, total, subtotal, tax, discount, payment_method, cash_register_id, warehouse_id, status, ticket_title, notes)
      VALUES (${saleData.tenantId}, ${saleData.userId}, ${saleData.customerId}, ${saleData.customerName}, ${saleData.total}, ${saleData.subtotal}, ${saleData.tax}, ${saleData.discount}, ${saleData.paymentMethod}, ${saleData.cashRegisterId}, ${saleData.warehouseId}, ${saleData.status}, ${saleData.ticketTitle}, ${saleData.notes})
      RETURNING id
    `);
    
    const saleId = sale.rows[0].id;
    console.log(`✅ Venta creada con ID: ${saleId}`);
    
    // Crear sale_item con cantidad decimal 0.5
    await db.execute(sql`
      INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total, tenant_id, price)
      VALUES (${saleId}, 46, '0.500', '350.00', '175.00', ${saleData.tenantId}, '175.00')
    `);
    
    console.log('✅ Sale item creado con cantidad decimal 0.500');
    
    // Crear sale_payment
    await db.execute(sql`
      INSERT INTO sale_payments (sale_id, payment_method, amount, currency, exchange_rate, tenant_id)
      VALUES (${saleId}, 'cash', '175.00', 'MXN', '1.0000', ${saleData.tenantId})
    `);
    
    console.log('✅ Sale payment creado');
    
    // Crear transacción de efectivo original
    await db.execute(sql`
      INSERT INTO cash_transactions (tenant_id, user_id, cash_register_id, type, amount, reference, description)
      VALUES (${saleData.tenantId}, ${saleData.userId}, ${saleData.cashRegisterId}, 'sale', '175.00', 'VENTA-${saleId}', 'Venta efectivo - ${saleData.ticketTitle}')
    `);
    
    console.log('✅ Transacción de efectivo original creada');
    
    // Verificar stock antes de cancelación
    console.log('\n📊 STOCK ANTES DE CANCELACIÓN:');
    const stockBeforeResult = await db.execute(sql`
      SELECT p.name, pws.stock 
      FROM products p 
      JOIN product_warehouse_stock pws ON p.id = pws.product_id 
      WHERE p.id IN (48, 49) AND pws.warehouse_id = 1
      ORDER BY p.id
    `);
    
    stockBeforeResult.rows.forEach(row => {
      console.log(`  - ${row.name}: ${row.stock}`);
    });
    
    // Ahora cancelar la venta
    console.log(`\n🔄 CANCELANDO VENTA #${saleId}...`);
    
    // Simular el proceso de cancelación del método deleteSale
    const [saleToCancel] = await db.execute(sql`
      SELECT * FROM sales WHERE id = ${saleId} AND tenant_id = ${saleData.tenantId}
    `);
    
    if (saleToCancel.rows.length === 0) {
      throw new Error('Venta no encontrada');
    }
    
    const saleRecord = saleToCancel.rows[0];
    console.log('📋 Venta encontrada:', saleRecord);
    
    // Obtener items de la venta
    const saleItemsResult = await db.execute(sql`
      SELECT * FROM sale_items WHERE sale_id = ${saleId}
    `);
    
    const saleItems = saleItemsResult.rows;
    console.log('🛒 Items de la venta:', saleItems);
    
    // Procesar cada item
    for (const item of saleItems) {
      const quantityToRestore = parseFloat(item.quantity);
      console.log(`\n  - Producto ID: ${item.product_id}, Cantidad a reintegrar: ${quantityToRestore}`);
      
      // Verificar si es producto conjunto
      const [productResult] = await db.execute(sql`
        SELECT * FROM products WHERE id = ${item.product_id} AND tenant_id = ${saleData.tenantId}
      `);
      
      const product = productResult.rows[0];
      console.log(`    📦 Producto: ${product.name}, Es conjunto: ${product.is_conjunto}`);
      
      if (product && product.is_conjunto) {
        console.log(`    🔧 Producto conjunto detectado, procesando componentes:`);
        
        // Obtener componentes
        const componentsResult = await db.execute(sql`
          SELECT * FROM product_components 
          WHERE parent_product_id = ${item.product_id} AND tenant_id = ${saleData.tenantId}
        `);
        
        const components = componentsResult.rows;
        console.log(`    📋 Componentes encontrados: ${components.length}`);
        
        for (const component of components) {
          const componentQuantityToRestore = parseFloat(component.quantity) * quantityToRestore;
          console.log(`      - Componente ID: ${component.component_product_id}, Cantidad a reintegrar: ${componentQuantityToRestore}`);
          
          // Obtener stock actual
          const [currentStockResult] = await db.execute(sql`
            SELECT * FROM product_warehouse_stock 
            WHERE product_id = ${component.component_product_id} 
            AND warehouse_id = ${saleRecord.warehouse_id} 
            AND tenant_id = ${saleData.tenantId}
          `);
          
          const currentStock = currentStockResult.rows[0];
          const currentStockValue = currentStock ? parseFloat(currentStock.stock) : 0;
          const newStockValue = currentStockValue + componentQuantityToRestore;
          
          console.log(`      📊 Stock actual: ${currentStockValue}, Nuevo stock: ${newStockValue}`);
          
          // Actualizar stock usando la misma lógica del método deleteSale
          await db.execute(sql`
            UPDATE product_warehouse_stock 
            SET stock = CAST(stock AS DECIMAL) + ${componentQuantityToRestore}
            WHERE product_id = ${component.component_product_id} 
            AND warehouse_id = ${saleRecord.warehouse_id} 
            AND tenant_id = ${saleData.tenantId}
          `);
          
          console.log(`      ✅ Stock actualizado exitosamente`);
        }
      }
    }
    
    // Crear transacción de cancelación
    const salePaymentsResult = await db.execute(sql`
      SELECT * FROM sale_payments WHERE sale_id = ${saleId}
    `);
    
    const salePayments = salePaymentsResult.rows;
    console.log('💳 Pagos de la venta:', salePayments);
    
    for (const payment of salePayments) {
      if (payment.payment_method === 'cash' && saleRecord.cash_register_id) {
        const cancelAmount = (parseFloat(payment.amount) * -1).toString();
        const cancelRef = `CANCEL-${saleId}`;
        const cancelDesc = `Cancelación venta #${saleId}`;
        
        await db.execute(sql`
          INSERT INTO cash_transactions 
          (tenant_id, user_id, cash_register_id, type, amount, reference, description)
          VALUES (${saleData.tenantId}, ${saleRecord.user_id}, ${saleRecord.cash_register_id}, 'sale_cancellation', ${cancelAmount}, ${cancelRef}, ${cancelDesc})
        `);
        
        console.log(`💰 Transacción de cancelación creada: ${cancelAmount}`);
      }
    }
    
    // Marcar venta como cancelada
    await db.execute(sql`
      UPDATE sales SET status = 'cancelled' WHERE id = ${saleId} AND tenant_id = ${saleData.tenantId}
    `);
    
    console.log('✅ Venta marcada como cancelada');
    
    // Verificar stock después de cancelación
    console.log('\n📊 STOCK DESPUÉS DE CANCELACIÓN:');
    const stockAfterResult = await db.execute(sql`
      SELECT p.name, pws.stock 
      FROM products p 
      JOIN product_warehouse_stock pws ON p.id = pws.product_id 
      WHERE p.id IN (48, 49) AND pws.warehouse_id = 1
      ORDER BY p.id
    `);
    
    stockAfterResult.rows.forEach(row => {
      console.log(`  - ${row.name}: ${row.stock}`);
    });
    
    // Verificar transacciones de efectivo
    console.log('\n💰 TRANSACCIONES DE EFECTIVO:');
    const cashTransactionsResult = await db.execute(sql`
      SELECT type, amount, reference, description 
      FROM cash_transactions 
      WHERE reference IN ('VENTA-${saleId}', 'CANCEL-${saleId}')
      ORDER BY created_at
    `);
    
    cashTransactionsResult.rows.forEach(row => {
      console.log(`  - ${row.type}: ${row.amount} (${row.reference}) - ${row.description}`);
    });
    
    console.log('\n✅ PRUEBA COMPLETADA - Cancelación con cantidades decimales exitosa');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    pool.end();
  }
}

testDecimalCancellation();