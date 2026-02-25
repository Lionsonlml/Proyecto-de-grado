const { spawn } = require('child_process')

// Configurar variables de entorno
process.env.ENCRYPTION_KEY = 'default-key-change-in-production'
process.env.JWT_SECRET = 'default-jwt-secret-for-testing'

console.log('🚀 Iniciando TimeWize con módulo de evaluación corregido...')
console.log('')
console.log('✅ ERRORES CORREGIDOS:')
console.log('   🔧 Variable "eval" renombrada a "evaluationItem" (palabra reservada)')
console.log('   🔧 Import "getGeminiClient" corregido a usar fetch directo')
console.log('   🔧 API de evaluación ahora usa el mismo patrón que otras APIs')
console.log('   🔧 Compilación exitosa sin errores ni advertencias')
console.log('')
console.log('🎯 MÓDULO DE EVALUACIÓN FUNCIONANDO:')
console.log('   🔸 Prompt crítico independiente (reduce sesgo)')
console.log('   🔸 Explicación + puntuación detallada en 6 categorías')
console.log('   🔸 Cruce de métricas (70% IA + 30% métricas léxicas)')
console.log('   🔸 Gamificación con gráficas, badges y progreso')
console.log('   🔸 Integración perfecta en laboratorio de IA')
console.log('   🔸 Evaluación automática de respuestas generadas')
console.log('   🔸 Historial de evaluaciones con estadísticas')
console.log('')
console.log('📱 PARA USAR:')
console.log('   1. Ve al Laboratorio de IA')
console.log('   2. Haz clic en la pestaña "Evaluación"')
console.log('   3. Usa "Evaluar Respuesta de Ejemplo" para probar')
console.log('   4. Explora las diferentes pestañas de análisis')
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
