import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronRight,
  CircleDollarSign,
  MoreHorizontal,
  Plus,
  Search,
  TrendingUp,
  UserRoundPlus,
  Wallet,
} from 'lucide-react'
import './App.css'

const stats = [
  { label: 'Cash in', value: '₹48.5K', delta: '+12.4%', tone: 'positive' },
  { label: 'Cash out', value: '₹26.1K', delta: '-4.2%', tone: 'negative' },
  { label: 'Customers', value: '324', delta: '+18', tone: 'neutral' },
]

const customers = [
  { name: 'Aman Verma', type: 'Retail', amount: '₹6,250', due: 'Due today', tone: 'positive' },
  { name: 'Priya Shah', type: 'Wholesale', amount: '₹14,800', due: 'Due in 3 days', tone: 'neutral' },
  { name: 'Rahul Soni', type: 'Credit', amount: '₹3,450', due: 'Overdue', tone: 'negative' },
]

const transactions = [
  { title: 'Sugar bag', tag: 'Sale', amount: '+₹2,400', time: 'Today · 10:20 AM', icon: ArrowUpRight, tone: 'positive' },
  { title: 'Rice supply', tag: 'Purchase', amount: '-₹1,980', time: 'Today · 09:10 AM', icon: ArrowDownLeft, tone: 'negative' },
  { title: 'Tea powder', tag: 'Sale', amount: '+₹960', time: 'Yesterday · 07:45 PM', icon: ArrowUpRight, tone: 'positive' },
]

const reminders = [
  { title: 'Remind Aman', note: 'Due payment ₹6,250', time: 'Today', tone: 'warning' },
  { title: 'Follow up Priya', note: 'Balance ₹14,800', time: 'Tomorrow', tone: 'neutral' },
]

const quickActions = [
  { label: 'Add sale', icon: Plus, tint: 'green' },
  { label: 'New customer', icon: UserRoundPlus, tint: 'blue' },
  { label: 'Reports', icon: TrendingUp, tint: 'purple' },
]

function App() {
  return (
    <div className="app-shell">
      <div className="mobile-frame">
        <header className="topbar">
          <div className="brand-block">
            <div className="avatar-badge">A</div>
            <div>
              <p className="eyebrow">Good morning</p>
              <h1>Arvind</h1>
            </div>
          </div>

          <button className="icon-button" aria-label="Notifications">
            <Bell size={18} />
          </button>
        </header>

        <section className="balance-card">
          <div className="balance-header">
            <div>
              <span className="eyebrow muted">Net balance</span>
              <h2>₹1,24,680</h2>
            </div>
            <button className="pill-button">This month</button>
          </div>

          <div className="balance-meta">
            <div>
              <span className="muted">Received</span>
              <strong>₹84,600</strong>
            </div>
            <div>
              <span className="muted">Paid</span>
              <strong>₹34,940</strong>
            </div>
          </div>
        </section>

        <nav className="quick-actions" aria-label="Quick actions">
          {quickActions.map(({ label, icon: Icon, tint }) => (
            <button key={label} className={`action-button ${tint}`} type="button">
              <span className="action-icon">
                <Icon size={18} />
              </span>
              {label}
            </button>
          ))}
        </nav>

        <section className="stats-grid" aria-label="Business summary">
          {stats.map(({ label, value, delta, tone }) => (
            <article key={label} className={`stat-card ${tone}`}>
              <span>{label}</span>
              <strong>{value}</strong>
              <em>{delta}</em>
            </article>
          ))}
        </section>

        <section className="panel">
          <div className="section-head">
            <h3>Recent customers</h3>
            <button type="button" className="text-button">
              View all <ChevronRight size={16} />
            </button>
          </div>

          <div className="search-row">
            <Search size={16} />
            <input type="text" value="Search customer" readOnly aria-label="Search customer" />
          </div>

          <div className="customer-list">
            {customers.map(({ name, type, amount, due, tone }) => (
              <div key={name} className="customer-item">
                <div className="customer-main">
                  <div className="customer-avatar">{name[0]}</div>
                  <div className="customer-copy">
                    <strong>{name}</strong>
                    <span>{type}</span>
                  </div>
                </div>

                <div className="customer-meta">
                  <strong>{amount}</strong>
                  <span className={`status ${tone}`}>{due}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ledger-panel panel">
          <div className="section-head">
            <h3>Today&apos;s ledger</h3>
            <button type="button" className="text-button muted-button">
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="transaction-list">
            {transactions.map(({ title, tag, amount, time, icon: Icon, tone }) => (
              <div key={title} className="transaction-item">
                <span className={`transaction-icon ${tone}`}>
                  <Icon size={15} />
                </span>
                <div className="transaction-copy">
                  <strong>{title}</strong>
                  <span>{tag}</span>
                </div>
                <div className="transaction-meta">
                  <strong className={tone}>{amount}</strong>
                  <span>{time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="bottom-grid">
          <section className="panel reminder-panel">
            <div className="section-head compact">
              <h3>Reminders</h3>
              <button type="button" className="mini-pill">3 active</button>
            </div>

            {reminders.map(({ title, note, time, tone }) => (
              <div key={title} className="reminder-item">
                <span className={`dot ${tone}`} />
                <div>
                  <strong>{title}</strong>
                  <p>{note}</p>
                </div>
                <small>{time}</small>
              </div>
            ))}
          </section>

          <section className="panel report-panel">
            <div className="section-head compact">
              <h3>Reports</h3>
              <Wallet size={16} />
            </div>

            <div className="report-metric">
              <CircleDollarSign size={18} />
              <div>
                <strong>₹49,320</strong>
                <span>Profit this month</span>
              </div>
            </div>

            <div className="mini-spark">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default App
