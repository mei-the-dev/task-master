import React from 'react';
import TaskCard from './TaskCard';

export default function TaskBoard({ tasks }) {
  const columns = ['Backlog', 'In Progress', 'Review', 'Blocked', 'Done'];
  return (
    <div className="task-board">
      {columns.map(col => (
        <div key={col} className="task-column">
          <h2>{col}</h2>
          {tasks.filter(t => t.status === col).map(task => (
            <TaskCard key={task.id} {...task} />
          ))}
        </div>
      ))}
    </div>
  );
}
