import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Tasks() {
  const [tasks, setTasks] = useState(null)

  useEffect(() => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks))
      .catch(() => setTasks([]))
  }, [])

  return (
    <div style={{padding:20}}>
      <h2>Tasks (MVP)</h2>
      {tasks === null && <p>Loading...</p>}
      {tasks && tasks.length === 0 && <p>No active tasks found.</p>}
      {tasks && tasks.length > 0 && (
        <ul>
          {tasks.map((t) => (
            <li key={t.issue_id || t.issue_id || t.id}>
              <strong>Issue #{t.issue_id}</strong>: {t.requirements?.primary || 'No title'} - <em>{t.status}</em>
            </li>
          ))}
        </ul>
      )}
      <Link href="/">Back</Link>
    </div>
  )
}
