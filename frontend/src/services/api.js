const BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:8000' : 'https://revisit-return-fog.ngrok-free.dev')

/**
 * analyzeImageMock — Mock for development and visual simulation
 */
export async function analyzeImageMock(sampleId, imageUrl) {
  // simulate network delay
  await new Promise((r) => setTimeout(r, 1200))

  const sampleData = {
    HH36895_0100_L: { severity: 'Intermediate AMD criteria (large drusen > 125 µm)', confidence: 94, total_lesion: 58 },
    HH39462_0400_L: { severity: 'Intermediate AMD criteria (large drusen > 125 µm)', confidence: 96, total_lesion: 74 },
    HH40481_0200_L: { severity: 'Early AMD criteria (medium drusen 63–125 µm)', confidence: 91, total_lesion: 24 },
    HH40508_0400_R: { severity: 'Normal aging changes (drupelets ≤ 63 µm)', confidence: 95, total_lesion: 6 },
    HH47331_0200_R: { severity: 'No apparent AMD signs', confidence: 98, total_lesion: 0 },
  }

  const selected = sampleData[sampleId] || { severity: 'Intermediate AMD criteria (large drusen > 125 µm)', confidence: 94, total_lesion: 58 }

  return {
    biomarker_image: imageUrl,
    confidence: selected.confidence,
    total_lesion: selected.total_lesion,
    severity: selected.severity,
    severity_level: selected.severity,
    is_simulated: true,
    lesions: [
      {
        type: 'Drusen',
        color: '#FF00FF',
        count: selected.total_lesion > 0 ? Math.round(selected.total_lesion * 0.55) : 0,
        area_percentage: selected.total_lesion > 0 ? '1.48%' : '0.00%',
        max_mm: selected.total_lesion > 0 ? 1.5 : 0,
        status: selected.total_lesion > 0 ? 'Intermediate' : 'None',
      },
      {
        type: 'Hard Exudate',
        color: '#00FF00',
        count: selected.total_lesion > 0 ? Math.round(selected.total_lesion * 0.32) : 0,
        area_percentage: selected.total_lesion > 0 ? '1.25%' : '0.00%',
        max_mm: selected.total_lesion > 0 ? 0.8 : 0,
        status: selected.total_lesion > 0 ? 'Detected' : 'None',
      },
      {
        type: 'Hemorrhages',
        color: '#0000FF',
        count: selected.total_lesion > 0 ? Math.round(selected.total_lesion * 0.13) : 0,
        area_percentage: selected.total_lesion > 0 ? '0.80%' : '0.00%',
        max_mm: selected.total_lesion > 0 ? 0.5 : 0,
        status: selected.total_lesion > 0 ? 'Detected' : 'None',
      },
    ].sort((a, b) => b.count - a.count),
  }
}

/**
 * Beckman Clinical Classification & Finding Interpretation:
 * Staging criteria per Beckman clinical classification (Ferris et al., Ophthalmology 2013):
 * - No apparent aging changes: No drusen, no pigment abnormalities.
 * - Normal aging changes: Only small drusen (drupelets <= 63 um).
 * - Early AMD: Medium drusen (> 63 um and <= 125 um).
 * - Intermediate AMD: Large drusen (> 125 um) or extensive medium drusen.
 *
 * Single-image fundus detection of hemorrhages or exudates alone cannot confirm Neovascular AMD
 * without confirmatory multimodal imaging (OCT, FFA). They are reported as co-existing retinal findings.
 */
function classify_AMD_beckman(eye_features) {
  const d = eye_features.max_drusen_diameter_um;
  const pigment = eye_features.has_pigmentary_abnormality;
  const otherLesions = eye_features.has_other_lesions;

  let baseSeverity = "No apparent AMD signs";

  if (!d || d === 0) {
    if (pigment) baseSeverity = "Indeterminate — pigment abnormality without drusen (clinical review needed)";
    else baseSeverity = "No apparent AMD signs";
  } else if (d <= 63) {
    if (pigment) baseSeverity = "Indeterminate — pigment abnormality with drupelets only (clinical review needed)";
    else baseSeverity = "Normal aging changes (drupelets ≤ 63 µm)";
  } else if (d > 63 && d <= 125) {
    baseSeverity = "Early AMD criteria (medium drusen 63–125 µm)";
  } else {
    baseSeverity = "Intermediate AMD criteria (large drusen > 125 µm)";
  }

  if (otherLesions) {
    return `${baseSeverity} + Co-existing retinal lesions (Exudates/Hemorrhages detected; non-specific finding, clinical evaluation required)`;
  }

  return baseSeverity;
}

/**
 * analyzeImageFile — Send fundus image to real SegFormer Backend
 */
export async function analyzeImageFile(file, options = {}) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('input_type', options.inputType || 'raw_fundus')

  const res = await fetch(`${BASE_URL}/api/predict`, {
    method: 'POST',
    headers: { 'ngrok-skip-browser-warning': 'true' },
    body: formData,
  })
  if (!res.ok) throw new Error(`Backend inference failed: ${res.status} ${res.statusText}`)

  const rawData = await res.json()

  // Extract features for preliminary clinical classification
  const drusenLesion = rawData.lesions?.find(l => l.type === 'Drusen');
  const max_drusen_diameter_um = drusenLesion && drusenLesion.count > 0 ? (drusenLesion.max_mm * 1000) : 0;

  const has_other_lesions = rawData.lesions?.some(l =>
    (l.type === 'Hemorrhages' || l.type === 'Exudates') && l.count > 0
  ) || false;

  const severity = classify_AMD_beckman({
    max_drusen_diameter_um,
    has_pigmentary_abnormality: false,
    has_other_lesions
  });

  // Map backend classes to AnalysisPanel view
  const lesions = rawData.lesions
    ?.filter(l => l.type !== 'OpticDisc' && l.type !== 'Macula')
    ?.map(l => {
      const displayType = l.type === 'Exudates' ? 'Hard Exudate' : l.type;

      let status = 'None';
      if (l.type === 'Drusen') {
        const d_um = l.max_mm * 1000;
        if (l.count > 0) {
          status = d_um > 125 ? 'Intermediate' : d_um > 63 ? 'Early' : 'Normal';
        }
      } else if (l.type === 'Hemorrhages' || l.type === 'Exudates') {
        status = l.count > 0 ? 'Detected' : 'None';
      }

      return {
        type: displayType,
        color: l.color,
        count: l.count,
        area_percentage: `${l.area_percentage}%`,
        max_mm: l.max_mm,
        status: status,
        pixel_count_512: l.pixel_count_512,
        pixel_count_orig: l.pixel_count_orig,
      };
    })
    ?.sort((a, b) => b.count - a.count) || [];

  const total = lesions.reduce((acc, curr) => acc + (curr.count || 0), 0);

  return {
    biomarker_image: rawData.mask_base64,
    confidence: rawData.confidence ?? 94,
    total_lesion: total,
    severity: severity,
    lesions: lesions,
    mm_conversion_approximate: rawData.mm_conversion_approximate,
    calibration: rawData.calibration,
    spatial_correspondence: rawData.spatial_correspondence,
    original_findings: rawData.findings,
    metadata: rawData.metadata,
    is_simulated: false,
  }
}

/**
 * checkHealth — Verify if FastAPI SegFormer backend is online
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/api/status`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * exportReportPDF — Request PDF clinical report generation from backend
 */
export async function exportReportPDF(result, metadata) {
  const res = await fetch(`${BASE_URL}/export-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    },
    body: JSON.stringify({ result, metadata }),
  })
  if (!res.ok) throw new Error(`PDF export failed: ${res.status}`)
  return await res.blob()
}
