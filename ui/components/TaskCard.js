import React from 'react';

export default function TaskCard({ title, status, assignee }) {
  return (
    <div className={`task-card ${status?.toLowerCase()}`}>
      <h3>{title}</h3>
      {assignee && <span>Assignee: {assignee}</span>}
      <span>Status: {status}</span>
    </div>
  );
}
