import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  try {
    const ctxDir = path.resolve(process.cwd(), '.task-context')
    if (!fs.existsSync(ctxDir)) {
      return res.status(200).json({ tasks: [] })
    }

    const files = fs.readdirSync(ctxDir).filter((f) => f.endsWith('.json'))
    const tasks = files.map((f) => {
      try {
        const content = fs.readFileSync(path.join(ctxDir, f), 'utf8')
        return JSON.parse(content)
      } catch (e) {
        return { error: String(e), file: f }
      }
    })

    res.status(200).json({ tasks })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
}
