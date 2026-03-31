import { readFileSync, writeFileSync } from 'fs'

const path = 'dist/client/wrangler.json'
const config = JSON.parse(readFileSync(path, 'utf-8'))

config.main = '../../worker/index.ts'

writeFileSync(path, JSON.stringify(config, null, 2))
console.log('✓ Patched wrangler.json → main: ../../worker/index.ts')
