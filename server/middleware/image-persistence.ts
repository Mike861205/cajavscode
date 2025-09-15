import fs from 'fs';
import path from 'path';

/**
 * Middleware para asegurar persistencia de imágenes durante deployments
 */
export class ImagePersistenceMiddleware {
  
  /**
   * Inicializa el sistema de persistencia al arrancar el servidor
   */
  static async initializePersistence(): Promise<void> {
    console.log('🔧 Inicializando sistema de persistencia de imágenes...');
    
    // Crear directorios necesarios
    this.ensureDirectories();
    
    // Verificar integridad básica
    await this.performBasicIntegrityCheck();
    
    console.log('✅ Sistema de persistencia inicializado');
  }
  
  /**
   * Asegura que existan los directorios necesarios
   */
  private static ensureDirectories(): void {
    const requiredDirs = [
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'uploads', 'tenants'),
      path.join(process.cwd(), 'backups'),
      path.join(process.cwd(), 'backups', 'images')
    ];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Directorio creado: ${dir}`);
      }
    }
  }
  
  /**
   * Realiza verificación básica de integridad
   */
  private static async performBasicIntegrityCheck(): Promise<void> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const tenantsDir = path.join(uploadsDir, 'tenants');
    
    if (!fs.existsSync(tenantsDir)) {
      console.log('⚠️  Directorio de tenants no existe, creándolo...');
      fs.mkdirSync(tenantsDir, { recursive: true });
      return;
    }
    
    // Contar archivos en directorios de tenants
    const tenantDirs = fs.readdirSync(tenantsDir).filter(item => {
      const fullPath = path.join(tenantsDir, item);
      return fs.statSync(fullPath).isDirectory();
    });
    
    let totalImages = 0;
    for (const tenantDir of tenantDirs) {
      const productsDir = path.join(tenantsDir, tenantDir, 'products');
      if (fs.existsSync(productsDir)) {
        const images = fs.readdirSync(productsDir).filter(file => 
          /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
        );
        totalImages += images.length;
        console.log(`📊 Tenant ${tenantDir}: ${images.length} imágenes`);
      }
    }
    
    console.log(`📊 Total de imágenes encontradas: ${totalImages}`);
  }
  
  /**
   * Middleware para procesar uploads con persistencia
   */
  static processUploadWithPersistence(tenantId: string, filename: string, sourcePath: string): string {
    // Asegurar directorio del tenant
    const tenantDir = path.join(process.cwd(), 'uploads', 'tenants', tenantId, 'products');
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    
    // Generar ruta de destino
    const destinationPath = path.join(tenantDir, filename);
    const publicUrl = `/uploads/tenants/${tenantId}/products/${filename}`;
    
    // Mover archivo si no está ya en la ubicación correcta
    if (sourcePath !== destinationPath) {
      fs.renameSync(sourcePath, destinationPath);
      console.log(`📁 Imagen organizada: ${filename} -> ${publicUrl}`);
    }
    
    return publicUrl;
  }
}