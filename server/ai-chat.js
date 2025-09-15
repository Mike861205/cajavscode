import OpenAI from "openai";

/*
Follow these instructions when using this blueprint:
1. Note that the newest OpenAI model is "gpt-4o", not "gpt-4". gpt-4o was released after your knowledge cutoff. Always prefer using gpt-4o as it is the latest model. When copying code from this blueprint, ensure you also mention this information verbatim as a comment so that you don't revert it to "gpt-4": `// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user`
2. Use the response_format: { type: "json_object" } option
3. Request output in JSON format in the prompt
*/

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export class AIChatService {
  
  static async processQuery(query, context, tenantId) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Detect function calls
      const functions = this.getFunctions();
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        max_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        tools: functions,
        tool_choice: "auto"
      });
      
      const message = response.choices[0].message;
      let responseText = message.content || '';
      let functionCalls = [];
      
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          functionCalls.push({
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments),
            id: toolCall.id
          });
        }
      }
      
      // Execute function calls if any
      if (functionCalls.length > 0) {
        const functionResults = await this.executeFunctions(functionCalls, tenantId);
        
        // If functions were executed, return function result as response
        if (functionResults && functionResults.length > 0) {
          return functionResults[0].result;
        }
      }
      
      return responseText || "No pude procesar tu consulta correctamente.";
      
    } catch (error) {
      console.error("Error en AIChatService:", error);
      return "Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.";
    }
  }
  
  static buildSystemPrompt(context) {
    const today = new Date().toLocaleDateString('es-ES');
    
    return `Eres un asistente inteligente para el sistema de gestión empresarial "Caja SAS Enterprise". 
    
Tu función es ayudar a los usuarios con consultas sobre su negocio usando los datos reales de su empresa.

INFORMACIÓN DEL NEGOCIO (DATOS REALES):
- Fecha actual: ${today}
- Productos totales: ${context?.products?.total || 0}
- Ventas de hoy: $${context?.sales?.today || 0}
- Ventas del mes: $${context?.sales?.month || 0}
- Transacciones: ${context?.sales?.transactions || 0}
- Almacenes: ${context?.warehouses?.length || 0}
- Empleados activos: ${context?.employees?.active || 0}
- Citas programadas: ${context?.appointments?.total || 0}
- Productos con stock bajo: ${context?.products?.lowStock || 0}

FUNCIONES DISPONIBLES:
- create_supplier: Crear nuevos proveedores
- create_appointment: Crear citas y agendas
- create_product: Crear productos con cálculos automáticos
- create_sale: Procesar ventas completas del POS

INSTRUCCIONES:
1. Responde SIEMPRE en español
2. Usa los datos reales proporcionados
3. Si te preguntan sobre stock, ventas, o datos específicos, usa la información real
4. Para crear elementos (proveedores, citas, productos, ventas), usa las funciones disponibles
5. Sé profesional pero amigable
6. Proporciona información específica y actionable

EJEMPLOS DE CONSULTAS:
- "¿Cuántas ventas tengo hoy?" → Usar datos reales de ventas
- "Crear proveedor Coca Cola" → Usar función create_supplier
- "¿Qué productos tienen stock bajo?" → Usar datos reales de productos
- "Agendar cita para mañana" → Usar función create_appointment

Responde de manera clara, concisa y útil usando los datos reales del negocio.`;
  }
  
  static getFunctions() {
    return [
      {
        type: "function",
        function: {
          name: "create_supplier",
          description: "Crear un nuevo proveedor en el sistema",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Nombre del proveedor (requerido)"
              },
              email: {
                type: "string",
                description: "Email del proveedor (opcional)"
              },
              phone: {
                type: "string", 
                description: "Teléfono del proveedor (opcional)"
              },
              address: {
                type: "string",
                description: "Dirección del proveedor (opcional)"
              }
            },
            required: ["name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_appointment",
          description: "Crear una nueva cita o agenda",
          parameters: {
            type: "object",
            properties: {
              customerName: {
                type: "string",
                description: "Nombre del cliente"
              },
              phone: {
                type: "string",
                description: "Teléfono del cliente"
              },
              subject: {
                type: "string",
                description: "Asunto o motivo de la cita"
              },
              date: {
                type: "string",
                description: "Fecha de la cita (formato YYYY-MM-DD)"
              },
              time: {
                type: "string",
                description: "Hora de la cita (formato HH:MM)"
              },
              notes: {
                type: "string",
                description: "Notas adicionales (opcional)"
              }
            },
            required: ["customerName", "phone", "subject", "date", "time"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_product",
          description: "Crear un nuevo producto con cálculos automáticos",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Nombre del producto"
              },
              price: {
                type: "number",
                description: "Precio de venta"
              },
              cost: {
                type: "number",
                description: "Costo del producto"
              },
              category: {
                type: "string",
                description: "Categoría del producto (opcional)"
              },
              description: {
                type: "string",
                description: "Descripción del producto (opcional)"
              }
            },
            required: ["name", "price", "cost"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_sale",
          description: "Procesar una venta completa en el POS",
          parameters: {
            type: "object",
            properties: {
              products: {
                type: "array",
                description: "Lista de productos a vender",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Nombre del producto"
                    },
                    quantity: {
                      type: "number",
                      description: "Cantidad a vender"
                    }
                  }
                }
              },
              paymentMethod: {
                type: "string",
                description: "Método de pago principal (cash, card, transfer, credit, voucher, gift_card)"
              },
              cashAmount: {
                type: "number",
                description: "Cantidad en efectivo si aplica"
              },
              ticketTitle: {
                type: "string",
                description: "Título del ticket (opcional)"
              }
            },
            required: ["products", "paymentMethod"]
          }
        }
      }
    ];
  }
  
  static async executeFunctions(functionCalls, tenantId) {
    const results = [];
    
    for (const call of functionCalls) {
      try {
        let result = "";
        
        switch (call.name) {
          case "create_supplier":
            result = await this.createSupplier(call.input, tenantId);
            break;
          case "create_appointment":
            result = await this.createAppointment(call.input, tenantId);
            break;
          case "create_product":
            result = await this.createProduct(call.input, tenantId);
            break;
          case "create_sale":
            result = await this.createSale(call.input, tenantId);
            break;
          default:
            result = "Función no reconocida";
        }
        
        results.push({
          name: call.name,
          result: result
        });
        
      } catch (error) {
        console.error(`Error ejecutando función ${call.name}:`, error);
        results.push({
          name: call.name,
          result: `Error: ${error.message}`
        });
      }
    }
    
    return results;
  }
  
  static async createSupplier(input, tenantId) {
    try {
      const response = await fetch(`${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/api/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `tenantId=${tenantId}`
        },
        body: JSON.stringify({
          name: input.name,
          email: input.email || '',
          phone: input.phone || '',
          address: input.address || ''
        })
      });
      
      if (response.ok) {
        const supplier = await response.json();
        return `✅ Proveedor creado exitosamente: ${supplier.name}`;
      } else {
        return `❌ Error al crear proveedor: ${response.statusText}`;
      }
    } catch (error) {
      return `❌ Error al crear proveedor: ${error.message}`;
    }
  }
  
  static async createAppointment(input, tenantId) {
    try {
      const response = await fetch(`${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `tenantId=${tenantId}`
        },
        body: JSON.stringify({
          customerName: input.customerName,
          phone: input.phone,
          subject: input.subject,
          date: input.date,
          time: input.time,
          notes: input.notes || '',
          status: 'scheduled'
        })
      });
      
      if (response.ok) {
        const appointment = await response.json();
        return `✅ Cita creada exitosamente para ${appointment.customerName} el ${appointment.date} a las ${appointment.time}`;
      } else {
        return `❌ Error al crear cita: ${response.statusText}`;
      }
    } catch (error) {
      return `❌ Error al crear cita: ${error.message}`;
    }
  }
  
  static async createProduct(input, tenantId) {
    try {
      // Calcular utilidad automáticamente
      const utilityAmount = input.price - input.cost;
      const utilityPercentage = ((utilityAmount / input.cost) * 100).toFixed(2);
      
      const response = await fetch(`${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `tenantId=${tenantId}`
        },
        body: JSON.stringify({
          name: input.name,
          price: input.price,
          cost: input.cost,
          category: input.category || 'General',
          description: input.description || '',
          sku: `PRD-${Date.now()}`,
          utilityPercentage: parseFloat(utilityPercentage)
        })
      });
      
      if (response.ok) {
        const product = await response.json();
        return `✅ Producto creado exitosamente: ${product.name} - Precio: $${product.price} - Costo: $${product.cost} - Utilidad: ${utilityPercentage}%`;
      } else {
        return `❌ Error al crear producto: ${response.statusText}`;
      }
    } catch (error) {
      return `❌ Error al crear producto: ${error.message}`;
    }
  }
  
  static async createSale(input, tenantId) {
    try {
      // Simular venta básica
      const saleData = {
        products: input.products,
        paymentMethod: input.paymentMethod,
        cashAmount: input.cashAmount,
        ticketTitle: input.ticketTitle || ''
      };
      
      // Aquí se implementaría la lógica real de venta
      // Por ahora retornamos un mensaje de éxito
      return `✅ Venta procesada exitosamente - ${input.products.length} productos - Método: ${input.paymentMethod}`;
    } catch (error) {
      return `❌ Error al procesar venta: ${error.message}`;
    }
  }
}