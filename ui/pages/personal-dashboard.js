import Dashboard from '../components/Dashboard'

// Mock data for now
const mockTasks = [
  { id: 1, title: 'Design new dashboard layout', status: 'pending', due_date: new Date().toISOString(), tags: ['design'] },
  { id: 2, title: 'Review calendar integration', status: 'in_progress', due_date: new Date().toISOString(), tags: ['calendar'] },
  { id: 3, title: 'Morning standup', status: 'completed', due_date: new Date().toISOString(), tags: ['meeting'] }
]
const mockEvents = []
const mockAnalytics = {}

export default function PersonalDashboard() {
  return <Dashboard tasks={mockTasks} events={mockEvents} analytics={mockAnalytics} />
}
