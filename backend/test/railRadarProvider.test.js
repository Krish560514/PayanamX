const test = require('node:test');
const assert = require('node:assert/strict');
const { RailRadarTrainDataProvider } = require('../src/services/trainDataProvider');

test('RailRadar station autocomplete uses its directory and sends the key only as a server-side bearer header', async () => {
  let calls = 0;
  const provider = new RailRadarTrainDataProvider({
    apiKey: 'test-secret',
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.match(`${url}`, /\/lookup\/stations$/);
      assert.equal(options.headers.Authorization, 'Bearer test-secret');
      return { ok: true, json: async () => ({ success: true, data: { CBE: 'Coimbatore Junction', MAS: 'Chennai Central' } }) };
    }
  });
  const stations = await provider.autocompleteStations('cbe');
  assert.equal(stations[0].code, 'CBE');
  assert.equal(stations[0].name, 'Coimbatore Junction');
  assert.equal(calls, 1);
});

test('RailRadar train search maps real timetable fields without inventing class, fare, or availability data', async () => {
  const provider = new RailRadarTrainDataProvider({
    apiKey: 'test-secret',
    fetchImpl: async url => {
      assert.match(`${url}`, /\/trains\/between\/MAS\/CBE\?date=2030-01-01&live=true$/);
      return { ok: true, json: async () => ({ success: true, data: { trains: [{
        train: { number: '12673', name: 'Cheran Express', type: 'Superfast', runDays: ['mon', 'fri'] },
        from: { departure: '22:10', day: 1 }, to: { arrival: '06:00', day: 2 }, duration: 470, distance: 500, totalHaltsBetween: 12
      }] } }) };
    }
  });
  const trains = await provider.findTrainsBetweenStations({ from: 'MAS', to: 'CBE', date: '2030-01-01' });
  assert.deepEqual(trains[0], {
    trainNumber: '12673', name: 'Cheran Express', type: 'Superfast', runningDays: ['Mon', 'Fri'],
    departureTime: '22:10', arrivalTime: '06:00', departureDay: 1, arrivalDay: 2,
    distanceKm: 500, durationMinutes: 470, totalHalts: 12
  });
  assert.equal(Object.hasOwn(trains[0], 'classes'), false);
});

test('RailRadar provider fails clearly when no key is configured', async () => {
  const provider = new RailRadarTrainDataProvider({ apiKey: '', fetchImpl: async () => { throw new Error('must not call'); } });
  await assert.rejects(provider.getStationDirectory(), /RAILRADAR_API_KEY is missing/);
});

test('RailRadar live status requests authoritative current data for the selected journey date', async () => {
  const provider = new RailRadarTrainDataProvider({
    apiKey: 'test-secret',
    fetchImpl: async url => {
      assert.match(`${url}`, /\/trains\/12673\/live\?date=2030-01-01&authoritative=true&includeCoordinates=true$/);
      return { ok: true, json: async () => ({ success: true, data: { status: 'running', isLive: true } }) };
    }
  });
  assert.deepEqual(await provider.getRunningStatus('12673', '2030-01-01'), { status: 'running', isLive: true });
});
