const Train = require('../models/Train');
const Route = require('../models/Route');
const Station = require('../models/Station');

// Coordinate mapper for Indian stations
const stationCoordinates = {
  NDLS: { lat: 28.6415, lng: 77.2198 },
  SBC: { lat: 12.9734, lng: 77.5759 },
  CSMT: { lat: 18.9400, lng: 72.8354 },
  HWH: { lat: 22.5850, lng: 88.3386 },
  MAS: { lat: 13.0827, lng: 80.2707 },
  PNBE: { lat: 25.6022, lng: 85.1194 },
  LKO: { lat: 26.8315, lng: 80.9224 },
  HYB: { lat: 17.3850, lng: 78.4867 },
  GKP: { lat: 26.7606, lng: 83.3731 },
  PUNE: { lat: 18.5289, lng: 73.8744 },
  ADI: { lat: 23.0276, lng: 72.5997 },
  GHY: { lat: 26.1859, lng: 91.7477 },
  BBS: { lat: 20.2644, lng: 85.8402 },
  VSKP: { lat: 17.7265, lng: 83.3155 },
  MYS: { lat: 12.3162, lng: 76.6465 },
  TVC: { lat: 8.4812, lng: 76.9485 },
  ERS: { lat: 9.9678, lng: 76.2996 },
  MAQ: { lat: 12.8624, lng: 74.8427 },
  JAT: { lat: 32.7059, lng: 74.8797 },
  CDG: { lat: 30.7046, lng: 76.8173 },
  JP: { lat: 26.9196, lng: 75.7878 },
  BPL: { lat: 23.2599, lng: 77.4126 },
  NGP: { lat: 21.1500, lng: 79.0900 },
  SEC: { lat: 17.4334, lng: 78.5015 },
  PRYJ: { lat: 25.4497, lng: 81.8286 },
  CNB: { lat: 26.4542, lng: 80.3500 },
  MMCT: { lat: 18.9696, lng: 72.8194 },
  BDTS: { lat: 19.0644, lng: 72.8408 },
  YPR: { lat: 13.0300, lng: 77.5500 },
  RU: { lat: 13.6272, lng: 79.4760 },
  TPTY: { lat: 13.6284, lng: 79.4192 },
  WL: { lat: 17.9689, lng: 79.5941 },
  BZA: { lat: 16.5062, lng: 80.6480 },
  VGLJ: { lat: 25.4484, lng: 78.5685 },
  GWL: { lat: 26.2183, lng: 78.1828 },
  AGC: { lat: 27.1578, lng: 77.9908 },
  KOTA: { lat: 25.1764, lng: 75.8577 },
  RTM: { lat: 23.3315, lng: 75.0367 },
  BRC: { lat: 22.3106, lng: 73.1812 },
  SUR: { lat: 17.6599, lng: 75.9064 },
  DD: { lat: 18.4635, lng: 74.7869 },
  MMR: { lat: 20.2458, lng: 74.4447 },
  BSL: { lat: 21.0475, lng: 75.7891 },
  ET: { lat: 22.6122, lng: 77.7599 },
  JBP: { lat: 23.1686, lng: 79.9338 },
  STA: { lat: 24.5802, lng: 80.8256 },
  DDU: { lat: 25.2789, lng: 83.1250 },
  GAYA: { lat: 24.7964, lng: 84.9994 },
  ASN: { lat: 23.6889, lng: 86.9749 },
  BHP: { lat: 23.6706, lng: 87.7224 },
  MLDT: { lat: 25.0081, lng: 88.1350 },
  NJP: { lat: 26.6872, lng: 88.4414 },
  APDJ: { lat: 26.4919, lng: 89.5247 },
  SPJ: { lat: 25.8617, lng: 85.7925 },
  MFP: { lat: 26.1209, lng: 85.3950 },
  DBG: { lat: 26.1557, lng: 85.8953 },
  BJU: { lat: 25.4208, lng: 85.9739 },
  BSB: { lat: 25.3216, lng: 82.9876 },
  AY: { lat: 26.7922, lng: 82.1998 },
  DDN: { lat: 30.3165, lng: 78.0322 },
  HW: { lat: 29.9457, lng: 78.1642 },
  KLK: { lat: 30.8353, lng: 76.9356 },
  ASR: { lat: 31.6340, lng: 74.8723 },
  JUC: { lat: 31.3260, lng: 75.5760 },
  LDH: { lat: 30.9010, lng: 75.8573 },
  UMB: { lat: 30.3400, lng: 76.8300 }
};

// Fallback coordinate generator
const getCoords = (code, index) => {
  if (stationCoordinates[code]) return stationCoordinates[code];
  // Stable random-ish coordinate within India boundaries
  const seed = code.charCodeAt(0) + code.charCodeAt(1) || 50;
  return {
    lat: 20 + (seed % 10) + index * 0.5,
    lng: 75 + (seed % 15) + index * 0.5
  };
};

// @desc    Get live running status simulation of a train
// @route   GET /api/tracker/:trainId/status
// @access  Public
exports.getLiveStatus = async (req, res) => {
  try {
    const { trainId } = req.params;

    const { getTrainDataProvider } = require('../services/trainDataProvider');
    const provider = getTrainDataProvider();
    if (typeof provider.getRunningStatus === 'function' && provider.constructor.name === 'RailRadarTrainDataProvider') {
      const live = await provider.getRunningStatus(trainId, req.query.date);
      return res.json({ success: true, dataSource: provider.sourceLabel, data: live });
    }

    const train = await Train.findById(trainId);
    if (!train) {
      return res.status(404).json({ success: false, message: 'Train not found' });
    }

    const route = await Route.findOne({ train: trainId }).populate('stops.station');
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found for this train' });
    }

    const stops = route.stops;
    if (stops.length < 2) {
      return res.status(400).json({ success: false, message: 'Invalid route stop list length' });
    }

    // Append coordinates to stops
    const mappedStops = stops.map((stop, idx) => {
      const coords = getCoords(stop.station.code, idx);
      return {
        stationName: stop.station.name,
        stationCode: stop.station.code,
        stopIndex: stop.stopIndex,
        arrivalTime: stop.arrivalTime,
        departureTime: stop.departureTime,
        distanceKm: stop.distanceKm,
        dayNumber: stop.dayNumber,
        lat: coords.lat,
        lng: coords.lng
      };
    });

    // Time calculations
    const now = new Date();
    // For simulation, let's use the current time of day
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMins = currentHour * 60 + currentMinute;

    // Parse source departure and destination arrival times
    const sourceDep = mappedStops[0].departureTime;
    const destArr = mappedStops[mappedStops.length - 1].arrivalTime;

    const [srcDepH, srcDepM] = sourceDep.split(':').map(Number);
    const [destArrH, destArrM] = destArr.split(':').map(Number);

    const srcDepMins = srcDepH * 60 + srcDepM;
    const destArrMins = destArrH * 60 + destArrM;

    let status = 'Not Started';
    let lastPassedStopIndex = 0;
    let nextStopIndex = 1;
    let progressPercent = 0;
    let currentLat = mappedStops[0].lat;
    let currentLng = mappedStops[0].lng;
    let delayMinutes = 0;

    // Helper to convert HH:MM string to absolute minutes of Day 1
    const stopToMins = (timeStr, dayNumber) => {
      if (timeStr === 'Source' || timeStr === 'Destination') return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m + (dayNumber - 1) * 1440;
    };

    // Calculate absolute minutes for all stops
    const stopTimes = mappedStops.map(stop => {
      const arr = stop.arrivalTime === 'Source' ? 0 : stopToMins(stop.arrivalTime, stop.dayNumber);
      const dep = stop.departureTime === 'Destination' ? 0 : stopToMins(stop.departureTime, stop.dayNumber);
      return { arr, dep };
    });

    const totalJourneyMins = stopToMins(destArr, mappedStops[mappedStops.length - 1].dayNumber) - stopToMins(sourceDep, 1);
    
    // Scale simulation time to fit inside 24 hours relative to current day minutes
    // Let's assume the train runs today, and check where it is relative to current time of day
    const simulatedMins = currentMins;

    const startMins = stopToMins(sourceDep, 1) % 1440;
    const endMins = stopToMins(destArr, mappedStops[mappedStops.length - 1].dayNumber) % 1440;

    // Determine simulation state
    if (simulatedMins < startMins) {
      status = 'Not Started';
      currentLat = mappedStops[0].lat;
      currentLng = mappedStops[0].lng;
      progressPercent = 0;
    } else if (simulatedMins > endMins && endMins > startMins) {
      status = 'Reached Destination';
      const last = mappedStops[mappedStops.length - 1];
      currentLat = last.lat;
      currentLng = last.lng;
      progressPercent = 100;
      lastPassedStopIndex = mappedStops.length - 1;
      nextStopIndex = -1;
    } else {
      status = 'Running';
      // Find where we are
      // Simple lookup: find the stops we are in between
      let found = false;
      for (let i = 0; i < mappedStops.length - 1; i++) {
        const currentStopMins = stopTimes[i].dep % 1440;
        const nextStopMins = stopTimes[i + 1].arr % 1440;

        // Account for midnight wrapping
        const isBetween = currentStopMins < nextStopMins 
          ? (simulatedMins >= currentStopMins && simulatedMins <= nextStopMins)
          : (simulatedMins >= currentStopMins || simulatedMins <= nextStopMins);

        if (isBetween || i === mappedStops.length - 2) {
          lastPassedStopIndex = i;
          nextStopIndex = i + 1;
          
          // Calculate percentage progress on this segment
          const segmentTotal = currentStopMins < nextStopMins 
            ? (nextStopMins - currentStopMins)
            : (1440 - currentStopMins + nextStopMins);

          const segmentElapsed = currentStopMins < nextStopMins
            ? (simulatedMins - currentStopMins)
            : (simulatedMins >= currentStopMins ? (simulatedMins - currentStopMins) : (1440 - currentStopMins + simulatedMins));

          progressPercent = segmentTotal > 0 ? Math.round((segmentElapsed / segmentTotal) * 100) : 0;
          progressPercent = Math.min(100, Math.max(0, progressPercent));

          // Interpolate GPS coordinates
          const lastStop = mappedStops[i];
          const nextStop = mappedStops[i + 1];
          const ratio = progressPercent / 100;
          currentLat = lastStop.lat + (nextStop.lat - lastStop.lat) * ratio;
          currentLng = lastStop.lng + (nextStop.lng - lastStop.lng) * ratio;
          
          found = true;
          break;
        }
      }

      if (!found) {
        // Fallback
        status = 'Reached Destination';
        const last = mappedStops[mappedStops.length - 1];
        currentLat = last.lat;
        currentLng = last.lng;
        progressPercent = 100;
        lastPassedStopIndex = mappedStops.length - 1;
        nextStopIndex = -1;
      }
    }

    // Mock stable delay: seed with train number to keep it consistent for this train
    const trainSeed = parseInt(train.trainNumber) || 12345;
    delayMinutes = status === 'Running' ? (trainSeed % 15) + 5 : 0; // 5-20 minutes delay

    // Calculate Estimated Arrival Time for Next Station
    let nextStationETA = 'N/A';
    if (nextStopIndex !== -1 && status === 'Running') {
      const nextStop = mappedStops[nextStopIndex];
      const nextArrTime = nextStop.arrivalTime;
      const [h, m] = nextArrTime.split(':').map(Number);
      let etaMins = h * 60 + m + delayMinutes;
      const etaHr = String(Math.floor((etaMins / 60) % 24)).padStart(2, '0');
      const etaMin = String(Math.floor(etaMins % 60)).padStart(2, '0');
      nextStationETA = `${etaHr}:${etaMin}`;
    }

    res.json({
      success: true,
      trainNumber: train.trainNumber,
      trainName: train.name,
      status,
      currentLocation: {
        lat: parseFloat(currentLat.toFixed(5)),
        lng: parseFloat(currentLng.toFixed(5))
      },
      delayMinutes,
      lastPassedStation: mappedStops[lastPassedStopIndex].stationName,
      lastPassedStationCode: mappedStops[lastPassedStopIndex].stationCode,
      nextStation: nextStopIndex !== -1 ? mappedStops[nextStopIndex].stationName : 'N/A',
      nextStationCode: nextStopIndex !== -1 ? mappedStops[nextStopIndex].stationCode : 'N/A',
      nextStationETA,
      segmentProgressPercent: progressPercent,
      routeStops: mappedStops
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
