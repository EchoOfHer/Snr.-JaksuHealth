import { useState, useEffect } from 'react'

export default function Navbar() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="apple-navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <img src="/favicon.svg" alt="JaksuHealth" className="navbar-logo-img" />
          <span className="brand-text">
            Jaksu<span className="brand-accent">Health</span>
          </span>
        </div>
        <div className="navbar-time">{time}</div>
      </div>
    </header>
  )
}
