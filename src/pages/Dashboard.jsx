import React, { useState } from 'react'
import { TimerProvider } from '../context/TimerContext'
import Sidebar from '../components/dashboard/Sidebar'
import Overview from '../components/dashboard/views/Overview'
import SubjectsView from '../components/dashboard/views/SubjectsView'
import ScheduleView from '../components/dashboard/views/ScheduleView'
import ExamScoresView from '../components/dashboard/views/ExamScoresView'
import TimerView from '../components/dashboard/views/TimerView'
import CalendarView from '../components/dashboard/views/CalendarView'
import GoalsView from '../components/dashboard/views/GoalsView'
import NotesView from '../components/dashboard/views/NotesView'
import SettingsView from '../components/dashboard/views/SettingsView'

const VIEWS = {
  overview: Overview,
  subjects: SubjectsView,
  schedule: ScheduleView,
  scores:   ExamScoresView,
  timer:    TimerView,
  calendar: CalendarView,
  goals:    GoalsView,
  notes:    NotesView,
  settings: SettingsView,
}

export const VIEW_IDS = Object.keys(VIEWS)

export default function Dashboard({ view, go: navigate, onBack }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const go = v => { navigate(v); setMenuOpen(false) }
  const View = VIEWS[view] ?? Overview

  return (
    <TimerProvider>
      <div className="shell">
        <header className="topbar">
          <span className="wordmark" style={{ padding: 0, fontSize: 16 }}>Board Exam Tracker</span>
          <button className="btn btn-sm btn-quiet" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}>Menu</button>
        </header>

        <div className={`scrim${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />
        <Sidebar view={view} go={go} onBack={() => { setMenuOpen(false); onBack() }} open={menuOpen} />

        <main className="main">
          <div className="page">
            <View go={go} />
          </div>
        </main>
      </div>
    </TimerProvider>
  )
}
