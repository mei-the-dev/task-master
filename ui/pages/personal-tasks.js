import { useEffect, useState } from 'react'
import PersonalTaskForm from '../components/PersonalTaskForm'

export default function PersonalTasks() {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')

  const fetchTasks = async () => {
    setError('')
    try {
      const res = await fetch('/api/personal-tasks')
      const data = await res.json()
      if (res.ok) setTasks(data.tasks)
      else setError(data.error || 'Failed to load tasks')
    } catch (err) {
      setError('Error: ' + err.message)
    }
  }

  useEffect(() => { fetchTasks() }, [])

  const handleSave = async (task) => {
    setError('')
    try {
      const res = await fetch('/api/personal-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      })
      const data = await res.json()
      if (res.ok) {
        fetchTasks()
      } else {
        setError(data.error || 'Failed to create task')
      }
    } catch (err) {
      setError('Error: ' + err.message)
    }
  }

  return (
    <div style={{padding:20}}>
      <h2>Personal Tasks</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      <PersonalTaskForm onSave={handleSave} />
      <ul>
        {tasks.map(t => (
          <li key={t.id}><strong>{t.title}</strong> ({t.status})</li>
        ))}
      </ul>
    </div>
  )
}
