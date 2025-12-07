import { useEffect } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Dashboard.module.css';

export default function Dashboard() {
  const router = useRouter();

  // Check if admin is logged in
  useEffect(() => {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      router.push('/login');
    }
  }, [router]);

  const handleManualVisitor = () => router.push('/manual-visitor');
  const handleEntryLog = () => router.push('/scanner');
  const handleOffense = () => router.push('/offense');

  return (
    <div className={styles.container}>
      <div className={styles.titleWrapper}>
        <h1 className={styles.title}>Admin Dashboard</h1>
      </div>

      <div className={styles.buttonContainer}>
        <button
          className={styles.button}
          onClick={handleManualVisitor}
        >
          Manual Visitor Input
        </button>
        <button
          className={styles.button}
          onClick={handleEntryLog}
        >
          Entry Log
        </button>
        <button
          className={styles.button}
          onClick={handleOffense}
        >
          Offense
        </button>
      </div>
    </div>
  );
}
