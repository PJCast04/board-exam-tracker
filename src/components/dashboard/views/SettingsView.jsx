import React, { useRef, useState } from 'react'
import { useApp } from '../../../context/AppContext'
import { Segmented } from '../../ui'
import { useAiSettings, loadAiSettings, PROVIDERS } from '../../../lib/ai'

function Group({ title, hint, children }) {
  return (
    <section className="settings-group">
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600 }}>{title}</h2>
        {hint && <p className="small faint" style={{ marginTop: 4 }}>{hint}</p>}
      </div>
      <div>{children}</div>
    </section>
  )
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(+v || lo)))

export default function SettingsView() {
  const { examDate, setExamDate, startDate, setStartDate, settings, setSettings, exportData, importData } = useApp()
  const file = useRef(null)
  const [status, setStatus] = useState(null)
  const [ai, setAi] = useAiSettings()
  const [showKey, setShowKey] = useState(false)
  const provider = PROVIDERS[ai.provider]
  const [test, setTest] = useState(null)

  // Any change to provider, key, or model makes an earlier test result stale
  const changeAi = patch => { setAi(patch); setTest(null) }

  const runTest = async () => {
    setTest({ state: 'testing' })
    try {
      const { testConnection } = await import('../../../lib/quiz/generate')
      const r = await testConnection(loadAiSettings())
      setTest({ state: 'ok', text: `Connected to ${r.model} in ${r.seconds.toFixed(1)}s. It replied “${r.reply || '(empty)'}”.` })
    } catch (e) {
      const { friendlyError } = await import('../../../lib/quiz/generate').catch(() => ({ friendlyError: err => String(err?.message ?? err) }))
      setTest({ state: 'error', text: friendlyError(e, ai.provider) })
    }
  }

  const onImport = async e => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    const ok = await importData(f)
    setStatus(ok ? { ok, text: 'Backup restored.' } : { ok, text: "That file isn't a tracker backup. Nothing was changed." })
  }

  return (
    <div className="page-narrow">
      <div className="page-head" style={{ marginBottom: 8 }}>
        <h1 className="page-title">Settings</h1>
      </div>

      <Group title="Exam" hint="Used for the countdown and to measure how much of your study period has passed.">
        <div className="form-grid">
          <label className="field">
            <span className="label">Exam date</span>
            <input className="input" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Started reviewing</span>
            <input className="input" type="date" value={startDate} max={examDate || undefined} onChange={e => setStartDate(e.target.value)} />
          </label>
        </div>
      </Group>

      <Group title="Timer" hint="Minutes per focus session and break.">
        <div className="form-grid">
          <label className="field">
            <span className="label">Focus</span>
            <input className="input" type="number" min={5} max={120} value={settings.pomodoroWork}
              onChange={e => setSettings({ pomodoroWork: clamp(e.target.value, 1, 120) })} />
          </label>
          <label className="field">
            <span className="label">Break</span>
            <input className="input" type="number" min={1} max={60} value={settings.pomodoroBreak}
              onChange={e => setSettings({ pomodoroBreak: clamp(e.target.value, 1, 60) })} />
          </label>
        </div>
      </Group>

      <Group title="Appearance">
        <Segmented label="Theme" value={settings.darkMode ? 'dark' : 'light'}
          onChange={v => setSettings({ darkMode: v === 'dark' })}
          options={[['light', 'Light'], ['dark', 'Dark']]} />
      </Group>

      <Group title="Quiz generator" hint="Quizzes are written by an AI model using your own API key. The key is kept in this browser and is not included in backups.">
        <div className="stack-sm" style={{ gap: 16 }}>
          <Segmented label="AI provider" value={ai.provider} onChange={v => changeAi({ provider: v })}
            options={Object.entries(PROVIDERS).map(([id, p]) => [id, p.label])} />
          <label className="field">
            <span className="label">{provider.label} API key</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false}
                value={ai.keys[ai.provider] ?? ''} onChange={e => changeAi({ keys: { [ai.provider]: e.target.value } })}
                placeholder="Paste your key" />
              <button type="button" className="btn" onClick={() => setShowKey(v => !v)}>{showKey ? 'Hide' : 'Show'}</button>
            </div>
            <span className="tiny faint">{provider.keyHint} <a className="link" style={{ fontSize: 12 }} href={provider.keyUrl} target="_blank" rel="noreferrer">Get a key</a></span>
          </label>
          <label className="field" style={{ maxWidth: 320 }}>
            <span className="label">Model <span className="faint">(optional)</span></span>
            <input className="input" spellCheck={false} value={ai.models[ai.provider] ?? ''}
              onChange={e => changeAi({ models: { [ai.provider]: e.target.value } })} placeholder={provider.defaultModel} />
          </label>
          <div className="row-wrap" style={{ gap: 12 }}>
            <button type="button" className="btn" onClick={runTest}
              disabled={test?.state === 'testing' || !ai.keys[ai.provider]?.trim()}>
              {test?.state === 'testing' ? 'Testing…' : 'Test connection'}
            </button>
            {!ai.keys[ai.provider]?.trim() && <span className="small faint">Add a key to test it.</span>}
          </div>
          {test && test.state !== 'testing' && (
            <p className={`notice${test.state === 'error' ? ' error' : ''}`} role="status">{test.text}</p>
          )}
        </div>
      </Group>

      <Group title="Your data" hint="Your study data is stored only in this browser. Export a backup before clearing browser data or switching devices.">
        <div className="row-wrap">
          <button className="btn" onClick={exportData}>Export backup</button>
          <button className="btn" onClick={() => file.current?.click()}>Restore from file</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={onImport} />
        </div>
        {status && <p className={`notice${status.ok ? '' : ' error'}`} style={{ marginTop: 14 }} role="status">{status.text}</p>}
      </Group>
    </div>
  )
}
