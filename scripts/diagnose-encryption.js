const { createClient } = require('@libsql/client')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

// Debe coincidir con lib/encryption.ts
const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32
const IV_LENGTH = 16

function getKeyFromEnv(keyEnv) {
  const key = keyEnv || process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
  return crypto.scryptSync(key, 'salt', KEY_LENGTH)
}

function isEncryptedFormat(data) {
  if (!data || typeof data !== 'string') return false
  const parts = data.split(':')
  if (parts.length !== 2) return false
  const [ivHex, payloadHex] = parts
  const hexRegex = /^[0-9a-fA-F]+$/
  if (!hexRegex.test(ivHex) || !hexRegex.test(payloadHex)) return false
  if (ivHex.length !== IV_LENGTH * 2) return false
  return true
}

function tryDecryptWithKey(hexData, keyBuffer) {
  try {
    if (!isEncryptedFormat(hexData)) return { ok: false, reason: 'not_encrypted' }
    const parts = hexData.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return { ok: true, text: decrypted }
  } catch (err) {
    return { ok: false, reason: (err && err.message) ? err.message : 'bad_decrypt' }
  }
}

async function run() {
  const dbPath = path.join(process.cwd(), 'data', 'app.db')
  if (!fs.existsSync(dbPath)) {
    console.error('No existe la DB en:', dbPath)
    process.exit(1)
  }

  const client = createClient({ url: `file:${dbPath}` })
  const currentKey = getKeyFromEnv(process.env.ENCRYPTION_KEY)

  const report = []

  // Tables and fields to check
  const checks = [
    { table: 'tasks', fields: ['title', 'description', 'tags'] },
    { table: 'moods', fields: ['notes'] },
    { table: 'ai_insights', fields: ['prompt', 'response', 'metadata'] },
  ]

  for (const chk of checks) {
    const rows = await client.execute(`SELECT id, ${chk.fields.join(', ')} FROM ${chk.table}`)
    for (const row of rows.rows) {
      for (const field of chk.fields) {
        const raw = row[field]
        if (raw === null || raw === undefined) continue
        const isFmt = isEncryptedFormat(raw)
        const tryCurrent = isFmt ? tryDecryptWithKey(raw, currentKey) : { ok: false, reason: 'not_encrypted_format' }

        report.push({ table: chk.table, id: row.id, field, rawPreview: String(raw).slice(0, 120), isEncryptedFormat: isFmt, decryptWithCurrentKey: tryCurrent })
      }
    }
  }

  const out = path.join(process.cwd(), 'encryption-diagnosis.json')
  fs.writeFileSync(out, JSON.stringify(report, null, 2))
  console.log('Reporte escrito en', out)
  const summary = report.reduce((acc, r) => {
    acc.total = (acc.total || 0) + 1
    if (r.isEncryptedFormat) acc.encryptedFormat = (acc.encryptedFormat || 0) + 1
    if (r.decryptWithCurrentKey && r.decryptWithCurrentKey.ok) acc.decryptable = (acc.decryptable || 0) + 1
    if (r.decryptWithCurrentKey && !r.decryptWithCurrentKey.ok) acc.failed = (acc.failed || 0) + 1
    return acc
  }, {})

  console.log('Resumen:', summary)
  console.log('Revisa encryption-diagnosis.json para detalles. Si hay filas con isEncryptedFormat=true y decryptWithCurrentKey.ok=false, necesitarás la clave anterior para recuperarlas.')
}

run().catch(err => { console.error(err); process.exit(1) })
