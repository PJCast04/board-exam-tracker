import React, { useState, useEffect, useRef } from 'react'

export function Bar({ value, color, thick, label }) {
  const p = Math.max(0, Math.min(100, value)) / 100
  return (
    <div className={`bar${thick ? ' bar-thick' : ''}`} style={{ '--p': p, ...(color && { '--c': color }) }}
      role="progressbar" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span />
    </div>
  )
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  )
}

// Two-step delete: first click arms it, second click within 3s confirms.
// Avoids a blocking confirm() dialog for every removal.
export function ConfirmButton({ onConfirm, children = 'Delete', armed = 'Confirm', className = 'btn btn-sm btn-quiet btn-danger' }) {
  const [isArmed, setArmed] = useState(false)
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <button type="button" className={isArmed ? 'btn btn-sm btn-confirm' : className}
      onClick={() => {
        if (isArmed) { clearTimeout(timer.current); onConfirm() }
        else { setArmed(true); timer.current = setTimeout(() => setArmed(false), 3000) }
      }}
      onBlur={() => setArmed(false)}>
      {isArmed ? armed : children}
    </button>
  )
}

export function ColorPicker({ value, onChange, presets }) {
  const custom = !presets.includes(value)
  return (
    <div className="color-row" role="group" aria-label="Color">
      {presets.map(c => (
        <button key={c} type="button" className="color-opt" style={{ '--c': c }}
          aria-pressed={value === c} aria-label={c} onClick={() => onChange(c)} />
      ))}
      <label className="color-custom" title="Custom color"
        style={custom ? { background: value, borderStyle: 'solid', borderColor: value } : undefined}>
        {!custom && '+'}
        <input type="color" value={value} onChange={e => onChange(e.target.value)} aria-label="Custom color" />
      </label>
    </div>
  )
}

export function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" />
    </svg>
  )
}

export function Chevron({ dir = 'right' }) {
  const d = dir === 'left' ? 'M9 3L5 7l4 4' : dir === 'down' ? 'M3 5l4 4 4-4' : 'M5 3l4 4-4 4'
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
