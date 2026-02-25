const { spawn } = require('child_process')

// Configurar variables de entorno
process.env.ENCRYPTION_KEY = 'default-key-change-in-production'
process.env.JWT_SECRET = 'default-jwt-secret-for-testing'

console.log('🚀 Iniciando TimeWize con módulo de evaluación de respuestas reales...')
console.log('')
console.log('✅ MÓDULO DE EVALUACIÓN COMPLETAMENTE FUNCIONAL:')
console.log('   🔸 Evaluación automática de respuestas reales (no ejemplos)')
console.log('   🔸 Captura automática de respuestas de los 3 módulos')
console.log('   🔸 Identificación clara con primera línea de cada respuesta')
console.log('   🔸 Evaluación secuencial con indicador de progreso')
console.log('   🔸 Historial completo con contexto de cada evaluación')
console.log('   🔸 Gamificación con gráficas, badges y métricas')
console.log('   🔸 Integración perfecta con módulos existentes')
console.log('')
console.log('🎯 FLUJO DE TRABAJO:')
console.log('   1. Usuario genera respuestas en módulos de análisis')
console.log('   2. Respuestas se capturan automáticamente en tiempo real')
console.log('   3. Usuario va a pestaña "Evaluación"')
console.log('   4. Ve las respuestas disponibles con primera línea')
console.log('   5. Hace clic en "Evaluar Respuestas Reales"')
console.log('   6. Ve evaluación detallada de cada respuesta')
console.log('   7. Explora métricas, justificaciones y sugerencias')
console.log('')
console.log('🔧 CARACTERÍSTICAS TÉCNICAS:')
console.log('   ✅ API /api/gemini/evaluate con prompt crítico independiente')
console.log('   ✅ Métricas léxicas locales para cruce de datos')
console.log('   ✅ Puntuación combinada (70% IA + 30% métricas léxicas)')
console.log('   ✅ Componentes React con props de callback')
console.log('   ✅ Estado compartido entre módulos')
console.log('   ✅ Evaluación en tiempo real con indicadores de progreso')
console.log('   ✅ Historial persistente de evaluaciones')
console.log('')
console.log('📱 PARA USAR:')
console.log('   1. Ve al Laboratorio de IA')
console.log('   2. Genera respuestas en los módulos de análisis')
console.log('   3. Ve a la pestaña "Evaluación"')
console.log('   4. Haz clic en "Evaluar Respuestas Reales"')
console.log('   5. Explora los resultados detallados')
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
