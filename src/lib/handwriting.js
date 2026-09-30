/**
 * Local, approximate template comparison for basic hiragana writing practice.
 * This is not OCR and cannot certify handwriting. It compares geometry after
 * translation/uniform scale normalization, retaining aspect ratio and loops.
 * Stroke order and direction are flexible by default; stroke count is checked.
 */

const SAMPLE_COUNT = 32;
const NORMALIZED_SIZE = 0.8;
const preparedReferences = new WeakMap();

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const strokeLength = stroke => stroke.slice(1).reduce((sum, point, index) => sum + distance(point, stroke[index]), 0);

function cleanStrokes(strokes) {
  if (!Array.isArray(strokes)) return [];
  return strokes.flatMap(stroke => {
    if (!Array.isArray(stroke)) return [];
    const points = [];
    for (const point of stroke) {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
      if (!points.length || distance(point, points.at(-1)) > 1e-9) points.push({ x: point.x, y: point.y });
    }
    return points.length >= 2 && strokeLength(points) > 0.005 ? [points] : [];
  });
}

function boundsOf(strokes) {
  const points = strokes.flat();
  const minX = Math.min(...points.map(point => point.x));
  const minY = Math.min(...points.map(point => point.y));
  const maxX = Math.max(...points.map(point => point.x));
  const maxY = Math.max(...points.map(point => point.y));
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Center and uniformly resize strokes, preserving the character's aspect ratio. */
export function normalizeStrokes(strokes, size = NORMALIZED_SIZE) {
  const cleaned = cleanStrokes(strokes);
  if (!cleaned.length) return [];
  const bounds = boundsOf(cleaned);
  const extent = Math.max(bounds.width, bounds.height);
  if (!extent) return [];
  const scale = size / extent;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return cleaned.map(stroke => stroke.map(point => ({
    x: (point.x - centerX) * scale + 0.5,
    y: (point.y - centerY) * scale + 0.5,
  })));
}

/** Equal-distance sampling removes pointer speed and device sampling differences. */
export function resampleStroke(stroke, count = SAMPLE_COUNT) {
  if (!Array.isArray(stroke) || !stroke.length || count < 2) return [];
  const lengths = [0];
  for (let index = 1; index < stroke.length; index++) {
    lengths.push(lengths.at(-1) + distance(stroke[index - 1], stroke[index]));
  }
  const total = lengths.at(-1);
  if (!total) return Array.from({ length: count }, () => ({ ...stroke[0] }));
  let segment = 1;
  return Array.from({ length: count }, (_, index) => {
    const target = total * index / (count - 1);
    while (segment < lengths.length - 1 && lengths[segment] < target) segment++;
    const span = lengths[segment] - lengths[segment - 1];
    const ratio = span ? (target - lengths[segment - 1]) / span : 0;
    const start = stroke[segment - 1];
    const end = stroke[segment];
    return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
  });
}

function prepare(strokes) {
  const normalized = normalizeStrokes(strokes);
  if (!normalized.length) return null;
  // Smooth equal-distance samples, rather than raw pointer events: event rates
  // vary by device, and small pointer jitter must not count as long scribbling.
  const smoothed = normalized.map(stroke => {
    const points = resampleStroke(stroke, 96);
    return points.map((point, index) => index === 0 || index === points.length - 1 ? point : ({
      x: points[index - 1].x * 0.25 + point.x * 0.5 + points[index + 1].x * 0.25,
      y: points[index - 1].y * 0.25 + point.y * 0.5 + points[index + 1].y * 0.25,
    }));
  });
  return {
    strokes: smoothed.map(stroke => resampleStroke(stroke)),
    cloud: smoothed.flatMap(stroke => resampleStroke(stroke, 16)),
    totalLength: smoothed.reduce((sum, stroke) => sum + strokeLength(stroke), 0),
  };
}

function referenceStrokes(reference) {
  return Array.isArray(reference) ? reference : reference?.strokes;
}

function prepareReference(reference) {
  const strokes = referenceStrokes(reference);
  if (!strokes || typeof strokes !== 'object') return null;
  if (!preparedReferences.has(strokes)) preparedReferences.set(strokes, prepare(strokes));
  return preparedReferences.get(strokes);
}

function orderedStrokeError(input, reference, reverse) {
  let sum = 0;
  for (let index = 0; index < input.length; index++) {
    sum += distance(input[index], reference[reverse ? reference.length - 1 - index : index]);
  }
  const first = reference[reverse ? reference.length - 1 : 0];
  const last = reference[reverse ? 0 : reference.length - 1];
  const endpointError = (distance(input[0], first) + distance(input.at(-1), last)) / 2;
  return sum / input.length * 0.8 + endpointError * 0.2;
}

function bestAssignment(costs, strictOrder) {
  if (strictOrder) return costs.map((row, index) => row[index]);
  let best = { sum: Infinity, errors: [] };
  function visit(index, mask, errors, sum) {
    if (sum >= best.sum) return;
    if (index === costs.length) { best = { sum, errors }; return; }
    for (let reference = 0; reference < costs.length; reference++) {
      if (!(mask & (1 << reference))) {
        visit(index + 1, mask | (1 << reference), [...errors, costs[index][reference]], sum + costs[index][reference]);
      }
    }
  }
  visit(0, 0, [], 0);
  return best.errors;
}

function cloudError(input, reference) {
  const nearestMean = (points, other) => points.reduce((sum, point) => {
    let closest = Infinity;
    for (const otherPoint of other) closest = Math.min(closest, distance(point, otherPoint));
    return sum + closest;
  }, 0) / points.length;
  return (nearestMean(input, reference) + nearestMean(reference, input)) / 2;
}

function compare(input, reference, options) {
  if (!reference || input.strokes.length !== reference.strokes.length) return null;
  const costs = input.strokes.map(stroke => reference.strokes.map(referenceStroke => {
    const forward = orderedStrokeError(stroke, referenceStroke, false);
    return options.strictDirection ? forward : Math.min(forward, orderedStrokeError(stroke, referenceStroke, true));
  }));
  const errors = bestAssignment(costs, options.strictOrder);
  const strokeError = errors.reduce((sum, error) => sum + error, 0) / errors.length;
  const lengthRatio = input.totalLength / reference.totalLength;
  const lengthError = Math.abs(Math.log(lengthRatio));
  const cost = strokeError * 0.75 + cloudError(input.cloud, reference.cloud) * 0.2 + Math.min(lengthError, 1) * 0.05;
  return { cost, strokeError, maxStrokeError: Math.max(...errors), lengthRatio };
}

const failure = (reason, extras = {}) => ({
  correct: false, score: 0, similarity: 0, reason, strokeCountMatch: false, ...extras,
});

/**
 * @param {Array<Array<{x: number, y: number}>>} inputStrokes canvas coordinates in 0..1
 * @param {Array|{strokes: Array}} reference normalized sampled template strokes
 * @param {{references?: Object, targetId?: string, strictOrder?: boolean,
 *   strictDirection?: boolean, maxError?: number}} options
 * Pass all 46 templates and targetId to reject another kana that fits better.
 * Results are approximate practice feedback, not proof of correct handwriting.
 */
export function evaluateHandwriting(inputStrokes, reference, options = {}) {
  const cleaned = cleanStrokes(inputStrokes);
  if (!cleaned.length) return failure('blank');
  const bounds = boundsOf(cleaned);
  const extent = Math.max(bounds.width, bounds.height);
  const totalLength = cleaned.reduce((sum, stroke) => sum + strokeLength(stroke), 0);
  if (extent < 0.16 || totalLength < 0.18) return failure('tiny');
  const expected = prepareReference(reference);
  if (!expected) return failure('reference');
  const input = prepare(cleaned);
  if (input.strokes.length !== expected.strokes.length) {
    return failure('strokes', { expectedStrokes: expected.strokes.length, actualStrokes: input.strokes.length });
  }
  const comparison = compare(input, expected, options);
  const score = Math.round(Math.max(0, 100 - comparison.cost * 450));
  let nearestId = options.targetId ?? null;
  let nearestCost = comparison.cost;
  if (options.references && options.targetId) {
    for (const [id, candidate] of Object.entries(options.references)) {
      if (id === options.targetId) continue;
      const other = compare(input, prepareReference(candidate), options);
      if (other && other.cost < nearestCost) { nearestCost = other.cost; nearestId = id; }
    }
  }
  // Require an actual target shape, plausible pen length, every stroke reasonably
  // close, and no clear better match to a different character (including loops).
  const wrongNearest = nearestId !== options.targetId && nearestCost + 1e-8 < comparison.cost;
  const correct = comparison.cost <= (options.maxError ?? 0.1)
    && comparison.maxStrokeError <= 0.18
    && comparison.lengthRatio >= 0.55 && comparison.lengthRatio <= 1.7
    && !wrongNearest;
  return {
    correct,
    score,
    similarity: score / 100,
    reason: correct ? 'correct' : 'shape',
    strokeCountMatch: true,
    expectedStrokes: expected.strokes.length,
    actualStrokes: input.strokes.length,
    nearestId,
    error: comparison.cost,
  };
}
