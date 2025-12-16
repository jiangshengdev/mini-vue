import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runAllScriptsInDir } from './_shared/run-all.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

runAllScriptsInDir(__dirname, { emptyMessage: 'No check scripts found.' })
