import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../../../context/AppContext'
import { Segmented } from '../../ui'

const GENERAL_KEY = 'bept_general_note'

function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(s) {
  return escape(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

// Small block-level markdown: headings, bullet lists, paragraphs. Input is
// escaped before any tags are added, so the output is safe to inject.
function renderMarkdown(src) {
  const out = []
  let list = null
  let para = []
  const flushPara = () => { if (para.length) { out.push(`<p>${para.map(inline).join('<br>')}</p>`); para = [] } }
  const flushList = () => { if (list) { out.push(`<ul>${list.map(li => `<li>${inline(li)}</li>`).join('')}</ul>`); list = null } }

  for (const line of src.split('\n')) {
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    const li = line.match(/^\s*[-*]\s+(.*)$/)
    if (h) { flushPara(); flushList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`) }
    else if (li) { flushPara(); (list ||= []).push(li[1]) }
    else if (!line.trim()) { flushPara(); flushList() }
    else { flushList(); para.push(line) }
  }
  flushPara(); flushList()
  return out.join('')
}

const TOOLS = [
  ['H', 'Heading', { line: '## ' }],
  ['B', 'Bold', { wrap: '**' }],
  ['I', 'Italic', { wrap: '*' }],
  ['•', 'Bullet', { line: '- ' }],
  ['<>', 'Code', { wrap: '`' }],
]

export default function NotesView() {
  const { subjects, updateSubject } = useApp()
  const [selected, setSelected] = useState(subjects[0]?.id ?? 'general')
  const [mode, setMode] = useState('write')
  const [general, setGeneral] = useState(() => localStorage.getItem(GENERAL_KEY) || '')
  const area = useRef(null)

  useEffect(() => { localStorage.setItem(GENERAL_KEY, general) }, [general])

  const subject = subjects.find(s => s.id === selected)
  const text = subject ? subject.notes || '' : general
  const setText = v => subject ? updateSubject(subject.id, { notes: v }) : setGeneral(v)

  // Apply formatting around the selection (or at the caret) instead of appending to the end
  const apply = ({ wrap, line }) => {
    const el = area.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    let next, caretA, caretB
    if (wrap) {
      next = text.slice(0, a) + wrap + text.slice(a, b) + wrap + text.slice(b)
      caretA = a + wrap.length; caretB = b + wrap.length
    } else {
      const lineStart = text.lastIndexOf('\n', a - 1) + 1
      next = text.slice(0, lineStart) + line + text.slice(lineStart)
      caretA = a + line.length; caretB = b + line.length
    }
    setText(next)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(caretA, caretB) })
  }

  const notebooks = [['general', 'General', null], ...subjects.map(s => [s.id, s.name, s.color])]

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Notes</h1>
        <Segmented label="Editor mode" value={mode} onChange={setMode} options={[['write', 'Write'], ['preview', 'Preview']]} />
      </div>

      <div className="notes">
        <nav className="notebooks" aria-label="Notebooks">
          {notebooks.map(([id, name, color]) => (
            <button key={id} aria-pressed={selected === id} onClick={() => setSelected(id)}>
              <span className="swatch" style={color ? { '--c': color } : undefined} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            </button>
          ))}
        </nav>

        <div className="panel" style={{ overflow: 'hidden' }}>
          {mode === 'write' ? (
            <>
              <div className="toolbar" role="toolbar" aria-label="Formatting">
                {TOOLS.map(([glyph, label, op]) => (
                  <button key={label} type="button" title={label} aria-label={label} onMouseDown={e => e.preventDefault()} onClick={() => apply(op)}>
                    {glyph}
                  </button>
                ))}
                <span className="tiny faint" style={{ marginLeft: 'auto', alignSelf: 'center', paddingRight: 8 }}>Markdown</span>
              </div>
              <textarea ref={area} className="editor" value={text} onChange={e => setText(e.target.value)}
                placeholder={`Notes for ${subject ? subject.name : 'general review'}`} aria-label="Note" />
            </>
          ) : text.trim() ? (
            <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }} />
          ) : (
            <p className="prose faint">Nothing written yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
