export default function SampleGallery({ samples, selected, onSelect }) {
  const currentIndex = selected
    ? samples.findIndex((s) => s.id === selected.id)
    : 0

  const count = samples.length
  const half = Math.floor(count / 2)

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
    <div className="card sample-gallery-card">
      <div className="card-header">Sample Image</div>

      <div className="gallery-carousel-wrapper">
        {/* Left Arrow */}
        <button
          type="button"
          className="carousel-btn prev-btn"
          onClick={handlePrev}
          aria-label="Previous sample"
        >
          ‹
        </button>

        {/* Circular Centered Carousel Items */}
        <div className="gallery-carousel-track">
          {samples.map((sample, idx) => {
            // Shortest circular offset from center: range [-2, +2]
            let diff = idx - currentIndex
            if (diff > half) diff -= count
            if (diff < -half) diff += count

            const isCenter = diff === 0

            return (
              <div
                key={sample.id}
                className={`gallery-card-item ${isCenter ? 'center-active' : ''}`}
                style={{
                  '--pos': diff,
                  '--dist': Math.abs(diff),
                }}
                onClick={() => onSelect(sample)}
                role="button"
                tabIndex={0}
                title={sample.id}
              >
                <div className="gallery-item-thumb">
                  <img src={sample.img} alt={sample.id} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Arrow */}
        <button
          type="button"
          className="carousel-btn next-btn"
          onClick={handleNext}
          aria-label="Next sample"
        >
          ›
        </button>
      </div>

      {/* Selected Sample ID label */}
      <div className="gallery-selected-label">
        {samples[currentIndex]?.id}
      </div>
    </div>
  )
}
