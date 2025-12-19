
import React from 'react';
import PropTypes from 'prop-types';
import './TaskList.css';

/**
 * TaskCard component displays a single task's key info and actions.
 * Props:
 * - title: string (required)
 * - status: string (e.g. 'To Do', 'In Progress', 'Done')
 * - assignee: string (optional)
 * - onEdit: function (optional)
 * - onDelete: function (optional)
 * - onStatusChange: function (optional)
 */
export default function TaskCard({ title, status, assignee, onEdit, onDelete, onStatusChange }) {
  return (
    <div className={`task-card status-${status?.toLowerCase().replace(/\s/g, '-')}`.trim()}>
      <div className="task-card-header">
        <h3 className="task-title">{title}</h3>
        {assignee && <span className="task-assignee">{assignee}</span>}
      </div>
      <div className="task-card-status">{status}</div>
      <div className="task-card-actions">
        {onEdit && <button aria-label="Edit task" onClick={onEdit}>Edit</button>}
        {onDelete && <button aria-label="Delete task" onClick={onDelete}>Delete</button>}
        {onStatusChange && (
          <button aria-label="Change status" onClick={onStatusChange}>Change Status</button>
        )}
      </div>
    </div>
  );
}

TaskCard.propTypes = {
  title: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  assignee: PropTypes.string,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onStatusChange: PropTypes.func,
};
