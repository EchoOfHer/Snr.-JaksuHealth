const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * analyzeImage — Call real Backend endpoint
 */
export async function analyzeImage(sampleId) {
  const res = await fetch(`${BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
        color: '#9B59B6',
        count: selected.total_lesion > 0 ? Math.round(selected.total_lesion * 0.55) : 0,
        area_percentage: selected.total_lesion > 0 ? '1.48 of total' : '0.00',
        largest_spot: selected.total_lesion > 0 ? 150 : 0,
        status: selected.total_lesion > 30 ? 'Significant' : selected.total_lesion > 0 ? 'Moderate' : 'None',
      },
      {
        type: 'Hard Exudate',
        color: null,
        count: selected.total_lesion > 0 ? Math.round(selected.total_lesion * 0.32) : 0,
        area_percentage: selected.total_lesion > 0 ? '1.25 of total' : '0.00',
        largest_spot: selected.total_lesion > 0 ? 80 : 0,
        status: selected.total_lesion > 30 ? 'Significant' : selected.total_lesion > 0 ? 'Moderate' : 'None',
      },
      {
        type: 'Hemorrhages',
        color: '#3B82F6',
        count: selected.total_lesion > 0 ? Math.round(selected.total_lesion * 0.13) : 0,
        area_percentage: selected.total_lesion > 0 ? '0.80 of total' : '0.00',
        largest_spot: selected.total_lesion > 0 ? 50 : 0,
        status: selected.total_lesion > 10 ? 'Significant' : selected.total_lesion > 0 ? 'Moderate' : 'None',
      },
    ],
  }
}

/**
 * analyzeImageFile — For when user uploads a custom raw fundus file
 */
export async function analyzeImageFile(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`Image file analysis failed: ${res.status}`)
  return await res.json()
}

/**
 * checkHealth — Verify if FastAPI SegFormer backend is online
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { method: 'GET' })
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result, metadata }),
  })
  if (!res.ok) throw new Error(`PDF export failed: ${res.status}`)
  return await res.blob()
}
