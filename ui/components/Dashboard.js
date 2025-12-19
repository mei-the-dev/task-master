import React from 'react';
import TaskList from './TaskList';
import CalendarWidget from './CalendarWidget';
import AnalyticsWidget from './AnalyticsWidget';
import PersonalTaskForm from './PersonalTaskForm';

export default function Dashboard({ tasks, events, analytics, loading, error }) {
  const [taskList, setTaskList] = React.useState(tasks || []);
  const [isLoading, setIsLoading] = React.useState(!!loading);
  const [err, setErr] = React.useState(error || null);

  React.useEffect(() => {
    setTaskList(tasks || []);
    setIsLoading(!!loading);
    setErr(error || null);
  }, [tasks, loading, error]);

  const handleSave = async (taskData) => {
    setIsLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/personal-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create task');
      // Refetch tasks
      const tasksRes = await fetch('/api/personal-tasks');
      const data = await tasksRes.json();
      setTaskList(data.tasks || []);
    } catch (e) {
      setErr(e.message || 'Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 24 }}>
      <div style={{ flex: 2 }}>
        <PersonalTaskForm onSave={handleSave} />
        <TaskList tasks={taskList} loading={isLoading} error={err} />
        <AnalyticsWidget analytics={analytics} />
      </div>
      <div style={{ flex: 1 }}>
        <CalendarWidget events={events} />
      </div>
    </div>
  );
}
