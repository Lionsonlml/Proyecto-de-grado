const { spawn } = require('child_process')

// Configurar variables de entorno
process.env.ENCRYPTION_KEY = 'default-key-change-in-production'
process.env.JWT_SECRET = 'default-jwt-secret-for-testing'

console.log('🚀 Iniciando aplicación con correcciones aplicadas...')
console.log('')
console.log('✅ Correcciones implementadas:')
console.log('  1. Cálculo de tendencia de moods corregido')
console.log('  2. Optimización del horario con datos descifrados')
console.log('  3. APIs actualizadas para usar funciones seguras')
console.log('  4. Manejo de errores mejorado')
console.log('')
console.log('🔧 Variables de entorno configuradas:')
console.log(`  ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY}`)
console.log(`  JWT_SECRET: ${process.env.JWT_SECRET}`)
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
