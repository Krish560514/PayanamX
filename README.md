# 🚆 PayanamX

### A Smart Train Reservation Demonstration System

PayanamX is a full-stack MERN application that demonstrates a modern train reservation experience. Users can search trains, explore class-specific coach layouts, select their preferred seats and berths, book tickets, and manage reservations through an intuitive interface.

> **Project Notice:** Train timetables and running status are requested from the configured RailRadar API. Train availability, fares, seat inventory, payments, PNRs and tickets remain simulated. Generated tickets are not valid for railway travel and the application is not connected to official IRCTC booking systems.

---

## 📌 About the Project

PayanamX aims to make the train reservation process more interactive by giving passengers control over their coach and exact seat selection.

Unlike basic booking demonstrations that automatically allocate seats, PayanamX allows passengers to visually explore coach layouts and select available seats for each traveller.

The application also provides administrative tools to manage train information, stations, bookings, users and reservation statistics.

## ✨ Key Features

### 👤 Passenger Features
- User registration and secure login using JWT authentication.
- Train search by source, destination and journey date.
- Station autocomplete and route information.
- Train schedules, running days and class availability.
- Train filtering and sorting.
- Visual, class-specific coach layouts.
- Exact coach, seat and berth selection.
- Multiple passenger booking.
- Berth preference guidance.
- Temporary seat holds to prevent double booking.
- Simulated payment and booking confirmation.
- Simulated PNR generation and enquiry.
- Downloadable PDF reservation tickets.
- Booking history and cancellation.
- User profile and saved passengers.
- Favourite trains and routes.
- Notifications and recent searches.

### 🚉 Coach and Seat Selection

The application supports configurable layouts for the following classes:

| Class | Description |
|---|---|
| 1A | AC First Class – Cabins and Coupes |
| 2A | AC Two Tier |
| 3A | AC Three Tier |
| 3E | AC Three Tier Economy |
| SL | Sleeper Class |
| CC | AC Chair Car |
| 2S | Second Sitting |

Sleeper coaches display berth types such as Lower, Middle, Upper, Side Lower and Side Upper where applicable. Chair-car layouts display numbered seats instead of sleeping berths.

### 🛏️ Lower Berth Guidance

The application provides a configurable lower-berth recommendation order:

1. Eligible aged passengers
2. Women passengers
3. Other passengers

This is application-level guidance, not an official railway quota. Passenger-selected available seats are never silently reassigned.

### 🔐 Booking Safety
- Temporary seat holds with expiry.
- Atomic seat inventory updates.
- Prevention of simultaneous booking of the same seat.
- Multi-seat hold rollback on failure.
- Booking confirmation linked to selected passengers and seats.
- Seat release after eligible cancellation.

### 🛠️ Administrator Features
- Train and station management.
- Coach and route configuration.
- Booking and passenger management.
- User management.
- Occupancy and class statistics.
- Booking analytics.
- Audit history.
- CSV reports.

---

## 🏗️ Technology Stack

| Technology | Purpose |
|---|---|
| React 18 | Frontend development |
| Vite | Frontend build tool |
| Tailwind CSS | UI styling |
| React Router | Navigation |
| Axios | API communication |
| Node.js | Backend runtime |
| Express.js | REST API |
| MongoDB | Database |
| Mongoose | Database modelling |
| JWT | Authentication |
| PDFKit | PDF ticket generation |
| Lucide React | Icons |

---

## 📂 Project Structure

```text
rail-yatra/
│
├── backend/
│   ├── scripts/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── test/
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── utils/
│   ├── test/
│   └── package.json
│
├── docs/
├── .gitignore
├── package-lock.json
└── README.md
```

---

## ⚙️ Installation and Setup

### Prerequisites

Install the following:

- Node.js 18 or later
- MongoDB Community Server
- Git
- Visual Studio Code (recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/BhuvaneshP63/payanamx.git
```

```bash
cd payanamx
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/train_booking
JWT_SECRET=your_strong_secret_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

Add optional provider or email configuration only when required. Refer to `.env.example` for the project's supported variables.

Start the backend:

```bash
npm run dev
```

Backend runs at:

`http://localhost:5000`

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

`http://localhost:5173`

### 4. Add Sample Train Data

From the backend directory:

```bash
npm run seed:sample
```

This script adds missing sample stations, trains and routes while preserving existing records.

**Important:** Avoid running the legacy seed script against a database containing data you want to preserve.

---

## 🔄 Application Workflow

1. Register or log in.
2. Enter source, destination and journey date.
3. Search and compare available sample trains.
4. Select a train and travel class.
5. Explore the visual coach layout.
6. Select an exact available seat or berth for each passenger.
7. Enter passenger details and review the fare.
8. Complete the simulated payment process.
9. Receive booking confirmation and a simulated PNR.
10. Download the PDF ticket or manage the booking.

---

## 🧩 System Architecture

```text
       REACT FRONTEND
              |
              | Axios API Requests
              |
       EXPRESS REST API
              |
       JWT Authentication
              |
       Controllers & Services
              |
          MONGOOSE
              |
          MONGODB
```

### Train Data Integration

The application uses RailRadar for train search, timetable details and live running status by default. Add a valid API key to the backend environment. If the API key is missing or the provider cannot be reached, the app returns an error instead of showing sample trains.

External timetable information is kept separate from locally managed coach inventory, seat availability, fares and reservations.

To enable the optional provider, configure the relevant environment variables:

```env
TRAIN_DATA_PROVIDER=railradar
RAILRADAR_API_KEY=your_api_key
```

RailRadar API reference: [trains between stations](https://railradar.in/docs/trains-between-stations) and [live running status](https://railradar.in/docs/live-train-status). Provider access, API coverage and credentials must be verified separately. Real-time tracking refreshes every 30 seconds while the tracker page is open.

---

## 🧪 Testing and Verification

The following verification results were recorded on 1 November 2026:

| Test | Result |
|---|---|
| Frontend unit tests | 4 passed |
| Backend unit tests | 24 passed |
| Frontend production build | Passed |
| Booking lifecycle smoke test | Passed |

### Verified Areas
- Coach layouts and capacities.
- Train composition and sample train data.
- Fare calculation and validation.
- Lower-berth recommendation guidance.
- Atomic seat holds and concurrent booking protection.
- Exact seat persistence.
- Simulated PNR generation.
- PDF ticket generation.
- Booking cancellation and seat release.

The booking lifecycle smoke test was performed against a dedicated test database.

---

## ⚠️ Limitations

- Live train search and running status require a configured RailRadar API key and provider availability.
- Seat availability and coach inventory are simulated.
- Fare calculations are project estimates, not official railway fares.
- Payment processing is simulated.
- PNR numbers are generated by the application and are not official railway PNRs.
- Generated PDF tickets are demonstration documents and cannot be used for travel.
- The application is not connected to IRCTC's official reservation or payment systems.

---

## 🚀 Future Enhancements

- Verified live railway timetable integration.
- Real-time train running status integration.
- Deployment to cloud infrastructure.
- Enhanced responsive design and accessibility.
- Expanded automated testing.
- Production monitoring, backups and recovery.
- Authorized payment integration, if available.

---

## 👨‍💻 Project Information

**Project Name:** PayanamX  
**Project Type:** Full-Stack Web Application  
**Domain:** Railway Reservation System  
**Technology:** MERN Stack  
**Repository:** [GitHub – PayanamX](https://github.com/BhuvaneshP63/payanamx)

---

## 📜 License

This project is developed for educational and demonstration purposes. Add a license before permitting reuse or redistribution.

---

**PayanamX – Making Train Reservations More Interactive! 🚆**
