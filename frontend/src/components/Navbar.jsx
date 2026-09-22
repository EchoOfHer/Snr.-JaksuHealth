import { useState, useEffect } from 'react'

export default function Navbar() {
  const [time, setTime] = useState('')
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    // Clock
    const tick = () => setTime(formatTime(new Date()))
    tick()
    const clockId = setInterval(tick, 1000)

    // Sticky on scroll
    const handleScroll = () => setIsSticky(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      clearInterval(clockId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <nav className={`navbar${isSticky ? ' sticky-nav' : ''}`}>
      {/* Logo + Brand */}
      <div className="navbar-left">
        <div className="navbar-logo">
          <img src="/favicon.svg" alt="JaksuHealth Logo" width="36" height="36" />
        </div>
        <div className="navbar-brand">
          <span className="brand-jaksu">Jaksu</span>
          <span className="brand-health">Health</span>
        </div>
      </div>

      {/* Clock */}
      <div className="navbar-time">{time}</div>
    </nav>
  )
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
