export default function AnalysisPanel({ result, isAnalyzing, sample }) {
  return (
    <div className="card analysis-panel">
      <div className="panel-top-header">
        <span className="card-header" style={{ marginBottom: 0 }}>Analysis</span>
        <span className="step-badge step-result">Step 2</span>
      </div>
      <div className="panel-sub-label">
        <span>Biomarker Visualisation</span>
      </div>

      {isAnalyzing ? (
        <div className="analysis-await">
          <div className="spinner" />
          <span className="await-title">Processing...</span>
          <span className="await-subtitle">
            Analyzing retinal image for biomarkers and lesion distribution
          </span>
        </div>

      ) : result ? (
        <div className="analysis-content">

          {/* Biomarker Visualisation */}
          <div className="result-section">
            <div className="biomarker-image">
              <img src={result.biomarker_image ?? sample?.img} alt="Biomarker Visualisation" />
            </div>
          </div>

          {/* Metrics */}
          <div className="result-section">
            <span className="section-label">Analysis Metrics</span>
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-name">Confidence</div>
                <div className="metric-value orange">{result.confidence}%</div>
                <div className="metric-bar">
                  <div className="metric-bar-fill" style={{ width: `${result.confidence}%` }} />
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-name">Total Lesions</div>
                <div className="metric-value dark">{result.total_lesion}</div>
                <div className="metric-tag">detected</div>
              </div>
              <div className="metric-card">
                <div className="metric-name">Severity Level</div>
                <div className="metric-value dark">{result.severity_level}</div>
                <div className="metric-tag severity">of 5</div>
              </div>
            </div>
          </div>

          {/* Spatial Distribution */}
          <div className="result-section">
            <span className="section-label">Spatial Distribution Breakdown</span>
            <div className="table-responsive-wrapper">
              <table className="lesion-table">
                <thead>
                  <tr>
                    <th>Lesion Type</th>
                    <th>Count</th>
                    <th>Area %</th>
                    <th>Largest (μm)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lesions.map((lesion) => (
                    <tr key={lesion.type}>
                      <td>
                        <div className="lesion-type-cell">
                          <span
                            className={`lesion-dot${lesion.color ? '' : ' empty'}`}
                            style={lesion.color ? { background: lesion.color } : {}}
                          />
                          <span>{lesion.type}</span>
                        </div>
                      </td>
                      <td className="td-number">{lesion.count}</td>
                      <td className="td-muted">{lesion.area_percentage}</td>
                      <td className="td-number">{lesion.largest_spot}</td>
                      <td>
                        <span className={`status-badge status-${lesion.status.toLowerCase()}`}>
                          {lesion.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      ) : (
        <div className="analysis-await">
          <EmptyIcon />
          <span className="await-title">No data yet</span>
          <span className="await-subtitle">
            Select a sample image and click Analyze to begin
          </span>
        </div>
      )}
    </div>
  )
}

function EmptyIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="24" stroke="#E0E0E0" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="28" cy="28" r="14" stroke="#E0E0E0" strokeWidth="1.5" />
      <circle cx="28" cy="28" r="5" fill="#E0E0E0" />
    </svg>
  )
}
