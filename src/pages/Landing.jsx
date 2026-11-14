import React from 'react'

// A sample study grid that fills in over time: sparse early on, steady later
const STRIP = Array.from({ length: 7 * 18 }, (_, i) => {
  const col = i % 18
  const noise = (Math.sin(i * 12.9898) * 43758.5453) % 1
  const r = Math.abs(noise)
  const odds = 0.25 + col / 18 * 0.7
  if (r > odds) return 0
  return 1 + Math.floor((r / odds) * 4 * (0.4 + col / 30)) % 4
})

const FEATURES = [
  ['Subjects', 'Break each subject into topics and check them off. Progress comes from what you have actually covered, not a guess.'],
  ['Schedule', 'Plan sessions by month, week, or day, down to the subject and topic.'],
  ['Timer', 'Focus sessions log themselves to the subject you are working on, and keep running while you use the rest of the app.'],
  ['Mock exams', 'Log every attempt at a mock or pre-board. Retakes sit under the same exam so the trend is obvious.'],
  ['Activity', 'A year of study days at a glance, and where your hours went by subject.'],
]

const STEPS = [
  ['Add your subjects', 'Enter what your exam covers, split it into topics, and set your exam date.'],
  ['Plan and study', 'Schedule sessions, run the timer, and log mock scores as you take them.'],
  ['Keep the chain going', 'Check in every day. The countdown and the activity grid make gaps hard to ignore.'],
]

export default function Landing({ onStart }) {
  return (
    <div className="lp">
      <header className="lp-hero">
        <div className="lp-wrap">
          <nav className="lp-nav">
            <div className="wordmark">Board Exam<span>Progress tracker</span></div>
            <button className="lp-nav-link" onClick={onStart}>Open the tracker</button>
          </nav>

          <div className="lp-hero-body">
            <div>
              <h1 className="lp-h1">Study a little every day. Pass the board exam.</h1>
              <p className="lp-lede">
                Most people who fail the boards studied hard, just not consistently. This tracker keeps
                your subjects, sessions, and mock scores in one place so you can see whether you are showing up.
              </p>
              <div className="lp-cta">
                <button className="lp-btn" onClick={onStart}>Open the tracker</button>
                <a className="lp-link" href="#how">How it works</a>
              </div>
            </div>

            <figure className="lp-strip">
              <div className="lp-strip-grid" aria-hidden="true">
                {STRIP.map((l, i) => <i key={i} data-l={l} />)}
              </div>
              <figcaption><p>Each square is a day. The goal is simply to keep them filled.</p></figcaption>
            </figure>
          </div>
        </div>
      </header>

      <section className="lp-section" id="features">
        <div className="lp-wrap lp-split">
          <h2 className="lp-h2">Five tools for one job.</h2>
          <dl className="lp-defs">
            {FEATURES.map(([term, desc]) => (
              <div key={term}><dt>{term}</dt><dd>{desc}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section className="lp-section" id="how">
        <div className="lp-wrap">
          <h2 className="lp-h2">Set up in five minutes.</h2>
          <ol className="lp-steps">
            {STEPS.map(([title, body]) => (
              <li key={title}><h3>{title}</h3><p>{body}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="lp-wrap"><div className="lp-close">
        <div>
          <h2 className="lp-h2">Your data stays in your browser.</h2>
          <p>No account and no server. Export a backup file whenever you want one.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onStart}>Open the tracker</button>
        </div>
      </section>

      <footer className="lp-wrap"><div className="lp-foot">
        <span>Board Exam Tracker</span>
        <span>Built for reviewees, {new Date().getFullYear()}</span>
      </div></footer>
    </div>
  )
}
