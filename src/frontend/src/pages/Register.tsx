import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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

        <h1 className={styles.heading}>Create account</h1>
        <p className={styles.sub}>Join YatraDrishti fleet intelligence platform</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Full name
            <input
              type="text"
              className={styles.input}
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className={styles.label}>
            Email address
            <input
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              type="password"
              className={styles.input}
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>
          <label className={styles.label}>
            Confirm password
            <input
              type="password"
              className={styles.input}
              placeholder="Repeat password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
