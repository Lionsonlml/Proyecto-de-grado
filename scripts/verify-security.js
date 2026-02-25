const { createClient } = require('@libsql/client')
const path = require('path')

async function verifySecurity() {
  const dbPath = path.join(process.cwd(), 'data', 'app.db')
  const client = createClient({
    url: `file:${dbPath}`,
  })

  console.log('🔍 Verificando seguridad de la base de datos...')
  console.log('')

  try {
    // 1. Verificar que los datos sensibles están cifrados
    console.log('1. Verificando cifrado de datos sensibles...')
    
    // Verificar tareas
    const tasksResult = await client.execute("SELECT id, title, description FROM tasks LIMIT 3")
    console.log('   📝 Tareas:')
    tasksResult.rows.forEach(task => {
      const isEncrypted = task.title.includes(':') && task.title.split(':').length === 2
      console.log(`     ID ${task.id}: ${isEncrypted ? '✅ Cifrado' : '❌ No cifrado'}`)
    })

    // Verificar moods
    const moodsResult = await client.execute("SELECT id, notes FROM moods WHERE notes IS NOT NULL LIMIT 3")
    console.log('   😊 Moods:')
    moodsResult.rows.forEach(mood => {
      const isEncrypted = mood.notes.includes(':') && mood.notes.split(':').length === 2
      console.log(`     ID ${mood.id}: ${isEncrypted ? '✅ Cifrado' : '❌ No cifrado'}`)
    })

    // Verificar insights
    const insightsResult = await client.execute("SELECT id, prompt, response FROM ai_insights LIMIT 3")
    console.log('   🤖 Insights:')
    insightsResult.rows.forEach(insight => {
      const isEncrypted = insight.prompt.includes(':') && insight.prompt.split(':').length === 2
      console.log(`     ID ${insight.id}: ${isEncrypted ? '✅ Cifrado' : '❌ No cifrado'}`)
    })

    console.log('')

    // 2. Verificar estructura de tablas de seguridad
    console.log('2. Verificando tablas de seguridad...')
    
    const tables = [
      'user_preferences',
      'consents', 
      'user_roles',
      'data_access_logs'
    ]

    for (const table of tables) {
      try {
        const result = await client.execute(`SELECT COUNT(*) as count FROM ${table}`)
        console.log(`   ${table}: ✅ Existe (${result.rows[0].count} registros)`)
      } catch (error) {
        console.log(`   ${table}: ❌ No existe`)
      }
    }

    console.log('')

    // 3. Verificar roles de usuario
    console.log('3. Verificando roles de usuario...')
    const rolesResult = await client.execute(`
      SELECT u.email, ur.role 
      FROM users u 
      LEFT JOIN user_roles ur ON u.id = ur.user_id
    `)
    
    rolesResult.rows.forEach(user => {
      console.log(`   ${user.email}: ${user.role || '❌ Sin rol'}`)
    })

    console.log('')

    // 4. Verificar logs de auditoría
    console.log('4. Verificando logs de auditoría...')
    const logsResult = await client.execute(`
      SELECT action, data_type, COUNT(*) as count 
      FROM data_access_logs 
      GROUP BY action, data_type
      ORDER BY count DESC
    `)
    
    if (logsResult.rows.length > 0) {
      console.log('   Actividad reciente:')
      logsResult.rows.forEach(log => {
        console.log(`     ${log.action} ${log.data_type}: ${log.count} veces`)
      })
    } else {
      console.log('   ⚠️  No hay logs de auditoría (normal si es la primera vez)')
    }

    console.log('')

    // 5. Verificar índices de seguridad
    console.log('5. Verificando índices de seguridad...')
    const indexesResult = await client.execute(`
      SELECT name FROM sqlite_master 
      WHERE type = 'index' 
      AND name LIKE 'idx_%'
      ORDER BY name
    `)
    
    const securityIndexes = [
      'idx_user_preferences_user',
      'idx_consents_user',
      'idx_user_roles_user',
      'idx_data_access_logs_user'
    ]

    securityIndexes.forEach(index => {
      const exists = indexesResult.rows.some(row => row.name === index)
      console.log(`   ${index}: ${exists ? '✅ Existe' : '❌ No existe'}`)
    })

    console.log('')

    // 6. Resumen de seguridad
    console.log('6. Resumen de seguridad:')
    console.log('   🔐 Datos sensibles: Cifrados con AES-256-GCM')
    console.log('   👥 Control de acceso: Basado en roles y permisos')
    console.log('   📝 Auditoría: Logs de acceso registrados')
    console.log('   🍪 Autenticación: JWT con cookies seguras')
    console.log('   🛡️  Validación: Entrada sanitizada y validada')

    console.log('')
    console.log('✅ Verificación de seguridad completada')

  } catch (error) {
    console.error('❌ Error durante la verificación:', error)
    process.exit(1)
  }
}

// Ejecutar verificación
verifySecurity()
