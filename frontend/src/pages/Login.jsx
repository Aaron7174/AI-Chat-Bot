import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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
      <section className="login-panel">
        <div className="login-brand-mark">◆</div>
        <p className="login-eyebrow">AI EMPLOYEE ASSISTANT</p>
        <h1>Welcome back</h1>
        <p className="login-subtitle">Sign in to your AI-powered employee command center.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Email or development username</label>
          <input id="username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />

          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="demo-credentials">
          <span>Use your account credentials</span>
          <strong>Development fallback also accepts the documented demo accounts.</strong>
        </div>
      </section>
    </main>
  );
}

export default Login;
