const DEFAULT_LESIONS = [
  { type: 'Drusen', color: '#9333ea' },
  { type: 'Hard Exudate', color: '#8e8e93' },
  { type: 'Hemorrhages', color: '#0071e3' },
]

function formatSeverity(val) {
  if (!val && val !== 0) return '—'
  if (typeof val === 'string') {
    const trimmed = val.trim()
    const match = [
      'No disease',
      'Normal aging',
      'Early',
      'Intermediate',
      'Advanced',
    ].find((s) => s.toLowerCase() === trimmed.toLowerCase())
    if (match) return match
  }

  const num = Number(val)
  if (num === 0) return 'No disease'
  if (num === 1) return 'Normal aging'
  if (num === 2) return 'Early'
  if (num === 3) return 'Intermediate'
  if (num >= 4) return 'Advanced'

  return String(val)
}

export default function AnalysisPanel({ result, isAnalyzing, sample }) {
  const lesions = result?.lesions ?? DEFAULT_LESIONS.map((l) => ({
    type: l.type,
    color: l.color,
    count: '—',
    area_percentage: '—',
    largest_spot: '—',
    status: 'Pending',
  }))

  const severityText = result
    ? formatSeverity(result.severity ?? result.severity_level)
    : '—'

  return (
    <div className="analysis-wrapper">
      {/* Visual Canvas */}
      <div className="canvas-frame">
        {isAnalyzing ? (
          <div className="analyzing-state">
            <div className="apple-spinner" />
            <p className="analyzing-text">Analyzing retina...</p>
          </div>
        ) : result ? (
          <img
            src={result.biomarker_image ?? sample?.img}
            alt="Biomarker"
            className="retina-image"
          />
        ) : (
          <div className="empty-canvas">
            <span>Ready for analysis</span>
          </div>
        )}
      </div>

      {/* Findings: Permanent height-stable layout */}
      <div className="results-container">
        {/* 3 Metric Stats */}
        <div className="metrics-row">
          <div className="stat-box">
            <span className="stat-label">Confidence</span>
            <span className={`stat-number ${result ? 'accent' : 'dimmed'}`}>
              {result ? `${result.confidence}%` : '—'}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Total Lesions</span>
            <span className={`stat-number ${result ? '' : 'dimmed'}`}>
              {result ? result.total_lesion : '—'}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Severity</span>
            <span
              className={`stat-number text-val ${result ? '' : 'dimmed'}`}
              title={result ? severityText : undefined}
            >
              {severityText}
            </span>
          </div>
        </div>

        {/* Spatial Breakdown Table */}
        <div className="breakdown-section">
          <div className="breakdown-header-row">
            <span className="breakdown-title">Lesion Distribution</span>
            {!result && !isAnalyzing && (
              <span className="standby-tag">Awaiting Analysis</span>
            )}
            {isAnalyzing && (
              <span className="standby-tag processing">Analyzing...</span>
            )}
          </div>
          <div className="table-scroll">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Count</th>
                  <th>Area</th>
                  <th>Max (μm)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lesions.map((item) => (
                  <tr key={item.type}>
                    <td>
                      <div className="type-cell">
                        <span
                          className="color-dot"
                          style={item.color ? { backgroundColor: item.color } : { border: '1.5px solid #ccc' }}
                        />
                        <span>{item.type}</span>
                      </div>
                    </td>
                    <td className="bold">{item.count}</td>
                    <td className="muted">{item.area_percentage}</td>
                    <td>{item.largest_spot}</td>
                    <td>
                      <span className={`status-pill ${item.status ? item.status.toLowerCase() : 'pending'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
