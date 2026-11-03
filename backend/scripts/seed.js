require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Station = require('../src/models/Station');
const Train = require('../src/models/Train');
const Route = require('../src/models/Route');
const Schedule = require('../src/models/Schedule');
const Booking = require('../src/models/Booking');
const Payment = require('../src/models/Payment');
const Notification = require('../src/models/Notification');
const Review = require('../src/models/Review');

const stationsData = [
  { code: 'NDLS', name: 'New Delhi', state: 'Delhi', zone: 'NR' },
  { code: 'SBC', name: 'KSR Bengaluru City', state: 'Karnataka', zone: 'SWR' },
  { code: 'CSMT', name: 'Mumbai CSMT', state: 'Maharashtra', zone: 'CR' },
  { code: 'HWH', name: 'Howrah Junction', state: 'West Bengal', zone: 'ER' },
  { code: 'MAS', name: 'MGR Chennai Central', state: 'Tamil Nadu', zone: 'SR' },
  { code: 'PNBE', name: 'Patna Junction', state: 'Bihar', zone: 'ECR' },
  { code: 'LKO', name: 'Lucknow Charbagh', state: 'Uttar Pradesh', zone: 'NR' },
  { code: 'HYB', name: 'Hyderabad Deccan', state: 'Telangana', zone: 'SCR' },
  { code: 'GKP', name: 'Gorakhpur Junction', state: 'Uttar Pradesh', zone: 'NER' },
  { code: 'PUNE', name: 'Pune Junction', state: 'Maharashtra', zone: 'CR' },
  { code: 'ADI', name: 'Ahmedabad Junction', state: 'Gujarat', zone: 'WR' },
  { code: 'GHY', name: 'Guwahati', state: 'Assam', zone: 'NFR' },
  { code: 'BBS', name: 'Bhubaneswar', state: 'Odisha', zone: 'ECoR' },
  { code: 'VSKP', name: 'Visakhapatnam', state: 'Andhra Pradesh', zone: 'ECoR' },
  { code: 'MYS', name: 'Mysuru Junction', state: 'Karnataka', zone: 'SWR' },
  { code: 'TVC', name: 'Thiruvananthapuram Central', state: 'Kerala', zone: 'SR' },
  { code: 'ERS', name: 'Ernakulam Junction', state: 'Kerala', zone: 'SR' },
  { code: 'MAQ', name: 'Mangaluru Central', state: 'Karnataka', zone: 'SR' },
  { code: 'JAT', name: 'Jammu Tawi', state: 'Jammu and Kashmir', zone: 'NR' },
  { code: 'CDG', name: 'Chandigarh', state: 'Punjab', zone: 'NR' },
  { code: 'JP', name: 'Jaipur Junction', state: 'Rajasthan', zone: 'NWR' },
  { code: 'BPL', name: 'Bhopal Junction', state: 'Madhya Pradesh', zone: 'WCR' },
  { code: 'NGP', name: 'Nagpur Junction', state: 'Maharashtra', zone: 'CR' },
  { code: 'SEC', name: 'Secunderabad Junction', state: 'Telangana', zone: 'SCR' },
  { code: 'PRYJ', name: 'Prayagraj Junction', state: 'Uttar Pradesh', zone: 'NCR' },
  { code: 'CNB', name: 'Kanpur Central', state: 'Uttar Pradesh', zone: 'NCR' },
  { code: 'MMCT', name: 'Mumbai Central', state: 'Maharashtra', zone: 'WR' },
  { code: 'BDTS', name: 'Bandra Terminus', state: 'Maharashtra', zone: 'WR' },
  { code: 'YPR', name: 'Yesvantpur Junction', state: 'Karnataka', zone: 'SWR' },
  { code: 'RU', name: 'Renigunta Junction', state: 'Andhra Pradesh', zone: 'SCR' },
  { code: 'TPTY', name: 'Tirupati', state: 'Andhra Pradesh', zone: 'SCR' },
  { code: 'WL', name: 'Warangal', state: 'Telangana', zone: 'SCR' },
  { code: 'BZA', name: 'Vijayawada Junction', state: 'Andhra Pradesh', zone: 'SCR' },
  { code: 'VGLJ', name: 'VGL Jhansi Junction', state: 'Uttar Pradesh', zone: 'NCR' },
  { code: 'GWL', name: 'Gwalior', state: 'Madhya Pradesh', zone: 'NCR' },
  { code: 'AGC', name: 'Agra Cantt', state: 'Uttar Pradesh', zone: 'NCR' },
  { code: 'KOTA', name: 'Kota Junction', state: 'Rajasthan', zone: 'WCR' },
  { code: 'RTM', name: 'Ratlam Junction', state: 'Madhya Pradesh', zone: 'WR' },
  { code: 'BRC', name: 'Vadodara Junction', state: 'Gujarat', zone: 'WR' },
  { code: 'SUR', name: 'Solapur Junction', state: 'Maharashtra', zone: 'CR' },
  { code: 'DD', name: 'Daund Junction', state: 'Maharashtra', zone: 'CR' },
  { code: 'MMR', name: 'Manmad Junction', state: 'Maharashtra', zone: 'CR' },
  { code: 'BSL', name: 'Bhusaval Junction', state: 'Maharashtra', zone: 'CR' },
  { code: 'ET', name: 'Itarsi Junction', state: 'Madhya Pradesh', zone: 'WCR' },
  { code: 'JBP', name: 'Jabalpur Junction', state: 'Madhya Pradesh', zone: 'WCR' },
  { code: 'STA', name: 'Satna Junction', state: 'Madhya Pradesh', zone: 'WCR' },
  { code: 'DDU', name: 'Pt. Deen Dayal Upadhyaya', state: 'Uttar Pradesh', zone: 'ECR' },
  { code: 'GAYA', name: 'Gaya Junction', state: 'Bihar', zone: 'ECR' },
  { code: 'ASN', name: 'Asansol Junction', state: 'West Bengal', zone: 'ER' },
  { code: 'BHP', name: 'Bolpur Shantiniketan', state: 'West Bengal', zone: 'ER' },
  { code: 'MLDT', name: 'Malda Town', state: 'West Bengal', zone: 'ER' },
  { code: 'NJP', name: 'New Jalpaiguri', state: 'West Bengal', zone: 'NFR' },
  { code: 'APDJ', name: 'Alipurduar Junction', state: 'West Bengal', zone: 'NFR' },
  { code: 'KYQ: ', name: 'Kamakhya Junction', state: 'Assam', zone: 'NFR' },
  { code: 'SPJ', name: 'Samastipur Junction', state: 'Bihar', zone: 'ECR' },
  { code: 'MFP', name: 'Muzaffarpur Junction', state: 'Bihar', zone: 'ECR' },
  { code: 'DBG', name: 'Darbhanga Junction', state: 'Bihar', zone: 'ECR' },
  { code: 'BJU', name: 'Barauni Junction', state: 'Bihar', zone: 'ECR' },
  { code: 'BSB', name: 'Varanasi Junction', state: 'Uttar Pradesh', zone: 'NER' },
  { code: 'AY', name: 'Ayodhya Dham', state: 'Uttar Pradesh', zone: 'NR' },
  { code: 'DDN', name: 'Dehradun', state: 'Uttarakhand', zone: 'NR' },
  { code: 'HW', name: 'Haridwar', state: 'Uttarakhand', zone: 'NR' },
  { code: 'KLK', name: 'Kalka', state: 'Haryana', zone: 'NR' },
  { code: 'ASR', name: 'Amritsar Junction', state: 'Punjab', zone: 'NR' },
  { code: 'JUC', name: 'Jalandhar City', state: 'Punjab', zone: 'NR' },
  { code: 'LDH', name: 'Ludhiana Junction', state: 'Punjab', zone: 'NR' },
  { code: 'UMB', name: 'Ambala Cantt', state: 'Haryana', zone: 'NR' }
];

const trainTypes = [
  { name: 'Rajdhani Express', classes: ['3A', '2A', '1A'], baseMultiplier: 1.8 },
  { name: 'Shatabdi Express', classes: ['CC', '1A'], baseMultiplier: 1.6 },
  { name: 'Duronto Express', classes: ['SL', '3A', '2A', '1A'], baseMultiplier: 1.4 },
  { name: 'Vande Bharat', classes: ['CC', '1A'], baseMultiplier: 2.0 },
  { name: 'Humsafar Express', classes: ['3A'], baseMultiplier: 1.3 },
  { name: 'Superfast Express', classes: ['SL', '3A', '2A', '2S'], baseMultiplier: 1.1 },
  { name: 'Garib Rath', classes: ['3A', 'CC'], baseMultiplier: 0.8 },
  { name: 'Mail Express', classes: ['SL', '3A', '2A', '2S'], baseMultiplier: 1.0 },
  { name: 'Jan Shatabdi', classes: ['2S', 'CC'], baseMultiplier: 0.9 }
];

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Helper to generate formatted time
function getRandomTime() {
  const hr = String(Math.floor(Math.random() * 24)).padStart(2, '0');
  const min = String(Math.floor(Math.random() * 12) * 5).padStart(2, '0');
  return `${hr}:${min}`;
}

// Add hours/minutes to time string
function addTime(timeStr, hoursToAdd, minsToAdd = 0) {
  const [hr, min] = timeStr.split(':').map(Number);
  let totalMins = hr * 60 + min + hoursToAdd * 60 + minsToAdd;
  const days = Math.floor(totalMins / 1440);
  totalMins %= 1440;
  const newHr = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const newMin = String(totalMins % 60).padStart(2, '0');
  return { time: `${newHr}:${newMin}`, days };
}

async function seedDB(options = {}) {
  const { disconnect = true } = options;
  if (mongoose.connection.readyState !== 1) {
    console.log('Connecting to database...');
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/train_booking';
    await mongoose.connect(mongoURI);
    console.log(`Connected to database at ${mongoURI}`);
  }

  // Clear existing databases
  console.log('Clearing existing collections...');
  await User.deleteMany({});
  await Station.deleteMany({});
  await Train.deleteMany({});
  await Route.deleteMany({});
  await Schedule.deleteMany({});
  await Booking.deleteMany({});
  await Payment.deleteMany({});
  await Notification.deleteMany({});
  await Review.deleteMany({});

  // Seed Users
  console.log('Seeding users...');
  const defaultUser = new User({
    name: 'Prajwal User',
    email: 'user@example.com',
    password: 'password123',
    phone: '9876543210',
    role: 'user',
    savedTravellers: [
      { name: 'Ramesh Kumar', age: 45, gender: 'Male' },
      { name: 'Sita Kumar', age: 42, gender: 'Female' }
    ]
  });

  const defaultAdmin = new User({
    name: 'System Admin',
    email: 'admin@example.com',
    password: 'password123',
    phone: '9999999999',
    role: 'admin'
  });

  await defaultUser.save();
  await defaultAdmin.save();
  console.log('Admin & user accounts seeded successfully.');

  // Seed Stations
  console.log('Seeding stations...');
  const stations = await Station.insertMany(stationsData);
  console.log(`${stations.length} stations seeded.`);

  // Create mappings
  const stationMap = {};
  stations.forEach(s => {
    stationMap[s.code] = s;
  });

  console.log('Generating 500+ trains and routes...');
  const trainsToInsert = [];
  const routesToInsert = [];

  // Let's create a programmatic generator to build exactly 505 trains
  let trainCount = 0;
  const targetTrainCount = 505;

  // We will loop and pick source and destination pairs, creating routes
  while (trainCount < targetTrainCount) {
    // Pick source and destination randomly
    const srcIndex = Math.floor(Math.random() * stations.length);
    let destIndex = Math.floor(Math.random() * stations.length);
    while (destIndex === srcIndex) {
      destIndex = Math.floor(Math.random() * stations.length);
    }

    const srcStation = stations[srcIndex];
    const destStation = stations[destIndex];

    // Pick 3-6 intermediate stops randomly (excluding src and dest)
    const numStops = 2 + Math.floor(Math.random() * 5); // 2 to 6 intermediate stops
    const intermediateStops = [];
    const usedStops = new Set([srcStation.code, destStation.code]);

    while (intermediateStops.length < numStops) {
      const idx = Math.floor(Math.random() * stations.length);
      const st = stations[idx];
      if (!usedStops.has(st.code)) {
        intermediateStops.push(st);
        usedStops.add(st.code);
      }
    }

    // Sort intermediate stops randomly or logically
    // For simplicity, we just keep them in the order picked
    
    // Choose train type
    const type = trainTypes[Math.floor(Math.random() * trainTypes.length)];
    const trainNum = String(10000 + trainCount + 100);
    const trainName = `${srcStation.name.split(' ')[0]} - ${destStation.name.split(' ')[0]} ${type.name}`;

    // Select runsOn days (at least 2, up to daily)
    const numDays = 2 + Math.floor(Math.random() * 6);
    const runsOn = [];
    const shuffledDays = [...daysOfWeek].sort(() => 0.5 - Math.random());
    for (let i = 0; i < numDays; i++) {
      runsOn.push(shuffledDays[i]);
    }

    // Set base fare multiplier based on train type
    const baseFare = {
      // These are class multipliers consumed by calculateSampleFare, not rupee fares.
      // The shared fare scale converts them to a modest per-kilometre demo estimate.
      SL: 2.5 * type.baseMultiplier,
      '3A': 7 * type.baseMultiplier,
      '2A': 10 * type.baseMultiplier,
      '1A': 15 * type.baseMultiplier,
      'CC': 5 * type.baseMultiplier,
      '2S': 1.5 * type.baseMultiplier
    };

    const trainId = new mongoose.Types.ObjectId();

    const newTrain = {
      _id: trainId,
      trainNumber: trainNum,
      name: trainName,
      source: srcStation._id,
      destination: destStation._id,
      classes: type.classes,
      runsOn: runsOn,
      baseFare: baseFare,
      active: true
    };

    trainsToInsert.push(newTrain);

    // Build Stops for the Route
    const stopsList = [];
    const startTimeStr = getRandomTime();
    
    // Source stop
    stopsList.push({
      station: srcStation._id,
      stopIndex: 0,
      arrivalTime: 'Source',
      departureTime: startTimeStr,
      distanceKm: 0,
      dayNumber: 1
    });

    let currentDay = 1;
    let prevTime = startTimeStr;
    let prevDistance = 0;

    for (let i = 0; i < intermediateStops.length; i++) {
      const stopStation = intermediateStops[i];
      const hoursToNext = 2 + Math.floor(Math.random() * 4); // 2 to 5 hours travel time
      const minsToNext = Math.floor(Math.random() * 12) * 5;
      const distanceInc = hoursToNext * 65 + Math.floor(Math.random() * 20); // avg speed 65 km/h
      
      const arrData = addTime(prevTime, hoursToNext, minsToNext);
      if (arrData.days > 0) currentDay += arrData.days;
      const arrTime = arrData.time;
      
      const depData = addTime(arrTime, 0, 5 + Math.floor(Math.random() * 15)); // 5-20 min stop
      const depTime = depData.time;
      if (depData.days > 0) currentDay += depData.days;

      const stopDistance = prevDistance + distanceInc;

      stopsList.push({
        station: stopStation._id,
        stopIndex: i + 1,
        arrivalTime: arrTime,
        departureTime: depTime,
        distanceKm: stopDistance,
        dayNumber: currentDay
      });

      prevTime = depTime;
      prevDistance = stopDistance;
    }

    // Destination stop
    const finalHours = 2 + Math.floor(Math.random() * 4);
    const finalMins = Math.floor(Math.random() * 12) * 5;
    const finalDistanceInc = finalHours * 65 + Math.floor(Math.random() * 20);
    const finalArrData = addTime(prevTime, finalHours, finalMins);
    if (finalArrData.days > 0) currentDay += finalArrData.days;

    stopsList.push({
      station: destStation._id,
      stopIndex: stopsList.length,
      arrivalTime: finalArrData.time,
      departureTime: 'Destination',
      distanceKm: prevDistance + finalDistanceInc,
      dayNumber: currentDay
    });

    routesToInsert.push({
      train: trainId,
      stops: stopsList
    });

    trainCount++;
  }

  // Insert in chunks
  console.log('Inserting trains into database...');
  await Train.insertMany(trainsToInsert);
  console.log('Inserting routes into database...');
  await Route.insertMany(routesToInsert);
  console.log('Trains and Routes inserted successfully.');

  // Seed a few Reviews for the first 10 trains
  console.log('Seeding reviews...');
  const seededUser = await User.findOne({ role: 'user' });
  const sampleTrains = await Train.find().limit(20);
  const reviews = [];
  const reviewComments = [
    'Very clean and prompt service. The seats were comfortable.',
    'Slight delay, but overall the journey was pleasant. Clean toilets.',
    'Food service was excellent. Bedding provided was neat.',
    'Good speed, reached on time. Dynamic tracking was very helpful.',
    'A bit crowded in Sleeper class, but AC coach was excellent.',
    'Best train on this route. Highly recommended!'
  ];

  for (let i = 0; i < sampleTrains.length; i++) {
    const numReviews = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < numReviews; j++) {
      reviews.push({
        user: seededUser._id,
        train: sampleTrains[i]._id,
        rating: 4 + Math.floor(Math.random() * 2), // 4 or 5 rating
        comment: reviewComments[Math.floor(Math.random() * reviewComments.length)]
      });
    }
  }
  await Review.insertMany(reviews);
  console.log(`${reviews.length} reviews seeded.`);

  console.log('Database seeding completed successfully!');
  if (disconnect) {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedDB().catch(err => {
    console.error('Error seeding database:', err);
    process.exit(1);
  });
}

module.exports = { seedDB };

