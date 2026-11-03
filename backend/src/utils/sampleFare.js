const SAMPLE_FARE_SCALE = 0.05;
const MIN_SAMPLE_FARE = 50;
const MAX_CLASS_MULTIPLIER = 30;
const CLASS_FARE_MULTIPLIERS = Object.freeze({
  '2S': 1.5,
  SL: 2.5,
  CC: 5,
  '3E': 6,
  '3A': 7,
  '2A': 10,
  '1A': 15
});

function normalizeClassFareMultiplier(seatClass, value) {
  const rate = Number(value);
  const classDefault = CLASS_FARE_MULTIPLIERS[seatClass] || 3;
  if (Number.isFinite(rate) && rate >= 0 && rate <= Math.min(MAX_CLASS_MULTIPLIER, classDefault * 2)) return rate;
  return classDefault;
}

function calculateSampleFare(distanceKm, classRate = 1.5) {
  const distance = Number(distanceKm);
  const rate = Number(classRate);
  if (!Number.isFinite(distance) || distance < 0 || !Number.isFinite(rate) || rate < 0) {
    throw new TypeError('Sample fare distance and class rate must be non-negative numbers.');
  }
  // Keep the demo price estimate lower than the original scale, rounded to ₹10.
  return Math.max(MIN_SAMPLE_FARE, Math.round(distance * rate * SAMPLE_FARE_SCALE) * 10);
}

module.exports = {
  calculateSampleFare,
  normalizeClassFareMultiplier,
  CLASS_FARE_MULTIPLIERS,
  MAX_CLASS_MULTIPLIER,
  SAMPLE_FARE_SCALE,
  MIN_SAMPLE_FARE
};
