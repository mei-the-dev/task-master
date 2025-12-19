import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from './TaskCard';

describe('TaskCard', () => {
  it('renders title, status, and assignee', () => {
    render(<TaskCard title="Test Task" status="In Progress" assignee="Alice" />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders without assignee', () => {
    render(<TaskCard title="No Assignee" status="To Do" />);
    expect(screen.getByText('No Assignee')).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('calls onEdit when Edit button clicked', () => {
    const onEdit = jest.fn();
    render(<TaskCard title="Edit Me" status="To Do" onEdit={onEdit} />);
    fireEvent.click(screen.getByLabelText('Edit task'));
    expect(onEdit).toHaveBeenCalled();
  });

  it('calls onDelete when Delete button clicked', () => {
    const onDelete = jest.fn();
    render(<TaskCard title="Delete Me" status="Done" onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Delete task'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('calls onStatusChange when Change Status button clicked', () => {
    const onStatusChange = jest.fn();
    render(<TaskCard title="Change Status" status="In Progress" onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByLabelText('Change status'));
    expect(onStatusChange).toHaveBeenCalled();
  });

  it('applies correct status class', () => {
    render(<TaskCard title="Class Test" status="In Progress" />);
    const card = screen.getByText('Class Test').closest('.task-card');
    expect(card.className).toMatch(/status-in-progress/);
  });
});
