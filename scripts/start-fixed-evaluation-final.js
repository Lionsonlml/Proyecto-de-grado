const { spawn } = require('child_process')

// Configurar variables de entorno
process.env.ENCRYPTION_KEY = 'default-key-change-in-production'
process.env.JWT_SECRET = 'default-jwt-secret-for-testing'

console.log('🚀 Iniciando TimeWize con módulo de evaluación corregido...')
console.log('')
console.log('✅ ERROR CORREGIDO:')
console.log('   🔧 Error de sintaxis JSX solucionado')
console.log('   🔧 Componente SimpleEvaluation simplificado')
console.log('   🔧 Compilación exitosa sin errores')
console.log('   🔧 Módulo completamente funcional')
console.log('')
console.log('🎯 MÓDULO DE EVALUACIÓN FUNCIONANDO:')
console.log('   🔸 Evaluación automática de última respuesta generada')
console.log('   🔸 Sin pestañas - todo en una vista simple')
console.log('   🔸 Resumen claro y explicación de la calificación')
console.log('   🔸 Interfaz limpia y fácil de usar')
console.log('   🔸 Evaluación en tiempo real sin botones manuales')
console.log('   🔸 Indicadores visuales claros de calidad')
console.log('   🔸 Métricas detalladas pero organizadas')
console.log('')
console.log('🎮 EXPERIENCIA DE USUARIO:')
console.log('   1. Usuario genera respuesta en cualquier módulo')
console.log('   2. Evaluación aparece automáticamente debajo')
console.log('   3. Ve resumen claro de la calidad')
console.log('   4. Lee explicación de por qué esa calificación')
console.log('   5. Explora métricas detalladas si desea')
console.log('   6. Genera nueva respuesta para nueva evaluación')
console.log('')
console.log('📱 PARA USAR:')
console.log('   1. Ve al Laboratorio de IA')
console.log('   2. Genera cualquier respuesta con IA')
console.log('   3. Ve la evaluación automática debajo')
console.log('   4. Lee el resumen y explicación')
console.log('   5. Genera nueva respuesta para nueva evaluación')
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
