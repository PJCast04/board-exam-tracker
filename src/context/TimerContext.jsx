import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from './AppContext'
import { fmtClock } from '../lib/format'

const STORE = 'bept_timer'
const TimerContext = createContext(null)

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORE)) } catch { return null }
}

// The timer lives above the views so it keeps running when you switch tabs.
// It counts toward a fixed end timestamp instead of decrementing every tick,
// so a throttled background tab or a page refresh doesn't drift or lose time.
export function TimerProvider({ children }) {
  const { settings, logStudyTime } = useApp()
  const lengthOf = useCallback(m => (m === 'work' ? settings.pomodoroWork : settings.pomodoroBreak) * 60,
    [settings.pomodoroWork, settings.pomodoroBreak])

  const saved = useRef(loadState()).current
  const [mode, setMode]           = useState(saved?.mode ?? 'work')
  const [running, setRunning]     = useState(saved?.running ?? false)
  const [endsAt, setEndsAt]       = useState(saved?.endsAt ?? null)
  const [remaining, setRemaining] = useState(() => {
    if (saved?.running && saved.endsAt) return Math.max(0, Math.round((saved.endsAt - Date.now()) / 1000))
    return saved?.remaining ?? settings.pomodoroWork * 60
  })
  const [subjectId, setSubjectId] = useState(saved?.subjectId ?? '')
  const [sessions, setSessions]   = useState(saved?.sessions ?? 0)

  useEffect(() => {
    localStorage.setItem(STORE, JSON.stringify({ mode, running, endsAt, remaining, subjectId, sessions }))
  }, [mode, running, endsAt, remaining, subjectId, sessions])

  useEffect(() => {
    if (!running) return
    const tick = () => setRemaining(Math.max(0, Math.round((endsAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [running, endsAt])

  // Durations changed in settings: reset an idle timer to the new length
  useEffect(() => {
    if (!running) setRemaining(lengthOf(mode))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.pomodoroWork, settings.pomodoroBreak])

  const switchTo = useCallback(next => {
    setRunning(false)
    setEndsAt(null)
    setMode(next)
    setRemaining(lengthOf(next))
  }, [lengthOf])

  // Completion runs in an effect, not inside a state updater, so it fires once
  useEffect(() => {
    if (!running || remaining > 0) return
    if (mode === 'work') {
      logStudyTime(settings.pomodoroWork, subjectId || null)
      setSessions(n => n + 1)
      notify('Focus session done', `Take a ${settings.pomodoroBreak} minute break.`)
      switchTo('break')
    } else {
      notify('Break is over', 'Ready for the next session.')
      switchTo('work')
    }
  }, [running, remaining]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
    setEndsAt(Date.now() + remaining * 1000)
    setRunning(true)
  }, [remaining])

  const pause = useCallback(() => setRunning(false), [])

  const reset = useCallback(() => switchTo(mode), [switchTo, mode])

  const skip = useCallback(() => {
    if (mode === 'work') {
      const minutes = Math.floor((lengthOf('work') - remaining) / 60)
      logStudyTime(minutes, subjectId || null)
      if (minutes > 0) setSessions(n => n + 1)
      switchTo('break')
    } else {
      switchTo('work')
    }
  }, [mode, remaining, lengthOf, logStudyTime, subjectId, switchTo])

  // Show the countdown in the browser tab while it runs
  useEffect(() => {
    const base = 'Board Exam Tracker'
    document.title = running ? `${fmtClock(remaining)} ${mode === 'work' ? 'Focus' : 'Break'}` : base
    return () => { document.title = base }
  }, [running, remaining, mode])

  return (
    <TimerContext.Provider value={{
      mode, running, remaining, total: lengthOf(mode), subjectId, sessions,
      setSubjectId, start, pause, reset, skip, switchTo,
    }}>
      {children}
    </TimerContext.Provider>
  )
}

function notify(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body })
}

export function useTimer() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within TimerProvider')
  return ctx
}
