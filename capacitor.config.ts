import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.timewize.app",
  appName: "TimeWize",
  // Capacitor sirve de envoltorio WebView que apunta a Vercel.
  // No usamos output:'export' — el middleware Next.js sigue activo.
  webDir: "out",
  server:
    process.env.NODE_ENV === "production"
      ? {
          // URL de la app desplegada en Vercel
          url: "https://timewize.vercel.app",
          cleartext: false,
        }
      : {
          // Emulador Android accede al host de desarrollo por 10.0.2.2
          url: "http://10.0.2.2:3000",
          cleartext: true,
        },
  android: {
    allowMixedContent: false,
  },
}

export default config
