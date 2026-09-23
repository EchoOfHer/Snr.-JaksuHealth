export default function ClinicalInfoPanel({ metadata }) {
  const eyeSide = metadata?.eyeSide ?? (metadata?.eye?.includes('Left') ? 'Left Eye' : 'Right Eye')
  const eyeCode = metadata?.eyeCode ?? (metadata?.eye?.includes('Left') ? 'OS' : 'OD')

  return (
    <div className="patient-meta-grid">
      {/* Patient ID */}
      <div className="patient-meta-card">
        <span className="patient-meta-label">Patient ID</span>
        <span className="patient-meta-value">{metadata ? metadata.patientId : '—'}</span>
      </div>

      {/* Laterality */}
      <div className="patient-meta-card">
        <span className="patient-meta-label">Laterality</span>
        <div className="laterality-value-row">
          <span className="patient-meta-value">{metadata ? eyeSide : '—'}</span>
          {metadata && <span className="laterality-code-badge">{eyeCode}</span>}
        </div>
      </div>
    </div>
  )
}
