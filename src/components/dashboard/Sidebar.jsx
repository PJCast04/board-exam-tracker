import React from 'react'
import { useApp } from '../../context/AppContext'
import { useTimer } from '../../context/TimerContext'
import { fmtClock } from '../../lib/format'

const NAV = [
  ['overview', 'Today'],
  ['subjects', 'Subjects'],
  ['schedule', 'Schedule'],
  ['timer',    'Timer'],
  ['scores',   'Exam scores'],
  ['quizzes',  'Quizzes'],
  ['calendar', 'Activity'],
  ['goals',    'Goals'],
  ['notes',    'Notes'],
]

export default function Sidebar({ view, go, onBack, open }) {
  const { daysToExam, streak, settings, setSettings } = useApp()
  const timer = useTimer()

  return (
    <aside className={`side${open ? ' open' : ''}`} aria-label="Main navigation">
      <div className="wordmark">Board Exam<span>Progress tracker</span></div>

      <div className="side-meta">
        {daysToExam !== null
          ? <div className={daysToExam <= 30 ? 'warn' : undefined}><strong className="num">{daysToExam}</strong> {daysToExam === 1 ? 'day' : 'days'} to the exam</div>
          : <button className="link" style={{ justifySelf: 'start' }} onClick={() => go('settings')}>Set your exam date</button>}
        {streak > 0 && <div><strong className="num">{streak}</strong>-day streak</div>}
      </div>

      <nav className="nav">
        {NAV.map(([id, label]) => (
          <button key={id} aria-current={view === id ? 'page' : undefined} onClick={() => go(id)}>
            {label}
            {id === 'timer' && timer.running && (
              <span className="live num">{fmtClock(timer.remaining)}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="side-foot nav">
        <button aria-current={view === 'settings' ? 'page' : undefined} onClick={() => go('settings')}>Settings</button>
        <button onClick={() => setSettings({ darkMode: !settings.darkMode })}>
          {settings.darkMode ? 'Light theme' : 'Dark theme'}
        </button>
        <button onClick={onBack}>Home page</button>
      </div>
    </aside>
  )
}
