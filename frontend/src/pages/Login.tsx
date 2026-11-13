import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';
import { api, errorMessage } from '../api';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('admin@cpai.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('cpai_token', data.token);
      localStorage.setItem('cpai_user', JSON.stringify(data.user));
      onLogin();
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-mark">
          <Sparkles size={20} />
        </div>
        <h1>Creative Partner AI</h1>
        <p>Masuk ke studio untuk mengelola konten, video, affiliate dan tim Anda.</p>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={15}
                color="#5f667c"
                style={{ position: 'absolute', left: 11, top: 11 }}
              />
              <input
                value={email}
                onChange={event => setEmail(event.target.value)}
                type="email"
                required
                style={{ width: '100%', paddingLeft: 34 }}
              />
            </div>
          </div>
          <div className="form-row">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={15}
                color="#5f667c"
                style={{ position: 'absolute', left: 11, top: 11 }}
              />
              <input
                value={password}
                onChange={event => setPassword(event.target.value)}
                type="password"
                required
                style={{ width: '100%', paddingLeft: 34 }}
              />
            </div>
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Memproses...' : <>Masuk ke studio <ArrowRight size={15} /></>}
          </button>
        </form>
        <p className="muted" style={{ marginTop: 16 }}>
          Default super admin: admin@cpai.com / admin123
        </p>
      </div>
    </div>
  );
}
