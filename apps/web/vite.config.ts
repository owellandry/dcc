import fs from 'node:fs'
import path from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig, loadEnv } from 'vite'
import vinext from 'vinext'

const originalDebug = console.debug.bind(console)
console.debug = (...args: unknown[]) => {
  const first = args[0]
  if (typeof first === 'string' && first.startsWith('[vinext:optimize-imports] skipping "lucide-react"')) {
    return
  }
  originalDebug(...args)
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.DEV_API_PROXY_TARGET || 'http://127.0.0.1:8080'
  const proxyWsTarget = proxyTarget.replace(/^http/i, 'ws')
  const enableHttps = command === 'serve' && ['1', 'true', 'yes'].includes((env.DEV_HTTPS || '').toLowerCase())
  const certFile = env.DEV_HTTPS_CERT_FILE
    ? path.resolve(env.DEV_HTTPS_CERT_FILE)
    : path.resolve(process.cwd(), 'certs/dev-local.pfx')
  const https =
    enableHttps && fs.existsSync(certFile)
      ? {
          pfx: fs.readFileSync(certFile),
          passphrase: env.DEV_HTTPS_CERT_PASSWORD || 'dcc-dev-https',
        }
      : undefined

  return {
    plugins: [
      vinext(),
      ...(command === 'build'
        ? [
            cloudflare({
              viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
            }),
          ]
        : []),
    ],
    server: {
      proxy: {
        '/v1': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: proxyWsTarget,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
      ...(https ? { https } : {}),
    },
  }
})
