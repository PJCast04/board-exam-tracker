import React, { useState } from 'react'
import { useApp } from '../../../context/AppContext'
import { Bar, ConfirmButton, CloseIcon } from '../../ui'
import { isoDate, fmtDate, pct, scoreBand } from '../../../lib/format'

const BANDS = [
  ['perfect', 'Perfect', '100%'],
  ['excellent', 'Excellent', '90+'],
  ['passing', 'Passing', '75+'],
  ['borderline', 'Borderline', '60+'],
  ['low', 'Needs work', 'below 60'],
]

function Trend({ points }) {
  if (points.length < 2) return null
  const W = 120, H = 36, pad = 4
  const lo = Math.min(...points) - 5, hi = Math.max(...points) + 5
  const x = i => pad + i * (W - pad * 2) / (points.length - 1)
  const y = p => H - pad - (p - lo) / Math.max(1, hi - lo) * (H - pad * 2)
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-label={`Trend: ${points.join('%, ')}%`} role="img" style={{ overflow: 'visible' }}>
      <polyline points={points.map((p, i) => `${x(i)},${y(p)}`).join(' ')} fill="none" stroke="var(--line-strong)" strokeWidth="1.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p)} r={i === points.length - 1 ? 3.5 : 2.5} fill={`var(--s-${scoreBand(p).key})`} />
      ))}
    </svg>
  )
}

function ExamForm({ initial, subjects, onSubmit, onCancel, submitLabel }) {
  const [name, setName]       = useState(initial?.name ?? '')
  const [subjectId, setSubId] = useState(initial?.subjectId ?? subjects[0]?.id ?? '')
  const [total, setTotal]     = useState(initial?.totalItems ?? 100)
  const valid = name.trim() && +total > 0

  return (
    <form className="stack-sm" style={{ gap: 14 }}
      onSubmit={e => { e.preventDefault(); if (valid) onSubmit({ name: name.trim(), subjectId: subjectId || null, totalItems: +total }) }}>
      <div className="form-grid">
        <label className="field">
          <span className="label">Exam name</span>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Week 3 mock exam" autoFocus />
        </label>
        {!initial && (
          <label className="field">
            <span className="label">Subject</span>
            <select className="input" value={subjectId} onChange={e => setSubId(e.target.value)}>
              <option value="">Mixed subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
        <label className="field">
          <span className="label">Number of items</span>
          <input className="input" type="number" min={1} max={1000} value={total} onChange={e => setTotal(e.target.value)} />
        </label>
      </div>
      <div className="row-wrap">
        <button className="btn btn-primary" type="submit" disabled={!valid}>{submitLabel}</button>
        <button className="btn btn-quiet" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function AddTake({ exam }) {
  const { addTake } = useApp()
  const [score, setScore] = useState('')
  const [date, setDate]   = useState(isoDate())
  const n = parseFloat(score)
  const valid = !isNaN(n) && n >= 0 && n <= exam.totalItems

  return (
    <form className="row-wrap" style={{ paddingTop: 14 }}
      onSubmit={e => { e.preventDefault(); if (valid) { addTake(exam.id, n, date); setScore('') } }}>
      <input className="input num" type="number" min={0} max={exam.totalItems} step={0.5} value={score}
        onChange={e => setScore(e.target.value)} placeholder="Score" aria-label="Score" style={{ width: 96 }} />
      <span className="small faint num">/ {exam.totalItems}</span>
      <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Date taken" style={{ width: 160 }} />
      <button className="btn" type="submit" disabled={!valid}>Log attempt</button>
    </form>
  )
}

function Exam({ exam, subject }) {
  const { deleteTake, deleteExamScore, updateExamScore, subjects } = useApp()
  const [editing, setEditing] = useState(false)
  const scores = exam.takes.map(t => pct(t.score, exam.totalItems))
  const latest = scores.at(-1)
  const delta  = scores.length > 1 ? latest - scores.at(-2) : null
  const band   = latest != null ? scoreBand(latest) : null

  return (
    <article className="panel">
      <div className="spread" style={{ padding: '18px 22px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="row-main">
          <div className="subject-name" style={{ fontSize: 18 }}>{exam.name}</div>
          <div className="small faint" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            {subject && <span className="swatch" style={{ '--c': subject.color }} />}
            {[subject?.name ?? 'Mixed subjects', `${exam.totalItems} items`, `${scores.length} ${scores.length === 1 ? 'attempt' : 'attempts'}`].join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Trend points={scores} />
          {band && (
            <div style={{ textAlign: 'right' }}>
              <div className="score" data-band={band.key} style={{ fontSize: 24, lineHeight: 1 }}>{latest}%</div>
              <div className="tiny faint" style={{ marginTop: 4 }}>
                {band.label}{delta != null && delta !== 0 && <span className="num"> · {delta > 0 ? '+' : ''}{delta}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 22px 18px', borderTop: '1px solid var(--line)' }}>
        {editing ? (
          <div style={{ paddingTop: 16 }}>
            <ExamForm initial={exam} subjects={subjects} submitLabel="Save"
              onCancel={() => setEditing(false)}
              onSubmit={patch => { updateExamScore(exam.id, { name: patch.name, totalItems: patch.totalItems }); setEditing(false) }} />
          </div>
        ) : (
          <>
            {exam.takes.length > 0 && (
              <div className="rows">
                {exam.takes.map((t, i) => {
                  const p = scores[i]
                  const b = scoreBand(p)
                  return (
                    <div key={t.id} className="row" style={{ minHeight: 44, padding: '8px 0' }}>
                      <span className="small faint num" style={{ width: 52 }}>Take {i + 1}</span>
                      <span className="small muted num" style={{ width: 64 }}>{fmtDate(t.takenAt)}</span>
                      <span className="small num" style={{ width: 72 }}>{t.score} / {exam.totalItems}</span>
                      <div style={{ flex: 1 }}><Bar value={p} color={`var(--s-${b.key})`} /></div>
                      <span className="score small" data-band={b.key} style={{ width: 40, textAlign: 'right' }}>{p}%</span>
                      <button className="icon-btn" aria-label={`Remove take ${i + 1}`} onClick={() => deleteTake(exam.id, t.id)}><CloseIcon /></button>
                    </div>
                  )
                })}
              </div>
            )}
            <AddTake exam={exam} />
            <div className="row-wrap" style={{ marginTop: 14 }}>
              <button className="btn btn-sm btn-quiet" onClick={() => setEditing(true)}>Edit</button>
              <ConfirmButton onConfirm={() => deleteExamScore(exam.id)} armed="Delete exam and attempts?">Delete</ConfirmButton>
            </div>
          </>
        )}
      </div>
    </article>
  )
}

export default function ExamScoresView() {
  const { subjects, examScores, addExamScore } = useApp()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('all')
  const [sort, setSort]     = useState('recent')

  const all = examScores.flatMap(e => e.takes.map(t => pct(t.score, e.totalItems)))
  const avg = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : null

  const lastTaken = e => e.takes.reduce((m, t) => t.takenAt > m ? t.takenAt : m, '')
  const latestPct = e => e.takes.length ? pct(e.takes.at(-1).score, e.totalItems) : -1
  const shown = examScores
    .filter(e => filter === 'all' || e.subjectId === filter)
    .sort((a, b) =>
      sort === 'name'  ? a.name.localeCompare(b.name) :
      sort === 'score' ? latestPct(b) - latestPct(a) :
                         lastTaken(b).localeCompare(lastTaken(a)))

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Exam scores</h1>
          {all.length > 0 && (
            <p className="page-lede num">
              {all.length} {all.length === 1 ? 'attempt' : 'attempts'} across {examScores.length} {examScores.length === 1 ? 'exam' : 'exams'}.
              Average {avg}%, best {Math.max(...all)}%.
            </p>
          )}
        </div>
        {!adding && <button className="btn btn-primary" onClick={() => setAdding(true)}>New exam</button>}
      </div>

      {adding && (
        <div className="panel panel-pad" style={{ marginBottom: 28 }}>
          <ExamForm subjects={subjects} submitLabel="Create exam" onCancel={() => setAdding(false)}
            onSubmit={({ subjectId, name, totalItems }) => { addExamScore(subjectId, name, totalItems); setAdding(false) }} />
        </div>
      )}

      {examScores.length === 0 ? (
        !adding && <p className="empty">Create an exam for each mock or pre-board you take. Log every retake under it to see whether you're improving.</p>
      ) : (
        <>
          <div className="spread" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="row-wrap" role="group" aria-label="Filter by subject">
              <button className="chip" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
              {subjects.map(s => (
                <button key={s.id} className="chip" style={{ '--c': s.color }} aria-pressed={filter === s.id}
                  onClick={() => setFilter(f => f === s.id ? 'all' : s.id)}>
                  <span className="swatch" style={{ '--c': s.color }} />{s.name}
                </button>
              ))}
            </div>
            <label className="row-wrap small muted">
              Sort
              <select className="input" style={{ width: 'auto', height: 30, fontSize: 13 }} value={sort} onChange={e => setSort(e.target.value)}>
                <option value="recent">Most recent</option>
                <option value="score">Latest score</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>

          <div className="row-wrap tiny muted" style={{ gap: 14, marginBottom: 20 }}>
            {BANDS.map(([key, label, range]) => (
              <span key={key} className="row-wrap" style={{ gap: 6 }}>
                <span className="band-dot" data-band={key} />{label} <span className="faint num">{range}</span>
              </span>
            ))}
          </div>

          {shown.length === 0
            ? <p className="empty">No exams for this subject yet.</p>
            : <div className="stack-sm" style={{ gap: 16 }}>
                {shown.map(e => <Exam key={e.id} exam={e} subject={subjects.find(s => s.id === e.subjectId)} />)}
              </div>}
        </>
      )}
    </div>
  )
}
