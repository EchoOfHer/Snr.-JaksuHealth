const BASE_URL = import.meta.env.VITE_API_URL || 'https://revisit-return-fog.ngrok-free.dev'

/**
 * analyzeImage — Call real Backend endpoint
 */
export async function analyzeImage(sampleId) {
  const res = await fetch(`${BASE_URL}/predict`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    },
    body: JSON.stringify({ sample_id: sampleId }),
  })
  if (!res.ok) throw new Error(`Analysis failed: ${res.status}`)
  return await res.json()
  /*
   * Expected response:
   * {
   *   biomarker_image: string | null,
   *   confidence: number,
   *   total_lesion: number,
   *   severity_level: number,
   *   lesions: [
   *     { type, color, count, area_percentage, largest_spot, status }
   *   ]
   * }
   */
}

/**
 * analyzeImageMock — Mock for development prior to backend deployment
 */
export async function analyzeImageMock(sampleId, imageUrl) {
  // simulate network delay
  await new Promise((r) => setTimeout(r, 2000))

  const sampleData = {
    HH36895_0100_L: { severity: 'Intermediate', confidence: 94, total_lesion: 58 },
    HH39462_0400_L: { severity: 'Advanced', confidence: 96, total_lesion: 74 },
    HH40481_0200_L: { severity: 'Early', confidence: 91, total_lesion: 24 },
    HH40508_0400_R: { severity: 'Normal aging', confidence: 95, total_lesion: 6 },
    HH47331_0200_R: { severity: 'No disease', confidence: 98, total_lesion: 0 },
  }

  const selected = sampleData[sampleId] || { severity: 'Intermediate', confidence: 94, total_lesion: 58 }

  return {
    biomarker_image: imageUrl, // placeholder
    confidence: selected.confidence,
    total_lesion: selected.total_lesion,
    severity: selected.severity,
    severity_level: selected.severity,
    lesions: [
      {
        type: 'Drusen',
        color: '#00FFFF',
        count: selected.total_lesion > 0 ? Math.round(selected.total_lesion * 0.55) : 0,
        area_percentage: selected.total_lesion > 0 ? '1.48%' : '0.00%',
        max_mm: selected.total_lesion > 0 ? 1.5 : 0,
        status: selected.total_lesion > 0 ? 'Intermediate' : 'None',
      },
      {
        type: 'Hard Exudate',
        color: '#FFFF00',
        count: selected.total_lesion > 0 ? Math.round(selected.total_lesion * 0.32) : 0,
        area_percentage: selected.total_lesion > 0 ? '1.25%' : '0.00%',
        max_mm: selected.total_lesion > 0 ? 0.8 : 0,
        status: selected.total_lesion > 0 ? 'Late (Neovascular)' : 'None',
      },
      {
        type: 'Hemorrhages',
        color: '#FF0000',
        count: selected.total_lesion > 0 ? Math.round(selected.total_lesion * 0.13) : 0,
        area_percentage: selected.total_lesion > 0 ? '0.80%' : '0.00%',
        max_mm: selected.total_lesion > 0 ? 0.5 : 0,
        status: selected.total_lesion > 0 ? 'Late (Neovascular)' : 'None',
      },
    ].sort((a, b) => b.count - a.count),
  }
}

/**
 * analyzeImageFile — For when user uploads a custom raw fundus file
 */
// --- Beckman Classification Logic ---
function classify_AMD_beckman(eye_features) {
  if (eye_features.has_geographic_atrophy || eye_features.has_neovascular_amd) {
    if (eye_features.has_neovascular_amd && eye_features.has_geographic_atrophy) {
      return "Late AMD (Neovascular + Geographic Atrophy)";
    } else if (eye_features.has_neovascular_amd) {
      return "Late AMD (Neovascular AMD)";
    } else {
      return "Late AMD (Geographic Atrophy)";
    }
  }

  const d = eye_features.max_drusen_diameter_um;
  const pigment = eye_features.has_pigmentary_abnormality;

  if (!d || d === 0) {
    if (pigment) return "Indeterminate — pigment abnormality without drusen, review needed";
    return "No apparent aging changes";
  } else if (d <= 63) {
    if (pigment) return "Indeterminate — pigment abnormality with drupelets only, review needed";
    return "Normal aging changes";
  } else if (d > 63 && d <= 125) {
    if (pigment) return "Intermediate AMD";
    return "Early AMD";
  } else {
    return "Intermediate AMD";
  }
}

export async function analyzeImageFile(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${BASE_URL}/api/predict`, {
    method: 'POST',
    headers: { 'ngrok-skip-browser-warning': 'true' },
    body: formData,
  })
  if (!res.ok) throw new Error(`Image file analysis failed: ${res.status}`)
  
  const rawData = await res.json()
  
  // Extract features for overall severity
  const drusenLesion = rawData.lesions?.find(l => l.type === 'Drusen');
  const max_drusen_diameter_um = drusenLesion && drusenLesion.count > 0 ? (drusenLesion.max_mm * 1000) : 0;
  
  const has_neovascular_amd = rawData.lesions?.some(l => 
    (l.type === 'Hemorrhages' || l.type === 'Exudates') && l.count > 0
  ) || false;

  const severity = classify_AMD_beckman({
    max_drusen_diameter_um,
    has_pigmentary_abnormality: false, // Not detected by model
    has_geographic_atrophy: false,     // Not detected by model
    has_neovascular_amd
  });

  // แปลงข้อมูลจาก Backend ให้เข้ากับหน้าตา UI (AnalysisPanel)
  const lesions = rawData.lesions
    ?.filter(l => l.type !== 'OpticDisc' && l.type !== 'Macula')
    ?.map(l => {
      const displayType = l.type === 'Exudates' ? 'Hard Exudate' : l.type;

      // Status อิงจากผลกระทบต่อ Beckman Score
      let status = 'None';
      if (l.type === 'Drusen') {
        const d_um = l.max_mm * 1000;
        if (l.count > 0) {
          status = d_um > 125 ? 'Intermediate' : d_um > 63 ? 'Early' : 'Normal';
        }
      } else if (l.type === 'Hemorrhages' || l.type === 'Exudates') {
        status = l.count > 0 ? 'Late (Neovascular)' : 'None';
      }

      return {
        type: displayType,
        color: l.color,
        count: l.count,
        area_percentage: `${l.area_percentage}%`,
        max_mm: l.max_mm,
        status: status,
      };
    })
    ?.sort((a, b) => b.count - a.count) || [];

  // คำนวณ total แบบใหม่ (รวมจำนวนก้อนทั้งหมด)
  const total = lesions.reduce((acc, curr) => acc + curr.count, 0);

  return {
    biomarker_image: rawData.mask_base64,
    confidence: rawData.confidence ?? 94,
    total_lesion: total,
    severity: severity,
    lesions: lesions,
    mm_conversion_approximate: rawData.mm_conversion_approximate,
    original_findings: rawData.findings,
    metadata: rawData.metadata
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
 * analyzeImageWithFallback — Attempts real backend first; falls back smoothly to mock if offline
 */
export async function analyzeImageWithFallback(sampleId, imageUrl) {
  try {
    // Attempt real backend inference
    return await analyzeImage(sampleId)
  } catch (err) {
    console.info('[JaksuHealth] Backend offline or unreachable, using local clinical simulation:', err.message)
    return await analyzeImageMock(sampleId, imageUrl)
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
