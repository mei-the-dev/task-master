import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskList from './TaskList';

describe('TaskList Component', () => {
  test('renders loading state', () => {
    render(<TaskList loading tasks={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading tasks');
  });

  test('renders error state', () => {
    render(<TaskList error="Network error" tasks={[]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });

  test('renders empty state', () => {
    render(<TaskList tasks={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent('No tasks for today');
  });

  test('renders a list of tasks', () => {
    const tasks = [
      { id: 1, title: 'Task 1', status: 'in_progress' },
      { id: 2, title: 'Task 2', status: 'done' },
    ];
    render(<TaskList tasks={tasks} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  test('filters out tasks with no id', () => {
    const tasks = [
      { title: 'No ID' },
      { id: 2, title: 'Valid' },
    ];
    render(<TaskList tasks={tasks} />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
    expect(screen.queryByText('No ID')).not.toBeInTheDocument();
  });

  test('handles duplicate task ids', () => {
    const tasks = [
      { id: 1, title: 'Task 1' },
      { id: 1, title: 'Task 1 Duplicate' },
    ];
    render(<TaskList tasks={tasks} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.queryByText('Task 1 Duplicate')).not.toBeInTheDocument();
  });

  test('is accessible via keyboard navigation', () => {
    const tasks = [
      { id: 1, title: 'Task 1' },
      { id: 2, title: 'Task 2' },
    ];
    render(<TaskList tasks={tasks} />);
    const items = screen.getAllByRole('listitem');
    items[0].focus();
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[0]);
  });

  test('warns on performance with many tasks', () => {
    const tasks = Array.from({ length: 101 }, (_, i) => ({ id: i, title: `Task ${i}` }));
    render(<TaskList tasks={tasks} />);
    expect(screen.getByText('Too many tasks to display efficiently')).toBeInTheDocument();
  });

  // Add more tests for edge cases, error boundaries, and integration as needed
});
