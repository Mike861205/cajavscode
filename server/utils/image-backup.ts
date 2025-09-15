import fs from 'fs';
import path from 'path';

/**
 * Sistema de respaldo y persistencia de imágenes
 * Asegura que las imágenes de los tenants persistan durante deployments
 */
export class ImageBackupManager {
  
  /**
   * Crea una copia de seguridad de todas las imágenes de un tenant
   */
  static async createTenantBackup(tenantId: string): Promise<void> {
    console.log(`💾 Creando respaldo de imágenes para tenant: ${tenantId}`);
    
    const tenantDir = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
    const backupDir = path.join(process.cwd(), 'backups', 'images', tenantId);
    
    if (!fs.existsSync(tenantDir)) {
      console.log(`⚠️  No existe directorio de tenant: ${tenantDir}`);
      return;
    }
    
    // Crear directorio de respaldo
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Copiar todos los archivos
    this.copyDirectory(tenantDir, backupDir);
    console.log(`✅ Respaldo creado en: ${backupDir}`);
  }
  
  /**
   * Restaura las imágenes desde el respaldo
   */
  static async restoreTenantBackup(tenantId: string): Promise<void> {
    console.log(`🔄 Restaurando respaldo de imágenes para tenant: ${tenantId}`);
    
    const backupDir = path.join(process.cwd(), 'backups', 'images', tenantId);
    const tenantDir = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
    
    if (!fs.existsSync(backupDir)) {
      console.log(`⚠️  No existe respaldo para tenant: ${tenantId}`);
      return;
    }
    
    // Crear directorio de destino
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    
    // Restaurar archivos
    this.copyDirectory(backupDir, tenantDir);
    console.log(`✅ Respaldo restaurado en: ${tenantDir}`);
  }
  
  /**
   * Verifica la integridad del sistema de respaldo
   */
  static async verifyBackupIntegrity(tenantId: string): Promise<boolean> {
    const tenantDir = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
    const backupDir = path.join(process.cwd(), 'backups', 'images', tenantId);
    
    if (!fs.existsSync(tenantDir) || !fs.existsSync(backupDir)) {
      return false;
    }
    
    // Comparar directorios (implementación básica)
    const tenantFiles = this.getDirectoryFiles(tenantDir);
    const backupFiles = this.getDirectoryFiles(backupDir);
    
    return tenantFiles.length === backupFiles.length;
  }
  
  /**
   * Utilidad para copiar directorios recursivamente
   */
  private static copyDirectory(source: string, destination: string): void {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    
    const files = fs.readdirSync(source);
    
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      
      if (fs.statSync(sourcePath).isDirectory()) {
        this.copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }
  
  /**
   * Obtiene lista de archivos en un directorio
   */
  private static getDirectoryFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    
    const files: string[] = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isFile()) {
        files.push(item);
      } else if (fs.statSync(fullPath).isDirectory()) {
        const subFiles = this.getDirectoryFiles(fullPath);
        files.push(...subFiles.map(f => path.join(item, f)));
      }
    }
    
    return files;
  }
}