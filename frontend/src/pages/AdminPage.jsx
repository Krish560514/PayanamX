import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Users, Ticket, IndianRupee, Loader2, AlertCircle } from 'lucide-react';

function downloadCsv(filename, rows) {
  const escapeCell = value => {
    const text = String(value ?? '');
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csv = rows.map(row => row.map(escapeCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

function getFarePreview(stopsValue, fareValue) {
  try {
    const stops = JSON.parse(stopsValue);
    const rates = JSON.parse(fareValue);
    if (!Array.isArray(stops) || stops.length < 2) return [];
    const distance = Number(stops.at(-1)?.distanceKm) - Number(stops[0]?.distanceKm);
    if (!Number.isFinite(distance) || distance < 0) return [];
    return Object.entries(rates).filter(([, rate]) => Number.isFinite(Number(rate)) && Number(rate) >= 0).map(([seatClass, rate]) => ({
      seatClass,
      fare: Math.max(50, Math.round(distance * Number(rate) * 0.05) * 10)
    }));
  } catch { return []; }
}

export default function AdminPage() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [trains, setTrains] = useState([]);
  const [stations, setStations] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [auditEntries, setAuditEntries] = useState([]);
  const [tab, setTab] = useState('trains');
  const [bookingQuery, setBookingQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [bookingQueryServer, setBookingQueryServer] = useState('');
  const [userQueryServer, setUserQueryServer] = useState('');
  const [bookingPage, setBookingPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [trainPage, setTrainPage] = useState(1);
  const [stationPage, setStationPage] = useState(1);
  const [trainQuery, setTrainQuery] = useState('');
  const [stationQuery, setStationQuery] = useState('');
  const [bookingPagination, setBookingPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [userPagination, setUserPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [auditPagination, setAuditPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [auditAction, setAuditAction] = useState('');
  const [auditResource, setAuditResource] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [bookingClass, setBookingClass] = useState('');
  const [bookingSort, setBookingSort] = useState('createdAt');
  const [bookingDirection, setBookingDirection] = useState('desc');
  const [bookingFrom, setBookingFrom] = useState('');
  const [bookingTo, setBookingTo] = useState('');
  const [analyticsFrom, setAnalyticsFrom] = useState('');
  const [analyticsTo, setAnalyticsTo] = useState('');
  const [savingTrain, setSavingTrain] = useState(false);
  const [trainForm, setTrainForm] = useState({ trainNumber: '', name: '', sourceCode: '', destinationCode: '', stopCodes: '', classes: 'SL,3A', runsOn: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', coachComposition: '[]', baseFare: '{}' });
  const [stationForm, setStationForm] = useState({ code: '', name: '', state: '', zone: '' });
  const [editingTrain, setEditingTrain] = useState(null);
  const [editingTrainForm, setEditingTrainForm] = useState(null);
  const [editingStation, setEditingStation] = useState(null);
  const [editingStationForm, setEditingStationForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Basic protection
    if (!token || user?.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchStats = async () => {
      try {
        const [res, trainRes, stationRes] = await Promise.all([
          axios.get('/api/admin/stats'), axios.get('/api/admin/trains'), axios.get('/api/admin/stations')
        ]);
        setStats({ ...res.data.metrics, classSplit: res.data.classSplit, trends: res.data.trends, monthlyTrends: res.data.monthlyTrends });
        setTrains(trainRes.data.trains || []);
        setStations(stationRes.data.stations || []);
      } catch (err) {
        setError('Failed to load admin statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, user?.role, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => { setBookingQueryServer(bookingQuery); setUserQueryServer(userQuery); }, 250);
    return () => clearTimeout(timer);
  }, [bookingQuery, userQuery]);

  useEffect(() => {
    if (!token || user?.role !== 'admin') return undefined;
    let active = true;
    const params = { page: bookingPage, limit: 20, q: bookingQueryServer, status: bookingStatus, seatClass: bookingClass, from: bookingFrom, to: bookingTo, sort: bookingSort, direction: bookingDirection };
    axios.get('/api/admin/bookings', { params })
      .then(bookingRes => {
        if (!active) return;
        setAdminBookings(bookingRes.data.bookings || []);
        setBookingPagination(bookingRes.data.pagination || { page: 1, pages: 1, total: bookingRes.data.bookings?.length || 0 });
      })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Failed to load booking list.'); });
    return () => { active = false; };
  }, [token, user?.role, bookingPage, bookingQueryServer, bookingStatus, bookingClass, bookingFrom, bookingTo, bookingSort, bookingDirection]);

  useEffect(() => {
    if (!token || user?.role !== 'admin') return undefined;
    let active = true;
    axios.get('/api/admin/users', { params: { page: userPage, limit: 20, q: userQueryServer } })
      .then(({ data }) => { if (active) { setAdminUsers(data.users || []); setUserPagination(data.pagination || { page: 1, pages: 1, total: data.users?.length || 0 }); } })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Failed to load registered users.'); });
    return () => { active = false; };
  }, [token, user?.role, userPage, userQueryServer]);

  useEffect(() => {
    if (!token || user?.role !== 'admin') return undefined;
    let active = true;
    axios.get('/api/admin/audit', { params: { page: auditPage, limit: 25, action: auditAction, resource: auditResource } })
      .then(({ data }) => { if (active) { setAuditEntries(data.entries || []); setAuditPagination(data.pagination || { page: 1, pages: 1, total: data.entries?.length || 0 }); } })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Failed to load admin audit history.'); });
    return () => { active = false; };
  }, [token, user?.role, auditPage, auditAction, auditResource]);

  useEffect(() => {
    if (!token || user?.role !== 'admin') return undefined;
    let active = true;
    axios.get('/api/admin/stats', { params: { from: analyticsFrom, to: analyticsTo } })
      .then(({ data }) => { if (active) setStats({ ...data.metrics, classSplit: data.classSplit, trends: data.trends, monthlyTrends: data.monthlyTrends }); })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Could not load analytics for this date range.'); });
    return () => { active = false; };
  }, [token, user?.role, analyticsFrom, analyticsTo]);

  const handleAddTrain = async (event) => {
    event.preventDefault();
    setSavingTrain(true); setError('');
    try {
      const codes = trainForm.stopCodes.split(',').map(code => code.trim().toUpperCase()).filter(Boolean);
      if (codes.length < 2 || codes[0] !== trainForm.sourceCode.toUpperCase() || codes[codes.length - 1] !== trainForm.destinationCode.toUpperCase()) throw new Error('Stop codes must start at the source and end at the destination.');
      const coaches = JSON.parse(trainForm.coachComposition);
      const baseFare = JSON.parse(trainForm.baseFare);
      const stops = codes.map((stationCode, stopIndex) => ({ stationCode, stopIndex, arrivalTime: stopIndex === 0 ? '00:00' : `${String((stopIndex * 4) % 24).padStart(2, '0')}:00`, departureTime: stopIndex === codes.length - 1 ? '00:00' : `${String((stopIndex * 4) % 24).padStart(2, '0')}:10`, distanceKm: stopIndex * 300, dayNumber: 1 }));
      await axios.post('/api/admin/trains', { trainNumber: trainForm.trainNumber, name: trainForm.name, sourceCode: trainForm.sourceCode.toUpperCase(), destinationCode: trainForm.destinationCode.toUpperCase(), classes: trainForm.classes.split(',').map(x => x.trim().toUpperCase()), runsOn: trainForm.runsOn.split(',').map(x => x.trim()), baseFare, coachComposition: coaches, stops });
      const updated = await axios.get('/api/admin/trains'); setTrains(updated.data.trains || []);
      setTrainForm({ trainNumber: '', name: '', sourceCode: '', destinationCode: '', stopCodes: '', classes: 'SL,3A', runsOn: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', coachComposition: '[]', baseFare: '{}' });
    } catch (err) { setError(err.response?.data?.message || err.message || 'Could not add train.'); }
    finally { setSavingTrain(false); }
  };

  const handleAddStation = async (event) => {
    event.preventDefault(); setError('');
    try { await axios.post('/api/admin/stations', stationForm); const response = await axios.get('/api/admin/stations'); setStations(response.data.stations || []); setStationForm({ code: '', name: '', state: '', zone: '' }); }
    catch (err) { setError(err.response?.data?.message || 'Could not add station.'); }
  };

  const openStationEditor = (station) => {
    setEditingStation(station);
    setEditingStationForm({ code: station.code, name: station.name, state: station.state, zone: station.zone });
  };

  const saveStation = async (event) => {
    event.preventDefault();
    try { await axios.put(`/api/admin/stations/${editingStation._id}`, editingStationForm); const response = await axios.get('/api/admin/stations'); setStations(response.data.stations || []); setEditingStation(null); setEditingStationForm(null); }
    catch (err) { setError(err.response?.data?.message || 'Could not update station.'); }
  };

  const removeStation = async (station) => {
    if (!window.confirm(`Delete station ${station.code}? Stations used by trains or routes are protected.`)) return;
    try { await axios.delete(`/api/admin/stations/${station._id}`); setStations(current => current.filter(item => item._id !== station._id)); }
    catch (err) { setError(err.response?.data?.message || 'Could not delete station.'); }
  };

  const openTrainEditor = (train) => {
    setEditingTrain(train);
    setEditingTrainForm({ name: train.name, classes: (train.classes || []).join(', '), runsOn: (train.runsOn || []).join(', '), coachComposition: JSON.stringify(train.coachComposition || [], null, 2), stops: JSON.stringify(train.stops || [], null, 2), baseFare: JSON.stringify(train.baseFare || {}, null, 2) });
  };

  const saveTrain = async (event) => {
    event.preventDefault(); setError('');
    try {
      const body = {
        name: editingTrainForm.name.trim(),
        classes: editingTrainForm.classes.split(',').map(x => x.trim().toUpperCase()).filter(Boolean),
        runsOn: editingTrainForm.runsOn.split(',').map(x => x.trim()).filter(Boolean),
        coachComposition: JSON.parse(editingTrainForm.coachComposition),
        stops: JSON.parse(editingTrainForm.stops),
        baseFare: JSON.parse(editingTrainForm.baseFare)
      };
      await axios.put(`/api/admin/trains/${editingTrain._id}`, body);
      const result = await axios.get('/api/admin/trains'); setTrains(result.data.trains || []);
      setEditingTrain(null); setEditingTrainForm(null);
    } catch (err) { setError(err.response?.data?.message || err.message || 'Could not save train configuration.'); }
  };

  const toggleTrain = async (train) => {
    try { await axios.put(`/api/admin/trains/${train._id}`, { active: !train.active }); const result = await axios.get('/api/admin/trains'); setTrains(result.data.trains || []); }
    catch (err) { setError(err.response?.data?.message || 'Could not update train status.'); }
  };

  const removeTrain = async (train) => {
    if (!window.confirm(`Remove ${train.trainNumber} from sample search? Trains with active bookings cannot be deleted.`)) return;
    try { await axios.delete(`/api/admin/trains/${train._id}`); setTrains(current => current.filter(item => item._id !== train._id)); }
    catch (err) { setError(err.response?.data?.message || 'Could not remove train.'); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#6d28d9]" /></div>;
  }

  const filteredDailyTrends = (stats?.trends || []).filter(row => (!analyticsFrom || row.date >= analyticsFrom) && (!analyticsTo || row.date <= analyticsTo));
  const filteredTrains = trains.filter(train => [train.trainNumber, train.name, train.source?.code, train.destination?.code].some(value => String(value || '').toLowerCase().includes(trainQuery.toLowerCase()))).sort((a, b) => a.trainNumber.localeCompare(b.trainNumber));
  const filteredStations = stations.filter(station => [station.code, station.name, station.state].some(value => String(value || '').toLowerCase().includes(stationQuery.toLowerCase()))).sort((a, b) => a.code.localeCompare(b.code));
  const trainPages = Math.max(1, Math.ceil(filteredTrains.length / 10));
  const stationPages = Math.max(1, Math.ceil(filteredStations.length / 10));
  const visibleTrains = filteredTrains.slice((trainPage - 1) * 10, trainPage * 10);
  const visibleStations = filteredStations.slice((stationPage - 1) * 10, stationPage * 10);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* Sidebar */}
      <div className="w-64 bg-[#4c1d95] text-white flex-shrink-0 min-h-screen hidden md:block shadow-xl">
        <div className="p-6">
          <h2 className="text-xl font-bold font-heading mb-8 flex items-center">
            <LayoutDashboard className="w-5 h-5 mr-2 text-[#d8ef73]" /> Admin Portal
          </h2>
          <nav className="space-y-2">
            <button type="button" onClick={() => setTab('trains')} aria-current={tab === 'trains' ? 'page' : undefined} className={`w-full flex items-center px-4 py-3 rounded-lg text-left text-sm font-semibold transition ${tab === 'trains' ? 'bg-[#6d28d9] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <LayoutDashboard className="w-4 h-4 mr-3" /> Dashboard
            </button>
            <button type="button" onClick={() => setTab('bookings')} aria-current={tab === 'bookings' ? 'page' : undefined} className={`w-full flex items-center px-4 py-3 rounded-lg text-left text-sm font-semibold transition ${tab === 'bookings' ? 'bg-[#6d28d9] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Ticket className="w-4 h-4 mr-3" /> Manage Bookings
            </button>
            <button type="button" onClick={() => setTab('users')} aria-current={tab === 'users' ? 'page' : undefined} className={`w-full flex items-center px-4 py-3 rounded-lg text-left text-sm font-semibold transition ${tab === 'users' ? 'bg-[#6d28d9] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              <Users className="w-4 h-4 mr-3" /> User Accounts
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Overview</h1>
            <p className="text-slate-500 text-sm mt-1">Platform analytics · revenue, booking and occupancy reports follow the selected date range.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center mb-4">
              <IndianRupee className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Revenue</div>
            <div className="text-3xl font-bold text-slate-800 mt-1">₹{stats?.netRevenue?.toLocaleString('en-IN') || 0}</div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-violet-50 rounded-lg flex items-center justify-center mb-4">
              <Ticket className="w-6 h-6 text-violet-600" />
            </div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Bookings</div>
            <div className="text-3xl font-bold text-slate-800 mt-1">{stats?.totalBookings || 0}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total Users</div>
            <div className="text-3xl font-bold text-slate-800 mt-1">{stats?.totalUsers || 0}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center mb-4"><Ticket className="w-6 h-6 text-amber-600" /></div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Active trains</div>
            <div className="text-3xl font-bold text-slate-800 mt-1">{stats?.totalTrains || 0}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Refunds Issued</div>
            <div className="text-3xl font-bold text-slate-800 mt-1">₹{stats?.refundedAmount?.toLocaleString('en-IN') || 0}</div>
          </div>
        </div>

        {error && <div className="my-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Admin sections">
          {[['trains','Trains'],['stations','Stations'],['bookings','Bookings'],['users','Users'],['analytics','Analytics'],['audit','Audit history']].map(([key,label]) => <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`min-h-11 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === key ? 'bg-[#4c1d95] text-white' : 'bg-slate-100 text-slate-700 hover:bg-violet-50 hover:text-violet-900'}`}>{label}</button>)}
        </div>

        {tab === 'trains' && <section className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="font-bold text-slate-800 mb-4">Add sample train</h2>
          <form onSubmit={handleAddTrain} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {['trainNumber','name','sourceCode','destinationCode','stopCodes','classes','runsOn'].map(field => <label key={field} className="text-xs text-slate-500">{field === 'stopCodes' ? 'Route station codes, in order' : field === 'runsOn' ? 'Running days' : field}<input required className="form-input mt-1" value={trainForm[field]} onChange={e => setTrainForm({ ...trainForm, [field]: e.target.value })} placeholder={field === 'stopCodes' ? 'NDLS, BPL, CSMT' : field === 'classes' ? 'SL,3A,2A' : field === 'runsOn' ? 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' : ''} /></label>)}
            <label className="text-xs text-slate-500 md:col-span-2">Coach composition JSON<input className="form-input mt-1 font-mono" value={trainForm.coachComposition} onChange={e => setTrainForm({ ...trainForm, coachComposition: e.target.value })} placeholder='[{"coachNumber":"S1","classType":"SL","capacity":72,"layout":"berth-sl"}]' /></label>
            <label className="text-xs text-slate-500 md:col-span-2">Class fare multipliers JSON<input className="form-input mt-1 font-mono" value={trainForm.baseFare} onChange={e => setTrainForm({ ...trainForm, baseFare: e.target.value })} placeholder='{"SL":2,"3A":5,"3E":4.5}' /></label>
            <button disabled={savingTrain} className="btn-primary px-4 py-2 w-fit">{savingTrain ? 'Saving…' : 'Add train'}</button>
          </form>
          <p className="text-xs text-slate-500 mt-3">Sample timetable only. Enter a JSON coach list to set each train’s class-specific coach numbers and capacities.</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Train directory <span className="text-sm font-normal text-slate-500">({filteredTrains.length})</span></h3><input aria-label="Search trains" className="form-input w-full sm:max-w-xs" value={trainQuery} onChange={e => { setTrainQuery(e.target.value); setTrainPage(1); }} placeholder="Search number, name, route" /></div>
          <div className="mt-2 divide-y">{visibleTrains.map(train => <div key={train._id} className="py-3 flex flex-wrap justify-between gap-3 items-center"><div><strong>{train.trainNumber}</strong> · {train.name}<p className="text-xs text-slate-500">{train.source?.code} → {train.destination?.code} · {(train.classes || []).join(', ')} · {(train.coachComposition || []).length || 'default'} coaches · {train.active ? 'Active' : 'Inactive'}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => openTrainEditor(train)} className="px-3 py-1.5 border rounded text-sm">Edit details</button><button onClick={() => toggleTrain(train)} className="px-3 py-1.5 border rounded text-sm">{train.active ? 'Deactivate' : 'Activate'}</button><button onClick={() => removeTrain(train)} className="px-3 py-1.5 border border-red-200 text-red-700 rounded text-sm">Delete</button></div></div>)}{!visibleTrains.length && <p className="py-4 text-sm text-slate-500">No trains match this search.</p>}</div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">Page {trainPage} of {trainPages}</span><div className="flex gap-2"><button type="button" disabled={trainPage <= 1} onClick={() => setTrainPage(page => page - 1)} className="btn-secondary min-h-10 disabled:opacity-50">Previous</button><button type="button" disabled={trainPage >= trainPages} onClick={() => setTrainPage(page => page + 1)} className="btn-secondary min-h-10 disabled:opacity-50">Next</button></div></div>
        </section>}

        {tab === 'stations' && <section className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="font-bold text-slate-800 mb-4">Manage sample stations</h2>
          <form onSubmit={handleAddStation} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {['code','name','state','zone'].map(field => <label key={field} className="text-xs text-slate-500">{field}<input required className="form-input mt-1" value={stationForm[field]} onChange={e => setStationForm({ ...stationForm, [field]: e.target.value })} /></label>)}
            <button className="btn-primary px-4 py-2 w-fit">Add station</button>
          </form>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Station directory <span className="text-sm font-normal text-slate-500">({filteredStations.length})</span></h3><input aria-label="Search stations" className="form-input w-full sm:max-w-xs" value={stationQuery} onChange={e => { setStationQuery(e.target.value); setStationPage(1); }} placeholder="Search code, name, state" /></div>
          <div className="divide-y">{visibleStations.map(station => <div key={station._id} className="py-3 flex justify-between gap-3 items-center"><div><strong>{station.code}</strong> · {station.name}<p className="text-xs text-slate-500">{station.state} · {station.zone}</p></div><div className="flex gap-2"><button onClick={() => openStationEditor(station)} className="px-3 py-1.5 border rounded text-sm">Edit</button><button onClick={() => removeStation(station)} className="px-3 py-1.5 border border-red-200 text-red-700 rounded text-sm">Delete</button></div></div>)}{!visibleStations.length && <p className="py-4 text-sm text-slate-500">No stations match this search.</p>}</div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">Page {stationPage} of {stationPages}</span><div className="flex gap-2"><button type="button" disabled={stationPage <= 1} onClick={() => setStationPage(page => page - 1)} className="btn-secondary min-h-10 disabled:opacity-50">Previous</button><button type="button" disabled={stationPage >= stationPages} onClick={() => setStationPage(page => page + 1)} className="btn-secondary min-h-10 disabled:opacity-50">Next</button></div></div>
        </section>}

        {tab === 'bookings' && <section className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Bookings <span className="ml-1 text-sm font-normal text-slate-500">({bookingPagination.total})</span></h2><div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><input aria-label="Search bookings by PNR, train, or passenger" className="form-input w-full sm:max-w-xs" value={bookingQuery} onChange={e => { setBookingQuery(e.target.value); setBookingPage(1); }} placeholder="Search PNR, train, passenger" /><button type="button" disabled={!adminBookings.length} onClick={() => downloadCsv('payanamx-bookings-page.csv', [['PNR','Train number','Train name','Journey date','Source','Destination','Class','Seats','Status','Simulated fare'], ...adminBookings.map(b => [b.pnr,b.train?.trainNumber,b.train?.name,b.date,b.source?.code,b.destination?.code,b.seatClass,b.passengers?.map(p => `${p.coach}/${p.seatNumber}`).join('; '),b.status,b.totalFare])])} className="btn-secondary min-h-11">Export this page</button></div></div><div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6"><label className="text-xs font-semibold text-slate-600">Status<select className="form-input mt-1" value={bookingStatus} onChange={e => { setBookingStatus(e.target.value); setBookingPage(1); }}><option value="">All statuses</option>{['Pending','Confirmed','Cancelled'].map(value => <option key={value}>{value}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Class<select className="form-input mt-1" value={bookingClass} onChange={e => { setBookingClass(e.target.value); setBookingPage(1); }}><option value="">All classes</option>{['1A','2A','3A','3E','SL','CC','2S'].map(value => <option key={value}>{value}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Journey from<input type="date" className="form-input mt-1" max={bookingTo || undefined} value={bookingFrom} onChange={e => { setBookingFrom(e.target.value); setBookingPage(1); }} /></label><label className="text-xs font-semibold text-slate-600">Journey to<input type="date" className="form-input mt-1" min={bookingFrom || undefined} value={bookingTo} onChange={e => { setBookingTo(e.target.value); setBookingPage(1); }} /></label><label className="text-xs font-semibold text-slate-600">Sort by<select className="form-input mt-1" value={bookingSort} onChange={e => { setBookingSort(e.target.value); setBookingPage(1); }}><option value="createdAt">Created</option><option value="date">Journey date</option><option value="pnr">PNR</option><option value="status">Status</option><option value="totalFare">Fare</option></select></label><label className="text-xs font-semibold text-slate-600">Direction<select className="form-input mt-1" value={bookingDirection} onChange={e => { setBookingDirection(e.target.value); setBookingPage(1); }}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label></div>{adminBookings.length ? <table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b text-left"><th className="py-2">PNR</th><th>Passenger</th><th>Train</th><th>Date</th><th>Seats</th><th>Status</th></tr></thead><tbody>{adminBookings.map(b => <tr key={b._id} className="border-b"><td className="py-2">{b.pnr}</td><td>{b.user?.name}</td><td>{b.train?.trainNumber} {b.train?.name}</td><td>{b.date}</td><td>{b.passengers?.map(p => `${p.coach}/${p.seatNumber}`).join(', ')}</td><td>{b.status}</td></tr>)}</tbody></table> : <p className="text-sm text-slate-500">{bookingPagination.total ? 'No bookings match these filters.' : 'No bookings yet.'}</p>}<div className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">Page {bookingPagination.page} of {Math.max(1, bookingPagination.pages)}</span><div className="flex gap-2"><button type="button" disabled={bookingPage <= 1} onClick={() => setBookingPage(page => page - 1)} className="btn-secondary min-h-10 disabled:opacity-50">Previous</button><button type="button" disabled={bookingPage >= bookingPagination.pages} onClick={() => setBookingPage(page => page + 1)} className="btn-secondary min-h-10 disabled:opacity-50">Next</button></div></div></section>}
        {tab === 'users' && <section className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-white p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">Registered users <span className="ml-1 text-sm font-normal text-slate-500">({userPagination.total})</span></h2><input aria-label="Search users by name or email" className="form-input w-full sm:max-w-xs" value={userQuery} onChange={e => { setUserQuery(e.target.value); setUserPage(1); }} placeholder="Search name or email" /></div>{adminUsers.length ? <table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left"><th className="py-2">Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead><tbody>{adminUsers.map(account => <tr key={account._id} className="border-b"><td className="py-2">{account.name}</td><td>{account.email}</td><td>{account.phone || '—'}</td><td>{new Date(account.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table> : <p className="text-sm text-slate-500">{userPagination.total ? 'No users match this search.' : 'No registered users yet.'}</p>}<div className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">Page {userPagination.page} of {Math.max(1, userPagination.pages)}</span><div className="flex gap-2"><button type="button" disabled={userPage <= 1} onClick={() => setUserPage(page => page - 1)} className="btn-secondary min-h-10 disabled:opacity-50">Previous</button><button type="button" disabled={userPage >= userPagination.pages} onClick={() => setUserPage(page => page + 1)} className="btn-secondary min-h-10 disabled:opacity-50">Next</button></div></div></section>}
        {tab === 'audit' && <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-bold">Admin change history</h2><p className="mt-1 text-xs text-slate-500">Train, station, and refund configuration changes.</p></div><div className="grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-slate-600">Action<select className="form-input mt-1" value={auditAction} onChange={e => { setAuditAction(e.target.value); setAuditPage(1); }}><option value="">All actions</option>{['CREATE','UPDATE','DELETE','REFUND_UPDATE'].map(value => <option key={value}>{value}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Type<select className="form-input mt-1" value={auditResource} onChange={e => { setAuditResource(e.target.value); setAuditPage(1); }}><option value="">All types</option>{['Train','Station','Booking'].map(value => <option key={value}>{value}</option>)}</select></label></div></div>
          {auditEntries.length ? <ol className="divide-y divide-slate-100">{auditEntries.map(entry => <li key={entry._id} className="flex flex-wrap items-start justify-between gap-2 py-3"><div><span className="mr-2 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-900">{entry.action}</span><span className="text-xs font-semibold text-slate-600">{entry.resource}</span><p className="mt-2 text-sm text-slate-800">{entry.summary}</p><p className="mt-1 text-xs text-slate-500">By {entry.actor?.name || 'Admin'}</p></div><time className="text-xs text-slate-500" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString('en-IN')}</time></li>)}</ol> : <p className="py-6 text-sm text-slate-500">No admin changes have been recorded yet.</p>}
          <div className="mt-4 flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">Page {auditPagination.page} of {Math.max(1, auditPagination.pages)} · {auditPagination.total} records</span><div className="flex gap-2"><button type="button" disabled={auditPage <= 1} onClick={() => setAuditPage(page => page - 1)} className="btn-secondary min-h-10 disabled:opacity-50">Previous</button><button type="button" disabled={auditPage >= auditPagination.pages} onClick={() => setAuditPage(page => page + 1)} className="btn-secondary min-h-10 disabled:opacity-50">Next</button></div></div>
        </section>}

        {(tab === 'analytics' || tab === 'trains') && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-bold text-slate-800 mb-1">Bookings by class</h2><p className="mb-4 text-xs text-slate-500">{analyticsFrom || analyticsTo ? `${analyticsFrom || 'Start'} to ${analyticsTo || 'today'}` : 'All dates'} · simulated reservations</p>
            {stats?.classSplit?.length ? stats.classSplit.map(row => <div key={row._id} className="flex justify-between py-2 border-b last:border-0 text-sm"><span>{row._id}</span><span>{row.count} bookings · ₹{row.revenue}</span></div>) : <p className="text-sm text-slate-500">No paid demo bookings yet.</p>}
          </section>
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-bold text-slate-800">Daily simulated activity</h2><p className="text-xs text-slate-500">Choose a date range · up to 90 recent booking dates</p></div><button type="button" onClick={() => { setAnalyticsFrom(''); setAnalyticsTo(''); }} className="min-h-10 text-xs font-semibold text-violet-800 hover:underline">Clear dates</button></div>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">From<input className="form-input mt-1" type="date" max={analyticsTo || undefined} value={analyticsFrom} onChange={e => setAnalyticsFrom(e.target.value)} /></label><label className="text-xs font-semibold text-slate-600">To<input className="form-input mt-1" type="date" min={analyticsFrom || undefined} value={analyticsTo} onChange={e => setAnalyticsTo(e.target.value)} /></label></div>
            {filteredDailyTrends.length ? filteredDailyTrends.map(row => <div key={row.date} className="flex justify-between py-2 border-b last:border-0 text-sm"><span>{row.date}</span><span>{row.bookings} · ₹{row.revenue}</span></div>) : <p className="text-sm text-slate-500">No simulated bookings in this date range.</p>}
            <p className="text-xs text-amber-700 mt-4">Revenue and occupancy figures are simulated project data.</p>
            <h3 className="font-bold text-slate-800 mt-5 mb-2">Monthly statistics</h3>
            {stats?.monthlyTrends?.length ? stats.monthlyTrends.map(row => <p key={row.month} className="text-sm text-slate-600 py-1">{row.month}: {row.bookings} bookings · ₹{row.revenue}</p>) : <p className="text-xs text-slate-500">No monthly demo bookings yet.</p>}
            <div className="mt-5 mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-slate-800">Coach occupancy</h3><button type="button" disabled={!stats?.occupancy?.length} onClick={() => downloadCsv('payanamx-simulated-coach-occupancy.csv', [['Class','Booked seats','Held seats','Total seats'], ...(stats?.occupancy || []).map(row => [row._id,row.bookedSeats,row.heldSeats,row.totalSeats])])} className="btn-secondary min-h-10">Export occupancy</button></div>
            {stats?.occupancy?.length ? stats.occupancy.map(row => <p key={row._id} className="text-sm text-slate-600 py-1">{row._id}: {row.bookedSeats} booked · {row.heldSeats} held · {row.totalSeats} total</p>) : <p className="text-xs text-slate-500">Inventory occupancy will appear when sample routes are searched.</p>}
          </section>
        </div>}

        {editingTrain && editingTrainForm && <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="edit-train-heading">
          <form onSubmit={saveTrain} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-start"><div><h2 id="edit-train-heading" className="text-xl font-bold">Edit {editingTrain.trainNumber}</h2><p className="text-sm text-slate-500">Train, schedule, running days, fares, coaches and capacities.</p></div><button type="button" onClick={() => { setEditingTrain(null); setEditingTrainForm(null); }} className="px-3 py-1 border rounded">Close</button></div>
            <label className="block text-sm">Train name<input className="form-input mt-1" required value={editingTrainForm.name} onChange={e => setEditingTrainForm({ ...editingTrainForm, name: e.target.value })} /></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm">Classes, comma separated<input className="form-input mt-1" value={editingTrainForm.classes} onChange={e => setEditingTrainForm({ ...editingTrainForm, classes: e.target.value })} /></label>
              <label className="text-sm">Running days<input className="form-input mt-1" value={editingTrainForm.runsOn} onChange={e => setEditingTrainForm({ ...editingTrainForm, runsOn: e.target.value })} /></label>
            </div>
            {[
              ['stops', 'Ordered route stops JSON'],
              ['coachComposition', 'Coach composition JSON'],
              ['baseFare', 'Class fare multipliers JSON']
            ].map(([field, label]) => <label key={field} className="block text-sm">{label}<textarea rows={field === 'baseFare' ? 3 : 7} className="form-input mt-1 font-mono text-xs" value={editingTrainForm[field]} onChange={e => setEditingTrainForm({ ...editingTrainForm, [field]: e.target.value })} /></label>)}
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-4"><h3 className="text-sm font-bold text-violet-950">Sample fare preview</h3><p className="mt-1 text-xs text-violet-900">Estimate for the full route distance using the current multipliers.</p><div className="mt-3 flex flex-wrap gap-2">{getFarePreview(editingTrainForm.stops, editingTrainForm.baseFare).map(item => <span key={item.seatClass} className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-950">{item.seatClass} · ₹{item.fare}</span>)}{!getFarePreview(editingTrainForm.stops, editingTrainForm.baseFare).length && <span className="text-xs text-amber-900">Enter valid route stops and fare JSON to preview.</span>}</div></div>
            <p className="text-xs text-slate-500">Route stops use station codes and ordered stop indices. Seat capacities and 1A compartment sizes are validated before saving.</p>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => { setEditingTrain(null); setEditingTrainForm(null); }} className="px-4 py-2 border rounded-lg">Cancel</button><button className="btn-primary px-5 py-2">Save train</button></div>
          </form>
        </div>}

        {editingStation && editingStationForm && <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="edit-station-heading">
          <form onSubmit={saveStation} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center"><h2 id="edit-station-heading" className="text-xl font-bold">Edit station</h2><button type="button" onClick={() => { setEditingStation(null); setEditingStationForm(null); }} className="px-3 py-1 border rounded">Close</button></div>
            {['code', 'name', 'state', 'zone'].map(field => <label key={field} className="block text-sm">{field}<input required className="form-input mt-1" value={editingStationForm[field]} onChange={e => setEditingStationForm({ ...editingStationForm, [field]: e.target.value })} /></label>)}
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => { setEditingStation(null); setEditingStationForm(null); }} className="px-4 py-2 border rounded-lg">Cancel</button><button className="btn-primary px-5 py-2">Save station</button></div>
          </form>
        </div>}

      </div>
    </div>
  );
}
