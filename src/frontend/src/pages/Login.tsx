import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brandRow}>
          <div className={styles.brandIcon}>YD</div>
          <div>
            <div className={styles.brandName}>YatraDrishti</div>
            <div className={styles.brandTag}>Intelligence for Every Journey</div>
          </div>
        </div>

        <h1 className={styles.heading}>Welcome back</h1>
        <p className={styles.sub}>Sign in to access your fleet dashboard</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Email address
            <input
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" className={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
