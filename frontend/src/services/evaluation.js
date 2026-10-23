// Model channel order: OpticDisc, Macula, Exudates, Hemorrhages, Drusen.
export const LESION_CLASSES = [
  { type: 'Drusen', index: 4, color: '#FF00FF' },
  { type: 'Hard Exudate', index: 2, color: '#00FF00' },
  { type: 'Hemorrhages', index: 3, color: '#0000FF' },
]

export function evaluateLesions(lesions, groundTruth, simulated = false) {
  const validReference = typeof groundTruth === 'string' && /^[01]{5}$/.test(groundTruth)
  return LESION_CLASSES.map((definition) => {
    const lesion = lesions.find((item) => item.type === definition.type ||
      (definition.index === 2 && item.type === 'Exudates'))
    const count = lesion?.count
    const knownPrediction = typeof count === 'number' && Number.isFinite(count) && count >= 0
    let status = simulated ? 'Not evaluated' : 'No reference'
    if (!knownPrediction) status = 'Unavailable'
    else if (validReference && !simulated) {
      const expected = groundTruth[definition.index] === '1'
      const detected = count > 0
      status = detected ? (expected ? 'Confirmed finding' : 'False alarm') : (expected ? 'Missed finding' : 'Not present')
    }
    return { ...lesion, ...definition, count: knownPrediction ? count : null, status }
  })
}

export function imageSource(value) {
  if (!value) return null
  if (/^(data:|https?:\/\/|\/)/.test(value)) return value
  return `data:image/png;base64,${value}`
}

export function findingsSummary(lesions) {
  const detected = lesions.filter((lesion) => lesion.count > 0).map((lesion) => lesion.type.toLowerCase())
  return detected.length ? `AI detected ${detected.join(', ')}.` : 'AI detected no lesions in the evaluated classes.'
}
