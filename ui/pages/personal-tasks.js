import { useEffect, useState } from 'react'
import PersonalTaskForm from '../components/PersonalTaskForm'
import TaskList from '../components/TaskList'

export default function PersonalTasks() {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchTasks = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/personal-tasks')
      const data = await res.json()
      if (res.ok) setTasks(data.tasks)
      else setError(data.error || 'Failed to load tasks')
    } catch (err) {
      setError('Error: ' + err.message)
    } finally {
      setLoading(false)
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
      <PersonalTaskForm onSave={handleSave} />
      <TaskList tasks={tasks} loading={loading} error={error} />
    </div>
  )
}
