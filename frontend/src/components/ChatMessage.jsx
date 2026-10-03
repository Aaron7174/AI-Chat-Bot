import { Link } from 'react-router-dom';

function ChatMessage({ message, messageIndex, onSuggestion, onConfirmAttendance, onCancelAttendance }) {
  const isUser = message.sender === 'user';

  return (
    <div className={`chat-row ${isUser ? 'user' : 'bot'}`}>
      <div className={`message-bubble ${isUser ? 'user' : 'bot'}`}>
        {message.text && <p className="message-text">{message.text}</p>}

        {message.stats && message.stats.length > 0 && (
          <div className="chat-stats-grid">
            {message.stats.map((stat) => (
              <div className="chat-stat-card" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        )}

        {message.attendanceSummary && (
          <div className="chat-stats-grid">
            {[
              ['Status', message.attendanceSummary.status],
              ['Worked', `${Math.floor((message.attendanceSummary.workingMinutes || 0) / 60)}h ${(message.attendanceSummary.workingMinutes || 0) % 60}m`],
              ['Late minutes', message.attendanceSummary.lateMinutes || 0],
              ['Overtime minutes', message.attendanceSummary.overtimeMinutes || 0],
            ].map(([label, value]) => <div className="chat-stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
        )}

        {message.attendanceAction && (
          <div className="chat-followups" aria-label="Confirm attendance action">
            <button type="button" onClick={() => onConfirmAttendance?.(message.attendanceAction)}>
              Confirm {message.attendanceAction === 'CHECK_IN' ? 'check-in' : 'check-out'}
            </button>
            <button type="button" onClick={() => onCancelAttendance?.(messageIndex)}>Cancel</button>
          </div>
        )}

        {message.attendanceUrl && (
          <Link className="chat-directory-link" to={message.attendanceUrl}>Open attendance <span aria-hidden="true">→</span></Link>
        )}

        {message.employees && message.employees.length > 0 && (
          <div className="chat-employee-list">
            {message.employees.map((employee) => (
              <div className="chat-employee-item" key={employee.id}>
                <div className="employee-card-heading">
                  <span className="chat-avatar">{(employee.name || '?').slice(0, 1).toUpperCase()}</span>
                  <div>
                    <h4>{employee.name || 'Unnamed employee'}</h4>
                    <p>{employee.role || 'Role not specified'}</p>
                  </div>
                </div>
                <div className="employee-card-meta">
                  <span>{employee.department || 'Department not set'}</span>
                  <span>{employee.location || 'Location not set'}</span>
                </div>
                <div className="employee-skill-row">
                  {(employee.skills || []).slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}
                </div>
                {employee.status && <small className="chat-employee-status">{employee.status.replace('_', ' ')}</small>}
                <Link className="chat-profile-link" to={`/employee/${employee.id}`}>Open profile <span aria-hidden="true">→</span></Link>
              </div>
            ))}
          </div>
        )}

        {message.hasMore && message.directoryUrl && (
          <Link className="chat-directory-link" to={message.directoryUrl}>
            Browse all {message.total} matches <span aria-hidden="true">→</span>
          </Link>
        )}

        {!isUser && message.suggestions?.length > 0 && onSuggestion && (
          <div className="chat-followups" aria-label="Suggested questions">
            {message.suggestions.slice(0, 3).map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => onSuggestion(suggestion)}>{suggestion}</button>
            ))}
          </div>
        )}

        <span className="message-time">{message.time}</span>
      </div>
    </div>
  );
}

export default ChatMessage;
