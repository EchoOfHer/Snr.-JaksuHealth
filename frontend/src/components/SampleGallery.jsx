import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function SampleGallery({ samples, selected, onSelect, disabled }) {
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 640px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const update = (event) => setCompact(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const count = samples.length
  const half = Math.floor(count / 2)

  const currentIndex = selected
    ? samples.findIndex((s) => s.id === selected.id)
    : 0

  const handlePrev = (e) => {
    if (disabled) return
    if (e) e.stopPropagation()
    const nextIdx = (currentIndex - 1 + count) % count
    onSelect(samples[nextIdx])
  }

  const handleNext = (e) => {
    if (disabled) return
    if (e) e.stopPropagation()
    const nextIdx = (currentIndex + 1) % count
    onSelect(samples[nextIdx])
  }

  const dragStart = useRef(null)
  const suppressClick = useRef(false)
  const handlePointerDown = (event) => {
    suppressClick.current = false
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
    dragStart.current = event.clientX
  }
  const handlePointerUp = (event) => {
    if (dragStart.current === null) return
    const distance = dragStart.current - event.clientX
    dragStart.current = null
    if (disabled || Math.abs(distance) < 40) return
    suppressClick.current = true
    if (distance > 0) handleNext()
    else handlePrev()
  }

  return (
    <div className="circular-sample-section">
      <div className="sample-section-header">
        <span className="sample-section-title">Samples</span>
        <span className="sample-badge-count">{currentIndex + 1} of {count}</span>
      </div>

      <div 
        className="carousel-view-container"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={() => { dragStart.current = null }}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault()
            event.stopPropagation()
            suppressClick.current = false
          }
        }}
      >
        {/* Prev Arrow */}
        <button
          type="button"
          className="carousel-circle-nav prev"
          onClick={handlePrev}
          aria-label="Previous sample"
          disabled={disabled}
        >
          <ChevronLeft size={18} />
        </button>

        {/* Circular Items Stage */}
        <div className="carousel-circular-stage">
          {samples.map((sample, idx) => {
            // Shortest circular offset: values from -2 to +2
            let diff = idx - currentIndex
            if (diff > half) diff -= count
            if (diff < -half) diff += count

            const isCenter = diff === 0

            return (
              <button
                type="button"
                key={sample.id}
                className={`circular-sample-item ${isCenter ? 'center-active' : ''}`}
                style={{
                  '--offset': diff,
                  '--abs-offset': Math.abs(diff),
                }}
                onClick={() => { if (!disabled) onSelect(sample) }}
                disabled={disabled}
                aria-pressed={isCenter}
                aria-label={`Select sample ${sample.id}`}
                aria-hidden={Math.abs(diff) > (compact ? 1 : 2)}
                data-outside={Math.abs(diff) > 2}
                tabIndex={Math.abs(diff) > (compact ? 1 : 2) ? -1 : 0}
                title={sample.id}
              >
                <div className="sample-img-wrapper">
                  <img src={sample.img} alt="" draggable="false" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Next Arrow */}
        <button
          type="button"
          className="carousel-circle-nav next"
          onClick={handleNext}
          aria-label="Next sample"
          disabled={disabled}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
