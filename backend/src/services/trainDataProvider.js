// Reservation inventory and bookings stay local. Replace only the timetable provider
// when an authorized railway data API becomes available.
let railRadarStationsCache;
let railRadarTrainsCache;

class SampleTrainDataProvider {
  get sourceLabel() { return 'Sample timetable data (unverified)'; }
  async findTrainsBetweenStations(query) {
    const Train = require('../models/Train');
    const Route = require('../models/Route');
    return Route.find(query.route || {}).populate({ path: 'train', match: { active: true, dataSource: { $in: ['sample', 'external'] } } }).populate('stops.station');
  }
}

class ExternalRailwayDataProvider {
  constructor() { this.sourceLabel = 'External provider not configured'; }
  async findTrainsBetweenStations() { throw new Error('External railway data provider is not configured.'); }
  async getSchedule() { throw new Error('External railway data provider is not configured.'); }
  async getRunningStatus() { throw new Error('External railway data provider is not configured.'); }
  async enquirePnr() { throw new Error('External railway data provider is not configured.'); }
  async enquireFare() { throw new Error('External railway data provider is not configured.'); }
}

class RailRadarTrainDataProvider {
  constructor({ apiKey = process.env.RAILRADAR_API_KEY, baseUrl = process.env.RAILRADAR_API_URL || 'https://api.railradar.in/v1', fetchImpl = global.fetch } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetch = fetchImpl;
    this.sourceLabel = 'RailRadar railway data (third-party; confirm with Indian Railways before travel)';
  }

  async request(path, params = {}) {
    if (!this.apiKey) throw new Error('RailRadar is selected but RAILRADAR_API_KEY is missing. Add a provider key to the backend environment.');
    const url = new URL(`${this.baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => value != null && value !== '' && url.searchParams.set(key, String(value)));
    const response = await this.fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(Number(process.env.TRAIN_DATA_TIMEOUT_MS) || 10000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      const error = new Error(payload.error?.message || payload.message || `RailRadar request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return payload.data;
  }

  async autocompleteStations(query) {
    const directory = await this.getStationDirectory();
    const needle = query.toLocaleLowerCase();
    return Object.entries(directory).filter(([code, name]) => code.toLocaleLowerCase().includes(needle) || name.toLocaleLowerCase().includes(needle)).slice(0, 10).map(([code, name]) => ({
      code, name, state: '', zone: '',
      dataSource: 'railradar'
    }));
  }

  async findTrainsBetweenStations({ from, to, date }) {
    const result = await this.request(`/trains/between/${encodeURIComponent(from)}/${encodeURIComponent(to)}`, { date, live: true });
    const rows = Array.isArray(result?.trains) ? result.trains : [];
    return rows.map(row => {
      const train = row.train || {};
      const days = (train.runDays || []).map(day => `${day}`.slice(0, 3).toLowerCase());
      const dayNames = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
      return {
        trainNumber: `${train.number || ''}`,
        name: train.name || 'Train name unavailable',
        type: train.type || train.category || 'Train',
        runningDays: days.map(day => dayNames[day]).filter(Boolean),
        departureTime: row.from?.departure || '',
        arrivalTime: row.to?.arrival || '',
        departureDay: row.from?.day || 1,
        arrivalDay: row.to?.day || row.from?.day || 1,
        distanceKm: Number(row.distance) || 0,
        durationMinutes: Number(row.duration) || 0,
        totalHalts: Number(row.totalHaltsBetween) || 0,
        live: row.live || null
      };
    });
  }

  async getSchedule(trainNumber) { return this.request(`/trains/${encodeURIComponent(trainNumber)}`); }
  async getRunningStatus(trainNumber, date) {
    return this.request(`/trains/${encodeURIComponent(trainNumber)}/live`, { date, authoritative: true, includeCoordinates: true });
  }
  async getTrainDirectory() {
    if (!this.apiKey) throw new Error('RailRadar is selected but RAILRADAR_API_KEY is missing. Add a provider key to the backend environment.');
    if (!railRadarTrainsCache) railRadarTrainsCache = this.request('/lookup/trains/prs').catch(error => { railRadarTrainsCache = undefined; throw error; });
    return railRadarTrainsCache;
  }
  async getStationDirectory() {
    if (!this.apiKey) throw new Error('RailRadar is selected but RAILRADAR_API_KEY is missing. Add a provider key to the backend environment.');
    if (!railRadarStationsCache) railRadarStationsCache = this.request('/lookup/stations').catch(error => { railRadarStationsCache = undefined; throw error; });
    return railRadarStationsCache;
  }
}

module.exports = {
  getTrainDataProvider: () => process.env.TRAIN_DATA_PROVIDER === 'sample'
    ? new SampleTrainDataProvider()
    : process.env.TRAIN_DATA_PROVIDER === 'external' ? new ExternalRailwayDataProvider() : new RailRadarTrainDataProvider(),
  SampleTrainDataProvider,
  ExternalRailwayDataProvider,
  RailRadarTrainDataProvider
};
