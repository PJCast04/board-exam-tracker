import React, { useState, useEffect } from 'react'
import { AppProvider } from './context/AppContext'
import Landing from './pages/Landing'
import Dashboard, { VIEW_IDS } from './pages/Dashboard'

// Hash routes: #/home is the landing page, #/<view> is a dashboard view.
// Hash routing keeps the browser back button working without a router dependency,
// and works when the built app is opened straight from disk.
function readRoute() {
  const route = location.hash.replace(/^#\/?/, '')
  if (route === 'home' || VIEW_IDS.includes(route)) return route
  return null
}

function defaultRoute() {
  if (localStorage.getItem('bept_page') !== 'dashboard') return 'home'
  const last = localStorage.getItem('bept_view')
  return VIEW_IDS.includes(last) ? last : 'overview'
}

export default function App() {
  const [route, setRoute] = useState(() => readRoute() ?? defaultRoute())

  useEffect(() => {
    if (readRoute() !== route) history.replaceState(null, '', `#/${route}`)
    const onHash = () => setRoute(readRoute() ?? defaultRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem('bept_page', route === 'home' ? 'landing' : 'dashboard')
    if (route !== 'home') localStorage.setItem('bept_view', route)
    window.scrollTo(0, 0)
  }, [route])

  const go = next => { location.hash = `#/${next}` }

  return (
    <AppProvider>
      {route === 'home'
        ? <Landing onStart={() => {
            const last = localStorage.getItem('bept_view')
            go(VIEW_IDS.includes(last) ? last : 'overview')
          }} />
        : <Dashboard view={route} go={go} onBack={() => go('home')} />}
    </AppProvider>
  )
}
