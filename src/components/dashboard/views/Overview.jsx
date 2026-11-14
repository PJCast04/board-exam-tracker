import React from 'react'
import { useApp } from '../../../context/AppContext'
import { Bar } from '../../ui'
import { isoDate, addDays, parseDate, fmtDate, fmtMinutes, daysBetween, pct, scoreBand } from '../../../lib/format'

function heatLevel(mins) {
  if (!mins) return 0
  return mins < 30 ? 1 : mins < 90 ? 2 : mins < 180 ? 3 : 4
}

function Countdown({ go }) {
  const { examDate, startDate, daysToExam, todayMinutes, streak } = useApp()

  if (!examDate) {
    return (
      <section className="stack-sm">
        <p className="muted" style={{ maxWidth: '48ch' }}>
          Add your exam date and this page will count down to it.
        </p>
        <div><button className="btn btn-primary" onClick={() => go('settings')}>Set exam date</button></div>
      </section>
    )
  }

  const total   = Math.max(1, daysBetween(startDate || examDate, examDate))
  const elapsed = pct(total - daysToExam, total)

  const studied = todayMinutes
    ? <>You've studied <strong className="num">{fmtMinutes(todayMinutes)}</strong> today</>
    : <>Nothing logged yet today</>
  const run = streak > 1 ? <>, and <strong className="num">{streak} days</strong> in a row.</> : '.'

  return (
    <section className="stack-sm">
      <div className="countdown">
        <span className="countdown-n" style={daysToExam <= 30 ? { color: 'var(--danger)' } : undefined}>{daysToExam}</span>
        <span className="countdown-label">
          {daysToExam === 1 ? 'day' : 'days'} until your board exam on <strong>{fmtDate(examDate, { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
        </span>
      </div>
      <div style={{ maxWidth: 420, display: 'grid', gap: 8 }}>
        <Bar value={elapsed} label="Study period elapsed" />
        <p className="small muted">{studied}{run} <span className="faint">{elapsed}% of your study period is behind you.</span></p>
      </div>
    </section>
  )
}

function TodayPlan({ go }) {
  const { activities, subjects } = useApp()
  const today = isoDate()
  const items = activities.filter(a => a.date === today)
  const total = items.reduce((n, a) => n + (a.duration || 0), 0)

  return (
    <section>
      <h2 className="section-title">
        Planned for today
        {total > 0 && <span className="aside num">{fmtMinutes(total)}</span>}
      </h2>
      {items.length === 0 ? (
        <p className="empty">
          Nothing planned. <button className="link" onClick={() => go('schedule')}>Plan a session</button>
        </p>
      ) : (
        <div className="rows">
          {items.map(a => {
            const sub = subjects.find(s => s.id === a.subjectId)
            const topic = sub?.topics.find(t => t.id === a.topicId)
            return (
              <div key={a.id} className="row">
                <span className="swatch" style={sub && { '--c': sub.color }} />
                <div className="row-main">
                  <div className="row-title">{a.title}</div>
                  <div className="row-sub">{[sub?.name, topic?.text].filter(Boolean).join(' · ') || 'General'}</div>
                </div>
                <span className="small faint num">{fmtMinutes(a.duration || 0)}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function SubjectList({ go }) {
  const { subjects, overallProgress } = useApp()
  return (
    <section>
      <h2 className="section-title">
        Subjects
        <span className="aside num">{overallProgress}% covered</span>
      </h2>
      {subjects.length === 0 ? (
        <p className="empty">No subjects yet. <button className="link" onClick={() => go('subjects')}>Add one</button></p>
      ) : (
        <div className="rows">
          {subjects.map(s => {
            const done = s.topics.filter(t => t.done).length
            return (
              <button key={s.id} className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('subjects')}>
                <span className="swatch" style={{ '--c': s.color }} />
                <div className="row-main">
                  <div className="row-title">{s.name}</div>
                  <div className="row-sub">{s.topics.length ? `${done} of ${s.topics.length} topics` : 'No topics yet'}</div>
                </div>
                <div style={{ width: 120 }}><Bar value={s.progress} color={s.color} /></div>
                <span className="small num" style={{ width: 36, textAlign: 'right' }}>{s.progress}%</span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function RecentActivity() {
  const { calendarData } = useApp()
  const today = isoDate()
  // 12 full weeks, columns run Sunday to Saturday, ending with the current week
  const lastSunday = addDays(today, -parseDate(today).getDay())
  const start = addDays(lastSunday, -11 * 7)
  const weeks = Array.from({ length: 12 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
  const total = weeks.flat().reduce((n, d) => n + (calendarData[d] || 0), 0)
  const days  = weeks.flat().filter(d => calendarData[d]).length

  return (
    <section>
      <h2 className="section-title">
        Last 12 weeks
        <span className="aside num">{days} days · {fmtMinutes(total)}</span>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 20px))', gap: 4, padding: '14px 0 10px' }} role="img" aria-label={`Studied on ${days} of the last 84 days`}>
        {weeks.map((week, i) => (
          <div key={i} style={{ display: 'grid', gap: 4 }}>
            {week.map(d => (
              <div key={d}
                className={`heat heat-lg ${d > today ? 'heat-future' : `heat-${heatLevel(calendarData[d])}`}${d === today ? ' heat-today' : ''}`}
                title={`${fmtDate(d)}: ${calendarData[d] ? fmtMinutes(calendarData[d]) : 'no study'}`} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

function RecentScores({ go }) {
  const { examScores, subjects } = useApp()
  const takes = examScores
    .flatMap(e => e.takes.map(t => ({ ...t, exam: e, p: pct(t.score, e.totalItems) })))
    .sort((a, b) => b.takenAt.localeCompare(a.takenAt))
    .slice(0, 5)

  return (
    <section>
      <h2 className="section-title">Recent exam scores</h2>
      {takes.length === 0 ? (
        <p className="empty">No scores yet. <button className="link" onClick={() => go('scores')}>Log a mock exam</button></p>
      ) : (
        <div className="rows">
          {takes.map(t => {
            const band = scoreBand(t.p)
            const sub = subjects.find(s => s.id === t.exam.subjectId)
            return (
              <div key={t.id} className="row">
                <span className="band-dot" data-band={band.key} />
                <div className="row-main">
                  <div className="row-title">{t.exam.name}</div>
                  <div className="row-sub">{[sub?.name, fmtDate(t.takenAt)].filter(Boolean).join(' · ')}</div>
                </div>
                <span className="score" data-band={band.key}>{t.p}%</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default function Overview({ go }) {
  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="stack" style={{ gap: 48 }}>
      <header>
        <p className="small faint">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1 className="page-title" style={{ marginTop: 4 }}>{greet}</h1>
      </header>

      <Countdown go={go} />

      <div className="cols">
        <div className="stack">
          <TodayPlan go={go} />
          <SubjectList go={go} />
        </div>
        <div className="stack">
          <RecentActivity />
          <RecentScores go={go} />
        </div>
      </div>
    </div>
  )
}
