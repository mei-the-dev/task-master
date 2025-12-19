import fs from 'fs'
import path from 'path'

const ctxDir = path.resolve(process.cwd(), '.task-context')
if (!fs.existsSync(ctxDir)) {
  console.error('.task-context directory not found')
  process.exit(1)
}

const files = fs.readdirSync(ctxDir).filter((f) => f.endsWith('.json'))
const tasks = files.map((f) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ctxDir, f), 'utf8'))
  } catch (e) {
    return { error: String(e), file: f }
  }
})

console.log(JSON.stringify({ tasks }, null, 2))
