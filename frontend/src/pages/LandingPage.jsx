import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookingContext } from '../context/BookingContext';
import { AuthContext } from '../context/AuthContext';
import { Calendar, MapPin, ArrowRightLeft, Users, Search, Loader2, Train, ArrowRight, Heart } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { searchParams, setSearchParams } = useContext(BookingContext);
  const { user } = useContext(AuthContext);
  const recentKey = `oneRailRecentRoutes:${user?.id || user?._id || 'guest'}`;
  const favoriteRouteKey = `oneRailFavoriteRoutes:${user?.id || user?._id || 'guest'}`;

  const [fromQuery, setFromQuery] = useState(searchParams.fromName || '');
  const [toQuery, setToQuery] = useState(searchParams.toName || '');
  const [date, setDate] = useState(searchParams.date);
  const [seatClass, setSeatClass] = useState(searchParams.seatClass);
  const [passengerCount, setPassengerCount] = useState(searchParams.passengerCount);
  const [recentRoutes, setRecentRoutes] = useState([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState([]);
  const [favoriteRouteError, setFavoriteRouteError] = useState('');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    try { setRecentRoutes(JSON.parse(localStorage.getItem(recentKey) || '[]')); } catch { setRecentRoutes([]); }
  }, [recentKey]);

  useEffect(() => {
    let active = true;
    if (user) axios.get('/api/auth/favorites').then(({ data }) => { if (active) setFavoriteRoutes(data.favoriteRoutes || []); })
      .catch(() => { try { if (active) setFavoriteRoutes(JSON.parse(localStorage.getItem(favoriteRouteKey) || '[]')); } catch { if (active) setFavoriteRoutes([]); } });
    else { try { setFavoriteRoutes(JSON.parse(localStorage.getItem(favoriteRouteKey) || '[]')); } catch { setFavoriteRoutes([]); } }
    return () => { active = false; };
  }, [favoriteRouteKey, user]);

  const toggleFavoriteRoute = route => {
    const exists = favoriteRoutes.some(item => item.from === route.from && item.to === route.to);
    const updated = exists ? favoriteRoutes.filter(item => item.from !== route.from || item.to !== route.to) : [...favoriteRoutes, { from: route.from, fromName: route.fromName, to: route.to, toName: route.toName }];
    setFavoriteRoutes(updated);
    localStorage.setItem(favoriteRouteKey, JSON.stringify(updated));
    setFavoriteRouteError('');
    if (user) axios.put('/api/auth/favorites', { kind: 'route', ...route, favorite: !exists })
      .catch(() => setFavoriteRouteError('Could not sync this favorite route. It is saved on this device for now.'));
  };

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [loadingFrom, setLoadingFrom] = useState(false);
  const [loadingTo, setLoadingTo] = useState(false);
  const [fromStationError, setFromStationError] = useState('');
  const [toStationError, setToStationError] = useState('');
  const [fromActiveIndex, setFromActiveIndex] = useState(-1);
  const [toActiveIndex, setToActiveIndex] = useState(-1);

  const chooseStation = (field, station) => {
    setSearchError('');
    const value = `${station.name} (${station.code})`;
    if (field === 'from') {
      setFromQuery(value);
      setSearchParams(prev => ({ ...prev, from: station.code, fromName: value }));
      setFromSuggestions([]);
      setFromActiveIndex(-1);
    } else {
      setToQuery(value);
      setSearchParams(prev => ({ ...prev, to: station.code, toName: value }));
      setToSuggestions([]);
      setToActiveIndex(-1);
    }
  };

  const handleStationKeyDown = (event, field, suggestions, activeIndex, setActiveIndex) => {
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex(index => (index + delta + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      chooseStation(field, suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setActiveIndex(-1);
      field === 'from' ? setFromSuggestions([]) : setToSuggestions([]);
    }
  };

  const fromRef = useRef();
  const toRef = useRef();

  // Handle auto-complete for 'From'
  useEffect(() => {
    const controller = new AbortController();
    const fetchStations = async () => {
      if (fromQuery.length > 2 && fromQuery !== searchParams.fromName) {
        setLoadingFrom(true);
        setFromStationError('');
        try {
          const res = await axios.get('/api/trains/stations/autocomplete', { params: { query: fromQuery }, signal: controller.signal });
          setFromSuggestions(res.data);
          if (!res.data.length) setFromStationError('No matching station found. Try a station code or another spelling.');
        } catch (error) { if (!controller.signal.aborted) setFromStationError(error.response?.data?.message || 'Station suggestions are temporarily unavailable.'); }
        setLoadingFrom(false);
      } else {
        setFromSuggestions([]);
        setFromStationError('');
      }
    };
    const timeoutId = setTimeout(fetchStations, 300);
    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [fromQuery, searchParams.fromName]);

  // Handle auto-complete for 'To'
  useEffect(() => {
    const controller = new AbortController();
    const fetchStations = async () => {
      if (toQuery.length > 2 && toQuery !== searchParams.toName) {
        setLoadingTo(true);
        setToStationError('');
        try {
          const res = await axios.get('/api/trains/stations/autocomplete', { params: { query: toQuery }, signal: controller.signal });
          setToSuggestions(res.data);
          if (!res.data.length) setToStationError('No matching station found. Try a station code or another spelling.');
        } catch (error) { if (!controller.signal.aborted) setToStationError(error.response?.data?.message || 'Station suggestions are temporarily unavailable.'); }
        setLoadingTo(false);
      } else {
        setToSuggestions([]);
        setToStationError('');
      }
    };
    const timeoutId = setTimeout(fetchStations, 300);
    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [toQuery, searchParams.toName]);

  const handleSwap = () => {
    const tempQuery = fromQuery;
    const tempName = searchParams.fromName;
    const tempCode = searchParams.from;

    setFromQuery(toQuery);
    setSearchParams(prev => ({
      ...prev,
      fromName: prev.toName,
      from: prev.to
    }));

    setToQuery(tempQuery);
    setSearchParams(prev => ({
      ...prev,
      toName: tempName,
      to: tempCode
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchParams.from || !searchParams.to) {
      setSearchError('Choose both stations from the suggestions before searching.');
      return;
    }
    if (searchParams.from === searchParams.to) {
      setSearchError('Choose two different stations for your journey.');
      return;
    }
    setSearchError('');
    
    const route = { from: searchParams.from, fromName: searchParams.fromName, to: searchParams.to, toName: searchParams.toName, date, seatClass, passengerCount };
    const updatedRecent = [route, ...recentRoutes.filter(item => item.from !== route.from || item.to !== route.to)].slice(0, 5);
    setRecentRoutes(updatedRecent);
    localStorage.setItem(recentKey, JSON.stringify(updatedRecent));

    // Update context
    setSearchParams(prev => ({
      ...prev,
      date,
      seatClass,
      passengerCount
    }));

    // Navigate to search results
    navigate(`/search`);
  };

  // Quick dates
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-inner mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-12 md:py-16 lg:px-8">
          <div className="md:col-span-7">
            <div className="landing-kicker mb-5 text-xs font-semibold uppercase">
              PayanamX · Sample reservation service
            </div>
            <h1 className="landing-headline max-w-3xl text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Plan the journey.<br /><span>Choose your berth.</span>
            </h1>
            <p className="landing-copy mt-5 max-w-xl text-base leading-7 sm:text-lg">
              Search railway timetable data, explore route details, then review the reservation demo before checkout.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
              <span className="inline-flex items-center gap-2"><Search className="h-4 w-4 text-blue-600" /> Search routes</span>
              <span className="inline-flex items-center gap-2"><Train className="h-4 w-4 text-blue-600" /> Choose a coach</span>
              <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-blue-600" /> Assign each seat</span>
            </div>
          </div>

          <div className="hidden md:col-span-5 md:block">
            <div className="route-note ml-auto max-w-md p-6 border border-slate-200 bg-white rounded-2xl shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Route example</span>
                <span className="border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 rounded-md">Sample data</span>
              </div>
              <div className="mt-8 flex items-center justify-between gap-3">
                <div><p className="route-code text-3xl font-bold text-slate-900 font-heading">MAS</p><p className="mt-1 text-xs text-slate-500">Chennai</p></div>
                <div aria-hidden="true" className="flex flex-1 items-center px-2 text-blue-600">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  <span className="h-px flex-1 bg-slate-300" />
                  <Train className="h-4 w-4 shrink-0 text-blue-600" />
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                </div>
                <div className="text-right"><p className="route-code text-3xl font-bold text-slate-900 font-heading">CBE</p><p className="mt-1 text-xs text-slate-500">Coimbatore</p></div>
              </div>
              <div className="mt-8 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Timetable from RailRadar · fares and seat inventory are simulated.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Search Widget */}
      <div className="landing-search-wrap relative z-10 mx-auto mb-10 mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="trip-search-panel rounded-xl p-5 md:p-7 border border-slate-200 bg-white shadow-sm">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-5">
            <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">Journey details</p><h2 className="mt-1 font-heading text-2xl font-bold text-slate-900">Find a train</h2></div>
            <span className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 rounded-md">Railway timetable · simulated reservation</span>
          </div>
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            
            {/* From Station */}
            <div className="md:col-span-3 relative" ref={fromRef}>
              <label htmlFor="from-station" className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">From Station</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-[#6d28d9]" />
                <input
                  id="from-station"
                  type="text"
                  className="form-input pl-10 h-12 text-lg font-medium"
                  placeholder="E.g. NDLS or Delhi"
                  value={fromQuery}
                  onChange={(e) => {
                    setFromQuery(e.target.value);
                    setFromActiveIndex(-1);
                    setSearchParams(prev => ({ ...prev, from: '', fromName: '' }));
                  }}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={fromSuggestions.length > 0}
                  aria-controls="from-station-options"
                  aria-activedescendant={fromActiveIndex >= 0 ? `from-station-${fromActiveIndex}` : undefined}
                  onKeyDown={e => handleStationKeyDown(e, 'from', fromSuggestions, fromActiveIndex, setFromActiveIndex)}
                  required
                />
                {loadingFrom && <Loader2 className="absolute right-3 top-3 h-5 w-5 text-slate-400 animate-spin" />}
              </div>
              {fromStationError && fromQuery.length > 2 && <p role="status" className="mt-1 text-xs text-amber-900">{fromStationError}</p>}
              
              {fromSuggestions.length > 0 && (
                <div id="from-station-options" role="listbox" className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {fromSuggestions.map(station => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={fromSuggestions[fromActiveIndex]?.code === station.code}
                      id={`from-station-${fromSuggestions.indexOf(station)}`}
                      key={station.code}
                      className={`block w-full px-4 py-3 text-left hover:bg-violet-50 focus:bg-violet-50 focus:outline-none border-b border-slate-50 last:border-0 ${fromSuggestions[fromActiveIndex]?.code === station.code ? 'bg-violet-50' : ''}`}
                      onMouseEnter={() => setFromActiveIndex(fromSuggestions.indexOf(station))}
                      onClick={() => chooseStation('from', station)}
                    >
                      <div className="font-semibold text-slate-800">{station.name}</div>
                      <div className="text-xs text-slate-500">{station.code} - {station.state}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Button */}
            <div className="md:col-span-1 flex justify-center pb-2 hidden md:flex">
              <button
                type="button"
                onClick={handleSwap}
                className="p-3 bg-white hover:bg-violet-50 rounded-2xl border border-slate-200 text-slate-600 hover:text-[#6d28d9] transition shadow-sm"
              >
                <ArrowRightLeft className="h-5 w-5" />
              </button>
            </div>

            {/* To Station */}
            <div className="md:col-span-3 relative" ref={toRef}>
              <label htmlFor="to-station" className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">To Station</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-[#6d28d9]" />
                <input
                  id="to-station"
                  type="text"
                  className="form-input pl-10 h-12 text-lg font-medium"
                  placeholder="E.g. SBC or Bengaluru"
                  value={toQuery}
                  onChange={(e) => {
                    setToQuery(e.target.value);
                    setToActiveIndex(-1);
                    setSearchParams(prev => ({ ...prev, to: '', toName: '' }));
                  }}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={toSuggestions.length > 0}
                  aria-controls="to-station-options"
                  aria-activedescendant={toActiveIndex >= 0 ? `to-station-${toActiveIndex}` : undefined}
                  onKeyDown={e => handleStationKeyDown(e, 'to', toSuggestions, toActiveIndex, setToActiveIndex)}
                  required
                />
                {loadingTo && <Loader2 className="absolute right-3 top-3 h-5 w-5 text-slate-400 animate-spin" />}
              </div>
              {toStationError && toQuery.length > 2 && <p role="status" className="mt-1 text-xs text-amber-900">{toStationError}</p>}

              {toSuggestions.length > 0 && (
                <div id="to-station-options" role="listbox" className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {toSuggestions.map(station => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={toSuggestions[toActiveIndex]?.code === station.code}
                      id={`to-station-${toSuggestions.indexOf(station)}`}
                      key={station.code}
                      className={`block w-full px-4 py-3 text-left hover:bg-violet-50 focus:bg-violet-50 focus:outline-none border-b border-slate-50 last:border-0 ${toSuggestions[toActiveIndex]?.code === station.code ? 'bg-violet-50' : ''}`}
                      onMouseEnter={() => setToActiveIndex(toSuggestions.indexOf(station))}
                      onClick={() => chooseStation('to', station)}
                    >
                      <div className="font-semibold text-slate-800">{station.name}</div>
                      <div className="text-xs text-slate-500">{station.code} - {station.state}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="md:col-span-2">
              <label htmlFor="journey-date" className="block text-sm font-semibold text-slate-700 mb-2 uppercase tracking-wide">Journey Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input
                  id="journey-date"
                  type="date"
                  className="form-input pl-10 h-12 text-lg font-medium"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex space-x-2 mt-2">
                <button type="button" onClick={() => setDate(today)} className={`text-xs px-2 py-1 rounded ${date === today ? 'bg-[#6d28d9] text-white' : 'bg-slate-100 text-slate-600'}`}>Today</button>
                <button type="button" onClick={() => setDate(tomorrow)} className={`text-xs px-2 py-1 rounded ${date === tomorrow ? 'bg-[#6d28d9] text-white' : 'bg-slate-100 text-slate-600'}`}>Tomorrow</button>
              </div>
            </div>

            {/* Class & Passengers */}
            <div className="md:col-span-2">
              <span className="mb-2 block text-sm font-semibold uppercase tracking-wide text-slate-700">Class & Pax</span>
              <div className="flex space-x-2">
                <label className="sr-only" htmlFor="journey-class">Travel class</label>
                <select 
                  id="journey-class"
                  className="form-input h-12 w-1/2 text-center font-medium"
                  value={seatClass}
                  onChange={(e) => setSeatClass(e.target.value)}
                >
                  <option value="SL">SL</option>
                  <option value="3A">3A</option>
                  <option value="3E">3E</option>
                  <option value="2A">2A</option>
                  <option value="1A">1A</option>
                  <option value="CC">CC</option>
                  <option value="2S">2S</option>
                </select>
                <div className="relative w-1/2">
                  <label className="sr-only" htmlFor="passenger-count">Passengers</label>
                  <Users className="absolute left-2 top-3 h-5 w-5 text-slate-400" />
                  <input 
                    id="passenger-count"
                    type="number" 
                    min="1" 
                    max="6" 
                    className="form-input h-12 pl-8 pr-2 font-medium" 
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            </div>

            {/* Search Button */}
            {searchError && <p role="alert" className="md:col-span-12 -mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{searchError}</p>}
            <div className="md:col-span-1 flex items-start h-full pb-2 md:pb-0">
               <button type="submit" className="btn-primary w-full h-12 flex items-center justify-center rounded-xl text-lg mt-7">
                 <Search className="h-5 w-5 md:mr-0 lg:mr-2" />
                 <span className="hidden lg:block">Search</span>
               </button>
            </div>

          </form>
          {recentRoutes.length > 0 && <div className="mt-4"><p className="text-xs font-semibold text-slate-600 mb-2">Recently searched</p><div className="flex flex-wrap gap-2">{recentRoutes.map((route, index) => <div key={`${route.from}-${route.to}-${index}`} className="inline-flex items-center rounded-full border border-slate-200 bg-white text-xs text-slate-700"><button type="button" onClick={() => { setFromQuery(route.fromName); setToQuery(route.toName); setDate(route.date); setSeatClass(route.seatClass); setPassengerCount(route.passengerCount); setSearchParams(prev => ({ ...prev, ...route })); navigate('/search'); }} className="min-h-10 pl-3 pr-2 hover:text-violet-900">{route.fromName} → {route.toName} · {route.date}</button><button type="button" aria-label={`${favoriteRoutes.some(item => item.from === route.from && item.to === route.to) ? 'Remove' : 'Save'} favorite route ${route.fromName} to ${route.toName}`} aria-pressed={favoriteRoutes.some(item => item.from === route.from && item.to === route.to)} onClick={() => toggleFavoriteRoute(route)} className="min-h-10 min-w-10 rounded-full text-violet-800 hover:bg-violet-50"><Heart className={`mx-auto h-4 w-4 ${favoriteRoutes.some(item => item.from === route.from && item.to === route.to) ? 'fill-current' : ''}`} /></button></div>)}</div></div>}
          {favoriteRouteError && <p role="status" className="mt-2 text-xs text-amber-800">{favoriteRouteError}</p>}
          {favoriteRoutes.length > 0 && <div className="mt-5 border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-semibold text-slate-600">Favorite routes</p><div className="flex flex-wrap gap-2">{favoriteRoutes.map(route => <button key={`${route.from}-${route.to}`} type="button" onClick={() => { setFromQuery(route.fromName); setToQuery(route.toName); setDate(today); setSearchParams(prev => ({ ...prev, from: route.from, fromName: route.fromName, to: route.to, toName: route.toName, date: today })); navigate('/search'); }} className="min-h-10 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-950 hover:bg-violet-100">{route.fromName} → {route.toName}</button>)}</div></div>}
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-12">
        <div className="mb-9 border-b border-slate-200 pb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">How it works</p>
          <h2 className="font-heading text-3xl font-bold text-slate-900">Your choices stay in view</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card card-hover text-center space-y-4 border border-slate-200 bg-white p-8 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
            <div className="mx-auto bg-blue-50 border border-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center">
               <MapPin className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-heading">Choose Your Seat</h3>
            <p className="text-slate-600 text-sm leading-relaxed">Explore a coach layout and select the exact seat for each passenger. Sample inventory is held briefly at checkout.</p>
          </div>
          <div className="card card-hover text-center space-y-4 border border-slate-200 bg-white p-8 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
             <div className="mx-auto bg-blue-50 border border-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
               </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-heading">Simulated Checkout</h3>
            <p className="text-slate-600 text-sm leading-relaxed">Confirm a sample reservation in demo mode. No payment is collected.</p>
          </div>
          <div className="card card-hover text-center space-y-4 border border-slate-200 bg-white p-8 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
             <div className="mx-auto bg-blue-50 border border-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
               </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-heading">Sample Journey Status</h3>
            <p className="text-slate-600 text-sm leading-relaxed">Check the latest running-status information supplied by RailRadar.</p>
          </div>
        </div>
      </div>

    </div>
  );
}

