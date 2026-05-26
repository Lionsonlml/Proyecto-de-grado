const { encryptSensitiveData, decryptSensitiveData } = require('./_encryption-helper')

// Probar el cifrado
console.log('🔐 Probando cifrado...')

const testData = "Revisar emails"
console.log('Datos originales:', testData)

const encrypted = encryptSensitiveData(testData)
console.log('Datos cifrados:', encrypted)

const decrypted = decryptSensitiveData(encrypted)
console.log('Datos descifrados:', decrypted)

if (testData === decrypted) {
  console.log('✅ Cifrado funciona correctamente!')
} else {
  console.log('❌ Error en el cifrado')
}
