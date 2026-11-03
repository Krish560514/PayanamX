require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Station = require('../src/models/Station');
const Train = require('../src/models/Train');
const Route = require('../src/models/Route');

// Additive sample data only: creates missing sample records, never clears or replaces data.
const stations = [
  { code: 'NDLS', name: 'New Delhi', state: 'Delhi' }, { code: 'BPL', name: 'Bhopal Junction', state: 'Madhya Pradesh' }, { code: 'CSMT', name: 'Mumbai CSMT', state: 'Maharashtra' },
  { code: 'SBC', name: 'KSR Bengaluru City', state: 'Karnataka', zone: 'SWR' }, { code: 'MAS', name: 'MGR Chennai Central', state: 'Tamil Nadu', zone: 'SR' },
  { code: 'CBE', name: 'Coimbatore Junction', state: 'Tamil Nadu', zone: 'SR' }, { code: 'SA', name: 'Salem Junction', state: 'Tamil Nadu', zone: 'SR' },
  { code: 'ED', name: 'Erode Junction', state: 'Tamil Nadu', zone: 'SR' }, { code: 'TPJ', name: 'Tiruchchirappalli Junction', state: 'Tamil Nadu', zone: 'SR' },
  { code: 'MDU', name: 'Madurai Junction', state: 'Tamil Nadu', zone: 'SR' }, { code: 'DG', name: 'Dindigul Junction', state: 'Tamil Nadu', zone: 'SR' },
  { code: 'TEN', name: 'Tirunelveli Junction', state: 'Tamil Nadu', zone: 'SR' }, { code: 'RMM', name: 'Rameswaram', state: 'Tamil Nadu', zone: 'SR' },
  { code: 'KPD', name: 'Katpadi Junction', state: 'Tamil Nadu', zone: 'SR' }, { code: 'VRI', name: 'Vriddhachalam Junction', state: 'Tamil Nadu', zone: 'SR' },
  { code: 'HWH', name: 'Howrah Junction', state: 'West Bengal' }, { code: 'PNBE', name: 'Patna Junction', state: 'Bihar' }, { code: 'DDU', name: 'Pt. Deen Dayal Upadhyaya Junction', state: 'Uttar Pradesh' }
];
const definitions = [
  { trainNumber: '92001', name: 'Sample Northern Deccan Express', codes: ['NDLS', 'BPL', 'CSMT'], classes: ['1A', '2A', '3A', 'SL'], coaches: [{ coachNumber: 'H1', classType: '1A', capacity: 24, layout: 'berth-1a' }, { coachNumber: 'A1', classType: '2A', capacity: 54, layout: 'berth-2a' }, { coachNumber: 'B1', classType: '3A', capacity: 72, layout: 'berth-3a' }, { coachNumber: 'B2', classType: '3A', capacity: 72, layout: 'berth-3a' }, { coachNumber: 'S1', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S2', classType: 'SL', capacity: 72, layout: 'berth-sl' }] },
  { trainNumber: '92002', name: 'Sample Southern Chair Express', codes: ['SBC', 'MAS'], classes: ['CC', '2S'], coaches: [{ coachNumber: 'C1', classType: 'CC', capacity: 78, layout: 'chair-cc' }, { coachNumber: 'D1', classType: '2S', capacity: 108, layout: 'chair-2s' }, { coachNumber: 'D2', classType: '2S', capacity: 108, layout: 'chair-2s' }] },
  { trainNumber: '92003', name: 'Sample Eastern Economy Express', codes: ['HWH', 'PNBE', 'DDU', 'NDLS'], classes: ['3E', '3A', 'SL'], coaches: [{ coachNumber: 'M1', classType: '3E', capacity: 80, layout: 'berth-3e' }, { coachNumber: 'M2', classType: '3E', capacity: 80, layout: 'berth-3e' }, { coachNumber: 'B1', classType: '3A', capacity: 72, layout: 'berth-3a' }, { coachNumber: 'S1', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S2', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S3', classType: 'SL', capacity: 72, layout: 'berth-sl' }] },
  {
    trainNumber: 'TN-S01', name: 'Sample Chennai–Coimbatore Express', codes: ['MAS', 'KPD', 'SA', 'ED', 'CBE'],
    classes: ['CC', '2S', '3A', 'SL'], runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [{ coachNumber: 'C1', classType: 'CC', capacity: 78, layout: 'chair-cc' }, { coachNumber: 'D1', classType: '2S', capacity: 108, layout: 'chair-2s' }, { coachNumber: 'B1', classType: '3A', capacity: 72, layout: 'berth-3a' }, { coachNumber: 'S1', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S2', classType: 'SL', capacity: 72, layout: 'berth-sl' }],
    stops: [['MAS','06:00','06:10',0,1], ['KPD','08:20','08:25',130,1], ['SA','11:30','11:35',345,1], ['ED','12:25','12:30',405,1], ['CBE','14:00','14:00',495,1]]
  },
  {
    trainNumber: 'TN-S02', name: 'Sample Chennai–Madurai Night Express', codes: ['MAS', 'VRI', 'TPJ', 'DG', 'MDU'],
    classes: ['1A', '2A', '3A', 'SL'], runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [{ coachNumber: 'H1', classType: '1A', capacity: 24, layout: 'berth-1a' }, { coachNumber: 'A1', classType: '2A', capacity: 54, layout: 'berth-2a' }, { coachNumber: 'B1', classType: '3A', capacity: 72, layout: 'berth-3a' }, { coachNumber: 'B2', classType: '3A', capacity: 72, layout: 'berth-3a' }, { coachNumber: 'S1', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S2', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S3', classType: 'SL', capacity: 72, layout: 'berth-sl' }],
    stops: [['MAS','21:00','21:10',0,1], ['VRI','00:05','00:10',220,2], ['TPJ','03:30','03:40',335,2], ['DG','05:05','05:10',430,2], ['MDU','06:20','06:20',497,2]]
  },
  {
    trainNumber: 'TN-S03', name: 'Sample Chennai–Tirunelveli Express', codes: ['MAS', 'TPJ', 'DG', 'MDU', 'TEN'],
    classes: ['3E', '3A', 'SL'], runsOn: ['Mon', 'Wed', 'Fri', 'Sun'],
    coaches: [{ coachNumber: 'M1', classType: '3E', capacity: 80, layout: 'berth-3e' }, { coachNumber: 'B1', classType: '3A', capacity: 72, layout: 'berth-3a' }, { coachNumber: 'B2', classType: '3A', capacity: 72, layout: 'berth-3a' }, { coachNumber: 'S1', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S2', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S3', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S4', classType: 'SL', capacity: 72, layout: 'berth-sl' }],
    stops: [['MAS','19:00','19:10',0,1], ['TPJ','01:00','01:10',335,2], ['DG','02:35','02:40',430,2], ['MDU','03:40','03:50',497,2], ['TEN','07:30','07:30',653,2]]
  },
  {
    trainNumber: 'TN-S04', name: 'Sample Madurai–Rameswaram Passenger', codes: ['MDU', 'RMM'],
    classes: ['2S'], runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    coaches: [{ coachNumber: 'D1', classType: '2S', capacity: 108, layout: 'chair-2s' }, { coachNumber: 'D2', classType: '2S', capacity: 108, layout: 'chair-2s' }, { coachNumber: 'D3', classType: '2S', capacity: 108, layout: 'chair-2s' }],
    stops: [['MDU','06:15','06:25',0,1], ['RMM','09:35','09:35',161,1]]
  },
  {
    trainNumber: 'TN-S05', name: 'Sample Coimbatore–Madurai Intercity', codes: ['CBE', 'ED', 'TPJ', 'DG', 'MDU'],
    classes: ['CC', '2S', '3A'], runsOn: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    coaches: [{ coachNumber: 'C1', classType: 'CC', capacity: 78, layout: 'chair-cc' }, { coachNumber: 'D1', classType: '2S', capacity: 108, layout: 'chair-2s' }, { coachNumber: 'D2', classType: '2S', capacity: 108, layout: 'chair-2s' }, { coachNumber: 'B1', classType: '3A', capacity: 72, layout: 'berth-3a' }],
    stops: [['CBE','06:00','06:10',0,1], ['ED','07:00','07:05',60,1], ['TPJ','10:00','10:10',230,1], ['DG','11:20','11:25',325,1], ['MDU','12:30','12:30',392,1]]
  },
  {
    trainNumber: 'TN-S06', name: 'Sample Chennai–Tiruchchirappalli Express', codes: ['MAS', 'KPD', 'VRI', 'TPJ'],
    classes: ['1A', '2A', '3A', 'SL'], runsOn: ['Tue', 'Thu', 'Sat'],
    coaches: [{ coachNumber: 'H1', classType: '1A', capacity: 24, layout: 'berth-1a' }, { coachNumber: 'A1', classType: '2A', capacity: 54, layout: 'berth-2a' }, { coachNumber: 'B1', classType: '3A', capacity: 72, layout: 'berth-3a' }, { coachNumber: 'S1', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S2', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S3', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S4', classType: 'SL', capacity: 72, layout: 'berth-sl' }],
    stops: [['MAS','07:00','07:10',0,1], ['KPD','09:15','09:20',130,1], ['VRI','11:30','11:35',220,1], ['TPJ','14:00','14:00',335,1]]
  },
  {
    trainNumber: 'TN-S07', name: 'Sample Coimbatore–Chennai Overnight Express', codes: ['CBE', 'ED', 'SA', 'KPD', 'MAS'],
    classes: ['2A', '3A', '3E', 'SL'], runsOn: ['Mon', 'Wed', 'Fri', 'Sun'],
    coaches: [{ coachNumber: 'A1', classType: '2A', capacity: 54, layout: 'berth-2a' }, { coachNumber: 'B1', classType: '3A', capacity: 72, layout: 'berth-3a' }, { coachNumber: 'B2', classType: '3A', capacity: 72, layout: 'berth-3a' }, { coachNumber: 'M1', classType: '3E', capacity: 80, layout: 'berth-3e' }, { coachNumber: 'S1', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S2', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S3', classType: 'SL', capacity: 72, layout: 'berth-sl' }, { coachNumber: 'S4', classType: 'SL', capacity: 72, layout: 'berth-sl' }],
    stops: [['CBE','20:00','20:10',0,1], ['ED','21:05','21:10',60,1], ['SA','23:00','23:05',155,1], ['KPD','04:20','04:25',365,2], ['MAS','06:45','06:45',495,2]]
  }
];

async function main() {
  if (mongoose.connection.readyState !== 1) {
    if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in backend/.env before adding sample trains.');
    await mongoose.connect(process.env.MONGODB_URI);
  }
  const ids = {};
  for (const station of stations) {
    const result = await Station.findOneAndUpdate({ code: station.code }, { $setOnInsert: station }, { upsert: true, new: true });
    ids[station.code] = result._id;
  }
  for (const item of definitions) {
    const source = ids[item.codes[0]], destination = ids[item.codes[item.codes.length - 1]];
    const train = await Train.findOneAndUpdate({ trainNumber: item.trainNumber }, { $setOnInsert: {
      trainNumber: item.trainNumber, name: item.name, source, destination, classes: item.classes, coachComposition: item.coaches,
      runsOn: item.runsOn || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], dataSource: 'sample', active: true
    } }, { upsert: true, new: true });
    const stops = item.codes.map((code, index) => ({
      station: ids[code], stopIndex: index,
      arrivalTime: index === 0 ? '00:00' : `${String((index * 6) % 24).padStart(2, '0')}:00`,
      departureTime: index === item.codes.length - 1 ? '00:00' : `${String((index * 6) % 24).padStart(2, '0')}:10`,
      distanceKm: index * 600, dayNumber: Math.floor(index * 6 / 24) + 1
    }));
    const routeStops = item.stops ? item.stops.map(([code, arrivalTime, departureTime, distanceKm, dayNumber], stopIndex) => ({
      station: ids[code], stopIndex, arrivalTime, departureTime, distanceKm, dayNumber
    })) : stops;
    await Route.updateOne({ train: train._id }, { $setOnInsert: { train: train._id, stops: routeStops } }, { upsert: true });
  }
  console.log('Added missing sample stations, trains and routes. Existing records were preserved.');
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => mongoose.disconnect());

module.exports = { stations, definitions, main };
