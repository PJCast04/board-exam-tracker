import React, { useState, useMemo } from 'react'
import { useApp } from '../../../context/AppContext'
import { Segmented, ConfirmButton, CloseIcon, Chevron } from '../../ui'
import { isoDate, addDays, parseDate, fmtDate, fmtMinutes } from '../../../lib/format'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfWeek(iso) { return addDays(iso, -parseDate(iso).getDay()) }

function AddActivityForm({ date, defaultSubject, onDone }) {
  const { subjects, addActivity } = useApp()
  const [title, setTitle]         = useState('')
  const [subjectId, setSubjectId] = useState(defaultSubject || subjects[0]?.id || '')
  const [topicId, setTopicId]     = useState('')
  const [duration, setDuration]   = useState(60)
  const [note, setNote]           = useState('')
  const topics = subjects.find(s => s.id === subjectId)?.topics ?? []

  const submit = e => {
    e.preventDefault()
    if (!title.trim()) return
    addActivity({ date, subjectId: subjectId || null, topicId: topicId || null, title: title.trim(), note: note.trim(), duration: Math.max(5, +duration || 0) })
    onDone()
  }

  return (
    <form onSubmit={submit} className="stack-sm" style={{ padding: '16px 0', gap: 14 }}>
      <label className="field">
        <span className="label">What will you do?</span>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chapter 3 problem set" autoFocus />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: 10 }}>
        <label className="field">
          <span className="label">Subject</span>
          <select className="input" value={subjectId} onChange={e => { setSubjectId(e.target.value); setTopicId('') }}>
            <option value="">General</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="label">Minutes</span>
          <input className="input" type="number" min={5} max={600} step={5} value={duration} onChange={e => setDuration(e.target.value)} />
        </label>
      </div>
      {topics.length > 0 && (
        <label className="field">
          <span className="label">Topic</span>
          <select className="input" value={topicId} onChange={e => setTopicId(e.target.value)}>
            <option value="">Any topic</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.text}</option>)}
          </select>
        </label>
      )}
      <label className="field">
        <span className="label">Note <span className="faint">(optional)</span></span>
        <textarea className="input" value={note} onChange={e => setNote(e.target.value)} rows={2} />
      </label>
      <div className="row-wrap">
        <button className="btn btn-primary" type="submit" disabled={!title.trim()}>Add to {fmtDate(date)}</button>
        <button className="btn btn-quiet" type="button" onClick={onDone}>Cancel</button>
      </div>
    </form>
  )
}

function ActivityItem({ a }) {
  const { subjects, deleteActivity } = useApp()
  const sub = subjects.find(s => s.id === a.subjectId)
  const topic = sub?.topics.find(t => t.id === a.topicId)

  return (
    <div className="activity" style={sub && { '--c': sub.color }}>
      <div className="row-main">
        <div className="activity-subject">{sub ? sub.name : 'General'}</div>
        {topic && <div className="activity-topic">{topic.text}</div>}
        <div className="activity-title">— {a.title}</div>
        {a.note && <div className="activity-note">{a.note}</div>}
        <div className="tiny faint num" style={{ marginTop: 6 }}>{fmtMinutes(a.duration || 0)}</div>
      </div>
      <ConfirmButton className="icon-btn" armed="Remove" onConfirm={() => deleteActivity(a.id)}>
        <CloseIcon />
      </ConfirmButton>
    </div>
  )
}

function DayPanel({ date, items, filter, adding, setAdding, large }) {
  const total = items.reduce((n, a) => n + (a.duration || 0), 0)
  const isToday = date === isoDate()

  return (
    <section style={large ? { maxWidth: 640 } : undefined}>
      <h2 className="section-title" style={{ fontSize: large ? 15 : 13 }}>
        <span>{isToday ? 'Today' : fmtDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        {total > 0 && <span className="aside num">{fmtMinutes(total)}</span>}
      </h2>

      {items.length === 0 && !adding && <p className="empty">Nothing planned.</p>}
      <div className="rows">
        {items.map(a => <ActivityItem key={a.id} a={a} />)}
      </div>

      {adding
        ? <AddActivityForm key={date} date={date} defaultSubject={filter !== 'all' ? filter : ''} onDone={() => setAdding(false)} />
        : <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>Add session</button>}
    </section>
  )
}

function MonthGrid({ date, setDate, byDay, examDate }) {
  const { subjects } = useApp()
  const today = isoDate()
  const first = date.slice(0, 8) + '01'
  const month = first.slice(0, 7)
  const next = parseDate(first); next.setMonth(next.getMonth() + 1)
  const last = addDays(isoDate(next), -1)
  const gridEnd = addDays(startOfWeek(last), 6)
  const cells = []
  for (let d = startOfWeek(first); d <= gridEnd; d = addDays(d, 1)) cells.push(d)

  return (
    <div className="cal">
      <div className="cal-head">{DOW.map(d => <div key={d}>{d}</div>)}</div>
      <div className="cal-grid">
        {cells.map(d => {
          const items = byDay[d] || []
          const cls = ['cal-cell', d.slice(0, 7) !== month && 'is-out', d === today && 'is-today', d === date && 'is-selected'].filter(Boolean).join(' ')
          return (
            <button key={d} className={cls} onClick={() => setDate(d)} aria-pressed={d === date}
              aria-label={`${fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}, ${items.length} planned`}>
              <span className="cal-day"><span>{+d.slice(8)}</span>{d === examDate && <span className="cal-flag">Exam</span>}</span>
              {items.slice(0, 3).map(a => {
                const sub = subjects.find(s => s.id === a.subjectId)
                return <span key={a.id} className="cal-item" style={sub && { '--c': sub.color }}>{a.title}</span>
              })}
              {items.length > 3 && <span className="cal-more">{items.length - 3} more</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WeekGrid({ date, byDay, examDate, openDay }) {
  const { subjects } = useApp()
  const today = isoDate()
  const start = startOfWeek(date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  return (
    <div className="week">
      {days.map(d => (
        <div key={d} className={`week-col${d === today ? ' is-today' : ''}`}>
          <div className="week-day">
            <div className="dow">{DOW[parseDate(d).getDay()]}{d === examDate && <span className="cal-flag"> · Exam</span>}</div>
            <div className="dom">{+d.slice(8)}</div>
          </div>
          <div className="week-body">
            {(byDay[d] || []).map(a => {
              const sub = subjects.find(s => s.id === a.subjectId)
              return (
                <button key={a.id} className="week-item" style={sub && { '--c': sub.color }} onClick={() => openDay(d, false)}>
                  <div className="s">{sub ? sub.name : 'General'}</div>
                  <div className="t">{a.title}</div>
                  <div className="d">{fmtMinutes(a.duration || 0)}</div>
                </button>
              )
            })}
          </div>
          <button className="week-add" onClick={() => openDay(d, true)} aria-label={`Add session on ${fmtDate(d)}`}>Add</button>
        </div>
      ))}
    </div>
  )
}

export default function ScheduleView() {
  const { subjects, activities, examDate } = useApp()
  const [mode, setMode]     = useState('month')
  const [date, setDate]     = useState(isoDate())
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)

  const byDay = useMemo(() => {
    const map = {}
    activities
      .filter(a => filter === 'all' || a.subjectId === filter)
      .forEach(a => { (map[a.date] ||= []).push(a) })
    return map
  }, [activities, filter])

  const step = dir => {
    setAdding(false)
    if (mode === 'day')  return setDate(d => addDays(d, dir))
    if (mode === 'week') return setDate(d => addDays(d, dir * 7))
    const d = parseDate(date)
    d.setDate(1)
    d.setMonth(d.getMonth() + dir)
    setDate(isoDate(d))
  }

  const pick = d => { setDate(d); setAdding(false) }
  const openDay = (d, add) => { setDate(d); setMode('day'); setAdding(add) }

  const label = (() => {
    if (mode === 'month') return fmtDate(date, { month: 'long', year: 'numeric' })
    if (mode === 'day')   return fmtDate(date, { weekday: 'long', month: 'long', day: 'numeric' })
    const s = startOfWeek(date), e = addDays(s, 6)
    const sameMonth = s.slice(0, 7) === e.slice(0, 7)
    return `${fmtDate(s)} – ${sameMonth ? +e.slice(8) : fmtDate(e)}, ${e.slice(0, 4)}`
  })()

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Schedule</h1>
        <Segmented label="Calendar view" value={mode} onChange={m => { setMode(m); setAdding(false) }}
          options={[['month', 'Month'], ['week', 'Week'], ['day', 'Day']]} />
      </div>

      <div className="spread" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="row-wrap" style={{ gap: 4 }}>
          <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous"><Chevron dir="left" /></button>
          <button className="icon-btn" onClick={() => step(1)} aria-label="Next"><Chevron /></button>
          <span style={{ fontWeight: 600, margin: '0 8px', minWidth: 0 }} className="num">{label}</span>
          {date !== isoDate() && <button className="btn btn-sm btn-quiet" onClick={() => pick(isoDate())}>Today</button>}
        </div>
        {subjects.length > 0 && (
          <div className="row-wrap" role="group" aria-label="Filter by subject">
            <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
            {subjects.map(s => (
              <button key={s.id} className="chip" style={{ '--c': s.color }} aria-pressed={filter === s.id}
                onClick={() => setFilter(f => f === s.id ? 'all' : s.id)}>
                <span className="swatch" style={{ '--c': s.color }} />{s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === 'month' && (
        <div className="schedule-split">
          <MonthGrid date={date} setDate={pick} byDay={byDay} examDate={examDate} />
          <DayPanel date={date} items={byDay[date] || []} filter={filter} adding={adding} setAdding={setAdding} />
        </div>
      )}

      {mode === 'week' && <WeekGrid date={date} byDay={byDay} examDate={examDate} openDay={openDay} />}

      {mode === 'day' && (
        <DayPanel date={date} items={byDay[date] || []} filter={filter} adding={adding} setAdding={setAdding} large />
      )}
    </div>
  )
}
