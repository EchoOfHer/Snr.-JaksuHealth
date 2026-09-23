export default function SampleGallery({ samples, selected, onSelect }) {
  const count = samples.length
  const half = Math.floor(count / 2)

  const currentIndex = selected
    ? samples.findIndex((s) => s.id === selected.id)
    : 0

  const handlePrev = (e) => {
    e.stopPropagation()
    const nextIdx = (currentIndex - 1 + count) % count
    onSelect(samples[nextIdx])
  }

  const handleNext = (e) => {
    e.stopPropagation()
    const nextIdx = (currentIndex + 1) % count
    onSelect(samples[nextIdx])
  }

  return (
    <div className="circular-sample-section">
      <div className="sample-section-header">
        <span className="sample-section-title">Samples</span>
        <span className="sample-badge-count">{currentIndex + 1} of {count}</span>
      </div>

      <div className="carousel-view-container">
        {/* Prev Arrow */}
        <button
          type="button"
          className="carousel-circle-nav prev"
          onClick={handlePrev}
          aria-label="Previous sample"
        >
          ‹
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
              <div
                key={sample.id}
                className={`circular-sample-item ${isCenter ? 'center-active' : ''}`}
                style={{
                  '--offset': diff,
                  '--abs-offset': Math.abs(diff),
                }}
                onClick={() => onSelect(sample)}
                role="button"
                tabIndex={0}
                title={sample.id}
              >
                <div className="sample-img-wrapper">
                  <img src={sample.img} alt={sample.id} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Next Arrow */}
        <button
          type="button"
          className="carousel-circle-nav next"
          onClick={handleNext}
          aria-label="Next sample"
        >
          ›
        </button>
      </div>
    </div>
  )
}
