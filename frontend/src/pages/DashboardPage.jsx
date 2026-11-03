import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import confetti from 'canvas-confetti';
import { AuthContext } from '../context/AuthContext';
import { Download, XCircle, Search, Clock, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';

export default function DashboardPage() {
  const { user, token } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [pnrSearch, setPnrSearch] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [bookingQuery, setBookingQuery] = useState('');
  const [journeyFrom, setJourneyFrom] = useState('');
  const [journeyTo, setJourneyTo] = useState('');
  const [cancellationTarget, setCancellationTarget] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [notificationQuery, setNotificationQuery] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (location.state?.bookingSuccess) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6d28d9', '#10B981', '#3B82F6']
      });
      // Clear state so refresh doesn't trigger confetti again
      window.history.replaceState({}, document.title);
    }

    fetchBookings();
  }, [token, navigate, location.state]);

  const fetchBookings = async () => {
    try {
      const [res, noticeRes] = await Promise.all([api.get('/api/bookings/history'), api.get('/api/auth/notifications')]);
      setBookings(res.data.bookings);
      setNotifications(noticeRes.data.notifications || []);
    } catch (err) {
      setError('Failed to load booking history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id, pnr) => {
    try {
      const res = await api.get(`/api/bookings/${id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ticket_PNR_${pnr}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download ticket. Please try again.');
    }
  };

  const handleCancel = async (booking) => {
    setCancellationTarget(null);
    setError('');
    setActionMessage('');
    setCancellingId(booking._id);
    try {
      const res = await api.post(`/api/bookings/${booking._id}/cancel`);
      if (res.data.success) {
        setActionMessage(`Simulated reservation cancelled. Estimated refund recorded: ₹${res.data.refundDetails.refundAmount}.`);
        fetchBookings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const handlePnrSearch = (e) => {
    e.preventDefault();
    if (pnrSearch.length === 10) {
      setError('');
      navigate(`/pnr?query=${pnrSearch}`);
    } else {
      setError('Simulated PNRs must contain exactly 10 digits.');
    }
  };

  const markNotificationRead = async (notification) => {
    try {
      await api.put(`/api/auth/notifications/${notification._id}/read`);
      setNotifications(current => current.map(item => item._id === notification._id ? { ...item, read: true } : item));
    } catch (err) { setError(err.response?.data?.message || 'Could not update notification.'); }
  };

  const getStatusBadge = (status) => {
    if (status === 'Confirmed') return <span className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-bold rounded flex items-center"><CheckCircle2 className="w-3 h-3 mr-1"/> CNF</span>;
    if (status === 'Cancelled') return <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded flex items-center"><XCircle className="w-3 h-3 mr-1"/> CANCELLED</span>;
    return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded">{status}</span>;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#6d28d9]" /></div>;
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcomingBookings = bookings.filter(b => b.status === 'Confirmed' && new Date(`${b.date}T00:00:00`) >= today);
  const completedBookings = bookings.filter(b => b.status === 'Confirmed' && new Date(`${b.date}T00:00:00`) < today);
  const cancelledBookings = bookings.filter(b => b.status === 'Cancelled');
  const historyRows = historyFilter === 'completed' ? completedBookings : historyFilter === 'cancelled' ? cancelledBookings : [...completedBookings, ...cancelledBookings];
  const matchesQuery = booking => (!journeyFrom || booking.date >= journeyFrom) && (!journeyTo || booking.date <= journeyTo) && (!bookingQuery.trim() || [booking.pnr, booking.train?.name, booking.train?.trainNumber, booking.source?.code, booking.destination?.code].some(value => String(value || '').toLowerCase().includes(bookingQuery.trim().toLowerCase())));
  const visibleUpcomingBookings = upcomingBookings.filter(matchesQuery).sort((a, b) => a.date.localeCompare(b.date));
  const visibleHistoryRows = historyRows.filter(matchesQuery).sort((a, b) => b.date.localeCompare(a.date));
  const visibleNotifications = notifications.filter(item => [item.title, item.message, item.type].some(value => String(value || '').toLowerCase().includes(notificationQuery.toLowerCase()))).slice(0, 20);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {notifications.length > 0 && <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-amber-950">Notifications</h2><label className="sr-only" htmlFor="notification-search">Search notifications</label><input id="notification-search" className="form-input min-h-10 w-full sm:max-w-xs" value={notificationQuery} onChange={e => setNotificationQuery(e.target.value)} placeholder="Search notification history" /></div>
          {visibleNotifications.length ? visibleNotifications.map(n => <div key={n._id} className={`flex flex-wrap justify-between items-center gap-3 border-t border-amber-200/70 py-2 text-sm ${n.read ? 'text-slate-600' : 'text-amber-950'}`}><p><span className="font-semibold">{n.title}</span> · {n.message} <span className="ml-1 text-xs">{n.read ? 'Read' : 'Unread'}</span></p>{!n.read && <button onClick={() => markNotificationRead(n)} className="min-h-10 shrink-0 font-semibold text-amber-950 underline">Mark read</button>}</div>) : <p className="text-sm text-amber-950">No notifications match this search.</p>}
        </section>}
        
        {/* Welcome & PNR Check */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 rounded-2xl shadow-lg p-7 text-white flex flex-col justify-center" style={{background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)'}}>
            <h1 className="text-2xl font-bold font-heading mb-1">Welcome back, {user?.name.split(' ')[0]}!</h1>
            <p className="text-sm" style={{color: '#c4b5fd'}}>Manage your upcoming journeys and booking history.</p>
          </div>
          
          <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide">Quick PNR Check</h3>
            <form onSubmit={handlePnrSearch} className="flex space-x-2">
              <label htmlFor="dashboard-pnr" className="sr-only">10-digit simulated PNR</label>
              <input 
                id="dashboard-pnr"
                type="text" 
                inputMode="numeric"
                aria-label="10-digit simulated PNR"
                placeholder="10-digit PNR" 
                className="form-input text-sm"
                value={pnrSearch}
                onChange={(e) => setPnrSearch(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
                <button type="submit" aria-label="Check simulated PNR" className="btn-primary min-h-11 min-w-11 px-3 flex-shrink-0">
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
        {error && <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {actionMessage && <div role="status" className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">{actionMessage}</div>}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-slate-800">Booking history</h2>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:grid-cols-4">
            <label className="sr-only" htmlFor="booking-history-search">Search bookings</label><input id="booking-history-search" className="form-input sm:w-56" value={bookingQuery} onChange={e => setBookingQuery(e.target.value)} placeholder="Search PNR or train" />
            <label className="sr-only" htmlFor="booking-history-filter">Filter bookings</label><select id="booking-history-filter" className="form-input sm:w-auto" value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}><option value="all">All bookings</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
            <label className="sr-only" htmlFor="journey-from">Journey from date</label><input id="journey-from" aria-label="Journey from date" type="date" className="form-input" max={journeyTo || undefined} value={journeyFrom} onChange={e => setJourneyFrom(e.target.value)} />
            <label className="sr-only" htmlFor="journey-to">Journey to date</label><input id="journey-to" aria-label="Journey to date" type="date" className="form-input" min={journeyFrom || undefined} value={journeyTo} onChange={e => setJourneyTo(e.target.value)} />
          </div>
        </div>

        {/* Upcoming Journeys */}
        {(historyFilter === 'all' || historyFilter === 'upcoming') && <>
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-[#6d28d9]" /> Upcoming Journeys
          </h2>
          
          {visibleUpcomingBookings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <TrainIcon className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">{upcomingBookings.length ? 'No upcoming journeys match your search.' : 'No upcoming journeys planned.'}</p>
              <button onClick={() => navigate('/')} className="mt-4 text-[#6d28d9] font-semibold hover:underline">Book a Ticket</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {visibleUpcomingBookings.map(b => (
                <BookingCard 
                  key={b._id} 
                  booking={b} 
                  onDownload={handleDownload} 
                  onCancel={() => setCancellationTarget(b)}
                  cancelling={cancellingId === b._id}
                  badge={getStatusBadge(b.status)}
                />
              ))}
            </div>
          )}
        </div>
        </>}

        {/* Past & Cancelled */}
        {visibleHistoryRows.length > 0 && (historyFilter === 'all' || historyFilter === 'completed' || historyFilter === 'cancelled') && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-slate-500" /> Past & Cancelled Tickets
            </h2>
            <div className="space-y-4">
              {visibleHistoryRows.map(b => (
                <BookingCardMini 
                  key={b._id} 
                  booking={b} 
                  onDownload={handleDownload}
                  badge={getStatusBadge(b.status)}
                />
              ))}
            </div>
          </div>
        )}
        {bookings.length > 0 && visibleUpcomingBookings.length === 0 && visibleHistoryRows.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">No bookings match “{bookingQuery}”. Try another PNR, train name, or route code.</div>}

      </div>
      {cancellationTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCancellationTarget(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="cancel-booking-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <h2 id="cancel-booking-title" className="text-xl font-bold text-slate-900">Cancel this simulated booking?</h2>
          <p className="mt-2 text-sm text-slate-600">{cancellationTarget.train?.name} · PNR {cancellationTarget.pnr}</p>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-600">Amount paid</span><span className="font-semibold">₹{cancellationTarget.totalFare}</span></div><div className="mt-2 flex justify-between gap-3"><span className="text-slate-600">Estimated cancellation charge</span><span className="font-semibold">₹{Math.max(60 * (cancellationTarget.passengers?.length || 1), cancellationTarget.totalFare * 0.15).toFixed(2)}</span></div><div className="mt-3 flex justify-between gap-3 border-t border-slate-200 pt-3"><span className="font-semibold">Estimated simulated refund</span><span className="font-bold text-violet-900">₹{Math.max(0, cancellationTarget.totalFare - Math.max(60 * (cancellationTarget.passengers?.length || 1), cancellationTarget.totalFare * 0.15)).toFixed(2)}</span></div></div>
          <p className="mt-3 text-xs text-amber-900">The sample seats will be released. This estimate uses a 15% charge with a ₹60 minimum per passenger; no real payment or refund is processed.</p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setCancellationTarget(null)} className="btn-secondary min-h-11">Keep booking</button><button type="button" onClick={() => handleCancel(cancellationTarget)} className="min-h-11 rounded-xl bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800">Cancel simulated booking</button></div>
        </section>
      </div>}
    </div>
  );
}

function BookingCard({ booking, onDownload, onCancel, cancelling, badge }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PNR: {booking.pnr}</div>
            <h3 className="text-lg font-bold text-slate-800">{booking.train.name}</h3>
          </div>
          {badge}
        </div>

        <div className="flex items-center justify-between text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
           <div className="text-center">
             <div className="font-bold">{booking.source.code}</div>
           </div>
           <div className="flex-1 px-4 text-center text-xs text-slate-400 font-medium relative">
             <div className="border-t border-dashed border-slate-300 w-full absolute top-1/2 left-0 z-0"></div>
             <span className="bg-slate-50 px-2 relative z-10">{booking.date}</span>
           </div>
           <div className="text-center">
             <div className="font-bold">{booking.destination.code}</div>
           </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <div className="text-slate-600">
            <span className="font-medium">{booking.passengers.length} Pax</span> • Class <span className="font-medium">{booking.seatClass}</span>
          </div>
          <div className="font-bold text-slate-800">
            ₹{booking.totalFare}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Passenger coach and seat assignments">
          {booking.passengers?.map((passenger, index) => <span key={`${passenger.coach}-${passenger.seatNumber}-${index}`} className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-900">{passenger.name}: {passenger.coach}/{passenger.seatNumber} · {passenger.seatType}</span>)}
        </div>
      </div>

      <div className="bg-slate-50 border-t border-slate-100 p-3 flex space-x-2">
        <button 
          onClick={() => navigate(`/tracker`)} // In a real app we'd pass train ID or date
          className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg text-center transition shadow-sm"
        >
          Track
        </button>
        <button 
          onClick={() => onDownload(booking._id, booking.pnr)}
          className="flex-1 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 rounded-lg flex items-center justify-center transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> PDF
        </button>
        <button 
          onClick={() => onCancel(booking)}
          disabled={cancelling}
          className="flex-1 py-2 text-xs font-semibold text-red-600 hover:text-red-700 bg-white border border-slate-200 rounded-lg flex items-center justify-center transition shadow-sm disabled:opacity-50"
        >
          {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cancel'}
        </button>
      </div>
    </div>
  );
}

function BookingCardMini({ booking, onDownload, badge }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between transition hover:shadow-md">
      <div className="flex items-center space-x-4 mb-3 md:mb-0">
        <div className="hidden sm:flex w-12 h-12 bg-slate-50 rounded flex-col items-center justify-center border border-slate-100">
           <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(booking.date).toLocaleString('default', { month: 'short' })}</span>
           <span className="text-lg font-bold text-slate-700 leading-none">{new Date(booking.date).getDate()}</span>
        </div>
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-bold text-slate-800">{booking.train.name}</span>
            {badge}
          </div>
          <div className="text-xs text-slate-500">
            PNR: <span className="font-semibold text-slate-600 mr-2">{booking.pnr}</span>
            {booking.source.code} → {booking.destination.code}
          </div>
          <div className="mt-1 text-xs text-slate-600">{booking.passengers?.map(p => `${p.coach}/${p.seatNumber}`).join(' · ') || 'Seat details unavailable'} · {booking.seatClass} · ₹{booking.totalFare}</div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-right hidden md:block">
          <div className="text-sm font-bold text-slate-800">₹{booking.totalFare}</div>
          {booking.status === 'Cancelled' && (
            <div className="text-[10px] font-semibold text-violet-600">Refund: ₹{booking.refundAmount}</div>
          )}
        </div>
        <button 
          onClick={() => onDownload(booking._id, booking.pnr)}
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition"
          title="Download Ticket"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function TrainIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="16" x="4" y="3" rx="2"/>
      <path d="M4 11h16"/>
      <path d="M12 3v8"/>
      <path d="m8 19-2 3"/>
      <path d="m18 22-2-3"/>
      <path d="M8 15h0"/>
      <path d="M16 15h0"/>
    </svg>
  );
}
