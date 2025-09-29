# Caja SAS Enterprise - Sistema Multitenant

🚀 **Sistema POS multitenant completo con React + Node.js + PostgreSQL**

## Estado del Proyecto
- **Plataforma:** VPS Liquid Web (AlmaLinux)
- **Database:** PostgreSQL con Neon
- **Status:** ✅ Listo para producción

## Características
- 💼 Sistema multitenant completo
- 🛒 Punto de venta (POS)
- 📊 Dashboard con analytics
- 👥 Gestión de usuarios y roles
- 💳 Integración Stripe
- 🤖 Asistente IA integrado
- 📱 Responsive design

## Quick Start - Desarrollo Local
```bash
npm install
# Copiar variables de entorno
cp .env.example .env
# Desarrollo local (puerto 5000)
NODE_ENV=development PORT=5000 npx tsx server/index.ts
```

## Deploy en VPS
```bash
npm install
npm run build
npm run start:vps
# Producción en puerto 4000
```

---
**Última actualización:** 2025-09-17