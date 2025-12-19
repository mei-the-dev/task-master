import TaskList from './TaskList'
import CalendarWidget from './CalendarWidget'
import AnalyticsWidget from './AnalyticsWidget'

export default function Dashboard({ tasks, events, analytics }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 24 }}>
      <div style={{ flex: 2 }}>
        <TaskList tasks={tasks} />
        <AnalyticsWidget analytics={analytics} />
      </div>
      <div style={{ flex: 1 }}>
        <CalendarWidget events={events} />
      </div>
    </div>
  )
}
