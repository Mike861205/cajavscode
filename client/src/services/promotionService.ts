import { apiRequest } from "@/lib/queryClient";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  cost?: number;
}

export interface AppliedPromotion {
  id: number;
  name: string;
  type: string;
  discountAmount: number;
  appliedToItems: number[];
}

export interface PromotionCalculationResult {
  subtotal: number;
  totalDiscount: number;
  finalTotal: number;
  appliedPromotions: AppliedPromotion[];
  updatedCart: CartItem[];
}

export class PromotionService {
  /**
   * Calcula y aplica promociones a un carrito de compras
   */
  static async calculatePromotions(
    cartItems: CartItem[],
    tenantId: string
  ): Promise<PromotionCalculationResult> {
    try {
      // Obtener promociones activas
      const activePromotions = await apiRequest("GET", "/api/promotions/active");
      
      // Verificar que activePromotions sea un array válido
      if (!activePromotions || !Array.isArray(activePromotions) || activePromotions.length === 0) {
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return {
          subtotal,
          totalDiscount: 0,
          finalTotal: subtotal,
          appliedPromotions: [],
          updatedCart: [...cartItems]
        };
      }

      // Calcular subtotal original
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Ordenar promociones por prioridad (mayor prioridad primero)
      const sortedPromotions = activePromotions.sort((a: any, b: any) => b.priority - a.priority);
      
      let updatedCart = [...cartItems];
      const appliedPromotions: AppliedPromotion[] = [];
      let totalDiscount = 0;

      // Aplicar promociones una por una
      for (const promotion of sortedPromotions) {
        const result = this.applyPromotion(promotion, updatedCart, subtotal);
        
        if (result.discountAmount > 0) {
          appliedPromotions.push({
            id: promotion.id,
            name: promotion.name,
            type: promotion.type,
            discountAmount: result.discountAmount,
            appliedToItems: result.appliedToItems
          });
          
          totalDiscount += result.discountAmount;
          updatedCart = result.updatedCart;
          
          // Si la promoción no es stackable, detener aquí
          if (!promotion.stackable) {
            break;
          }
        }
      }

      const finalTotal = Math.max(0, subtotal - totalDiscount);

      return {
        subtotal,
        totalDiscount,
        finalTotal,
        appliedPromotions,
        updatedCart
      };

    } catch (error) {
      console.error("Error calculating promotions:", error);
      // En caso de error, devolver el carrito sin promociones
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return {
        subtotal,
        totalDiscount: 0,
        finalTotal: subtotal,
        appliedPromotions: [],
        updatedCart: [...cartItems]
      };
    }
  }

  /**
   * Aplica una promoción específica al carrito
   */
  private static applyPromotion(
    promotion: any,
    cartItems: CartItem[],
    subtotal: number
  ): { discountAmount: number; appliedToItems: number[]; updatedCart: CartItem[] } {
    
    // Verificar si cumple con el mínimo de compra
    if (promotion.minPurchaseAmount && subtotal < parseFloat(promotion.minPurchaseAmount)) {
      return { discountAmount: 0, appliedToItems: [], updatedCart: cartItems };
    }

    let discountAmount = 0;
    let appliedToItems: number[] = [];
    let updatedCart = [...cartItems];

    switch (promotion.type) {
      case 'percentage':
        discountAmount = subtotal * (parseFloat(promotion.value) / 100);
        appliedToItems = cartItems.map(item => item.id);
        break;

      case 'fixed_amount':
        discountAmount = Math.min(parseFloat(promotion.value), subtotal);
        appliedToItems = cartItems.map(item => item.id);
        break;

      case '2x1':
        const result2x1 = this.apply2x1Promotion(cartItems, promotion);
        discountAmount = result2x1.discountAmount;
        appliedToItems = result2x1.appliedToItems;
        updatedCart = result2x1.updatedCart;
        break;

      case 'buy_x_get_y':
        const resultBuyXGetY = this.applyBuyXGetYPromotion(cartItems, promotion);
        discountAmount = resultBuyXGetY.discountAmount;
        appliedToItems = resultBuyXGetY.appliedToItems;
        updatedCart = resultBuyXGetY.updatedCart;
        break;

      case 'bulk_discount':
        const resultBulk = this.applyBulkDiscountPromotion(cartItems, promotion);
        discountAmount = resultBulk.discountAmount;
        appliedToItems = resultBulk.appliedToItems;
        break;

      default:
        break;
    }

    return { discountAmount, appliedToItems, updatedCart };
  }

  /**
   * Aplica promoción 2x1
   */
  private static apply2x1Promotion(cartItems: CartItem[], promotion: any) {
    let discountAmount = 0;
    let appliedToItems: number[] = [];
    let updatedCart = [...cartItems];

    // TODO: Implementar lógica específica para productos aplicables
    // Por ahora aplica a todos los productos que tengan cantidad >= 2
    cartItems.forEach((item, index) => {
      if (item.quantity >= 2) {
        const freeItems = Math.floor(item.quantity / 2);
        discountAmount += freeItems * item.price;
        appliedToItems.push(item.id);
        
        // Actualizar la descripción del item para mostrar la promoción
        updatedCart[index] = {
          ...item,
          name: `${item.name} (2x1)`
        };
      }
    });

    return { discountAmount, appliedToItems, updatedCart };
  }

  /**
   * Aplica promoción Compra X Lleva Y
   */
  private static applyBuyXGetYPromotion(cartItems: CartItem[], promotion: any) {
    let discountAmount = 0;
    let appliedToItems: number[] = [];
    let updatedCart = [...cartItems];

    const buyQuantity = promotion.buyQuantity || 1;
    const getQuantity = promotion.getQuantity || 1;

    cartItems.forEach((item, index) => {
      if (item.quantity >= buyQuantity) {
        const sets = Math.floor(item.quantity / (buyQuantity + getQuantity));
        const freeItems = sets * getQuantity;
        discountAmount += freeItems * item.price;
        appliedToItems.push(item.id);
        
        updatedCart[index] = {
          ...item,
          name: `${item.name} (${buyQuantity}x${getQuantity})`
        };
      }
    });

    return { discountAmount, appliedToItems, updatedCart };
  }

  /**
   * Aplica promoción de descuento por volumen
   */
  private static applyBulkDiscountPromotion(cartItems: CartItem[], promotion: any) {
    let discountAmount = 0;
    let appliedToItems: number[] = [];

    const minQuantity = promotion.minQuantity || 1;
    
    cartItems.forEach(item => {
      if (item.quantity >= minQuantity) {
        const itemDiscount = (item.price * item.quantity) * (parseFloat(promotion.value) / 100);
        discountAmount += itemDiscount;
        appliedToItems.push(item.id);
      }
    });

    return { discountAmount, appliedToItems, updatedCart: cartItems };
  }
}