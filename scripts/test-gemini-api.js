#!/usr/bin/env node
/**
 * Script para diagnosticar problemas con la API de Gemini
 */

const fs = require('fs')
const path = require('path')

// Leer .env.local manualmente
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const apiKeyMatch = envContent.match(/GEMINI_API_KEY=(.+)/)
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY no está configurada en .env.local')
  process.exit(1)
}

async function testGeminiAPI() {
  console.log(`\n🔍 Probando API de Gemini...`)
  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(-10)}`)
  console.log(`📌 Modelos a probar: gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro\n`)

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
  
  for (const model of models) {
    console.log(`\n⏳ Probando modelo: ${model}`)
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Hola, ¿cómo estás?" }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 100,
            },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No hay respuesta'
        console.log(`✅ FUNCIONA: ${model}`)
        console.log(`📝 Respuesta: ${responseText.substring(0, 100)}...`)
        return model
      } else {
        const errorData = await response.json()
        console.log(`❌ ERROR ${response.status}: ${model}`)
        console.log(`   Mensaje: ${errorData.error?.message || 'Error desconocido'}`)
      }
    } catch (error) {
      console.log(`❌ EXCEPCIÓN: ${model}`)
      console.log(`   ${error.message}`)
    }
  }

  console.log(`\n⚠️  NINGÚN MODELO FUNCIONA`)
  console.log(`\nPosibles causas:`)
  console.log(`1. Clave API inválida o expirada`)
  console.log(`2. Proyecto Google Cloud sin acceso a Generative AI API`)
  console.log(`3. Cuota excedida`)
  console.log(`4. Problema de conectividad`)
  
  console.log(`\n✅ SOLUCIONES:`)
  console.log(`1. Ve a: https://console.cloud.google.com/apis/dashboard`)
  console.log(`2. Busca y habilita "Generative Language API"`)
  console.log(`3. Ve a Credentials y crea una nueva API Key`)
  console.log(`4. Reemplaza GEMINI_API_KEY en .env.local`)
  
  process.exit(1)
}

testGeminiAPI()
