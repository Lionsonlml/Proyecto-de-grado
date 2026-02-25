const { spawn } = require('child_process')

// Configurar variables de entorno
process.env.ENCRYPTION_KEY = 'default-key-change-in-production'
process.env.JWT_SECRET = 'default-jwt-secret-for-testing'

console.log('🚀 Iniciando TimeWize con módulo de evaluación de IA...')
console.log('')
console.log('🎯 MÓDULO DE EVALUACIÓN IMPLEMENTADO:')
console.log('   🔸 Prompt crítico independiente (reduce sesgo de autocomplacencia)')
console.log('   🔸 Explicación + puntuación detallada en 6 categorías')
console.log('   🔸 Cruce de métricas (70% IA + 30% métricas léxicas)')
console.log('   🔸 Gamificación con gráficas, badges y progreso')
console.log('   🔸 Integración perfecta en laboratorio de IA')
console.log('   🔸 Evaluación automática de respuestas generadas')
console.log('   🔸 Historial de evaluaciones con estadísticas')
console.log('')
console.log('📊 CARACTERÍSTICAS TÉCNICAS:')
console.log('   ✅ API /api/gemini/evaluate con prompt crítico')
console.log('   ✅ Métricas léxicas: diversidad, longitud, proporción V/N')
console.log('   ✅ Puntuación combinada para mayor precisión')
console.log('   ✅ Componente AIEvaluation gamificado')
console.log('   ✅ Componente EvaluationIntegration para otros módulos')
console.log('   ✅ Pestaña "Evaluación" en laboratorio de IA')
console.log('   ✅ Visualización de resultados en 4 pestañas')
console.log('')
console.log('🎮 FUNCIONALIDADES GAMIFICADAS:')
console.log('   🏆 Niveles de confianza: Excelente, Muy Buena, Buena, Regular, Necesita Mejora')
console.log('   📊 Gráficas de progreso para cada métrica')
console.log('   🎯 Badges de puntuación con colores dinámicos')
console.log('   📈 Historial de evaluaciones con estadísticas')
console.log('   ⚡ Evaluación en tiempo real con animaciones')
console.log('   🎨 Diseño consistente con la estética de la app')
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
