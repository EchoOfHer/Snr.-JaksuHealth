import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateLesions, imageSource } from '../src/services/evaluation.js'
import { SAMPLES } from '../src/services/sampleData.js'

test('GT 11010 maps by model channel, independently of display or response order', () => {
  const result = evaluateLesions([
    { type: 'Hemorrhages', count: 0 },
    { type: 'Drusen', count: 12 },
    { type: 'Exudates', count: 0 },
  ], '11010')
  assert.deepEqual(result.map((item) => [item.type, item.status]), [
    ['Drusen', 'False alarm'], ['Hard Exudate', 'Not present'], ['Hemorrhages', 'Missed finding'],
  ])
})

test('all four presence outcomes use current counts, not old status text', () => {
  for (const expected of [0, 1]) for (const count of [0, 5]) {
    const result = evaluateLesions([{ type: 'Drusen', count, max_mm: 0.18, status: 'Old status' }], `1100${expected}`)[0]
    assert.equal(result.status, count ? (expected ? 'Confirmed finding' : 'False alarm') : (expected ? 'Missed finding' : 'Not present'))
    assert.equal(result.max_mm, 0.18)
    assert.equal(result.count, count)
  }
})

test('missing prediction or invalid counts never become a correct negative', () => {
  for (const count of [undefined, null, '0', NaN, -1]) {
    assert.equal(evaluateLesions([{ type: 'Drusen', count }], '11000')[0].status, 'Unavailable')
  }
  assert.ok(evaluateLesions([], '11000').every((item) => item.status === 'Unavailable'))
})

test('simulation and missing or malformed reference cannot claim correctness', () => {
  assert.equal(evaluateLesions([{ type: 'Drusen', count: 1 }], '11001', true)[0].status, 'Not evaluated')
  for (const gt of [undefined, null, 11001, '1100', '11x01']) {
    assert.equal(evaluateLesions([{ type: 'Drusen', count: 1 }], gt)[0].status, 'No reference')
  }
})

test('all 12 original sample references are preserved and valid', () => {
  assert.equal(SAMPLES.length, 12)
  assert.deepEqual(SAMPLES.map((sample) => sample.groundTruth), ['11010', '11011', '11101', '11111', '11010', '11110', '11000', '11010', '11110', '11000', '11000', '11000'])
})

test('overlay supports raw base64 and URLs without double prefixes', () => {
  assert.equal(imageSource('abc='), 'data:image/png;base64,abc=')
  for (const src of ['/samples/image.png', 'https://example.com/image.png', 'data:image/png;base64,abc=']) assert.equal(imageSource(src), src)
  assert.equal(imageSource(null), null)
})
