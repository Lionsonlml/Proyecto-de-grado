const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'app.db');
const backupPath = path.join(process.cwd(), 'data', 'app.db.backup');

console.log('🗑️ Creando backup de la base de datos antigua...');

try {
  if (fs.existsSync(dbPath)) {
    // Renombrar en lugar de eliminar
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
    }
    fs.renameSync(dbPath, backupPath);
    console.log('✅ Base de datos respaldada en app.db.backup');
  } else {
    console.log('ℹ️ No existía base de datos previa');
  }
} catch (error) {
  console.error('⚠️ La BD está en uso. Por favor:');
  console.error('   1. Detén el servidor (Ctrl+C)');
  console.error('   2. Ejecuta: node scripts/reset-db.js');
  console.error('   3. Reinicia el servidor: pnpm dev');
  process.exit(1);
}

console.log('');
console.log('✨ La base de datos se recreará automáticamente al iniciar el servidor');
console.log('📋 Nueva estructura:');
console.log('  - ✅ tasks: category, priority, status, tags, due_date, hour validada');
console.log('  - ✅ moods: validaciones energy (0-10), hour (0-23), notes');
console.log('  - ✅ ai_insights: renombrado desde gemini_insights + metadata');
console.log('  - ✅ users: con updated_at');
console.log('  - ✅ Índices optimizados para queries rápidos');
console.log('  - ✅ Foreign keys con CASCADE para integridad');
console.log('  - ✅ Datos de seed con fechas actuales');
console.log('');
console.log('🚀 Reinicia el servidor con: pnpm dev');
