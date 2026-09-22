export default function InputImagePanel({ sample }) {
  return (
    <div className="card">
      <div className="input-panel-header">
        <span className="card-header" style={{ marginBottom: 0 }}>Input Image</span>
        <span className="step-badge">Step 1</span>
      </div>

      <div className="input-image-body">
        {sample ? (
          <div className="image-zone">
            <img src={sample.img} alt={sample.id} />
          </div>
        ) : (
          <div className="await-zone">
            <EmptyRetina />
            <span className="await-title">No image selected</span>
            <span className="await-subtitle">Choose a sample above to preview</span>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyRetina() {
  return (
    <svg width="52" height="52" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="24" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="28" cy="28" r="13" stroke="#D1D5DB" strokeWidth="1.5" />
      <circle cx="28" cy="28" r="4.5" fill="#D1D5DB" />
    </svg>
  )
}
