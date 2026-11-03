require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Train = require('../src/models/Train');
const { CLASS_FARE_MULTIPLIERS, normalizeClassFareMultiplier } = require('../src/utils/sampleFare');

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in backend/.env before normalizing train fares.');
  await mongoose.connect(process.env.MONGODB_URI);
  const trains = await Train.find({});
  let updatedCount = 0;

  for (const train of trains) {
    let changed = false;
    for (const seatClass of train.classes) {
      const rate = Number(train.baseFare?.get?.(seatClass) ?? train.baseFare?.[seatClass]);
      const normalizedRate = normalizeClassFareMultiplier(seatClass, rate);
      if (rate !== normalizedRate) {
        train.set(`baseFare.${seatClass}`, normalizedRate);
        changed = true;
      }
    }
    if (changed) {
      await train.save();
      updatedCount += 1;
    }
  }

  console.log(`Normalized fares for ${updatedCount} of ${trains.length} trains.`);
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());

module.exports = { main };
