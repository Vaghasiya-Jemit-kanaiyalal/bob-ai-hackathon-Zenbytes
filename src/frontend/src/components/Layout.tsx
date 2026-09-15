import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import Footer from './Footer';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.shell}>
      <TopNav />
      <main className={styles.content}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
