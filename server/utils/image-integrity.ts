import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { products } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ImageIntegrityResult {
  productId: number;
  productName: string;
  imageUrl?: string;
  exists: boolean;
  shouldRestore: boolean;
}

/**
 * Sistema de preservación de imágenes por tenant
 * Evita pérdida de datos y organiza archivos de manera segura
 */
export class ImageIntegrityManager {
  
  /**
   * Crea la estructura de directorios por tenant
   */
  static ensureTenantDirectories(tenantId: string): void {
    const tenantDir = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
    const productsDir = path.join(tenantDir, 'products');
    
    // Crear directorios si no existen
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
      console.log(`📁 Directorio tenant creado: ${tenantDir}`);
    }
    
    if (!fs.existsSync(productsDir)) {
      fs.mkdirSync(productsDir, { recursive: true });
      console.log(`📁 Directorio productos creado: ${productsDir}`);
    }
  }

  /**
   * Genera una ruta de imagen organizada por tenant
   */
  static generateTenantImagePath(tenantId: string, filename: string): string {
    this.ensureTenantDirectories(tenantId);
    return `/uploads/tenants/${tenantId}/products/${filename}`;
  }

  /**
   * Verifica si un archivo de imagen existe físicamente
   * ACTUALIZADO: Búsqueda en múltiples ubicaciones para mayor precisión
   */
  static imageExists(imageUrl: string): boolean {
    if (!imageUrl) return false;
    
    try {
      const filename = path.basename(imageUrl);
      
      // Rutas posibles donde puede estar la imagen
      const possiblePaths = [
        // Ruta exacta como está en la BD
        path.join(process.cwd(), imageUrl.replace(/^\/+/, '')),
        // Ruta antigua en uploads directo
        path.join(process.cwd(), 'uploads', filename),
        // Ruta con /uploads/ al inicio
        path.join(process.cwd(), imageUrl.startsWith('/uploads/') ? imageUrl.substring(1) : `uploads/${filename}`)
      ];
      
      // Verificar cada ruta posible
      for (const imagePath of possiblePaths) {
        if (fs.existsSync(imagePath)) {
          console.log(`✅ Imagen encontrada en: ${imagePath}`);
          return true;
        }
      }
      
      console.log(`❌ Imagen NO encontrada en ninguna ubicación:`, possiblePaths);
      return false;
    } catch (error) {
      console.error(`❌ Error verificando imagen ${imageUrl}:`, error);
      return false;
    }
  }

  /**
   * Audita la integridad de imágenes para un tenant específico
   */
  static async auditTenantImages(tenantId: string): Promise<ImageIntegrityResult[]> {
    console.log(`🔍 Auditando imágenes para tenant: ${tenantId}`);
    
    try {
      // Obtener todos los productos del tenant
      const tenantProducts = await db
        .select({
          id: products.id,
          name: products.name,
          imageUrl: products.imageUrl,
        })
        .from(products)
        .where(eq(products.tenantId, tenantId));

      const results: ImageIntegrityResult[] = [];

      for (const product of tenantProducts) {
        const exists = product.imageUrl ? this.imageExists(product.imageUrl) : false;
        
        results.push({
          productId: product.id,
          productName: product.name,
          imageUrl: product.imageUrl || undefined,
          exists: exists,
          shouldRestore: !exists && !!product.imageUrl
        });

        if (!exists && product.imageUrl) {
          console.log(`⚠️  Imagen perdida: ${product.name} - ${product.imageUrl}`);
        }
      }

      return results;
    } catch (error) {
      console.error(`❌ Error auditando imágenes:`, error);
      return [];
    }
  }

  /**
   * Migra archivos existentes a estructura por tenant
   * ACTUALIZADO: Busca en múltiples ubicaciones para encontrar imágenes
   */
  static async migrateLegacyImages(tenantId: string): Promise<number> {
    console.log(`🔄 Migrando imágenes legacy para tenant: ${tenantId}`);
    
    let migratedCount = 0;
    const results = await this.auditTenantImages(tenantId);
    
    for (const result of results) {
      if (result.imageUrl && !result.exists) {
        const filename = path.basename(result.imageUrl);
        
        // Buscar en múltiples ubicaciones posibles
        const searchPaths = [
          path.join(process.cwd(), 'uploads', filename),
          path.join(process.cwd(), 'uploads', 'tenants', tenantId, 'products', filename),
          path.join(process.cwd(), result.imageUrl.replace(/^\/+/, '')),
          // También buscar con el patrón exacto de la URL
          path.join(process.cwd(), result.imageUrl.startsWith('/') ? result.imageUrl.substring(1) : result.imageUrl)
        ];
        
        console.log(`🔍 Buscando imagen ${filename} en:`, searchPaths);
        
        let foundPath = null;
        for (const searchPath of searchPaths) {
          if (fs.existsSync(searchPath)) {
            foundPath = searchPath;
            break;
          }
        }
        
        if (foundPath) {
          try {
            // Generar nueva ruta organizada
            const newImageUrl = this.generateTenantImagePath(tenantId, filename);
            const newPath = path.join(process.cwd(), newImageUrl.replace(/^\/+/, ''));
            
            // Crear directorio si no existe
            const newDir = path.dirname(newPath);
            if (!fs.existsSync(newDir)) {
              fs.mkdirSync(newDir, { recursive: true });
              console.log(`📁 Directorio creado: ${newDir}`);
            }
            
            // Solo copiar si la imagen no está ya en la ubicación correcta
            if (foundPath !== newPath) {
              fs.copyFileSync(foundPath, newPath);
              console.log(`📁 Copiado: ${foundPath} -> ${newPath}`);
            }
            
            // Actualizar base de datos con la ruta correcta
            await db
              .update(products)
              .set({ imageUrl: newImageUrl })
              .where(eq(products.id, result.productId));
              
            console.log(`✅ Migrado: ${result.productName} -> ${newImageUrl}`);
            migratedCount++;
          } catch (error) {
            console.error(`❌ Error migrando ${result.productName}:`, error);
          }
        } else {
          console.log(`⚠️  No se encontró imagen para: ${result.productName} - ${result.imageUrl}`);
        }
      }
    }
    
    return migratedCount;
  }

  /**
   * Limpia URLs de imágenes rotas para evitar confusión
   * ACTUALIZADO: Verificar dos veces antes de limpiar para evitar pérdida de datos
   */
  static async cleanBrokenImageUrls(tenantId: string): Promise<number> {
    console.log(`🧹 Limpiando URLs rotas para tenant: ${tenantId}`);
    
    const results = await this.auditTenantImages(tenantId);
    let cleanedCount = 0;
    
    for (const result of results) {
      if (result.shouldRestore && result.imageUrl) {
        // VERIFICACIÓN ADICIONAL: buscar en múltiples ubicaciones
        const possiblePaths = [
          path.join(process.cwd(), result.imageUrl.replace(/^\/+/, '')),
          path.join(process.cwd(), 'uploads', path.basename(result.imageUrl)),
          path.join(process.cwd(), 'uploads', 'tenants', tenantId, 'products', path.basename(result.imageUrl))
        ];
        
        const foundInAnyPath = possiblePaths.some(p => fs.existsSync(p));
        
        if (!foundInAnyPath) {
          try {
            await db
              .update(products)
              .set({ imageUrl: null })
              .where(eq(products.id, result.productId));
              
            console.log(`🧹 URL realmente rota limpiada: ${result.productName}`);
            cleanedCount++;
          } catch (error) {
            console.error(`❌ Error limpiando ${result.productName}:`, error);
          }
        } else {
          console.log(`⚠️  IMAGEN ENCONTRADA - NO limpiar: ${result.productName}`);
        }
      }
    }
    
    return cleanedCount;
  }

  /**
   * Generar reporte completo de integridad
   */
  static async generateIntegrityReport(tenantId: string) {
    const results = await this.auditTenantImages(tenantId);
    
    const report = {
      tenantId,
      totalProducts: results.length,
      withImages: results.filter(r => r.imageUrl).length,
      imagesExisting: results.filter(r => r.exists).length,
      imagesBroken: results.filter(r => r.shouldRestore).length,
      imagesHealthy: results.filter(r => r.imageUrl && r.exists).length,
      details: results
    };

    console.log(`
📊 REPORTE DE INTEGRIDAD DE IMÁGENES
Tenant: ${tenantId}
Total de productos: ${report.totalProducts}
Con imágenes: ${report.withImages}
Imágenes existentes: ${report.imagesExisting}
Imágenes rotas: ${report.imagesBroken}
Imágenes saludables: ${report.imagesHealthy}
    `);

    return report;
  }
}