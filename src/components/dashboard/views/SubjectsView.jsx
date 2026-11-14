import React, { useState } from 'react'
import { useApp } from '../../../context/AppContext'
import { Bar, Segmented, ConfirmButton, ColorPicker, CloseIcon, Chevron } from '../../ui'
import { fmtDate } from '../../../lib/format'

const STATUS = { 'not-started': 'Not started', 'in-progress': 'In progress', mastered: 'Mastered' }

function SubjectForm({ initial, presets, onSubmit, onCancel, submitLabel }) {
  const [name, setName]   = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? presets[0])

  return (
    <form className="stack-sm" style={{ gap: 16 }}
      onSubmit={e => { e.preventDefault(); if (name.trim()) onSubmit(name.trim(), color) }}>
      <label className="field" style={{ maxWidth: 420 }}>
        <span className="label">Name</span>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Structural Design" autoFocus />
      </label>
      <div className="field">
        <span className="label">Color</span>
        <ColorPicker value={color} onChange={setColor} presets={presets} />
      </div>
      <div className="row-wrap">
        <button className="btn btn-primary" type="submit" disabled={!name.trim()}>{submitLabel}</button>
        <button className="btn btn-quiet" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function Subject({ subject, presets }) {
  const { updateSubject, deleteSubject, addTopic, toggleTopic, deleteTopic } = useApp()
  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState(false)
  const [topic, setTopic]     = useState('')

  const done = subject.topics.filter(t => t.done).length
  const meta = [
    subject.topics.length ? `${done} of ${subject.topics.length} topics` : 'No topics',
    STATUS[subject.status],
    subject.lastReviewed && `reviewed ${fmtDate(subject.lastReviewed)}`,
  ].filter(Boolean).join(' · ')

  const submitTopic = e => {
    e.preventDefault()
    if (!topic.trim()) return
    addTopic(subject.id, topic.trim())
    setTopic('')
  }

  return (
    <article className="panel subject" style={{ '--c': subject.color }}>
      <div className="subject-head">
        <span className="swatch swatch-lg" style={{ '--c': subject.color }} />
        <button className="row-main" style={{ textAlign: 'left' }} onClick={() => setOpen(o => !o)} aria-expanded={open}>
          <div className="subject-name">{subject.name}</div>
          <div className="small faint">{meta}</div>
        </button>
        <span className="num" style={{ fontWeight: 600 }}>{subject.progress}%</span>
        <button className="icon-btn" onClick={() => setOpen(o => !o)} aria-label={open ? 'Collapse' : 'Expand'}>
          <Chevron dir={open ? 'down' : 'right'} />
        </button>
      </div>
      <div style={{ padding: '0 20px 16px' }}>
        <Bar value={subject.progress} color={subject.color} thick label={`${subject.name} progress`} />
      </div>

      {open && (
        <div className="subject-body">
          {editing ? (
            <div style={{ paddingTop: 16 }}>
              <SubjectForm initial={subject} presets={presets} submitLabel="Save"
                onCancel={() => setEditing(false)}
                onSubmit={(name, color) => { updateSubject(subject.id, { name, color }); setEditing(false) }} />
            </div>
          ) : (
            <>
              <div className="rows">
                {subject.topics.map(t => (
                  <label key={t.id} className="topic">
                    <input type="checkbox" className="check" checked={t.done} onChange={() => toggleTopic(subject.id, t.id)} />
                    <span className={t.done ? 'done-text' : undefined} style={{ flex: 1 }}>{t.text}</span>
                    <button type="button" className="icon-btn" aria-label={`Remove ${t.text}`}
                      onClick={e => { e.preventDefault(); deleteTopic(subject.id, t.id) }}>
                      <CloseIcon />
                    </button>
                  </label>
                ))}
              </div>

              <form onSubmit={submitTopic} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input className="input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Add a topic" aria-label="New topic" />
                <button className="btn" type="submit" disabled={!topic.trim()}>Add</button>
              </form>

              {subject.topics.length === 0 && (
                <label className="field" style={{ marginTop: 18 }}>
                  <span className="label">Progress without topics: {subject.progress}%</span>
                  <input type="range" min={0} max={100} step={5} value={subject.progress}
                    style={{ accentColor: subject.color, maxWidth: 320 }}
                    onChange={e => {
                      const progress = +e.target.value
                      updateSubject(subject.id, { progress, status: progress === 100 ? 'mastered' : progress ? 'in-progress' : 'not-started' })
                    }} />
                </label>
              )}

              <div className="row-wrap" style={{ marginTop: 18 }}>
                <button className="btn btn-sm btn-quiet" onClick={() => setEditing(true)}>Rename or recolor</button>
                <ConfirmButton onConfirm={() => deleteSubject(subject.id)} armed="Delete subject?">Delete</ConfirmButton>
              </div>
            </>
          )}
        </div>
      )}
    </article>
  )
}

export default function SubjectsView() {
  const { subjects, addSubject, SUBJECT_COLORS } = useApp()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('all')

  const shown = filter === 'all' ? subjects : subjects.filter(s => s.status === filter)

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Subjects</h1>
        {!adding && <button className="btn btn-primary" onClick={() => setAdding(true)}>New subject</button>}
      </div>

      {adding && (
        <div className="panel panel-pad" style={{ marginBottom: 28 }}>
          <SubjectForm presets={SUBJECT_COLORS} submitLabel="Add subject"
            initial={{ color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length] }}
            onCancel={() => setAdding(false)}
            onSubmit={(name, color) => { addSubject(name, color); setAdding(false) }} />
        </div>
      )}

      {subjects.length > 3 && (
        <div style={{ marginBottom: 20 }}>
          <Segmented label="Filter by status" value={filter} onChange={setFilter}
            options={[['all', 'All'], ['not-started', 'Not started'], ['in-progress', 'In progress'], ['mastered', 'Mastered']]} />
        </div>
      )}

      {subjects.length === 0 ? (
        <p className="empty">Add the subjects your exam covers, then break each one into topics.</p>
      ) : shown.length === 0 ? (
        <p className="empty">No subjects with this status.</p>
      ) : (
        <div className="stack-sm">
          {shown.map(s => <Subject key={s.id} subject={s} presets={SUBJECT_COLORS} />)}
        </div>
      )}
    </div>
  )
}
