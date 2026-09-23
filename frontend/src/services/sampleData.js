export const SAMPLES = [
  { id: 'HH36895_0100_L', img: '/samples/HH36895_0100_L.png' },
  { id: 'HH39462_0400_L', img: '/samples/HH39462_0400_L.png' },
  { id: 'HH40481_0200_L', img: '/samples/HH40481_0200_L.png' },
  { id: 'HH40508_0400_R', img: '/samples/HH40508_0400_R.png' },
  { id: 'HH47331_0200_R', img: '/samples/HH47331_0200_R.png' },
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
