export default function TaskList({ tasks }) {
  return (
    <section>
      <h2>Today's Tasks</h2>
      <ul>
        {tasks && tasks.length > 0 ? tasks.map(task => (
          <li key={task.id}>
            <strong>{task.title}</strong> ({task.status})
            {task.due_date && <span> - Due: {new Date(task.due_date).toLocaleString()}</span>}
            {task.tags && task.tags.length > 0 && <span> [{task.tags.join(', ')}]</span>}
          </li>
        )) : <li>No tasks for today.</li>}
      </ul>
    </section>
  )
}
