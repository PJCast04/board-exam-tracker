import React, { useRef, useState } from 'react'
import { useApp } from '../../../context/AppContext'
import { Segmented } from '../../ui'

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

  const onImport = async e => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    const ok = await importData(f)
    setStatus(ok ? { ok, text: 'Backup restored.' } : { ok, text: "That file isn't a tracker backup. Nothing was changed." })
  }

  return (
    <div style={{ maxWidth: 760 }}>
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

      <Group title="Your data" hint="Everything is stored in this browser only. Export a backup before clearing browser data or switching devices.">
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
