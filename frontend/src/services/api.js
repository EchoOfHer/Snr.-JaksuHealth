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
  await new Promise((r) => setTimeout(r, 2500))

  return {
    biomarker_image: imageUrl, // placeholder
    confidence: 94,
    total_lesion: 58,
    severity_level: 4,
    lesions: [
      {
        type: 'Drusen',
        color: '#9B59B6',
        count: 30,
        area_percentage: '1.48 of total',
        largest_spot: 150,
        status: 'Significant',
      },
      {
        type: 'Hard Exudate',
        color: null,
        count: 20,
        area_percentage: '1.25 of total',
        largest_spot: 80,
        status: 'Significant',
      },
      {
        type: 'Hemorrhages',
        color: '#3B82F6',
        count: 8,
        area_percentage: '0.80 of total',
        largest_spot: 50,
        status: 'Moderate',
      },
    ],
  }
}
