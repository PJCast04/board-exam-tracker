import React, { useState } from 'react'
import { useApp } from '../../../context/AppContext'
import { Bar, Segmented, CloseIcon } from '../../ui'
import { isoDate, addDays, parseDate } from '../../../lib/format'

function GoalList({ title, goals, aside }) {
  const { toggleGoal, deleteGoal } = useApp()
  if (!goals.length) return null
  const done = goals.filter(g => g.done).length
  const ordered = [...goals.filter(g => !g.done), ...goals.filter(g => g.done)]

  return (
    <section>
      <h2 className="section-title">
        {title}
        <span className="aside num">{aside ?? `${done} of ${goals.length}`}</span>
      </h2>
      {!aside && <div style={{ padding: '8px 0 4px', maxWidth: 240 }}><Bar value={done / goals.length * 100} /></div>}
      <div className="rows">
        {ordered.map(g => (
          <label key={g.id} className="topic" style={{ padding: '11px 0' }}>
            <input type="checkbox" className="check" checked={g.done} onChange={() => toggleGoal(g.id)} />
            <span className={g.done ? 'done-text' : undefined} style={{ flex: 1 }}>{g.text}</span>
            <button type="button" className="icon-btn" aria-label={`Remove ${g.text}`}
              onClick={e => { e.preventDefault(); deleteGoal(g.id) }}>
              <CloseIcon />
            </button>
          </label>
        ))}
      </div>
    </section>
  )
}

export default function GoalsView() {
  const { goals, addGoal, clearDoneGoals } = useApp()
  const [text, setText] = useState('')
  const [type, setType] = useState('daily')

  const today = isoDate()
  const weekStart = addDays(today, -parseDate(today).getDay())
  const daily   = goals.filter(g => g.type === 'daily' && g.createdAt === today)
  const weekly  = goals.filter(g => g.type === 'weekly' && g.createdAt >= weekStart)
  const earlier = goals.filter(g => !daily.includes(g) && !weekly.includes(g))
  const anyDone = goals.some(g => g.done)

  const submit = e => {
    e.preventDefault()
    if (!text.trim()) return
    addGoal(text.trim(), type)
    setText('')
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Goals</h1>
        {anyDone && <button className="btn btn-sm btn-quiet" onClick={clearDoneGoals}>Clear completed</button>}
      </div>

      <form onSubmit={submit} className="row-wrap" style={{ marginBottom: 40 }}>
        <input className="input" style={{ flex: '1 1 280px' }} value={text} onChange={e => setText(e.target.value)}
          placeholder={type === 'daily' ? 'A goal for today, e.g. finish two problem sets' : 'A goal for this week, e.g. score 80% on the mock'}
          aria-label="New goal" />
        <Segmented label="Goal type" value={type} onChange={setType} options={[['daily', 'Today'], ['weekly', 'This week']]} />
        <button className="btn btn-primary" type="submit" disabled={!text.trim()}>Add goal</button>
      </form>

      {goals.length === 0 ? (
        <p className="empty">Small, specific goals work best. Set one or two for today.</p>
      ) : (
        <div className="stack">
          <GoalList title="Today" goals={daily} />
          <GoalList title="This week" goals={weekly} />
          <GoalList title="Earlier" goals={earlier} aside={`${earlier.filter(g => !g.done).length} unfinished`} />
        </div>
      )}
    </div>
  )
}
