const { createClient } = require('@libsql/client')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

// Debe coincidir con lib/encryption.ts
const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32
const IV_LENGTH = 16

function getKeyFromEnv(keyRaw) {
  if (!keyRaw) throw new Error('Se requiere la clave (env OLD_ENCRYPTION_KEY/NEW_ENCRYPTION_KEY)')
  return crypto.scryptSync(keyRaw, 'salt', KEY_LENGTH)
}

function encryptWithKey(text, keyBuf) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuf, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function tryDecryptWithKey(hexData, keyBuf) {
  try {
    const parts = hexData.split(':')
    if (parts.length !== 2) return { ok: false, reason: 'format' }
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return { ok: true, text: decrypted }
  } catch (err) {
    return { ok: false, reason: err && err.message ? err.message : String(err) }
  }
}

async function run() {
  const OLD = process.env.OLD_ENCRYPTION_KEY
  const NEW = process.env.NEW_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY
  if (!OLD) {
    console.error('Por seguridad, especifique la clave antigua en la variable de entorno OLD_ENCRYPTION_KEY')
    process.exit(1)
  }
  if (!NEW) {
    console.error('Especifique la nueva clave en NEW_ENCRYPTION_KEY o ENCRYPTION_KEY')
    process.exit(1)
  }

  const oldKey = getKeyFromEnv(OLD)
  const newKey = getKeyFromEnv(NEW)

  const dbPath = path.join(process.cwd(), 'data', 'app.db')
  if (!fs.existsSync(dbPath)) {
    console.error('No existe la DB en:', dbPath)
    process.exit(1)
  }

  const client = createClient({ url: `file:${dbPath}` })

  const checks = [
    { table: 'tasks', fields: ['title', 'description', 'tags'] },
    { table: 'moods', fields: ['notes'] },
    { table: 'ai_insights', fields: ['prompt', 'response', 'metadata'] },
  ]

  let changed = 0

  for (const chk of checks) {
    const rows = await client.execute(`SELECT id, ${chk.fields.join(', ')} FROM ${chk.table}`)
    for (const row of rows.rows) {
      const updates = {}
      for (const field of chk.fields) {
        const raw = row[field]
        if (raw === null || raw === undefined) continue
        const dec = tryDecryptWithKey(raw, oldKey)
        if (dec.ok) {
          const reenc = encryptWithKey(dec.text, newKey)
          updates[field] = reenc
        }
      }

      if (Object.keys(updates).length > 0) {
        const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ')
        const args = [...Object.values(updates), row.id]
        await client.execute({ sql: `UPDATE ${chk.table} SET ${setClause} WHERE id = ?`, args })
        changed++
      }
    }
  }

  console.log(`Re-encriptadas ${changed} filas con la nueva clave.`)
  console.log('IMPORTANTE: una vez verificado, actualiza ENCRYPTION_KEY en tu entorno a la nueva clave y reinicia la app.')
}

run().catch(err => { console.error(err); process.exit(1) })
