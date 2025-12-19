import React from 'react';
import { render, screen } from '@testing-library/react';
import TaskBoard from './TaskBoard';

const mockTasks = [
  { id: 1, title: 'Task 1', status: 'Backlog' },
  { id: 2, title: 'Task 2', status: 'In Progress' },
  { id: 3, title: 'Task 3', status: 'Review' },
  { id: 4, title: 'Task 4', status: 'Blocked' },
  { id: 5, title: 'Task 5', status: 'Done' },
];

test('renders all columns and cards', () => {
  render(<TaskBoard tasks={mockTasks} />);
  ['Backlog', 'In Progress', 'Review', 'Blocked', 'Done'].forEach(col => {
    expect(screen.getByText(col)).toBeInTheDocument();
  });
  mockTasks.forEach(task => {
    expect(screen.getByText(task.title)).toBeInTheDocument();
  });
});
