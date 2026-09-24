function ChatMessage({ message }) {
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

        {message.data && message.type === 'department_summary' && (
          <div className="department-summary-card">
            <div><span>Employees</span><strong>{message.data.employees}</strong></div>
            <div><span>Average salary</span><strong>{message.data.averageSalary}</strong></div>
            <div><span>Locations</span><strong>{message.data.locations.length}</strong></div>
          </div>
        )}

        {message.employees && message.employees.length > 0 && (
          <div className="chat-employee-list">
            {message.employees.map((employee) => (
              <div className="chat-employee-item" key={employee.id}>
                <div className="employee-card-heading">
                  <span className="chat-avatar">{employee.name.slice(0, 1)}</span>
                  <div>
                    <h4>{employee.name}</h4>
                    <p>{employee.role}</p>
                  </div>
                </div>
                <div className="employee-card-meta">
                  <span>{employee.department}</span>
                  <span>{employee.location}</span>
                </div>
                <div className="employee-skill-row">
                  {employee.skills.slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        <span className="message-time">{message.time}</span>
      </div>
    </div>
  );
}

export default ChatMessage;
