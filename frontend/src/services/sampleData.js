export const SAMPLES = [
  { id: 'HH35224_0400_R', img: '/samples/HH35224_0400_R.png', category: 'Hallucination', gt: '11010', errors: 'Drusens:FP' },
  { id: 'HH35305_0400_R', img: '/samples/HH35305_0400_R.png', category: 'Wrong', gt: '11011', errors: 'Macula:FN, Drusens:FN' },
  { id: 'HH36548_0400_R', img: '/samples/HH36548_0400_R.png', category: 'Near Miss', gt: '11101', errors: 'Exudates:FN' },
  { id: 'HH36895_0100_R', img: '/samples/HH36895_0100_R.png', category: 'Correct', gt: '11111', errors: 'None' },
  { id: 'HH39462_0400_R', img: '/samples/HH39462_0400_R.png', category: 'Near Miss', gt: '11010', errors: 'Hemorrhages:FN' },
  { id: 'HH40146_0200_L', img: '/samples/HH40146_0200_L.png', category: 'Near Miss', gt: '11110', errors: 'Exudates:FN' },
  { id: 'HH40481_0200_L', img: '/samples/HH40481_0200_L.png', category: 'Correct', gt: '11000', errors: 'None' },
  { id: 'HH41169_0400_R', img: '/samples/HH41169_0400_R.png', category: 'Wrong', gt: '11010', errors: 'Macula:FN, Exudates:FP' },
  { id: 'HH43038_0100_R', img: '/samples/HH43038_0100_R.png', category: 'Wrong', gt: '11110', errors: 'Exudates:FN, Hemorrhages:FN, Drusens:FP' },
  { id: 'HH47166_0200_L', img: '/samples/HH47166_0200_L.png', category: 'Hallucination', gt: '11000', errors: 'Hemorrhages:FP, Drusens:FP' },
  { id: 'HH60751_0200_L', img: '/samples/HH60751_0200_L.png', category: 'Hallucination', gt: '11000', errors: 'Drusens:FP' },
  { id: 'HH61365_0200_L', img: '/samples/HH61365_0200_L.png', category: 'Correct', gt: '11000', errors: 'None' },
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
