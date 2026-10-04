import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const networkParticles = [
  { left: '14%', top: '18%', size: 4, delay: '0s' },
  { left: '28%', top: '28%', size: 5, delay: '1.4s' },
  { left: '35%', top: '48%', size: 4, delay: '2.2s' },
  { left: '46%', top: '23%', size: 6, delay: '0.5s' },
  { left: '57%', top: '34%', size: 5, delay: '1.7s' },
  { left: '68%', top: '18%', size: 4, delay: '1.1s' },
  { left: '72%', top: '48%', size: 6, delay: '2.6s' },
  { left: '18%', top: '62%', size: 5, delay: '0.8s' },
  { left: '32%', top: '72%', size: 4, delay: '1.8s' },
  { left: '48%', top: '66%', size: 5, delay: '2.9s' },
  { left: '62%', top: '72%', size: 6, delay: '1.3s' },
  { left: '80%', top: '60%', size: 4, delay: '0.3s' },
  { left: '82%', top: '74%', size: 5, delay: '2.1s' },
  { left: '64%', top: '50%', size: 4, delay: '0.7s' },
  { left: '22%', top: '46%', size: 4, delay: '2.4s' },
  { left: '39%', top: '12%', size: 5, delay: '1.5s' },
  { left: '79%', top: '26%', size: 4, delay: '2.8s' },
  { left: '52%', top: '88%', size: 5, delay: '1.9s' }
];

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { username, password });
      login(response.data);
      navigate('/');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-scene" aria-hidden="true">
        <div className="login-ambient ambient-left" />
        <div className="login-ambient ambient-right" />
        <div className="login-ambient ambient-bottom" />
        <div className="login-grid" />
        <div className="login-data-stream stream-horizontal one" />
        <div className="login-data-stream stream-horizontal two" />
        <div className="login-data-stream stream-vertical one" />
        <div className="login-data-stream stream-vertical two" />

        <div className="login-network">
          <svg viewBox="0 0 520 520" preserveAspectRatio="xMidYMid meet" role="presentation">
            <g>
              <path d="M40 180 C120 120, 170 150, 220 210 S330 300, 420 210" />
              <path d="M60 280 C150 240, 210 320, 290 260 S380 180, 480 220" />
              <path d="M100 115 C180 90, 250 150, 330 135 S430 75, 500 145" />
              <path d="M120 370 C190 320, 240 360, 290 310 S405 250, 500 330" />
              <path d="M160 80 L210 210 L290 170 L355 300 L430 250" />
            </g>
            <g>
              <circle cx="40" cy="180" r="4" className="node active" />
              <circle cx="220" cy="210" r="5" />
              <circle cx="420" cy="210" r="4" className="node active" />
              <circle cx="60" cy="280" r="4" />
              <circle cx="290" cy="260" r="5" className="node active" />
              <circle cx="480" cy="220" r="4" />
              <circle cx="100" cy="115" r="4" />
              <circle cx="330" cy="135" r="5" className="node active" />
              <circle cx="500" cy="145" r="4" />
              <circle cx="160" cy="80" r="4" />
              <circle cx="290" cy="170" r="5" className="node active" />
              <circle cx="355" cy="300" r="4" />
              <circle cx="430" cy="250" r="5" className="node active" />
              <circle cx="120" cy="370" r="4" />
              <circle cx="405" cy="250" r="4" />
            </g>
          </svg>
        </div>

        <div className="ai-core">
          <span className="ai-core-ring ring-one" />
          <span className="ai-core-ring ring-two" />
          <span className="ai-core-ring ring-three" />
          <span className="ai-core-node node-one" />
          <span className="ai-core-node node-two" />
          <span className="ai-core-node node-three" />
          <span className="ai-core-node node-four" />
        </div>

        <div className="login-particle-field">
          {networkParticles.map((particle, index) => (
            <span
              key={`${particle.left}-${particle.top}-${index}`}
              className="login-particle"
              style={{
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
                animationDelay: particle.delay
              }}
            />
          ))}
        </div>
      </div>

      <section className="login-panel">
        <div className="login-brand-row">
          <div className="login-brand-mark">AI</div>
          <div className="login-status" aria-label="System status indicator">
            <span className="status-dot" />
            <span>AI CORE ACTIVE</span>
          </div>
        </div>

        <p className="login-eyebrow">AI EMPLOYEE ASSISTANT</p>
        <h1>Welcome back</h1>
        <p className="login-subtitle">Intelligent Workforce Platform</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Email or development username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder="Enter your email or username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />

          <div className="login-utility-row">
            <label className="remember-box" htmlFor="remember-me">
              <input id="remember-me" type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" className="login-link" onClick={(event) => event.preventDefault()}>
              Forgot password?
            </a>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="demo-credentials">
          <span>Use your account credentials</span>
          <strong>Development fallback supports the documented demo accounts.</strong>
        </div>
      </section>
    </main>
  );
}

export default Login;
