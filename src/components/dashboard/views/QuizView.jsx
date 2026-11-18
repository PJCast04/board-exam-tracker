import React, { useState, useRef } from 'react'
import { useApp } from '../../../context/AppContext'
import { Segmented, ConfirmButton } from '../../ui'
import { loadAiSettings, activeModel, PROVIDERS } from '../../../lib/ai'
import { fmtDate, pct, scoreBand } from '../../../lib/format'

// The parsers and LangChain are large, so they load only when a file is actually used
const loadersModule  = () => import('../../../lib/quiz/loaders')
const generateModule = () => import('../../../lib/quiz/generate')

// Past this, generation gets slow and long replies risk being cut off
const MAX_QUESTIONS = 50

function Uploader({ onLoaded }) {
  const [reading, setReading] = useState(false)
  const [error, setError]     = useState(null)
  const [dragging, setDragging] = useState(false)
  const input = useRef(null)

  const read = async file => {
    if (!file) return
    setError(null)
    setReading(true)
    try {
      const { loadReviewer } = await loadersModule()
      onLoaded(await loadReviewer(file))
    } catch (e) {
      setError(e.message || 'Could not read that file.')
    } finally {
      setReading(false)
    }
  }

  return (
    <div>
      <label className={`dropzone${dragging ? ' is-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); read(e.dataTransfer.files[0]) }}>
        <input ref={input} type="file" accept=".pdf,.docx,.pptx" hidden onChange={e => { read(e.target.files[0]); e.target.value = '' }} />
        <span className="dropzone-title">{reading ? 'Reading file…' : 'Drop your reviewer here'}</span>
        <span className="small muted">PDF, Word (.docx), or PowerPoint (.pptx)</span>
        {!reading && <span className="btn btn-sm" style={{ marginTop: 10 }}>Choose a file</span>}
      </label>
      {error && <p className="notice error" style={{ marginTop: 12 }} role="alert">{error}</p>}
    </div>
  )
}

function Generator({ source, onReset, onCreated, go }) {
  const { subjects, addQuiz } = useApp()
  const ai = loadAiSettings()
  const [preset, setPreset]       = useState(10)   // 5, 10, 20, or 'custom'
  const [customCount, setCustom]  = useState('15')
  const count = preset === 'custom' ? Number(customCount) : preset
  const countValid = Number.isInteger(count) && count >= 1 && count <= MAX_QUESTIONS
  const [subjectId, setSubjectId] = useState('')
  const [status, setStatus]       = useState(null)
  const [error, setError]         = useState(null)
  const provider = PROVIDERS[ai.provider]
  const hasKey = !!ai.keys[ai.provider]?.trim()

  const generate = async () => {
    setError(null)
    setStatus('Starting')
    try {
      const { generateQuiz } = await generateModule()
      const { title, questions } = await generateQuiz({ source, count, ai, onStatus: setStatus })
      const id = addQuiz({
        title: title || source.name.replace(/\.[^.]+$/, ''),
        source: source.name,
        subjectId: subjectId || null,
        provider: ai.provider,
        model: activeModel(ai),
        questions,
      })
      onCreated(id)
    } catch (e) {
      const { friendlyError } = await generateModule()
      setError(friendlyError(e, ai.provider))
    } finally {
      setStatus(null)
    }
  }

  return (
    <div className="panel panel-pad stack-sm" style={{ gap: 18 }}>
      <div className="spread" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{source.name}</div>
          <div className="small faint num">
            {[
              source.units && `${source.units} ${source.unitLabel}${source.units === 1 ? '' : 's'}`,
              source.pdfBase64 ? 'no selectable text, so the AI will read the pages directly' : `${source.words.toLocaleString()} words`,
            ].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button className="btn btn-sm btn-quiet" onClick={onReset} disabled={!!status}>Use a different file</button>
      </div>

      <div className="row-wrap" style={{ gap: 20, alignItems: 'flex-end' }}>
        <div className="field">
          <span className="label">Questions</span>
          <div className="row-wrap">
            <Segmented label="Number of questions" value={preset} onChange={setPreset}
              options={[[5, '5'], [10, '10'], [20, '20'], ['custom', 'Custom']]} />
            {preset === 'custom' && (
              <input className="input num" type="number" min={1} max={MAX_QUESTIONS} step={1}
                value={customCount} onChange={e => setCustom(e.target.value)}
                aria-label="Number of questions" aria-invalid={!countValid} autoFocus style={{ width: 76, height: 36 }} />
            )}
          </div>
        </div>
        <label className="field" style={{ minWidth: 200 }}>
          <span className="label">Subject <span className="faint">(optional)</span></span>
          <select className="input" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
            <option value="">None</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <button className="btn btn-primary" onClick={generate} disabled={!!status || !hasKey || !countValid}>
          {status ? 'Generating…' : 'Generate quiz'}
        </button>
      </div>

      {preset === 'custom' && !countValid && (
        <p className="small" style={{ color: 'var(--danger)' }}>Enter a whole number from 1 to {MAX_QUESTIONS}.</p>
      )}
      {status && <p className="small muted" role="status">{status}. This usually takes 15 to 60 seconds.</p>}
      {error && <p className="notice error" role="alert">{error}</p>}
      {hasKey ? (
        <p className="tiny faint">
          {source.pdfBase64 ? 'This PDF is' : 'The text of this file is'} sent to {provider.label} ({activeModel(ai)}) to write the questions. Nothing else from the app is sent.
        </p>
      ) : (
        <p className="notice">
          Add a {provider.label} API key in <button className="link" onClick={() => go('settings')}>Settings</button> to generate quizzes.
        </p>
      )}
    </div>
  )
}

function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

function TakeQuiz({ quiz, onExit }) {
  const { recordQuizAttempt } = useApp()
  const [order, setOrder]       = useState(() => quiz.questions.map(q => q.id))
  const [answers, setAnswers]   = useState({})
  const [submitted, setSubmitted] = useState(false)
  const top = useRef(null)

  const byId = Object.fromEntries(quiz.questions.map(q => [q.id, q]))
  const answered = Object.keys(answers).length
  const total = quiz.questions.length
  const correct = quiz.questions.filter(q => answers[q.id] === q.answerIndex).length
  const p = pct(correct, total)
  const band = scoreBand(p)

  const submit = () => {
    setSubmitted(true)
    recordQuizAttempt(quiz.id, correct)
    top.current?.scrollIntoView({ behavior: 'smooth' })
  }
  const retake = () => {
    setOrder(shuffled(quiz.questions.map(q => q.id)))
    setAnswers({})
    setSubmitted(false)
    top.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div ref={top} style={{ maxWidth: 760, scrollMarginTop: 80 }}>
      <button className="btn btn-sm btn-quiet" style={{ marginLeft: -10, marginBottom: 12 }} onClick={onExit}>Back to quizzes</button>
      <div className="page-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">{quiz.title}</h1>
          <p className="page-lede">{total} questions from {quiz.source}</p>
        </div>
      </div>

      {submitted && (
        <div className="panel panel-pad spread" style={{ marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <div className="score" data-band={band.key} style={{ fontSize: 32, lineHeight: 1 }}>{p}%</div>
            <div className="small muted num" style={{ marginTop: 6 }}>{correct} of {total} correct · {band.label}. Saved to Exam scores.</div>
          </div>
          <div className="row-wrap">
            <button className="btn btn-primary" onClick={retake}>Retake</button>
            <button className="btn" onClick={onExit}>Done</button>
          </div>
        </div>
      )}

      <ol className="quiz">
        {order.map((id, n) => {
          const q = byId[id]
          const picked = answers[id]
          return (
            <li key={id} className="quiz-q">
              <p className="quiz-stem"><span className="faint num">{n + 1}.</span> {q.question}</p>
              <div className="quiz-choices" role="radiogroup" aria-label={`Question ${n + 1}`}>
                {q.choices.map((choice, i) => {
                  const state = !submitted ? (picked === i ? 'picked' : '')
                    : i === q.answerIndex ? 'right' : picked === i ? 'wrong' : ''
                  return (
                    <label key={i} className="choice" data-state={state || undefined}>
                      <input type="radio" name={id} checked={picked === i} disabled={submitted}
                        onChange={() => setAnswers(a => ({ ...a, [id]: i }))} />
                      <span className="choice-key">{'ABCD'[i]}</span>
                      <span>{choice}</span>
                    </label>
                  )
                })}
              </div>
              {submitted && q.explanation && (
                <p className="quiz-why">
                  <strong>{picked === q.answerIndex ? 'Correct.' : picked == null ? 'Not answered.' : 'Incorrect.'}</strong> {q.explanation}
                </p>
              )}
            </li>
          )
        })}
      </ol>

      {!submitted && (
        <div className="spread quiz-submit">
          <span className="small muted num">{answered} of {total} answered</span>
          <button className="btn btn-primary btn-lg" onClick={submit} disabled={answered === 0}>
            {answered < total ? `Submit with ${total - answered} blank` : 'Submit answers'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function QuizView({ go }) {
  const { quizzes, subjects, deleteQuiz } = useApp()
  const [source, setSource]   = useState(null)
  const [activeId, setActive] = useState(null)

  const active = quizzes.find(q => q.id === activeId)
  if (active) return <TakeQuiz key={active.id} quiz={active} onExit={() => setActive(null)} />

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Quizzes</h1>
          <p className="page-lede">Upload a reviewer and get multiple-choice questions written from it. Every attempt is logged to Exam scores.</p>
        </div>
      </div>

      <section style={{ marginBottom: 48 }}>
        {source
          ? <Generator source={source} go={go} onReset={() => setSource(null)}
              onCreated={id => { setSource(null); setActive(id) }} />
          : <Uploader onLoaded={setSource} />}
      </section>

      <section>
        <h2 className="section-title">Your quizzes <span className="aside num">{quizzes.length || ''}</span></h2>
        {quizzes.length === 0 ? (
          <p className="empty">Quizzes you generate are saved here so you can retake them.</p>
        ) : (
          <div className="rows">
            {quizzes.map(q => {
              const sub = subjects.find(s => s.id === q.subjectId)
              const best = q.attempts.length ? Math.max(...q.attempts.map(a => pct(a.score, q.questions.length))) : null
              return (
                <div key={q.id} className="row">
                  <span className="swatch" style={sub && { '--c': sub.color }} />
                  <div className="row-main">
                    <div className="row-title">{q.title}</div>
                    <div className="row-sub">
                      {[sub?.name, q.source, `${q.questions.length} questions`, fmtDate(q.createdAt)].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {best != null && (
                    <span className="small muted num" style={{ textAlign: 'right' }}>
                      best <span className="score" data-band={scoreBand(best).key}>{best}%</span>
                      <span className="faint"> · {q.attempts.length}×</span>
                    </span>
                  )}
                  <button className="btn btn-sm" onClick={() => setActive(q.id)}>{q.attempts.length ? 'Retake' : 'Start'}</button>
                  <ConfirmButton onConfirm={() => deleteQuiz(q.id)} armed="Delete?">Delete</ConfirmButton>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
