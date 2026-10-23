import { LESION_CLASSES, findingsSummary } from '../services/evaluation'

export default function AnalysisPanel({ result, isAnalyzing }) {
  const lesions = result?.lesions ?? LESION_CLASSES.map((item) => ({ ...item, count: null, status: 'Pending' }))
  const state = isAnalyzing ? 'Analyzing...' : result?.is_simulated ? 'Simulation' : result ? 'Analysis complete' : 'Awaiting analysis'
  return (
    <div className="analysis-wrapper" aria-busy={isAnalyzing}>
      <div className="breakdown-header-row"><h2>Analysis Results</h2><span className="standby-tag" role="status">{state}</span></div>
      <section className="severity-summary" aria-labelledby="severity-title" aria-live="polite">
        <h3 id="severity-title">Severity</h3>
        <p className="severity-value">{isAnalyzing ? 'Analyzing...' : result?.severity ?? 'Awaiting analysis'}</p>
        <p>{result ? findingsSummary(lesions) : 'Select a sample and analyze the image to view findings.'}</p>
        <small>Based on the existing Beckman Clinical Classification criteria.</small>
      </section>
      {result?.is_simulated && <p className="notice" role="status">Server unavailable. These are simulated results, with no AI mask or reference evaluation. Try Analyze Image again when the server is ready.</p>}
      <div className="table-scroll">
        <table className="clean-table">
          <caption className="sr-only">Lesion counts, maximum sizes and presence comparison with sample reference labels</caption>
          <thead><tr><th scope="col">Lesion type</th><th scope="col">Count</th><th scope="col">Max (mm)</th><th scope="col">Status</th></tr></thead>
          <tbody>{lesions.map((item) => <tr key={item.type}>
            <th scope="row"><span className="type-cell"><i className="color-dot" style={{ backgroundColor: item.color }} />{item.type}</span></th>
            <td>{item.count ?? '—'}</td>
            <td>{item.count > 0 && Number.isFinite(item.max_mm) ? `${result?.mm_conversion_approximate ? '≈' : ''}${item.max_mm.toFixed(2)}` : '—'}</td>
            <td><span className={`status-pill ${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span></td>
          </tr>)}</tbody>
        </table>
      </div>
            <ul className="status-key" aria-label="Status meanings">
        <li><strong>Confirmed finding:</strong> AI found a lesion that is present in the reference.</li>
        <li><strong>Not present:</strong> Neither AI nor the reference shows this lesion type.</li>
        <li><strong>False alarm:</strong> AI flagged a lesion that is absent in the reference.</li>
        <li><strong>Missed finding:</strong> The reference shows a lesion, but AI did not find it.</li>
      </ul>
      <p className="analysis-note">Status compares presence per lesion type with the sample reference, not individual lesion counts or sizes.</p>
      {result?.mm_conversion_approximate && <p className="analysis-note">≈ Size uses the server's fallback scale because the optic disc was not detected.</p>}
    </div>
  )
}
