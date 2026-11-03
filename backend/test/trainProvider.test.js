const test = require('node:test');
const assert = require('node:assert/strict');
const { getTrainDataProvider } = require('../src/services/trainDataProvider');

test('RailRadar timetable provider is the default source', () => {
  const prior = process.env.TRAIN_DATA_PROVIDER;
  delete process.env.TRAIN_DATA_PROVIDER;
  try { assert.match(getTrainDataProvider().sourceLabel, /RailRadar/); }
  finally { if (prior !== undefined) process.env.TRAIN_DATA_PROVIDER = prior; }
});

test('external provider contract fails clearly until credentials are configured', async () => {
  const prior = process.env.TRAIN_DATA_PROVIDER;
  process.env.TRAIN_DATA_PROVIDER = 'external';
  try {
    const provider = getTrainDataProvider();
    assert.equal(provider.sourceLabel, 'External provider not configured');
    await assert.rejects(provider.getSchedule(), /not configured/);
    await assert.rejects(provider.getRunningStatus(), /not configured/);
    await assert.rejects(provider.enquirePnr(), /not configured/);
  } finally { if (prior === undefined) delete process.env.TRAIN_DATA_PROVIDER; else process.env.TRAIN_DATA_PROVIDER = prior; }
});
