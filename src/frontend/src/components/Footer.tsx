import { Link } from 'react-router-dom';
import { MapPin, Shield, BarChart3, Truck, Navigation, MessageSquareText } from 'lucide-react';
import footerBg from '../assets/footer_bbg.png';
import logoSrc from '../assets/logo.png';
import styles from './Footer.module.css';

const navLinks = [
  { to: '/',          label: 'Dashboard'  },
  { to: '/fleet',     label: 'Fleet'      },
  { to: '/routes',    label: 'Routes'     },
  { to: '/trips',     label: 'Trips'      },
  { to: '/analytics', label: 'Analytics'  },
  { to: '/copilot',   label: 'AI Copilot' },
];

const features = [
  { icon: <Truck size={14} />,             label: 'Real-time Fleet Tracking'    },
  { icon: <Navigation size={14} />,        label: 'Route Optimisation'          },
  { icon: <Shield size={14} />,            label: 'ML Risk Intelligence'         },
  { icon: <BarChart3 size={14} />,         label: 'Analytics & Insights'        },
  { icon: <MessageSquareText size={14} />, label: 'AI-Powered Copilot'          },
];

export default function Footer() {
  return (
    <footer
      className={styles.footer}
      style={{ backgroundImage: `url(${footerBg})` }}
    >
      {/* Dark overlay for legibility */}
      <div className={styles.overlay} />

      <div className={styles.inner}>
        {/* Brand column */}
        <div className={styles.brandCol}>
          <div className={styles.brand}>
            <img src={logoSrc} alt="YatraDrishti" className={styles.logo} />
            <div>
              <div className={styles.brandName}>YatraDrishti</div>
              <div className={styles.brandTag}>Intelligence for Every Journey</div>
            </div>
          </div>
          <p className={styles.desc}>
            Urban fleet intelligence platform combining real-time telematics,
            ML-powered risk scoring and AI copilot assistance for smarter,
            safer city logistics.
          </p>
          <div className={styles.statusBadge}>
            <span className={styles.statusDot} />
            Live — Fleet Operations Active
          </div>
        </div>

        {/* Navigation */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>
            <MapPin size={13} /> Platform
          </h4>
          <ul className={styles.linkList}>
            {navLinks.map(l => (
              <li key={l.to}>
                <Link to={l.to} className={styles.link}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Features */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>
            <Shield size={13} /> Capabilities
          </h4>
          <ul className={styles.featureList}>
            {features.map(f => (
              <li key={f.label} className={styles.featureItem}>
                <span className={styles.featureIcon}>{f.icon}</span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Tech stack */}
        <div className={styles.col}>
          <h4 className={styles.colTitle}>Technology</h4>
          <ul className={styles.techList}>
            {['React + TypeScript', 'Node.js + Express', 'Python FastAPI', 'MySQL Database', 'Statistical ML Engine', 'Recharts Visualisation'].map(t => (
              <li key={t} className={styles.techItem}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomInner}>
          <span className={styles.copyright}>
            © {new Date().getFullYear()} YatraDrishti. All rights reserved.
          </span>
          <span className={styles.tagline}>
            यात्रा दृष्टि — Intelligence for Every Journey
          </span>
        </div>
      </div>
    </footer>
  );
}
