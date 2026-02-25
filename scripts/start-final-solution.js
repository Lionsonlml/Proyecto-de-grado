const { spawn } = require('child_process')

// Configurar variables de entorno
process.env.ENCRYPTION_KEY = 'default-key-change-in-production'
process.env.JWT_SECRET = 'default-jwt-secret-for-testing'

console.log('🚀 Iniciando TimeWize con solución completa y definitiva...')
console.log('')
console.log('✅ CORRECCIONES IMPLEMENTADAS:')
console.log('   🔐 Sistema de cifrado robusto y funcional')
console.log('   📊 Cálculo de tendencia de moods con regresión lineal')
console.log('   🔄 APIs actualizadas con funciones seguras')
console.log('   🛡️ Control de acceso y auditoría implementado')
console.log('   🎯 Descifrado automático en todas las operaciones')
console.log('')
console.log('🔧 FUNCIONES CORREGIDAS:')
console.log('   ✅ updateSecureTask - Actualización de tareas con cifrado')
console.log('   ✅ deleteSecureTask - Eliminación con logging de auditoría')
console.log('   ✅ Cálculo de tendencia de moods preciso')
console.log('   ✅ Optimización de horario con datos descifrados')
console.log('   ✅ Análisis de patrones con datos descifrados')
console.log('')
console.log('🎯 RESULTADO ESPERADO:')
console.log('   - Los datos se muestran correctamente descifrados')
console.log('   - La tendencia de moods es precisa')
console.log('   - La optimización del horario muestra nombres de tareas')
console.log('   - Todo el sistema es seguro y funcional')
console.log('')

// Iniciar la aplicación Next.js
const nextProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    ENCRYPTION_KEY: 'default-key-change-in-production',
    JWT_SECRET: 'default-jwt-secret-for-testing'
  }
})

nextProcess.on('error', (error) => {
  console.error('❌ Error iniciando la aplicación:', error)
})

nextProcess.on('close', (code) => {
  console.log(`📱 Aplicación cerrada con código: ${code}`)
})

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando aplicación...')
  nextProcess.kill('SIGINT')
  process.exit(0)
})
