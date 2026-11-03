import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AlertTriangle, Loader2, Navigation, Search } from 'lucide-react';

export default function LiveTrackerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTrain = searchParams.get('train') || '';
  const initialDate = searchParams.get('date') || new Date().toLocaleDateString('en-CA');
  const [train, setTrain] = useState(initialTrain);
  const [date, setDate] = useState(initialDate);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialTrain) return undefined;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/tracker/${encodeURIComponent(initialTrain)}/status`, { params: { date: initialDate } });
        if (active) { setData(response.data); setError(''); }
      } catch (err) {
        if (active) { setData(null); setError(err.response?.data?.message || 'Live tracking data unavailable.'); }
      } finally { if (active) setLoading(false); }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [initialTrain, initialDate]);

  const live = data?.data || {};
  const route = live.route || [];
  const currentIndex = live.currentLocation?.sequence || 0;

  return <main className="min-h-screen bg-slate-50 py-8"><div className="mx-auto max-w-4xl px-4">
    <section className="mb-6 flex flex-col gap-4 rounded-2xl bg-[#4c1d95] p-6 text-white md:flex-row md:items-center md:justify-between">
      <div><h1 className="flex items-center text-2xl font-bold"><Navigation className="mr-2 h-6 w-6 text-[#d8ef73]" />Live Train Status</h1><p className="mt-1 text-sm text-slate-300">Live running status from RailRadar · refreshed every 30 seconds</p></div>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (train && date) setSearchParams({ train, date }); }}>
        <input aria-label="Train number" className="form-input w-32 text-sm text-slate-900" placeholder="Train number" value={train} onChange={e => setTrain(e.target.value)} required />
        <input aria-label="Journey date" type="date" className="form-input w-40 text-sm text-slate-900" value={date} onChange={e => setDate(e.target.value)} required />
        <button className="btn-primary px-4" type="submit" aria-label="Search"><Search className="h-4 w-4" /></button>
      </form>
    </section>
    {loading && !data && <div className="flex justify-center py-16"><Loader2 className="h-9 w-9 animate-spin text-violet-700" /></div>}
    {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700"><AlertTriangle className="h-5 w-5" />{error}</div>}
    {data && <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-800">{live.trainName || live.train?.name} ({live.trainNumber || live.train?.number})</h2><p className="text-sm text-slate-500">Run date: {live.startDate || date}</p></div><span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-bold capitalize text-violet-800">{live.status || 'Status unavailable'}{live.isLive === false ? ' · not live' : ''}</span></div>
      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Current location</p><p className="font-semibold">{live.currentLocation?.stationName || live.currentLocation?.stationCode || 'Unavailable'}</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Delay</p><p className="font-semibold">{live.delayMinutes == null ? 'Unavailable' : `${live.delayMinutes} min`}</p></div><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Next halt</p><p className="font-semibold">{live.nextHalt?.stationName || live.nextHalt?.stationCode || 'None reported'}</p></div></div>
      {live.currentLocation?.speedKmh != null && <p className="text-sm text-slate-600">Speed: {live.currentLocation.speedKmh} km/h</p>}
      {live.exceptions?.length > 0 && <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{live.exceptions.map((item, i) => <p key={i}>{item.message || item.type || JSON.stringify(item)}</p>)}</div>}
      <div><p className="mb-3 text-sm text-slate-500">Last updated: {live.lastUpdatedAt ? new Date(live.lastUpdatedAt).toLocaleString() : 'Not provided'}</p><h3 className="mb-3 font-bold text-slate-800">Route status</h3><ol className="space-y-2">{route.map((stop, i) => <li key={`${stop.stationCode}-${stop.sequence || i}`} className={`flex justify-between rounded-lg p-3 ${stop.sequence === currentIndex ? 'bg-violet-50 font-semibold text-violet-900' : 'bg-slate-50 text-slate-700'}`}><span>{stop.stationName} <span className="text-xs text-slate-500">{stop.stationCode}</span></span><span className="text-sm capitalize">{stop.status || 'Scheduled'}</span></li>)}</ol></div>
      <p className="text-xs text-slate-500">Source: {data.dataSource}. Live service availability and update times depend on the provider feed.</p>
    </section>}
  </div></main>;
}
