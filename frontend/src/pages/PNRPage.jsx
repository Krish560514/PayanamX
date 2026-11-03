import React, { useState, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Search, AlertTriangle } from 'lucide-react';

export default function PNRPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPnr = searchParams.get('query') || '';
  const { user } = useContext(AuthContext);
  
  const [pnrInput, setPnrInput] = useState(initialPnr);
  const [searching, setSearching] = useState(false);
  const [pnrResult, setPnrResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!pnrInput || pnrInput.length !== 10) {
      setPnrResult(null);
      setError('Enter all 10 digits of the simulated PNR.');
      return;
    }
    setSearchParams({ query: pnrInput });
    setSearching(true);
    setError('');
    setPnrResult(null);
    axios.get(`/api/bookings/pnr/${pnrInput}`)
      .then(({ data }) => setPnrResult(data.booking))
      .catch(err => setError(err.response?.status === 401 ? 'Sign in to the account that made this booking to view its simulated PNR.' : err.response?.data?.message || 'No booking found for that PNR.'))
      .finally(() => setSearching(false));
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-[#4c1d95] rounded-2xl shadow-lg p-8 text-center text-white mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
             <Search className="h-8 w-8 text-[#d8ef73]" />
          </div>
          <h1 className="text-3xl font-bold font-heading mb-2">Check PNR Status</h1>
          <p className="text-slate-300">Look up a simulated project booking and its selected seats. This is not a railway PNR enquiry.</p>
          
          <form onSubmit={handleSearch} className="mt-8 max-w-md mx-auto relative">
            <label className="sr-only" htmlFor="simulated-pnr">10-digit simulated PNR</label>
            <input 
              id="simulated-pnr"
              type="text" 
              inputMode="numeric"
              autoComplete="off"
              aria-describedby="pnr-help"
              className="w-full pl-6 pr-32 py-4 rounded-full text-slate-900 text-lg font-bold tracking-widest shadow-inner focus:outline-none focus:ring-2 focus:ring-[#6d28d9]"
              placeholder="Enter 10-digit PNR"
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
            <button 
              type="submit" 
              disabled={searching}
              className="absolute right-2 top-2 bottom-2 bg-[#6d28d9] hover:bg-[#115e59] text-white font-semibold rounded-full px-6 transition disabled:opacity-70"
            >
              {searching ? 'Checking...' : 'Check'}
            </button>
          </form>
          <p id="pnr-help" className="mt-2 text-xs text-slate-300" aria-live="polite">{pnrInput.length}/10 digits · simulated project bookings only</p>
        </div>

        {error && !error.includes('No booking') && <div role="alert" className="bg-red-50 rounded-xl border border-red-200 p-4 text-center text-red-800">{error}{!user && error.includes('Sign in') && <div className="mt-3"><Link className="font-semibold underline" to="/login">Sign in</Link></div>}</div>}
        {pnrResult && <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs uppercase text-slate-500">Simulated PNR</p><h2 className="text-2xl font-bold">{pnrResult.pnr}</h2></div><span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-sm h-fit">{pnrResult.status}</span></div>
          <p className="mt-4 font-semibold">{pnrResult.train?.trainNumber} · {pnrResult.train?.name}</p>
          <p className="text-sm text-slate-600">{pnrResult.source?.name} → {pnrResult.destination?.name} · {pnrResult.date} · {pnrResult.seatClass}</p>
          <div className="mt-4 divide-y">{pnrResult.passengers?.map((p, i) => <p key={i} className="py-2 text-sm">{p.name} · {p.coach} / {p.seatNumber} ({p.seatType})</p>)}</div>
          <p className="text-xs text-amber-700 mt-4">Sample reservation only · not valid for travel.</p>
        </div>}

        {error.includes('No booking') && !searching && (
          <div role="status" className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">PNR Not Found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              We couldn't find any booking details for PNR <strong>{pnrInput}</strong>. 
              Please verify the number or log in to your dashboard to view your tickets securely.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
