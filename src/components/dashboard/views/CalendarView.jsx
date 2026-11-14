import React, { useState, useMemo } from 'react'
import { useApp } from '../../../context/AppContext'
import { Bar } from '../../ui'
import { isoDate, addDays, parseDate, fmtDate, fmtMinutes, pct } from '../../../lib/format'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function level(mins) {
  if (!mins) return 0
  return mins < 30 ? 1 : mins < 90 ? 2 : mins < 180 ? 3 : 4
}

export default function CalendarView() {
  const { calendarData, logs, subjects, streak } = useApp()
  const [tip, setTip] = useState(null)
  const today = isoDate()

  const weeks = useMemo(() => {
    const end = addDays(today, 6 - parseDate(today).getDay())
    const start = addDays(end, -52 * 7 - 6)
    return Array.from({ length: 53 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
  }, [today])

  const yearDays  = weeks.flat().filter(d => d <= today)
  const studied   = yearDays.filter(d => calendarData[d])
  const yearTotal = studied.reduce((n, d) => n + calendarData[d], 0)
  const best      = studied.reduce((m, d) => calendarData[d] > (calendarData[m] || 0) ? d : m, null)

  const week = Array.from({ length: 7 }, (_, i) => addDays(addDays(today, -parseDate(today).getDay()), i))
  const weekMax = Math.max(60, ...week.map(d => calendarData[d] || 0))
  const weekTotal = week.reduce((n, d) => n + (calendarData[d] || 0), 0)

  const bySubject = useMemo(() => {
    const map = {}
    logs.forEach(l => { const k = l.subjectId || 'general'; map[k] = (map[k] || 0) + l.minutes })
    const total = Object.values(map).reduce((a, b) => a + b, 0)
    return Object.entries(map)
      .map(([id, mins]) => ({ id, mins, share: pct(mins, total), subject: subjects.find(s => s.id === id) }))
      .sort((a, b) => b.mins - a.mins)
  }, [logs, subjects])

  const showTip = (e, d) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ x: r.left + r.width / 2, y: r.top, d })
  }

  return (
    <div className="stack" style={{ gap: 48 }}>
      <div>
        <h1 className="page-title">Activity</h1>
        <p className="page-lede">
          {studied.length
            ? <>You studied on <strong className="num">{studied.length}</strong> days in the past year, <span className="num">{fmtMinutes(yearTotal)}</span> in total.{best && <> Your longest day was {fmtDate(best, { month: 'long', day: 'numeric' })} at <span className="num">{fmtMinutes(calendarData[best])}</span>.</>}{streak > 1 && <> Current streak: <span className="num">{streak} days</span>.</>}</>
            : 'Sessions you finish in the timer show up here, one square per day.'}
        </p>
      </div>

      <section>
        <h2 className="section-title">Past year</h2>
        <div style={{ overflowX: 'auto', padding: '16px 0 8px' }}>
          <div style={{ display: 'inline-grid', gridTemplateColumns: `20px repeat(${weeks.length}, 12px)`, gap: 3 }}
            role="img" aria-label={`Studied on ${studied.length} days in the past year`} onMouseLeave={() => setTip(null)}>
            <span />
            {weeks.map((w, i) => {
              const m = parseDate(w[0]).getMonth()
              const show = i === 0 || parseDate(weeks[i - 1][0]).getMonth() !== m
              return <span key={i} className="tiny faint" style={{ height: 16, overflow: 'visible', whiteSpace: 'nowrap' }}>{show ? MONTHS[m] : ''}</span>
            })}
            {DOW.map((label, row) => (
              <React.Fragment key={row}>
                <span className="tiny faint" style={{ lineHeight: '12px' }}>{row % 2 ? label : ''}</span>
                {weeks.map(w => {
                  const d = w[row]
                  if (d > today) return <span key={d} className="heat heat-future" />
                  return (
                    <span key={d} className={`heat heat-${level(calendarData[d])}${d === today ? ' heat-today' : ''}`}
                      onMouseEnter={e => showTip(e, d)} />
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="row-wrap tiny faint" style={{ gap: 3, justifyContent: 'flex-end' }}>
          Less {[0, 1, 2, 3, 4].map(l => <span key={l} className={`heat heat-${l}`} />)} More
        </div>
      </section>

      <div className="cols">
        <section>
          <h2 className="section-title">This week <span className="aside num">{fmtMinutes(weekTotal)}</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, paddingTop: 20, alignItems: 'end' }}>
            {week.map(d => {
              const mins = calendarData[d] || 0
              return (
                <div key={d} style={{ display: 'grid', gap: 6, justifyItems: 'center' }}>
                  <span className="tiny faint num" style={{ height: 16 }}>{mins ? fmtMinutes(mins) : ''}</span>
                  <div style={{ width: '100%', maxWidth: 28, height: 96, display: 'flex', alignItems: 'flex-end', background: 'var(--sunken)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: d > today ? 'transparent' : 'var(--accent)', transform: `scaleY(${mins / weekMax})`, transformOrigin: 'bottom', transition: 'transform 0.5s var(--ease)' }} />
                  </div>
                  <span className={`tiny ${d === today ? '' : 'faint'}`} style={d === today ? { fontWeight: 600 } : undefined}>
                    {fmtDate(d, { weekday: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="section-title">Time by subject</h2>
          {bySubject.length === 0 ? (
            <p className="empty">Pick a subject in the timer and it gets tracked here.</p>
          ) : (
            <div className="rows">
              {bySubject.map(r => (
                <div key={r.id} className="row" style={{ minHeight: 44 }}>
                  <span className="swatch" style={r.subject && { '--c': r.subject.color }} />
                  <span className="small" style={{ width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.subject?.name ?? 'General study'}</span>
                  <div style={{ flex: 1 }}><Bar value={r.share} color={r.subject?.color} /></div>
                  <span className="small muted num" style={{ width: 64, textAlign: 'right' }}>{fmtMinutes(r.mins)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }}>
          <strong>{calendarData[tip.d] ? fmtMinutes(calendarData[tip.d]) : 'No study'}</strong> on {fmtDate(tip.d, { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  )
}
