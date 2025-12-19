
import React from 'react';
import Dashboard from '../components/Dashboard';

export default function PersonalDashboard() {
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    setLoading(true);
    fetch('/api/personal-tasks')
      .then(res => res.json())
      .then(data => {
        setTasks(data.tasks || []);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message || 'Failed to load tasks');
        setLoading(false);
      });
  }, []);

  // TODO: fetch real events/analytics if needed
  return <Dashboard tasks={tasks} events={[]} analytics={{}} loading={loading} error={error} />;
}
