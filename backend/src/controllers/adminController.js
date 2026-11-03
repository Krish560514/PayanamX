const Train = require('../models/Train');
const Route = require('../models/Route');
const Station = require('../models/Station');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Payment = require('../models/Payment');
const SeatInventory = require('../models/SeatInventory');
const Schedule = require('../models/Schedule');
const AdminAuditLog = require('../models/AdminAuditLog');

async function recordAdminAction(req, action, resource, resourceId, summary) {
  try { await AdminAuditLog.create({ actor: req.user._id, action, resource, resourceId: String(resourceId), summary: String(summary).slice(0, 240) }); }
  catch (error) { console.error('Admin audit log write failed:', error.message); }
}

function validateFareRates(value) {
  if (value === undefined) return;
  const validClasses = new Set(['SL', '3A', '3E', '2A', '1A', 'CC', '2S']);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Object.assign(new Error('Class fare multipliers must be a JSON object.'), { status: 400 });
  for (const [seatClass, rate] of Object.entries(value)) {
    if (!validClasses.has(seatClass) || !Number.isFinite(Number(rate)) || Number(rate) < 0 || Number(rate) > 30) throw Object.assign(new Error(`Fare multiplier for ${seatClass} must be between 0 and 30.`), { status: 400 });
  }
}

async function resolveRouteStops(stops, sourceCode, destinationCode) {
  if (!Array.isArray(stops) || stops.length < 2) throw new Error('A route must have at least a source and destination stop.');
  const resolved = [];
  for (const [index, stop] of stops.entries()) {
    const stationCode = String(stop.stationCode || '').trim().toUpperCase();
    const station = await Station.findOne({ code: stationCode });
    const arrivalTimeValid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(stop.arrivalTime || '');
    const departureTimeValid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(stop.departureTime || '');
    const distance = Number(stop.distanceKm);
    const dayNumber = Number(stop.dayNumber || 1);
    if (!station || Number(stop.stopIndex) !== index || !arrivalTimeValid || !departureTimeValid || !Number.isFinite(distance) || (index && distance <= resolved[index - 1].distanceKm) || !Number.isInteger(dayNumber) || dayNumber < 1) throw new Error(`Route stop ${index + 1} is invalid.`);
    resolved.push({ station: station._id, stopIndex: index, arrivalTime: stop.arrivalTime, departureTime: stop.departureTime, distanceKm: distance, dayNumber });
  }
  if (sourceCode && resolved[0].station.toString() !== (await Station.findOne({ code: sourceCode.toUpperCase() }))?._id.toString()) throw new Error('The first route stop must match the source station.');
  if (destinationCode && resolved[resolved.length - 1].station.toString() !== (await Station.findOne({ code: destinationCode.toUpperCase() }))?._id.toString()) throw new Error('The final route stop must match the destination station.');
  return resolved;
}

exports.getTrains = async (req, res) => {
  try {
    const trains = await Train.find().populate('source', 'name code').populate('destination', 'name code').sort({ trainNumber: 1 });
    const result = await Promise.all(trains.map(async train => {
      const route = await Route.findOne({ train: train._id }).populate('stops.station', 'code name');
      return { ...train.toObject(), stops: (route?.stops || []).map(stop => ({ stationCode: stop.station.code, stopIndex: stop.stopIndex, arrivalTime: stop.arrivalTime, departureTime: stop.departureTime, distanceKm: stop.distanceKm, dayNumber: stop.dayNumber })) };
    }));
    res.json({ success: true, trains: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getStations = async (req, res) => {
  try {
    const stations = await Station.find().sort({ name: 1 });
    res.json({ success: true, stations });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.addStation = async (req, res) => {
  try {
    const { code, name, state, zone } = req.body;
    if (!/^[A-Z0-9]{2,6}$/.test(String(code || '').toUpperCase()) || !name?.trim() || !state?.trim() || !zone?.trim()) return res.status(400).json({ success: false, message: 'Station code, name, state and zone are required.' });
    const station = await Station.create({ code: code.toUpperCase(), name: name.trim(), state: state.trim(), zone: zone.trim().toUpperCase() });
    await recordAdminAction(req, 'CREATE', 'Station', station._id, `Created station ${station.code} · ${station.name}`);
    res.status(201).json({ success: true, station });
  } catch (error) { res.status(400).json({ success: false, message: error.code === 11000 ? 'Station code already exists.' : error.message }); }
};

exports.editStation = async (req, res) => {
  try {
    const { code, name, state, zone } = req.body;
    if (code !== undefined && !/^[A-Z0-9]{2,6}$/.test(String(code).toUpperCase())) return res.status(400).json({ success: false, message: 'Station code must contain 2 to 6 letters or numbers.' });
    const station = await Station.findByIdAndUpdate(req.params.id, { $set: { ...(code !== undefined ? { code: code.toUpperCase() } : {}), ...(name !== undefined ? { name: name.trim() } : {}), ...(state !== undefined ? { state: state.trim() } : {}), ...(zone !== undefined ? { zone: zone.trim() } : {}) } }, { new: true, runValidators: true });
    if (!station) return res.status(404).json({ success: false, message: 'Station not found.' });
    await recordAdminAction(req, 'UPDATE', 'Station', station._id, `Updated station ${station.code} · ${station.name}`);
    res.json({ success: true, station });
  } catch (error) { res.status(400).json({ success: false, message: error.code === 11000 ? 'Station code already exists.' : error.message }); }
};

exports.deleteStation = async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ success: false, message: 'Station not found.' });
    const [trainRef, routeRef] = await Promise.all([
      Train.countDocuments({ $or: [{ source: station._id }, { destination: station._id }] }),
      Route.countDocuments({ 'stops.station': station._id })
    ]);
    if (trainRef || routeRef) return res.status(409).json({ success: false, message: 'Station is used by a train or route and cannot be deleted.' });
    await Station.deleteOne({ _id: station._id });
    await recordAdminAction(req, 'DELETE', 'Station', station._id, `Deleted station ${station.code} · ${station.name}`);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// @desc    Add a new train and its route stops
// @route   POST /api/admin/trains
// @access  Private/Admin
exports.addTrain = async (req, res) => {
  let createdTrain;
  try {
    const { trainNumber, name, sourceCode, destinationCode, classes, runsOn, baseFare, stops, coachComposition } = req.body;

    if (!trainNumber || !name || !sourceCode || !destinationCode || !classes || !runsOn || !stops || stops.length < 2) {
      return res.status(400).json({ success: false, message: 'Invalid train data. Check stops count (min 2).' });
    }

    // Resolve source and destination
    const srcStation = await Station.findOne({ code: sourceCode.toUpperCase() });
    const destStation = await Station.findOne({ code: destinationCode.toUpperCase() });

    if (!srcStation || !destStation) {
      return res.status(404).json({ success: false, message: 'Source or Destination station not found' });
    }

    const train = new Train({
      trainNumber,
      name,
      source: srcStation._id,
      destination: destStation._id,
      classes,
      runsOn,
      baseFare,
      coachComposition: Array.isArray(coachComposition) ? coachComposition : []
    });

    validateFareRates(baseFare);

    await train.save();
    createdTrain = train;

    const stopsList = await resolveRouteStops(stops, sourceCode, destinationCode);

    const route = new Route({
      train: train._id,
      stops: stopsList
    });

    await route.save();
    await recordAdminAction(req, 'CREATE', 'Train', train._id, `Created train ${train.trainNumber} · ${train.name}`);

    res.status(201).json({ success: true, message: 'Train and Route created successfully', train });
  } catch (error) {
    if (createdTrain) {
      await Route.deleteOne({ train: createdTrain._id });
      await Train.deleteOne({ _id: createdTrain._id });
    }
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @desc    Edit an existing train details
// @route   PUT /api/admin/trains/:id
// @access  Private/Admin
exports.editTrain = async (req, res) => {
  try {
    const { name, classes, runsOn, baseFare, active, coachComposition, stops, sourceCode, destinationCode } = req.body;
    const train = await Train.findById(req.params.id);

    if (!train) {
      return res.status(404).json({ success: false, message: 'Train not found' });
    }

    if (name) train.name = name;
    if (classes) train.classes = classes;
    if (runsOn) train.runsOn = runsOn;
    if (baseFare) train.baseFare = baseFare;
    validateFareRates(baseFare);
    if (active !== undefined) train.active = active;
    if (Array.isArray(coachComposition)) train.coachComposition = coachComposition;

    let routeStopsToSave;
    if (sourceCode || destinationCode || stops) {
      if (!Array.isArray(stops) || stops.length < 2) return res.status(400).json({ success: false, message: 'A route must include at least two station stops.' });
      const routeStops = await resolveRouteStops(stops, sourceCode, destinationCode);
      train.source = routeStops[0].station;
      train.destination = routeStops[routeStops.length - 1].station;
      routeStopsToSave = routeStops;
    }

    await train.save();
    if (routeStopsToSave) await Route.findOneAndUpdate({ train: train._id }, { $set: { stops: routeStopsToSave } }, { upsert: true, new: true });
    await recordAdminAction(req, 'UPDATE', 'Train', train._id, `Updated train ${train.trainNumber} · ${train.name}`);

    res.json({ success: true, message: 'Train details updated successfully', train });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a train and its associated route
// @route   DELETE /api/admin/trains/:id
// @access  Private/Admin
exports.deleteTrain = async (req, res) => {
  try {
    const trainId = req.params.id;
    const train = await Train.findById(trainId);
    if (!train) {
      return res.status(404).json({ success: false, message: 'Train not found' });
    }

    const existingBookings = await Booking.countDocuments({ train: trainId });
    if (existingBookings) return res.status(409).json({ success: false, message: 'Train has booking history. Keep it and mark it inactive instead of deleting it.' });

    await Route.deleteOne({ train: trainId });
    await Schedule.deleteMany({ train: trainId });
    await SeatInventory.deleteMany({ train: trainId });
    await Train.deleteOne({ _id: trainId });
    await recordAdminAction(req, 'DELETE', 'Train', trainId, `Deleted train ${train.trainNumber} · ${train.name}`);

    res.json({ success: true, message: 'Train and Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    View all bookings in the system
// @route   GET /api/admin/bookings
// @access  Private/Admin
exports.getAllBookings = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};
    if (req.query.status && !['Pending', 'Confirmed', 'Cancelled'].includes(req.query.status)) return res.status(400).json({ success: false, message: 'Booking status filter is invalid.' });
    if (req.query.seatClass && !['1A', '2A', '3A', '3E', 'SL', 'CC', '2S'].includes(req.query.seatClass)) return res.status(400).json({ success: false, message: 'Booking class filter is invalid.' });
    if (['Pending', 'Confirmed', 'Cancelled'].includes(req.query.status)) filter.status = req.query.status;
    if (['1A', '2A', '3A', '3E', 'SL', 'CC', '2S'].includes(req.query.seatClass)) filter.seatClass = req.query.seatClass;
    if (req.query.from || req.query.to) {
      if (req.query.from && !/^\d{4}-\d{2}-\d{2}$/.test(req.query.from) || req.query.to && !/^\d{4}-\d{2}-\d{2}$/.test(req.query.to) || req.query.from && req.query.to && req.query.from > req.query.to) return res.status(400).json({ success: false, message: 'Booking date filter is invalid.' });
      filter.date = { ...(req.query.from ? { $gte: req.query.from } : {}), ...(req.query.to ? { $lte: req.query.to } : {}) };
    }
    const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const [userIds, trainIds] = await Promise.all([
        User.find({ $or: [{ name: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }] }).distinct('_id'),
        Train.find({ $or: [{ trainNumber: { $regex: escaped, $options: 'i' } }, { name: { $regex: escaped, $options: 'i' } }] }).distinct('_id')
      ]);
      filter.$or = [{ pnr: { $regex: escaped, $options: 'i' } }, { 'passengers.name': { $regex: escaped, $options: 'i' } }, { user: { $in: userIds } }, { train: { $in: trainIds } }];
    }
    const sortBy = ['createdAt', 'date', 'pnr', 'status', 'totalFare'].includes(req.query.sort) ? req.query.sort : 'createdAt';
    const sortDirection = req.query.direction === 'asc' ? 1 : -1;
    const [bookings, total] = await Promise.all([Booking.find(filter)
      .populate('user', 'name email phone')
      .populate('train', 'trainNumber name')
      .populate('source', 'name code')
      .populate('destination', 'name code')
      .sort({ [sortBy]: sortDirection, _id: sortDirection }).skip((page - 1) * limit).limit(limit), Booking.countDocuments(filter)]);

    res.json({ success: true, bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    View all registered user accounts
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUserAccounts = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const filter = { role: 'user' };
    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = ['name', 'email', 'phone'].map(field => ({ [field]: { $regex: escaped, $options: 'i' } }));
    }
    const [users, total] = await Promise.all([User.find(filter).select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), User.countDocuments(filter)]);
    res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAuditLog = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const filter = {};
    if (['CREATE', 'UPDATE', 'DELETE', 'REFUND_UPDATE'].includes(req.query.action)) filter.action = req.query.action;
    if (['Train', 'Station', 'Booking'].includes(req.query.resource)) filter.resource = req.query.resource;
    const [entries, total] = await Promise.all([
      AdminAuditLog.find(filter).populate('actor', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AdminAuditLog.countDocuments(filter)
    ]);
    return res.json({ success: true, entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { return res.status(500).json({ success: false, message: 'Could not load audit history.' }); }
};

// @desc    Get dashboard financial and user statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getRevenueStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from) || to && !/^\d{4}-\d{2}-\d{2}$/.test(to) || from && to && from > to) return res.status(400).json({ success: false, message: 'Analytics date range is invalid.' });
    const dateRange = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    const bookingRange = from || to ? { date: dateRange } : {};
    const totalBookings = await Booking.countDocuments(bookingRange);
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalTrains = await Train.countDocuments({ active: true });
    const occupancy = await SeatInventory.aggregate([
      ...(from || to ? [{ $match: { date: dateRange } }] : []),
      { $group: { _id: '$seatClass', totalSeats: { $sum: 1 }, bookedSeats: { $sum: { $cond: [{ $eq: ['$status', 'BOOKED'] }, 1, 0] } }, heldSeats: { $sum: { $cond: [{ $eq: ['$status', 'HELD'] }, 1, 0] } } } },
      { $sort: { _id: 1 } }
    ]);

    // Calculate Gross and Net Revenue
    const revenueSummary = await Booking.aggregate([
      ...(from || to ? [{ $match: { date: dateRange } }] : []),
      {
        $group: {
          _id: null,
          grossRevenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$totalFare', 0]
            }
          },
          refundedAmount: { $sum: '$refundAmount' }
        }
      }
    ]);

    const grossRevenue = revenueSummary.length > 0 ? revenueSummary[0].grossRevenue : 0;
    const refundedAmount = revenueSummary.length > 0 ? revenueSummary[0].refundedAmount : 0;
    const netRevenue = grossRevenue - refundedAmount;

    // Class wise bookings split
    const classSplit = await Booking.aggregate([
      { $match: { ...bookingRange, paymentStatus: 'Paid' } },
      { $group: { _id: '$seatClass', count: { $sum: 1 }, revenue: { $sum: '$totalFare' } } }
    ]);

    // Trend analysis over last 7 bookings or dates
    const dailyTrend = await Booking.aggregate([
      { $match: { ...bookingRange, paymentStatus: 'Paid' } },
      {
        $group: {
          _id: '$date',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalFare' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 90 }
    ]);
    const monthlyTrend = await Booking.aggregate([
      { $match: { ...bookingRange, paymentStatus: 'Paid' } },
      { $group: { _id: { $substr: ['$date', 0, 7] }, bookings: { $sum: 1 }, revenue: { $sum: '$totalFare' } } },
      { $sort: { _id: -1 } }, { $limit: 12 }
    ]);

    // Map trends to UI labels
    const trends = dailyTrend.reverse().map(d => ({
      date: d._id,
      bookings: d.bookings,
      revenue: d.revenue
    }));

    res.json({
      success: true,
      metrics: {
        totalBookings,
        totalUsers,
        totalTrains,
        occupancy,
        grossRevenue,
        refundedAmount,
        netRevenue
      },
      classSplit,
      trends,
      monthlyTrends: monthlyTrend.reverse().map(row => ({ month: row._id, bookings: row.bookings, revenue: row.revenue }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update refund request status
// @route   PUT /api/admin/bookings/:id/refund
// @access  Private/Admin
exports.manageRefunds = async (req, res) => {
  try {
    const { refundStatus } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot process refund for active booking' });
    }

    if (refundStatus) booking.refundStatus = refundStatus;
    await booking.save();
    await recordAdminAction(req, 'REFUND_UPDATE', 'Booking', booking._id, `Updated refund status for simulated PNR ${booking.pnr}`);

    res.json({ success: true, message: 'Refund status updated successfully', booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.validateFareRates = validateFareRates;
