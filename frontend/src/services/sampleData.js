export const SAMPLES = [
  { id: 'HH35224_0400_R', img: '/samples/HH35224_0400_R.png', tagLabel: 'FP-DR | GT : 11010' },
  { id: 'HH35305_0400_R', img: '/samples/HH35305_0400_R.png', tagLabel: 'FN-MA, FN-DR | GT : 11011' },
  { id: 'HH36548_0400_R', img: '/samples/HH36548_0400_R.png', tagLabel: 'FN-EX | GT : 11101' },
  { id: 'HH36895_0100_R', img: '/samples/HH36895_0100_R.png', tagLabel: 'GT : 11111' },
  { id: 'HH39462_0400_R', img: '/samples/HH39462_0400_R.png', tagLabel: 'FN-HE | GT : 11010' },
  { id: 'HH40146_0200_L', img: '/samples/HH40146_0200_L.png', tagLabel: 'FN-EX | GT : 11110' },
  { id: 'HH40481_0200_L', img: '/samples/HH40481_0200_L.png', tagLabel: 'GT : 11000' },
  { id: 'HH41169_0400_R', img: '/samples/HH41169_0400_R.png', tagLabel: 'FN-MA, FP-EX | GT : 11010' },
  { id: 'HH43038_0100_R', img: '/samples/HH43038_0100_R.png', tagLabel: 'FN-EX, FN-HE, FP-DR | GT : 11110' },
  { id: 'HH47166_0200_L', img: '/samples/HH47166_0200_L.png', tagLabel: 'FP-HE, FP-DR | GT : 11000' },
  { id: 'HH60751_0200_L', img: '/samples/HH60751_0200_L.png', tagLabel: 'FP-DR | GT : 11000' },
  { id: 'HH61365_0200_L', img: '/samples/HH61365_0200_L.png', tagLabel: 'GT : 11000' },
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
