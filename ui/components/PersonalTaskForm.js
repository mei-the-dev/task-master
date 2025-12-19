import { useState } from 'react'

export default function PersonalTaskForm({ onSave }) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [recurrence, setRecurrence] = useState('')
  const [reminders, setReminders] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      title,
      due_date: dueDate,
      priority,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      notes,
      recurrence,
      reminders: reminders.split(',').map(r => r.trim()).filter(Boolean)
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{padding:20, border:'1px solid #ccc', marginBottom:20}}>
      <div>
        <label>Title: </label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
      </div>
      <div>
        <label>Due Date: </label>
        <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </div>
      <div>
        <label>Priority: </label>
        <select value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div>
        <label>Tags: </label>
        <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="comma separated" />
      </div>
      <div>
        <label>Notes: </label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div>
        <label>Recurrence: </label>
        <input type="text" value={recurrence} onChange={e => setRecurrence(e.target.value)} placeholder="e.g. weekly" />
      </div>
      <div>
        <label>Reminders: </label>
        <input type="text" value={reminders} onChange={e => setReminders(e.target.value)} placeholder="comma separated datetimes" />
      </div>
      <button type="submit">Save Task</button>
    </form>
  )
}
