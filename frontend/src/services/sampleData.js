export const SAMPLES = [
  { id: 'HH35224_0400_R', img: '/samples/HH35224_0400_R.png', category: 'Hallucination' },
  { id: 'HH35305_0400_R', img: '/samples/HH35305_0400_R.png', category: 'Wrong' },
  { id: 'HH36548_0400_R', img: '/samples/HH36548_0400_R.png', category: 'Near Miss' },
  { id: 'HH36895_0100_R', img: '/samples/HH36895_0100_R.png', category: 'Correct' },
  { id: 'HH39462_0400_R', img: '/samples/HH39462_0400_R.png', category: 'Near Miss' },
  { id: 'HH40146_0200_L', img: '/samples/HH40146_0200_L.png', category: 'Near Miss' },
  { id: 'HH40481_0200_L', img: '/samples/HH40481_0200_L.png', category: 'Correct' },
  { id: 'HH41169_0400_R', img: '/samples/HH41169_0400_R.png', category: 'Wrong' },
  { id: 'HH43038_0100_R', img: '/samples/HH43038_0100_R.png', category: 'Wrong' },
  { id: 'HH47166_0200_L', img: '/samples/HH47166_0200_L.png', category: 'Hallucination' },
  { id: 'HH60751_0200_L', img: '/samples/HH60751_0200_L.png', category: 'Hallucination' },
  { id: 'HH61365_0200_L', img: '/samples/HH61365_0200_L.png', category: 'Correct' },
]

/**
 * Parse metadata from filename pattern:
 * Pattern: HH{PatientID}_{VisitCode}_{Eye}
 * Example: HH36895_0100_L -> { patientId: 'HH36895', visitCode: '0100', eye: 'Left Eye (OS)' }
 */
export function parseFilename(id) {
  const parts = id.split('_')
  const patientId = parts[0]
  const visitCode = parts[1]
  const eyeCode = parts[2]

  return {
    patientId,
    visitCode,
    eye: eyeCode === 'L' ? 'Left Eye (OS)' : 'Right Eye (OD)',
    eyeSide: eyeCode === 'L' ? 'Left Eye' : 'Right Eye',
    eyeCode: eyeCode === 'L' ? 'OS' : 'OD',
  }
}
