import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { kana } from '../src/data/kana.js';
import { hiraganaStrokes } from '../src/data/hiraganaStrokes.js';
import { evaluateHandwriting, normalizeStrokes, resampleStroke } from '../src/lib/handwriting.js';

const evaluate = (input, id, options = {}) => evaluateHandwriting(input, hiraganaStrokes[id], {
  references: hiraganaStrokes, targetId: id, ...options,
});
const transform = (strokes, operation) => strokes.map(stroke => stroke.map(operation));

test('all 46 basic kana have authentic, usable stroke templates without a fallback', () => {
  assert.equal(Object.keys(hiraganaStrokes).length, 46);
  for (const item of kana) {
    const reference = hiraganaStrokes[item.id];
    assert.equal(reference.character, item.character);
    assert.equal(reference.paths.length, reference.strokes.length);
    assert.match(reference.sourceFile, /^030[0-9a-f]{2}\.svg$/);
    assert.ok(reference.strokes.every(stroke => stroke.length > 24));
    assert.ok(reference.strokes.flat().every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
    assert.equal(evaluate(reference.strokes, item.id).correct, true, item.id);
  }
  assert.equal(hiraganaStrokes.unknown, undefined);
  assert.equal(evaluateHandwriting(hiraganaStrokes.a.strokes, undefined).reason, 'reference');
});

test('all kana tolerate natural size, position, stroke order and small shape variation', () => {
  for (const item of kana) {
    const input = transform(hiraganaStrokes[item.id].strokes, (point, index) => ({
      x: point.x * 0.66 + 0.14 + Math.sin(index * 0.47) * 0.009,
      y: point.y * 0.66 + 0.08 + Math.cos(index * 0.31) * 0.011,
    })).reverse();
    const result = evaluate(input, item.id);
    assert.equal(result.correct, true, `${item.id}: ${JSON.stringify(result)}`);
  }
});

test('independently sketched sparse ku, he and ko are accepted as their own kana', () => {
  // Hand-entered pen coordinates, not generated from the reference templates.
  const sketches = {
    ku: [[{ x: 0.72, y: 0.18 }, { x: 0.6, y: 0.3 }, { x: 0.4, y: 0.43 }, { x: 0.27, y: 0.53 },
      { x: 0.39, y: 0.66 }, { x: 0.53, y: 0.81 }, { x: 0.65, y: 0.93 }]],
    he: [[{ x: 0.12, y: 0.62 }, { x: 0.25, y: 0.55 }, { x: 0.4, y: 0.36 }, { x: 0.5, y: 0.38 },
      { x: 0.6, y: 0.49 }, { x: 0.72, y: 0.6 }, { x: 0.85, y: 0.68 }]],
    ko: [[{ x: 0.28, y: 0.28 }, { x: 0.45, y: 0.22 }, { x: 0.62, y: 0.22 }, { x: 0.76, y: 0.25 }],
      [{ x: 0.28, y: 0.65 }, { x: 0.23, y: 0.73 }, { x: 0.33, y: 0.78 }, { x: 0.52, y: 0.8 }, { x: 0.76, y: 0.79 }]],
  };
  for (const [id, strokes] of Object.entries(sketches)) {
    assert.equal(evaluate(strokes, id).correct, true, id);
  }
});

test('every exact wrong kana is rejected, including kana with the same stroke count', () => {
  const falsePositives = [];
  for (const [drawnId, drawn] of Object.entries(hiraganaStrokes)) {
    for (const requestedId of Object.keys(hiraganaStrokes)) {
      if (drawnId !== requestedId && evaluate(drawn.strokes, requestedId).correct) {
        falsePositives.push(`${drawnId} accepted as ${requestedId}`);
      }
    }
  }
  assert.deepEqual(falsePositives, []);
});

test('nearby re and wa shapes must fit the requested kana best before passing', () => {
  const rotate = (strokes, degrees) => {
    const angle = degrees * Math.PI / 180;
    return transform(strokes, point => ({
      x: 0.5 + (point.x - 0.5) * Math.cos(angle) - (point.y - 0.5) * Math.sin(angle),
      y: 0.5 + (point.x - 0.5) * Math.sin(angle) + (point.y - 0.5) * Math.cos(angle),
    }));
  };
  for (const [drawn, requested, angle] of [['re', 'wa', 10], ['re', 'wa', 15], ['wa', 're', -15]]) {
    const input = rotate(hiraganaStrokes[drawn].strokes, angle);
    assert.equal(evaluate(input, drawn).correct, true, `${drawn} rotated ${angle}`);
    const wrong = evaluate(input, requested);
    assert.equal(wrong.correct, false, `${drawn} rotated ${angle} must not pass as ${requested}`);
    assert.equal(wrong.nearestId, drawn);
  }
});

test('small fast pointer jitter is tolerated for every kana without accepting scribbles', () => {
  for (const [id, reference] of Object.entries(hiraganaStrokes)) {
    const input = transform(reference.strokes, (point, index) => ({
      x: point.x + Math.sin(index * 2.1) * 0.01,
      y: point.y + Math.cos(index * 1.7) * 0.01,
    }));
    assert.equal(evaluate(input, id).correct, true, id);
  }
});

test('blank canvas, taps, tiny writing and missing strokes cannot pass', () => {
  assert.equal(evaluate([], 'a').reason, 'blank');
  assert.equal(evaluate([[{ x: 0.5, y: 0.5 }]], 'a').reason, 'blank');
  const tiny = transform(hiraganaStrokes.a.strokes, point => ({ x: 0.5 + point.x * 0.05, y: 0.5 + point.y * 0.05 }));
  assert.equal(evaluate(tiny, 'a').reason, 'tiny');
  const partial = evaluate(hiraganaStrokes.a.strokes.slice(0, 2), 'a');
  assert.equal(partial.correct, false);
  assert.equal(partial.reason, 'strokes');
  assert.equal(partial.expectedStrokes, 3);
});

test('arbitrary marks and long scribbles fail even with the expected stroke count', () => {
  for (const [id, reference] of Object.entries(hiraganaStrokes)) {
    const marks = reference.strokes.map((_, strokeIndex) => [
      { x: 0.1, y: 0.2 + strokeIndex * 0.12 }, { x: 0.9, y: 0.2 + strokeIndex * 0.12 },
    ]);
    assert.equal(evaluate(marks, id).correct, false, `horizontal marks: ${id}`);
    const scribble = reference.strokes.map((_, strokeIndex) => Array.from({ length: 80 }, (_, index) => ({
      x: 0.5 + Math.sin(index * 2.1 + strokeIndex) * 0.35,
      y: 0.5 + Math.cos(index * 1.7 + strokeIndex) * 0.35,
    })));
    assert.equal(evaluate(scribble, id).correct, false, `scribble: ${id}`);
  }
});

test('normalization is translation and uniform scale invariant but preserves aspect ratio', () => {
  const original = hiraganaStrokes.ki.strokes;
  const moved = transform(original, point => ({ x: point.x * 0.55 + 0.18, y: point.y * 0.55 + 0.25 }));
  const first = normalizeStrokes(original).flat();
  const second = normalizeStrokes(moved).flat();
  for (let index = 0; index < first.length; index++) {
    assert.ok(Math.abs(first[index].x - second[index].x) < 1e-10);
    assert.ok(Math.abs(first[index].y - second[index].y) < 1e-10);
  }
  const flat = normalizeStrokes([[{ x: 0, y: 0 }, { x: 1, y: 0.1 }]])[0];
  assert.ok(Math.abs((flat[1].y - flat[0].y) / (flat[1].x - flat[0].x) - 0.1) < 1e-10);
  assert.deepEqual(normalizeStrokes([]), []);
});

test('equal-distance resampling handles uneven pointer speed and keeps endpoints', () => {
  const samples = resampleStroke([{ x: 0, y: 0 }, { x: 0.01, y: 0 }, { x: 1, y: 0 }], 5);
  assert.deepEqual(samples.map(point => point.x), [0, 0.25, 0.5, 0.75, 1]);
  assert.deepEqual(samples.at(-1), { x: 1, y: 0 });
});

test('all-reference checks remain responsive for explicit submission', () => {
  // Warm reference caches before measuring the repeated submission path.
  evaluate(hiraganaStrokes.na.strokes, 'na');
  const start = performance.now();
  for (let count = 0; count < 10; count++) evaluate(hiraganaStrokes.na.strokes, 'na');
  const average = (performance.now() - start) / 10;
  assert.ok(average < 300, `average all-reference evaluation: ${average.toFixed(1)}ms`);
});
