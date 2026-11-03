const mongoose = require('mongoose');
const Station = require('../models/Station');
const Train = require('../models/Train');
const Route = require('../models/Route');
const Review = require('../models/Review');
const { checkAvailability } = require('../utils/seatAllocator');
const SeatInventory = require('../models/SeatInventory');
const { ensureInventory, releaseExpiredHolds } = require('../utils/coachInventory');
const { getTrainDataProvider } = require('../services/trainDataProvider');
const { calculateSampleFare, normalizeClassFareMultiplier } = require('../utils/sampleFare');

const DEMO_EXTERNAL_CLASSES = ['SL', '3A', '2A', 'CC', '2S'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

async function getDemoTrainForExternalResult(train, fromCode, toCode, sourceName, destinationName, date) {
  const localTrain = await Train.findOne({ trainNumber: train.trainNumber, active: true }).populate('source destination');
  const localRoute = localTrain ? await Route.findOne({ train: localTrain._id }).populate('stops.station') : null;
  const localFrom = localRoute?.stops.find(stop => stop.station?.code === fromCode);
  const localTo = localRoute?.stops.find(stop => stop.station?.code === toCode);
  if (localTrain && localTrain.runsOn.includes(getDayName(date)) && localFrom && localTo && localFrom.stopIndex < localTo.stopIndex) {
    return { train: localTrain, fromStop: localFrom, toStop: localTo };
  }

  // The external timetable has no reservation inventory. Create a clearly simulated,
  // route-specific local record so the existing coach/seat/checkout flow can run.
  const [fromStation, toStation] = await Promise.all([
    Station.findOneAndUpdate({ code: fromCode }, { $setOnInsert: { code: fromCode, name: sourceName, state: 'Unknown', zone: 'UNK' } }, { upsert: true, new: true, setDefaultsOnInsert: true }),
    Station.findOneAndUpdate({ code: toCode }, { $setOnInsert: { code: toCode, name: destinationName, state: 'Unknown', zone: 'UNK' } }, { upsert: true, new: true, setDefaultsOnInsert: true })
  ]);
  const safeNumber = String(train.trainNumber).replace(/[^A-Za-z0-9]/g, '').slice(-12) || 'UNKNOWN';
  const syntheticNumber = `RR${safeNumber}-${fromCode}-${toCode}`;
  const runsOn = train.runningDays?.length ? train.runningDays.filter(day => WEEKDAYS.includes(day)) : WEEKDAYS;
  const classes = localTrain?.classes?.length ? localTrain.classes : DEMO_EXTERNAL_CLASSES;
  const demoTrain = await Train.findOneAndUpdate(
    { trainNumber: syntheticNumber },
    { $setOnInsert: {
      trainNumber: syntheticNumber,
      name: train.name,
      source: fromStation._id,
      destination: toStation._id,
      classes,
      dataSource: 'external',
      runsOn: runsOn.length ? runsOn : WEEKDAYS,
      active: true
    } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const distance = Math.max(1, Number(train.distanceKm) || 1);
  const route = await Route.findOneAndUpdate(
    { train: demoTrain._id },
    { $setOnInsert: { train: demoTrain._id, stops: [
      { station: fromStation._id, stopIndex: 0, arrivalTime: train.departureTime || '00:00', departureTime: train.departureTime || '00:00', distanceKm: 0, dayNumber: 1 },
      { station: toStation._id, stopIndex: 1, arrivalTime: train.arrivalTime || train.departureTime || '00:00', departureTime: train.arrivalTime || train.departureTime || '00:00', distanceKm: distance, dayNumber: 1 }
    ] } },
    { upsert: true, new: true }
  );
  const populated = await Route.populate(route, 'stops.station');
  return { train: demoTrain, fromStop: populated.stops[0], toStop: populated.stops[1] };
}

// Get day name from date string
const getDayName = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

// Calculate duration between arrival and departure times (accounting for day differences)
const calculateDuration = (depTime, arrTime, depDay, arrDay) => {
  const [depH, depM] = depTime.split(':').map(Number);
  const [arrH, arrM] = arrTime.split(':').map(Number);
  
  let totalDepMins = depH * 60 + depM;
  let totalArrMins = arrH * 60 + arrM + (arrDay - depDay) * 1440;
  
  const diffMins = totalArrMins - totalDepMins;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  return `${hours}h ${mins}m`;
};

// @desc    Autocomplete stations
// @route   GET /api/trains/stations/autocomplete
// @access  Public
exports.autocompleteStations = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.json([]);
    }
    if (typeof query !== 'string' || query.length > 80) return res.status(400).json({ success: false, message: 'Station query is invalid.' });
    const provider = getTrainDataProvider();
    if (typeof provider.autocompleteStations === 'function') {
      return res.json(await provider.autocompleteStations(query.trim()));
    }
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const stations = await Station.find({
      $or: [
        { code: { $regex: safeQuery, $options: 'i' } },
        { name: { $regex: safeQuery, $options: 'i' } },
        { state: { $regex: safeQuery, $options: 'i' } }
      ]
    }).limit(10);

    res.json(stations);
  } catch (error) {
    res.status(error.status && error.status < 500 ? error.status : 502).json({ success: false, message: error.message });
  }
};

// @desc    Search trains between stations on a date
// @route   GET /api/trains/search
// @access  Public
exports.searchTrains = async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from || !to || !date) {
      return res.status(400).json({ success: false, message: 'From, To and Date are required query parameters' });
    }

    const provider = getTrainDataProvider();
    if (typeof provider.autocompleteStations === 'function') {
      const stationCode = async value => {
        if (/^[A-Za-z0-9]{2,8}$/.test(value)) return value.toUpperCase();
        if (mongoose.Types.ObjectId.isValid(value)) {
          const station = await Station.findById(value).select('code');
          if (station) return station.code;
        }
        return null;
      };
      const [fromCode, toCode] = await Promise.all([stationCode(from), stationCode(to)]);
      if (!fromCode || !toCode) return res.status(400).json({ success: false, message: 'Choose source and destination from the railway station suggestions.' });
      const fromStation = await provider.autocompleteStations(fromCode);
      const toStation = await provider.autocompleteStations(toCode);
      const sourceStation = fromStation.find(station => station.code === fromCode);
      const destinationStation = toStation.find(station => station.code === toCode);
      if (!sourceStation || !destinationStation) return res.status(404).json({ success: false, message: 'Railway station code was not found by the timetable provider.' });
      const records = await provider.findTrainsBetweenStations({ from: fromCode, to: toCode, date });
      const formatDuration = minutes => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
      const trains = await Promise.all(records.map(async train => {
        const { train: localTrain, fromStop, toStop } = await getDemoTrainForExternalResult(
          train, fromCode, toCode, sourceStation.name, destinationStation.name, date
        );
        const canDemoBook = localTrain.runsOn.includes(getDayName(date));
        const classes = canDemoBook ? localTrain.classes : [];
        const classDetails = {};
        if (canDemoBook) {
          for (const cls of classes) {
            await ensureInventory(localTrain, date, cls);
            await releaseExpiredHolds({ train: localTrain._id, date, seatClass: cls });
            const inventory = await SeatInventory.aggregate([
              { $match: { train: localTrain._id, date, seatClass: cls } },
              { $group: { _id: null, availableSeats: { $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] } } } }
            ]);
            const distance = toStop.distanceKm - fromStop.distanceKm;
            classDetails[cls] = {
              availableSeats: inventory[0]?.availableSeats || 0,
              fare: calculateSampleFare(distance, normalizeClassFareMultiplier(cls, localTrain.baseFare?.[cls]))
            };
          }
        }
        return {
          trainId: canDemoBook ? localTrain._id : `external:${train.trainNumber}`,
          trainNumber: train.trainNumber,
          name: train.name,
          trainType: train.type,
          source: sourceStation.name,
          sourceCode: fromCode,
          destination: destinationStation.name,
          destinationCode: toCode,
          boardingStation: canDemoBook ? { id: fromStop.station._id, name: fromStop.station.name, code: fromCode, departureTime: train.departureTime, arrivalTime: train.departureTime, stopIndex: fromStop.stopIndex } : { id: fromCode, name: sourceStation.name, code: fromCode, departureTime: train.departureTime, arrivalTime: train.departureTime, stopIndex: 0 },
          deboardingStation: canDemoBook ? { id: toStop.station._id, name: toStop.station.name, code: toCode, departureTime: train.arrivalTime, arrivalTime: train.arrivalTime, stopIndex: toStop.stopIndex } : { id: toCode, name: destinationStation.name, code: toCode, departureTime: train.arrivalTime, arrivalTime: train.arrivalTime, stopIndex: train.totalHalts },
          duration: train.durationMinutes ? formatDuration(train.durationMinutes) : 'Schedule duration unavailable',
          runningDays: train.runningDays,
          classes,
          dataSource: 'railradar',
          dataSourceLabel: provider.sourceLabel,
          availabilityLabel: canDemoBook ? 'Simulated demo inventory · not railway availability' : 'Train does not run on selected date',
          classDetails,
          bookable: canDemoBook,
          distanceKm: train.distanceKm,
          totalHalts: train.totalHalts,
          liveStatus: train.live
        };
      }));
      return res.json({
        success: true,
        searchCriteria: { from: sourceStation.name, to: destinationStation.name, date },
        trainsCount: trains.length,
        dataSource: provider.sourceLabel,
        trains
      });
    }

    // 1. Resolve source and destination stations (accept code or ObjectId)
    const fromStation = await Station.findOne({ $or: [{ code: from.toUpperCase() }, { _id: mongoose.Types.ObjectId.isValid(from) ? from : null }] });
    const toStation = await Station.findOne({ $or: [{ code: to.toUpperCase() }, { _id: mongoose.Types.ObjectId.isValid(to) ? to : null }] });

    if (!fromStation || !toStation) {
      return res.status(404).json({ success: false, message: 'Source or destination station not found' });
    }

    // Get weekday for date
    const reqDay = getDayName(date);

    // 2. Fetch routes and filter trains that go from -> to
    const routes = await getTrainDataProvider().findTrainsBetweenStations({ route: {} });
    await Promise.all(routes.map(route => route.train?.populate(['source', 'destination'])));

    const matchingTrains = [];

    for (const route of routes) {
      const train = route.train;
      if (!train || !train.active) continue;

      // Check if train runs on requested day of week
      if (!train.runsOn.includes(reqDay)) continue;

      const fromStop = route.stops.find(stop => stop.station._id.toString() === fromStation._id.toString());
      const toStop = route.stops.find(stop => stop.station._id.toString() === toStation._id.toString());

      // Ensure stops exist and boarding is before destination
      if (fromStop && toStop && fromStop.stopIndex < toStop.stopIndex) {
        const distance = toStop.distanceKm - fromStop.distanceKm;
        
        // Calculate dynamic availability and fares for each class supported by the train
        const availabilityAndFares = {};
        
        for (const cls of train.classes) {
          await ensureInventory(train, date, cls);
          await releaseExpiredHolds({ train: train._id, date, seatClass: cls });
          const inventory = await SeatInventory.aggregate([
            { $match: { train: train._id, date, seatClass: cls } },
            { $group: { _id: null, totalSeats: { $sum: 1 }, availableSeats: { $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] } } } }
          ]);
          const avail = inventory[0] || { totalSeats: 0, availableSeats: 0 };

          // Calculate fare: base fare rate per class * distance (min. Rs 50)
          const multiplier = normalizeClassFareMultiplier(cls, train.baseFare?.[cls]);
          const fare = calculateSampleFare(distance, multiplier);

          availabilityAndFares[cls] = {
            availableSeats: avail.availableSeats,
            totalSeats: avail.totalSeats,
            fare
          };
        }

        // Get train rating
        const reviewsCount = await Review.countDocuments({ train: train._id });
        const avgRatingResult = await Review.aggregate([
          { $match: { train: train._id } },
          { $group: { _id: null, avg: { $avg: '$rating' } } }
        ]);
        const rating = avgRatingResult.length > 0 ? parseFloat(avgRatingResult[0].avg.toFixed(1)) : 4.0;

        matchingTrains.push({
          trainId: train._id,
          trainNumber: train.trainNumber,
          name: train.name,
          source: train.source.name,
          sourceCode: train.source.code,
          destination: train.destination.name,
          destinationCode: train.destination.code,
          boardingStation: {
            id: fromStation._id,
            name: fromStation.name,
            code: fromStation.code,
            arrivalTime: fromStop.arrivalTime,
            departureTime: fromStop.departureTime,
            stopIndex: fromStop.stopIndex
          },
          deboardingStation: {
            id: toStation._id,
            name: toStation.name,
            code: toStation.code,
            arrivalTime: toStop.arrivalTime,
            departureTime: toStop.departureTime,
            stopIndex: toStop.stopIndex
          },
          duration: calculateDuration(
            fromStop.departureTime,
            toStop.arrivalTime,
            fromStop.dayNumber,
            toStop.dayNumber
          ),
          runningDays: train.runsOn,
          classes: train.classes,
          dataSource: train.dataSource || 'sample',
          availabilityLabel: 'Simulated sample inventory',
          classDetails: availabilityAndFares,
          rating,
          reviewsCount
        });
      }
    }

    res.json({
      success: true,
      searchCriteria: {
        from: fromStation.name,
        to: toStation.name,
        date,
        day: reqDay
      },
      trainsCount: matchingTrains.length,
      trains: matchingTrains
    });
  } catch (error) {
    res.status(error.status && error.status < 500 ? error.status : 502).json({ success: false, message: error.message });
  }
};

// @desc    Get train route stops
// @route   GET /api/trains/:id/route
// @access  Public
exports.getRouteStops = async (req, res) => {
  try {
    const route = await Route.findOne({ train: req.params.id })
      .populate('train')
      .populate('stops.station');

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found for this train' });
    }

    res.json({ success: true, route });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get reviews for a train
// @route   GET /api/trains/:id/reviews
// @access  Public
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ train: req.params.id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTrainDirectory = async (req, res) => {
  try {
    const provider = getTrainDataProvider();
    if (typeof provider.getTrainDirectory === 'function') {
      return res.json({ success: true, dataSource: provider.sourceLabel, trains: await provider.getTrainDirectory() });
    }
    const trains = await Train.find({ active: true }).select('trainNumber name source destination dataSource').populate('source destination', 'code name').sort({ trainNumber: 1 });
    return res.json({ success: true, dataSource: 'Local sample train directory', trains });
  } catch (error) {
    return res.status(error.status && error.status < 500 ? error.status : 502).json({ success: false, message: error.message });
  }
};

exports.getProviderSchedule = async (req, res) => {
  try {
    const provider = getTrainDataProvider();
    if (typeof provider.getSchedule !== 'function') return res.status(404).json({ success: false, message: 'External train schedules are not enabled.' });
    if (!/^\d{4,6}$/.test(req.params.trainNumber)) return res.status(400).json({ success: false, message: 'Train number is invalid.' });
    return res.json({ success: true, dataSource: provider.sourceLabel, schedule: await provider.getSchedule(req.params.trainNumber) });
  } catch (error) {
    return res.status(error.status && error.status < 500 ? error.status : 502).json({ success: false, message: error.message });
  }
};

// @desc    Add a review for a train
// @route   POST /api/trains/:id/reviews
// @access  Private
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({ success: false, message: 'Rating is required' });
    }

    const review = await Review.create({
      user: req.user._id,
      train: req.params.id,
      rating,
      comment
    });

    res.status(201).json({ success: true, message: 'Review added successfully', review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
