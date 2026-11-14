import React from 'react'
import { useApp } from '../../../context/AppContext'
import { useTimer } from '../../../context/TimerContext'
import { Bar, Segmented } from '../../ui'
import { fmtClock, fmtMinutes } from '../../../lib/format'

export default function TimerView({ go }) {
  const { subjects, settings, todayMinutes } = useApp()
  const t = useTimer()
  const elapsed = (t.total - t.remaining) / t.total * 100
  const fresh = t.remaining === t.total

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Timer</h1>
        <Segmented label="Mode" value={t.mode}
          onChange={m => { if (!t.running && m !== t.mode) t.switchTo(m) }}
          options={[['work', `Focus ${settings.pomodoroWork}m`], ['break', `Break ${settings.pomodoroBreak}m`]]} />
      </div>

      <div className="panel timer" data-mode={t.mode}>
        <div className="timer-clock" aria-live="off">{fmtClock(t.remaining)}</div>
        <div className="timer-track">
          <Bar value={elapsed} color={t.mode === 'break' ? 'var(--sage)' : undefined} label="Session progress" />
        </div>

        <div className="timer-controls">
          {t.running
            ? <button className="btn btn-primary btn-lg" style={{ minWidth: 120 }} onClick={t.pause}>Pause</button>
            : <button className="btn btn-primary btn-lg" style={{ minWidth: 120 }} onClick={t.start}>{fresh ? 'Start' : 'Resume'}</button>}
          <button className="btn btn-lg btn-quiet" onClick={t.reset} disabled={fresh && !t.running}>Reset</button>
          <button className="btn btn-lg btn-quiet" onClick={t.skip}>{t.mode === 'work' ? 'End early' : 'Skip break'}</button>
        </div>

        <label className="field" style={{ width: 'min(280px, 100%)', textAlign: 'left' }}>
          <span className="label">Logging time to</span>
          <select className="input" value={t.subjectId} onChange={e => t.setSubjectId(e.target.value)}>
            <option value="">General study</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      <div className="spread" style={{ marginTop: 20, flexWrap: 'wrap' }}>
        <p className="small muted">
          <strong className="num" style={{ color: 'var(--ink)' }}>{fmtMinutes(todayMinutes)}</strong> studied today.
          {' '}Ending a focus session early still logs the minutes you put in.
        </p>
        {t.sessions > 0 && (
          <div className="session-dots" aria-label={`${t.sessions} sessions completed`}>
            {Array.from({ length: Math.max(4, t.sessions) }, (_, i) => <span key={i} className={i < t.sessions ? 'on' : undefined} />)}
          </div>
        )}
      </div>
      <p className="tiny faint" style={{ marginTop: 8 }}>
        Session lengths live in <button className="link" style={{ fontSize: 12 }} onClick={() => go('settings')}>Settings</button>.
      </p>
    </div>
  )
}
