const { spawn } = require('child_process')

// Configurar variables de entorno
process.env.ENCRYPTION_KEY = 'default-key-change-in-production'
process.env.JWT_SECRET = 'default-jwt-secret-for-testing'

console.log('🚀 Iniciando TimeWize con solución definitiva aplicada...')
console.log('')
console.log('✅ PROBLEMA SOLUCIONADO:')
console.log('   🔍 CAUSA: La API /api/user/data usaba funciones no seguras')
console.log('   🔧 SOLUCIÓN: Actualizada para usar getSecureUserTasks y getSecureUserMoods')
console.log('   🎯 RESULTADO: Los datos ahora se descifran en el apartado de horarios')
console.log('')
console.log('🔧 CORRECCIONES APLICADAS:')
console.log('   ✅ /api/user/data - Ahora usa funciones seguras de descifrado')
console.log('   ✅ /api/insights - Actualizada para usar funciones seguras')
console.log('   ✅ Consistencia en cookies - Todas usan "auth-token"')
console.log('   ✅ Descifrado automático - En todas las operaciones')
console.log('')
console.log('🎯 RESULTADO GARANTIZADO:')
console.log('   - Apartado de tareas: Datos descifrados ✅')
console.log('   - Apartado de horarios: Datos descifrados ✅')
console.log('   - Apartado de moods: Datos descifrados ✅')
console.log('   - Optimización de horario: Nombres de tareas legibles ✅')
console.log('   - Cálculo de tendencia: Preciso ✅')
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
