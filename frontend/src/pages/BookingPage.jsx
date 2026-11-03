import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookingContext } from '../context/BookingContext';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, Trash2, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { getLowerBerthPriority } from '../utils/lowerBerthPriority';

export default function BookingPage() {
  const navigate = useNavigate();
  const { searchParams, selectedTrain, selectedClass, resetBookingFlow } = useContext(BookingContext);
  const { user, token } = useContext(AuthContext);

  const [passengers, setPassengers] = useState(
    Array.from({ length: searchParams.passengerCount || 1 }, (_, index) => user?.savedTravellers?.[index] || ({ name: '', age: '', gender: 'Male' }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [coaches, setCoaches] = useState([]);
  const [activeCoach, setActiveCoach] = useState('');
  const [coachSeats, setCoachSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [activePassengerIndex, setActivePassengerIndex] = useState(0);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [holdMinutes, setHoldMinutes] = useState(8);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(null);
  const [showBookingReview, setShowBookingReview] = useState(false);

  // Mock Payment UI State
  const [mockPaymentData, setMockPaymentData] = useState(null);
  const [mockMethod, setMockMethod] = useState('UPI');
  const [mockProcessing, setMockProcessing] = useState(false);

  useEffect(() => {
    if (!holdExpiresAt) { setHoldSecondsLeft(null); return undefined; }
    const updateCountdown = () => setHoldSecondsLeft(Math.max(0, Math.ceil((new Date(holdExpiresAt).getTime() - Date.now()) / 1000)));
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [holdExpiresAt]);

  useEffect(() => {
    if (!selectedTrain || !user) {
      navigate('/');
    }
  }, [selectedTrain, user, navigate]);

  useEffect(() => {
    if (!selectedTrain || !selectedClass || !searchParams.date) return;
    axios.get('/api/bookings/coaches', { params: { trainId: selectedTrain.trainId, date: searchParams.date, seatClass: selectedClass } })
      .then(({ data }) => { setCoaches(data.coaches || []); setHoldMinutes(data.holdMinutes || 8); setActiveCoach(data.coaches?.[0]?.coach || ''); })
      .catch(err => setError(err.response?.data?.message || 'Could not load sample coach inventory.'));
  }, [selectedTrain, selectedClass, searchParams.date]);

  useEffect(() => {
    if (!activeCoach || !selectedTrain) return;
    setLoadingSeats(true);
    setSelectedSeats([]);
    axios.get(`/api/bookings/coaches/${encodeURIComponent(activeCoach)}/seats`, { params: { trainId: selectedTrain.trainId, date: searchParams.date, seatClass: selectedClass } })
      .then(({ data }) => setCoachSeats(data.seats || []))
      .catch(err => setError(err.response?.data?.message || 'Could not load coach layout.'))
      .finally(() => setLoadingSeats(false));
  }, [activeCoach, selectedTrain, selectedClass, searchParams.date]);

  if (!selectedTrain) return null;

  const farePerPassenger = selectedTrain.classDetails[selectedClass].fare;
  const totalFare = farePerPassenger * passengers.length;
  const seniorCitizenAge = Number(import.meta.env.VITE_SENIOR_CITIZEN_AGE) || 60;
  const { recommendLowerForActive, maleLowerBerthSelections, guidance: lowerBerthGuidance } = getLowerBerthPriority({
    passengers, selectedSeats, coachSeats, activePassengerIndex, seniorCitizenAge
  });
  const isChairClass = selectedClass === 'CC' || selectedClass === '2S';
  const berthGroups = [];
  const groupedSeats = new Map();
  coachSeats.forEach(seat => {
    const key = seat.layoutUnit || (isChairClass ? `Row ${Math.ceil(seat.seatNumber / 6)}` : `Bay ${Math.ceil(seat.seatNumber / 8)}`);
    if (!groupedSeats.has(key)) groupedSeats.set(key, []);
    groupedSeats.get(key).push(seat);
  });
  groupedSeats.forEach((seats, name) => berthGroups.push({ name, type: seats[0].compartmentType, seats }));

  const handlePassengerChange = (index, field, value) => {
    const newPass = [...passengers];
    newPass[index][field] = value;
    setPassengers(newPass);
  };

  const handleSeatSelect = (seatNumber) => {
    setSelectedSeats(current => {
      const next = Array.from({ length: passengers.length }, (_, index) => current[index] ?? null);
      const existingPassengerIndex = next.indexOf(seatNumber);
      if (next[activePassengerIndex] === seatNumber) next[activePassengerIndex] = null;
      else {
        if (existingPassengerIndex >= 0) next[existingPassengerIndex] = null;
        next[activePassengerIndex] = seatNumber;
      }
      return next;
    });
  };

  const addPassenger = () => {
    if (passengers.length >= 6) {
      return setError('Maximum 6 passengers allowed per booking');
    }
    setPassengers([...passengers, { name: '', age: '', gender: 'Male' }]);
    setSelectedSeats(current => [...current, null]);
  };

  const renderSeatButton = seat => {
    const chosen = selectedSeats[activePassengerIndex] === seat.seatNumber;
    const assignedIndex = selectedSeats.findIndex((number, index) => index !== activePassengerIndex && number === seat.seatNumber);
    const assignedElsewhere = assignedIndex >= 0;
    const disabled = seat.status !== 'AVAILABLE' && !chosen;
    const recommended = !isChairClass && seat.seatType === 'LB' && !chosen && recommendLowerForActive;
    const statusLabel = chosen ? `Selected for Passenger ${activePassengerIndex + 1}` : assignedElsewhere ? `Assigned to Passenger ${assignedIndex + 1}` : seat.status === 'AVAILABLE' ? 'Available' : seat.status === 'HELD' ? 'Temporarily held' : 'Booked';
    return <button type="button" key={seat.seatNumber} disabled={disabled} onClick={() => handleSeatSelect(seat.seatNumber)}
      aria-label={`${seat.seatType} ${seat.seatNumber}, ${statusLabel}${recommended ? ', recommended lower berth' : ''}`}
      title={`${seat.seatType} · seat ${seat.seatNumber} · ${statusLabel}`}
      className={`min-h-11 min-w-11 sm:min-h-14 sm:min-w-14 rounded-lg border text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 ${chosen ? 'bg-[#6d28d9] border-[#6d28d9] text-white' : disabled && seat.status === 'HELD' ? 'bg-amber-100 border-amber-300 text-amber-950 cursor-not-allowed' : disabled ? 'bg-slate-200 border-slate-300 text-slate-700 cursor-not-allowed' : assignedElsewhere ? 'bg-blue-50 border-blue-300 text-blue-950' : recommended ? 'bg-violet-50 border-violet-400 text-violet-950 hover:bg-violet-100' : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-100'}`}>
      {seat.seatNumber}<span className="block text-[9px] font-normal">{seat.seatType}{recommended ? ' ★' : assignedElsewhere ? ` P${assignedIndex + 1}` : ''}</span>
    </button>;
  };

  const removePassenger = (index) => {
    if (passengers.length === 1) return;
    const newPass = [...passengers];
    newPass.splice(index, 1);
    setPassengers(newPass);
    setSelectedSeats(current => { const next = [...current]; next.splice(index, 1); return next; });
    setActivePassengerIndex(current => Math.max(0, Math.min(current > index ? current - 1 : current, newPass.length - 1)));
    setError('');
  };

  const initializeRazorpay = (orderData) => {
    return new Promise((resolve) => {
      setMockPaymentData({ orderData, resolve });
    });
  };

  const handleReviewBooking = () => {
    // Validate
    if (passengers.some(p => !p.name?.trim() || !Number.isInteger(Number(p.age)) || Number(p.age) < 1 || Number(p.age) > 120 || !['Male', 'Female', 'Other'].includes(p.gender))) {
      return setError('Enter a valid name, age, and gender for every passenger.');
    }
    if (selectedSeats.filter(Number.isInteger).length !== passengers.length) return setError(`Select one available seat for each of the ${passengers.length} passengers.`);
    if (new Set(selectedSeats).size !== passengers.length) return setError('Each passenger must have a different seat.');
    setError('');
    setShowBookingReview(true);
  };

  const handleCheckout = async () => {
    setShowBookingReview(false);
    setSubmitting(true);
    let holdId = null;

    try {
      const held = await axios.post('/api/bookings/hold', {
        trainId: selectedTrain.trainId, date: searchParams.date, seatClass: selectedClass,
        coach: activeCoach, seatNumbers: selectedSeats
      });
      holdId = held.data.holdId;
      setHoldExpiresAt(held.data.expiresAt);
      // 1. Create pending reservation for the exact seats selected by the user
      const orderRes = await axios.post('/api/bookings/create', {
        trainId: selectedTrain.trainId,
        date: searchParams.date,
        seatClass: selectedClass,
        fromStation: selectedTrain.boardingStation.id,
        toStation: selectedTrain.deboardingStation.id,
        boardingStation: selectedTrain.boardingStation.id,
        passengers,
        holdId,
        seats: selectedSeats.map(seatNumber => ({ coach: activeCoach, seatNumber }))
      });

      const orderData = orderRes.data.booking;

      // 2. Open Razorpay or Mock Overlay
      const paymentResult = await initializeRazorpay(orderData);

      if (!paymentResult.success) {
        await axios.post(`/api/bookings/hold/${holdId}/release`);
        holdId = null;
        setHoldExpiresAt(null);
        setSubmitting(false);
        return setError(paymentResult.message || 'Payment failed or was cancelled');
      }

      // 3. Verify Payment & Allocate Seats
      const verifyRes = await axios.post('/api/bookings/verify', {
        bookingId: orderData.id,
        paymentId: paymentResult.paymentId,
        orderId: paymentResult.orderId,
        signature: paymentResult.signature,
        method: paymentResult.orderId.startsWith('order_mock_') ? 'Mock' : 'Razorpay'
      });

      if (verifyRes.data.success) {
        // Booking successful!
        holdId = null;
        setHoldExpiresAt(null);
        resetBookingFlow();
        navigate(`/booking/confirmation/${verifyRes.data.booking._id || verifyRes.data.booking.id}`, { state: { bookingSuccess: true, pnr: verifyRes.data.booking.pnr } });
      } else {
        throw new Error('The simulated reservation could not be confirmed.');
      }

    } catch (err) {
      if (holdId) {
        try { await axios.post(`/api/bookings/hold/${holdId}/release`); } catch { /* the hold may already have expired or been committed */ }
      }
      setHoldExpiresAt(null);
      setError(err.response?.data?.message || 'Checkout failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center space-x-2 mb-6">
           <button onClick={() => navigate('/search')} className="text-slate-500 hover:text-[#6d28d9] font-medium text-sm">
             Back to Search Results
           </button>
        </div>

        <div className="mb-7 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <ol className="grid grid-cols-3 gap-3 text-xs sm:text-sm" aria-label="Booking progress">
            {[['01', 'Choose train', true], ['02', 'Select seats', true], ['03', 'Review & pay', false]].map(([number, label, complete]) => (
              <li key={number} className={`flex items-center gap-2 font-semibold ${complete ? 'text-violet-800' : 'text-slate-400'}`}>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] ${complete ? 'bg-violet-100 text-violet-800' : 'bg-slate-100 text-slate-500'}`}>{number}</span>
                <span>{label}</span>
                {number !== '03' && <span className="ml-auto hidden h-px flex-1 bg-slate-200 sm:block" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content: Passenger Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Train Summary Strip */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row justify-between md:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedTrain.name} ({selectedTrain.trainNumber})</h2>
                <div className="text-sm text-slate-500 mt-1 flex space-x-2">
                  <span>{selectedTrain.boardingStation.departureTime}</span>
                  <span>→</span>
                  <span>{selectedTrain.deboardingStation.arrivalTime}</span>
                  <span>|</span>
                  <span>{searchParams.date}</span>
                </div>
              </div>
              <div className="mt-4 md:mt-0 text-right">
                <div className="text-lg font-bold text-[#6d28d9]">{selectedClass} Class</div>
                <div className="text-xs font-semibold text-violet-600">Available: {selectedTrain.classDetails[selectedClass].availableSeats}</div>
              </div>
            </div>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-800">Choose your coach and seats</h3>
                <p className="text-xs text-slate-500 mt-1">Sample inventory · seats are held for {holdMinutes} minutes at checkout. This is not live railway availability.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {coaches.map(c => <button key={c.coach} type="button" onClick={() => setActiveCoach(c.coach)} className={`rounded-xl border px-4 py-2 text-sm ${activeCoach === c.coach ? 'border-[#6d28d9] bg-violet-50 text-[#6d28d9]' : 'border-slate-200'}`}>
                    <strong>{c.coach}</strong><span className="ml-2 text-xs">{c.available}/{c.total} free</span>
                  </button>)}
                </div>
              </div>
              <div className="p-5">
                <div className="mb-4 flex flex-wrap gap-2 text-xs" aria-label="Seat status legend">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-slate-700"><span className="h-2.5 w-2.5 rounded-sm border border-slate-400 bg-white" /> Available</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 font-semibold text-violet-900"><span className="h-2.5 w-2.5 rounded-sm bg-violet-700" /> Selected</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-900"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Assigned in this booking</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-950"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Temporarily held</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700"><span className="h-2.5 w-2.5 rounded-sm bg-slate-400" /> Booked</span>
                  {!isChairClass && <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-violet-900">★ Lower berth recommendation</span>}
                </div>
                <p className="text-xs text-slate-500 mb-4">{lowerBerthGuidance} This is application guidance, not an official railway quota.</p>
                {maleLowerBerthSelections.map(({ passengerIndex, seatNumber }) => <div key={`${passengerIndex}-${seatNumber}`} role="status" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  Priority reminder: Passenger {passengerIndex + 1}{passengers[passengerIndex]?.name ? ` (${passengers[passengerIndex].name})` : ''} selected lower berth {seatNumber}. This choice is allowed and will remain selected; you can continue booking. Lower berth recommendations for other passengers remain Priority 1: eligible aged passengers, Priority 2: women.
                </div>)}
                <div className="flex flex-wrap gap-2 mb-4" aria-label="Choose passenger to assign a seat">
                  {passengers.map((passenger, index) => <button type="button" key={index} onClick={() => setActivePassengerIndex(index)} className={`rounded-xl border px-3 py-2 text-xs ${activePassengerIndex === index ? 'border-[#6d28d9] bg-violet-50 text-[#6d28d9]' : 'border-slate-200 text-slate-600'}`}>
                    Passenger {index + 1}{passenger.name ? ` · ${passenger.name}` : ''}{Number.isInteger(selectedSeats[index]) ? ` · Seat ${selectedSeats[index]}` : ' · choose seat'}
                  </button>)}
                </div>
                {loadingSeats ? <p className="py-8 text-center text-slate-500">Loading coach layout…</p> : <div className="border-2 border-slate-200 rounded-2xl p-4 overflow-x-auto">
                  <div className="text-[10px] uppercase text-slate-400 mb-3">Coach entrance · choose a seat for Passenger {activePassengerIndex + 1} in {activeCoach}</div>
                  <div className="flex flex-wrap gap-3 min-w-[280px]">
                    {berthGroups.map(group => <div key={group.name} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <div className="text-[9px] text-slate-400 uppercase mb-2">{group.name}{group.type ? ` · ${group.type}` : ''}</div>
                      {group.type === 'Chair row' ? <div className="grid grid-cols-6 gap-1.5" aria-label={`${group.name} seating row`}>{group.seats.map(renderSeatButton)}</div>
                        : group.type === 'Berth bay' ? <div className="flex items-stretch gap-3"><div className="grid grid-cols-3 gap-1.5" aria-label="Main berths arranged by tier">{group.seats.filter(seat => !['SLB', 'SUB'].includes(seat.seatType)).map(renderSeatButton)}</div><div className="border-l border-dashed border-slate-300" aria-hidden="true" /><div className="flex flex-col justify-center gap-1.5" aria-label="Side berths">{group.seats.filter(seat => ['SLB', 'SUB'].includes(seat.seatType)).map(renderSeatButton)}</div></div>
                          : <div className="grid grid-cols-2 gap-1.5" aria-label={`${group.name} berth layout`}>{group.seats.map(renderSeatButton)}</div>}
                    </div>)}
                  </div>
                </div>}
                <p className="text-sm mt-3 text-slate-600">Selected: {selectedSeats.filter(Number.isInteger).length}/{passengers.length}</p>
                {passengers.map((passenger, index) => Number.isInteger(selectedSeats[index]) && <p key={index} className="text-xs text-slate-500">Passenger {index + 1}{passenger.name ? ` (${passenger.name})` : ''}: {activeCoach} · {selectedSeats[index]} · {coachSeats.find(s => s.seatNumber === selectedSeats[index])?.seatType}</p>)}
              </div>
            </section>

            {error && (
              <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 font-medium">
                {error}
              </div>
            )}

            {/* Passenger Forms */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Passenger Details</h3>
                <span className="text-xs font-medium text-slate-500">{passengers.length}/6 Passengers</span>
              </div>
              
              <div className="p-5 space-y-6">
                {passengers.map((p, index) => (
                  <div key={index} className="pb-6 border-b border-slate-100 last:border-0 last:pb-0 relative">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Passenger {index + 1}</h4>
                      <div className="flex items-center gap-3">
                        {user.savedTravellers?.length > 0 && <select aria-label={`Use saved passenger for passenger ${index + 1}`} className="rounded border border-slate-200 p-1.5 text-xs" value="" onChange={e => {
                          if (e.target.value === 'clear') { setPassengers(current => current.map((item, i) => i === index ? { ...item, name: '', age: '', gender: 'Male' } : item)); return; }
                          const saved = user.savedTravellers[Number(e.target.value)];
                          if (saved) setPassengers(current => current.map((item, i) => i === index ? { ...item, name: saved.name, age: saved.age, gender: saved.gender } : item));
                        }}><option value="">Use saved passenger…</option>{user.savedTravellers.map((saved, savedIndex) => <option key={savedIndex} value={savedIndex}>{saved.name}</option>)}<option value="clear">Clear passenger</option></select>}
                        {passengers.length > 1 && <button onClick={() => removePassenger(index)} className="text-red-400 hover:text-red-600" aria-label={`Remove passenger ${index + 1}`}><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-6">
                        <label htmlFor={`passenger-${index}-name`} className="sr-only">Passenger {index + 1} full name</label>
                        <input 
                          id={`passenger-${index}-name`}
                          type="text" 
                          placeholder="Full Name" 
                          className="form-input" 
                          maxLength="100"
                          value={p.name}
                          onChange={(e) => handlePassengerChange(index, 'name', e.target.value)}
                          required
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label htmlFor={`passenger-${index}-age`} className="sr-only">Passenger {index + 1} age</label>
                        <input 
                          id={`passenger-${index}-age`}
                          type="number" 
                          placeholder="Age" 
                          className="form-input" 
                          min="1" max="120"
                          value={p.age}
                          onChange={(e) => handlePassengerChange(index, 'age', e.target.value)}
                          required
                        />
                      </div>
                      {!['CC', '2S'].includes(selectedClass) && <div className="md:col-span-12">
                        <label htmlFor={`passenger-${index}-berth`} className="text-xs text-slate-600">Berth preference (guidance only)</label>
                        <select id={`passenger-${index}-berth`} className="form-input" value={p.preferredBerth || 'No preference'} onChange={(e) => handlePassengerChange(index, 'preferredBerth', e.target.value)}>
                          <option>No preference</option><option>Lower Berth</option><option>Middle Berth</option><option>Upper Berth</option><option>Side Lower Berth</option><option>Side Upper Berth</option>
                        </select>
                      </div>}
                      <div className="md:col-span-3">
                        <label htmlFor={`passenger-${index}-gender`} className="sr-only">Passenger {index + 1} gender</label>
                        <select 
                          id={`passenger-${index}-gender`}
                          className="form-input"
                          value={p.gender}
                          onChange={(e) => handlePassengerChange(index, 'gender', e.target.value)}
                        >
                          <option>Male</option>
                          <option>Female</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {passengers.length < 6 && (
                  <button 
                    onClick={addPassenger}
                    className="flex items-center space-x-2 text-[#6d28d9] font-semibold text-sm hover:underline"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Add Passenger</span>
                  </button>
                )}
              </div>
            </div>

            {/* Contact Details (Readonly from User Profile) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">Contact Details</h3>
                <p className="text-xs text-slate-500 mt-1">Ticket PDF will be sent to this email address</p>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email</label>
                  <div className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100">{user.email}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mobile</label>
                  <div className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-100">{user.phone || 'Not provided'}</div>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar: Fare Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 sticky top-24">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-800">Booking summary</h3>
              </div>
              
              <div className="p-5 space-y-4 text-sm">
                <div className="rounded-xl bg-violet-50 p-3">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-violet-950">Passenger seats</h4>
                  {passengers.map((passenger, index) => {
                    const seat = coachSeats.find(item => item.seatNumber === selectedSeats[index]);
                    return <div key={`summary-${index}`} className="flex items-start justify-between gap-2 border-b border-violet-100 py-2 last:border-0 last:pb-0 text-xs"><span className="min-w-0 truncate text-violet-950">{passenger.name || `Passenger ${index + 1}`}</span><span className="shrink-0 font-semibold text-violet-950">{Number.isInteger(selectedSeats[index]) ? `${activeCoach}/${selectedSeats[index]} · ${seat?.seatType || 'Seat'}` : 'Seat pending'}</span></div>;
                  })}
                </div>
                <div className="flex justify-between text-slate-600"><span>Sample fare per passenger</span><span className="font-medium">₹{farePerPassenger}</span></div>
                <div className="flex justify-between text-slate-600">
                  <span>Base Fare ({passengers.length} x ₹{farePerPassenger})</span>
                  <span className="font-medium">₹{totalFare}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Convenience Fee</span>
                  <span className="font-medium">₹0</span>
                </div>
                
                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                  <span className="font-bold text-slate-800">Total Amount</span>
                  <span className="text-2xl font-bold text-[#6d28d9]">₹{totalFare}</span>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-b-xl border-t border-slate-100">
                <button 
                  onClick={handleReviewBooking}
                  disabled={submitting}
                  className="btn-primary w-full h-12 flex items-center justify-center space-x-2 text-lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Review Booking</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
      <div className="mt-4 flex items-center justify-center space-x-1.5 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-violet-500" />
                  <span>Simulated payment only · no charge is made</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      {showBookingReview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
        <section role="dialog" aria-modal="true" aria-labelledby="booking-review-title" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white p-5">
            <div><h3 id="booking-review-title" className="text-xl font-bold text-slate-800">Review your booking</h3><p className="mt-1 text-xs text-slate-500">Check every passenger and selected seat before continuing.</p></div>
            <button type="button" onClick={() => setShowBookingReview(false)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Edit</button>
          </div>
          <div className="space-y-5 p-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="font-bold text-slate-800">{selectedTrain.name} · {selectedTrain.trainNumber}</h4>
              <p className="mt-1 text-sm text-slate-600">{selectedTrain.boardingStation.name || selectedTrain.boardingStation.code} {selectedTrain.boardingStation.departureTime} → {selectedTrain.deboardingStation.name || selectedTrain.deboardingStation.code} {selectedTrain.deboardingStation.arrivalTime}</p>
              <p className="mt-1 text-xs text-slate-500">{searchParams.date} · {selectedClass} · Coach {activeCoach} · Sample reservation</p>
            </div>
            <div>
              <h4 className="mb-2 font-bold text-slate-800">Passengers and selected seats</h4>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {passengers.map((passenger, index) => {
                  const seat = coachSeats.find(item => item.seatNumber === selectedSeats[index]);
                  return <div key={`${index}-${selectedSeats[index]}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="font-medium text-slate-800">{passenger.name} <span className="font-normal text-slate-500">· Age {passenger.age} · {passenger.gender}</span></span>
                    <span className="text-slate-700">{activeCoach} · {selectedSeats[index]} · {seat?.seatType || 'Seat'}</span>
                  </div>;
                })}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex justify-between text-sm text-slate-600"><span>Sample fare ({passengers.length} × ₹{farePerPassenger})</span><span>₹{totalFare}</span></div>
              <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 font-bold text-slate-800"><span>Total simulated amount</span><span className="text-lg text-[#6d28d9]">₹{totalFare}</span></div>
            </div>
            <p className="text-xs text-amber-800">This is a simulated project reservation. No real payment or railway ticket is issued. Seats are held for up to {holdMinutes} minutes after you continue; if the hold expires, you must select available seats again.</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowBookingReview(false)} className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back and edit</button>
              <button type="button" onClick={handleCheckout} disabled={submitting} className="btn-primary flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold disabled:opacity-60">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <>Confirm and continue to simulated payment <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
        </section>
      </div>}
      {/* Mock Payment Modal */}
      {mockPaymentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-premium w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Simulated Checkout</h3>
              <div className="text-sm font-semibold text-slate-500">Demo only · no real payment</div>
            </div>
            <div className="p-6">
              {holdSecondsLeft !== null && <div role="status" aria-live="polite" className={`mb-4 rounded-xl border p-3 text-sm ${holdSecondsLeft > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
                {holdSecondsLeft > 0 ? `Seat hold expires in ${String(Math.floor(holdSecondsLeft / 60)).padStart(2, '0')}:${String(holdSecondsLeft % 60).padStart(2, '0')}.` : 'Your seat hold has expired. Cancel this checkout and select available seats again.'}
              </div>}
              <div className="flex justify-between items-center mb-6 p-4 bg-red-50 rounded-lg border border-red-100">
                <span className="font-semibold text-slate-700">Total Amount</span>
                <span className="text-2xl font-bold text-[#6d28d9]">₹{totalFare}</span>
              </div>
              
              <h4 className="font-bold text-slate-700 mb-3">Select Payment Method</h4>
              <div className="mb-6 space-y-3">
                <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition ${mockMethod === 'UPI' ? 'border-[#6d28d9] bg-violet-50' : 'hover:bg-slate-50 border-slate-200'}`}>
                  <input type="radio" name="method" checked={mockMethod === 'UPI'} onChange={() => setMockMethod('UPI')} className="mr-3 text-[#6d28d9] accent-[#6d28d9] w-4 h-4" />
                  <span className="font-semibold text-slate-800">UPI (GPay, PhonePe, Paytm)</span>
                </label>
                <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition ${mockMethod === 'Card' ? 'border-[#6d28d9] bg-violet-50' : 'hover:bg-slate-50 border-slate-200'}`}>
                  <input type="radio" name="method" checked={mockMethod === 'Card'} onChange={() => setMockMethod('Card')} className="mr-3 text-[#6d28d9] accent-[#6d28d9] w-4 h-4" />
                  <span className="font-semibold text-slate-800">Credit / Debit Card</span>
                </label>
                <label className={`flex items-center p-3 border rounded-xl cursor-pointer transition ${mockMethod === 'NetBanking' ? 'border-[#6d28d9] bg-violet-50' : 'hover:bg-slate-50 border-slate-200'}`}>
                  <input type="radio" name="method" checked={mockMethod === 'NetBanking'} onChange={() => setMockMethod('NetBanking')} className="mr-3 text-[#6d28d9] accent-[#6d28d9] w-4 h-4" />
                  <span className="font-semibold text-slate-800">Net Banking</span>
                </label>
              </div>
              
              <button 
                disabled={mockProcessing || holdSecondsLeft === 0}
                onClick={() => {
                  setMockProcessing(true);
                  setTimeout(() => {
                    mockPaymentData.resolve({
                      success: true,
                      paymentId: 'pay_mock_' + Math.floor(Math.random()*1000000),
                      orderId: mockPaymentData.orderData.razorpayOrderId,
                      signature: 'mock_sig'
                    });
                    setMockPaymentData(null);
                    setMockProcessing(false);
                  }, 2500);
                }}
                className="btn-primary w-full py-3 flex justify-center items-center text-lg shadow-md"
              >
                {mockProcessing ? <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Processing Payment...</> : `Pay ₹${totalFare} Securely`}
              </button>
              
              <button 
                disabled={mockProcessing}
                onClick={() => {
                  mockPaymentData.resolve({ success: false, message: 'Payment cancelled by user' });
                  setMockPaymentData(null);
                }}
                className="w-full mt-3 py-2 text-slate-500 font-semibold hover:text-slate-800 transition disabled:opacity-50"
              >
                Cancel Transaction
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

