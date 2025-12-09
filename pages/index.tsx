// pages/index.tsx
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Login.module.css';

export default function IndexPage() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem('admin', JSON.stringify(data.admin));

        switch (data.admin.role) {
          case 'SuperAdmin':
          case 'Admin':
            router.push('/dashboard');
            break;
          case 'Moderator':
            router.push('/dashboard');
            break;
          default:
            router.push('/');
        }
      } else {
        setError(data.message);
      }

    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2>Login</h2>
        {error && <p className={styles.error}>{error}</p>}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}
