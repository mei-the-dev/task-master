import './TaskList.css';

export default function TaskList({ tasks, loading, error }) {
  if (loading) {
    return (
      <section>
        <h2>Today's Tasks</h2>
        <div role="status" aria-live="polite">Loading tasks…</div>
      </section>
    );
  }
  if (error) {
    return (
      <section>
        <h2>Today's Tasks</h2>
        <div role="alert" aria-live="assertive">{typeof error === 'string' ? error : 'An error occurred.'}</div>
      </section>
    );
  }
  // Defensive: treat null/undefined as empty
  // Defensive: filter out tasks with no id or title, warn on duplicates
  let safeTasks = Array.isArray(tasks) ? tasks : [];
  const seenIds = new Set();
  safeTasks = safeTasks.map((task, idx) => ({ ...task, id: task.id ?? idx })).filter((task, idx, arr) => {
    if (task.id == null) return false;
    if (seenIds.has(task.id)) {
      if (typeof window !== 'undefined') console.warn('Duplicate task id:', task.id);
      return false;
    }
    seenIds.add(task.id);
    return true;
  });
  const isEmpty = safeTasks.length === 0;
  const now = new Date();
  // Keyboard navigation: arrow keys move focus between tasks
  const listRef = React.useRef(null);
  const handleKeyDown = (e) => {
    if (!listRef.current) return;
    const items = Array.from(listRef.current.querySelectorAll('[role="listitem"]'));
    const idx = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' && idx >= 0 && idx < items.length - 1) {
      items[idx + 1].focus();
      e.preventDefault();
    } else if (e.key === 'ArrowUp' && idx > 0) {
      items[idx - 1].focus();
      e.preventDefault();
    }
  };
  return (
    <section aria-labelledby="tasklist-heading">
      <h2 id="tasklist-heading">Today's Tasks</h2>
      {isEmpty ? (
        <div role="status" aria-live="polite">No tasks for today.</div>
      ) : (
        <ul
          role="list"
          ref={listRef}
          tabIndex={0}
          aria-label="Task list"
          onKeyDown={handleKeyDown}
        >
          {safeTasks.map((task, idx) => {
            const title = task.title || 'Untitled';
            const status = task.status || 'unknown';
            const due = task.due_date ? new Date(task.due_date) : null;
            const overdue = due && due < now && status !== 'completed';
            import React, { useMemo } from 'react';
            return (
              <li
                key={task.id ?? idx}
                role="listitem"
                className={[
                  completed ? 'completed' : '',
                  overdue ? 'overdue' : '',
                ].join(' ').trim()}
                tabIndex={0}
                aria-label={`${title}, status: ${status}${due ? ', due ' + due.toLocaleString() : ''}${completed ? ', completed' : ''}${overdue ? ', overdue' : ''}`}
              >
                <span className="status-badge" aria-label={`Status: ${status}`}>{status}</span>{' '}
                <strong style={completed ? { textDecoration: 'line-through', color: '#888' } : {}}>{title}</strong>
                {due && (
                  <span> - Due: {due.toLocaleString()}</span>
                )}
                {task.tags && task.tags.length > 0 && (
                  <span> [{task.tags.join(', ')}]</span>
              let safeTasks = useMemo(() => {
                let arr = Array.isArray(tasks) ? tasks : [];
                const seenIds = new Set();
                arr = arr.map((task, idx) => ({ ...task, id: task.id ?? idx })).filter((task, idx, arr) => {
                  if (task.id == null) return false;
                  if (seenIds.has(task.id)) {
                    if (typeof window !== 'undefined') console.warn('Duplicate task id:', task.id);
                    return false;
                  }
                  seenIds.add(task.id);
                  return true;
                });
                return arr;
              }, [tasks]);
              const isEmpty = safeTasks.length === 0;
              const now = new Date();

              // Virtualization placeholder for >100 tasks
              if (safeTasks.length > 100) {
                return (
                  <section aria-labelledby="tasklist-heading">
                    <h2 id="tasklist-heading">Today's Tasks</h2>
                    <div role="status" aria-live="polite">Too many tasks to display efficiently. Please filter your list.</div>
                  </section>
                );
              }
