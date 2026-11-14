import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { isoDate, addDays, daysBetween } from '../lib/format'

const KEY = {
  subjects:   'bept_subjects',
  examDate:   'bept_examDate',
  startDate:  'bept_startDate',
  logs:       'bept_timerLogs',
  goals:      'bept_goals',
  settings:   'bept_settings',
  activities: 'bept_activities',
  examScores: 'bept_examScores',
}

// Earthy presets that sit inside the forest/cream palette
const SUBJECT_COLORS = ['#546B41', '#8FA36E', '#A9824A', '#8B4E40', '#5A6B8A', '#7A5C7E', '#3F6E6A', '#6E6A5E']

const today = isoDate()

const DEFAULT_SUBJECTS = [
  {
    id: '1', name: 'Mathematics', color: '#546B41', progress: 25,
    topics: [
      { id: 't1', text: 'Algebra and functions', done: true },
      { id: 't2', text: 'Differential calculus', done: false },
      { id: 't3', text: 'Integral calculus', done: false },
      { id: 't4', text: 'Differential equations', done: false },
    ],
    status: 'in-progress', lastReviewed: today, notes: '',
  },
  {
    id: '2', name: 'Physics', color: '#A9824A', progress: 67,
    topics: [
      { id: 't5', text: 'Mechanics', done: true },
      { id: 't6', text: 'Thermodynamics', done: true },
      { id: 't7', text: 'Electromagnetism', done: false },
    ],
    status: 'in-progress', lastReviewed: today, notes: '',
  },
  {
    id: '3', name: 'Engineering Ethics', color: '#5A6B8A', progress: 100,
    topics: [
      { id: 't8', text: 'Code of ethics', done: true },
      { id: 't9', text: 'Professional practice', done: true },
    ],
    status: 'mastered', lastReviewed: today, notes: '',
  },
]

export function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

function deriveProgress(topics, fallback) {
  if (!topics.length) return fallback
  return Math.round(topics.filter(t => t.done).length / topics.length * 100)
}

function deriveStatus(progress) {
  return progress === 100 ? 'mastered' : progress > 0 ? 'in-progress' : 'not-started'
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [subjects,   setSubjects]   = useState(() => load(KEY.subjects,   DEFAULT_SUBJECTS))
  const [examDate,   setExamDate]   = useState(() => load(KEY.examDate,   ''))
  const [startDate,  setStartDate]  = useState(() => load(KEY.startDate,  isoDate()))
  const [logs,       setLogs]       = useState(() => load(KEY.logs,       []))
  const [goals,      setGoals]      = useState(() => load(KEY.goals,      []))
  const [settings,   setSettingsRaw] = useState(() => load(KEY.settings,  {
    darkMode: false, pomodoroWork: 25, pomodoroBreak: 5,
  }))
  const [activities, setActivities] = useState(() => load(KEY.activities, []))
  const [examScores, setExamScores] = useState(() => load(KEY.examScores, []))

  useEffect(() => { save(KEY.subjects,   subjects)   }, [subjects])
  useEffect(() => { save(KEY.examDate,   examDate)   }, [examDate])
  useEffect(() => { save(KEY.startDate,  startDate)  }, [startDate])
  useEffect(() => { save(KEY.logs,       logs)       }, [logs])
  useEffect(() => { save(KEY.goals,      goals)      }, [goals])
  useEffect(() => { save(KEY.settings,   settings)   }, [settings])
  useEffect(() => { save(KEY.activities, activities) }, [activities])
  useEffect(() => { save(KEY.examScores, examScores) }, [examScores])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode)
  }, [settings.darkMode])

  const setSettings = useCallback(patch => setSettingsRaw(prev => ({ ...prev, ...patch })), [])

  // Subjects
  const addSubject = useCallback((name, color) => {
    setSubjects(prev => [...prev, {
      id: genId(), name, color: color || SUBJECT_COLORS[prev.length % SUBJECT_COLORS.length],
      progress: 0, topics: [], status: 'not-started', lastReviewed: isoDate(), notes: '',
    }])
  }, [])

  const updateSubject = useCallback((id, patch) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }, [])

  const deleteSubject = useCallback(id => {
    setSubjects(prev => prev.filter(s => s.id !== id))
  }, [])

  const addTopic = useCallback((subjectId, text) => {
    setSubjects(prev => prev.map(s => {
      if (s.id !== subjectId) return s
      const topics = [...s.topics, { id: genId(), text, done: false }]
      const progress = deriveProgress(topics, s.progress)
      return { ...s, topics, progress, status: deriveStatus(progress) }
    }))
  }, [])

  const toggleTopic = useCallback((subjectId, topicId) => {
    setSubjects(prev => prev.map(s => {
      if (s.id !== subjectId) return s
      const topics = s.topics.map(t => t.id === topicId ? { ...t, done: !t.done } : t)
      const progress = deriveProgress(topics, s.progress)
      return { ...s, topics, progress, status: deriveStatus(progress), lastReviewed: isoDate() }
    }))
  }, [])

  const deleteTopic = useCallback((subjectId, topicId) => {
    setSubjects(prev => prev.map(s => {
      if (s.id !== subjectId) return s
      const topics = s.topics.filter(t => t.id !== topicId)
      const progress = deriveProgress(topics, 0)
      return { ...s, topics, progress, status: deriveStatus(progress) }
    }))
  }, [])

  // Study log
  const logStudyTime = useCallback((minutes, subjectId = null) => {
    if (minutes <= 0) return
    const day = isoDate()
    setLogs(prev => {
      const hit = prev.find(l => l.date === day && l.subjectId === subjectId)
      if (hit) return prev.map(l => l === hit ? { ...l, minutes: l.minutes + minutes } : l)
      return [...prev, { id: genId(), date: day, minutes, subjectId }]
    })
  }, [])

  // Goals
  const addGoal = useCallback((text, type = 'daily') => {
    setGoals(prev => [...prev, { id: genId(), text, done: false, type, createdAt: isoDate() }])
  }, [])
  const toggleGoal = useCallback(id => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g))
  }, [])
  const deleteGoal = useCallback(id => {
    setGoals(prev => prev.filter(g => g.id !== id))
  }, [])
  const clearDoneGoals = useCallback(() => {
    setGoals(prev => prev.filter(g => !g.done))
  }, [])

  // Scheduled activities
  const addActivity = useCallback(activity => {
    setActivities(prev => [...prev, { id: genId(), ...activity }])
  }, [])
  const deleteActivity = useCallback(id => {
    setActivities(prev => prev.filter(a => a.id !== id))
  }, [])

  // Exam scores
  const addExamScore = useCallback((subjectId, name, totalItems) => {
    setExamScores(prev => [...prev, { id: genId(), subjectId, name, totalItems: +totalItems, takes: [] }])
  }, [])
  const updateExamScore = useCallback((id, patch) => {
    setExamScores(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
  }, [])
  const deleteExamScore = useCallback(id => {
    setExamScores(prev => prev.filter(e => e.id !== id))
  }, [])
  const addTake = useCallback((examId, score, takenAt) => {
    setExamScores(prev => prev.map(e => e.id === examId
      ? { ...e, takes: [...e.takes, { id: genId(), score: +score, takenAt: takenAt || isoDate() }] }
      : e))
  }, [])
  const deleteTake = useCallback((examId, takeId) => {
    setExamScores(prev => prev.map(e => e.id === examId
      ? { ...e, takes: e.takes.filter(t => t.id !== takeId) }
      : e))
  }, [])

  // Derived
  const derived = useMemo(() => {
    const day = isoDate()
    const calendarData = {}
    logs.forEach(l => { calendarData[l.date] = (calendarData[l.date] || 0) + l.minutes })

    // A streak survives until the end of today, so start from yesterday if today is empty
    let streak = 0
    let cursor = calendarData[day] ? day : addDays(day, -1)
    while (calendarData[cursor]) { streak++; cursor = addDays(cursor, -1) }

    return {
      calendarData,
      streak,
      todayMinutes: calendarData[day] || 0,
      totalMinutes: logs.reduce((a, l) => a + l.minutes, 0),
      overallProgress: subjects.length
        ? Math.round(subjects.reduce((a, s) => a + s.progress, 0) / subjects.length)
        : 0,
      daysToExam: examDate ? Math.max(0, daysBetween(day, examDate)) : null,
    }
  }, [logs, subjects, examDate])

  const exportData = useCallback(() => {
    const data = { subjects, examDate, startDate, logs, goals, settings, activities, examScores, exportedAt: new Date().toISOString() }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `board-exam-tracker-${isoDate()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [subjects, examDate, startDate, logs, goals, settings, activities, examScores])

  // Resolves true on success, false if the file isn't a valid backup
  const importData = useCallback(file => new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data || typeof data !== 'object' || !Array.isArray(data.subjects)) return resolve(false)
        setSubjects(data.subjects)
        if (data.examDate)   setExamDate(data.examDate)
        if (data.startDate)  setStartDate(data.startDate)
        if (data.logs)       setLogs(data.logs)
        if (data.goals)      setGoals(data.goals)
        if (data.settings)   setSettingsRaw(prev => ({ ...prev, ...data.settings }))
        if (data.activities) setActivities(data.activities)
        if (data.examScores) setExamScores(data.examScores)
        resolve(true)
      } catch { resolve(false) }
    }
    reader.onerror = () => resolve(false)
    reader.readAsText(file)
  }), [])

  return (
    <AppContext.Provider value={{
      subjects, examDate, startDate, logs, goals, settings, activities, examScores,
      setExamDate, setStartDate, setSettings,
      addSubject, updateSubject, deleteSubject,
      addTopic, toggleTopic, deleteTopic,
      logStudyTime,
      addGoal, toggleGoal, deleteGoal, clearDoneGoals,
      addActivity, deleteActivity,
      addExamScore, updateExamScore, deleteExamScore, addTake, deleteTake,
      ...derived,
      SUBJECT_COLORS,
      exportData, importData,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
