export default function ClinicalInfoPanel({ metadata }) {
  return (
    <div className="card clinical-info-card">
      <div className="card-header">Clinical Information</div>
      <div className="clinical-fields">
        <div className="field-group">
          <label className="field-label">Patient ID</label>
          <div className={`field-value${!metadata ? ' placeholder' : ''}`}>
            {metadata ? metadata.patientId : ''}
          </div>
        </div>
        <div className="field-group">
          <label className="field-label">Eye Laterality</label>
          <div className={`field-value${!metadata ? ' placeholder' : ''}`}>
            {metadata ? metadata.eye : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
