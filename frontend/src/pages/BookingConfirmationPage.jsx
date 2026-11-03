import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Download, Loader2, Ticket } from 'lucide-react';

export default function BookingConfirmationPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    axios.get(`/api/bookings/${encodeURIComponent(id)}`)
      .then(({ data }) => { if (active) setBooking(data.booking); })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Could not load this booking confirmation.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const downloadTicket = async () => {
    if (!booking) return;
    setDownloading(true);
    setError('');
    try {
      const response = await axios.get(`/api/bookings/${encodeURIComponent(id)}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `The_One_Rail_Simulated_PNR_${booking.pnr}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) { setError(err.response?.data?.message || 'Could not download this simulated ticket.'); }
    finally { setDownloading(false); }
  };

  if (loading) return <main className="min-h-[70vh] flex items-center justify-center" role="status"><Loader2 className="h-8 w-8 animate-spin text-violet-700" /><span className="sr-only">Loading booking confirmation</span></main>;

  return <div className="min-h-screen px-4 py-10 sm:py-14">
    <div className="mx-auto max-w-3xl">
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {!booking ? <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><Ticket className="mx-auto mb-3 h-10 w-10 text-slate-400" /><h1 className="text-xl font-bold">Booking unavailable</h1><p className="mt-2 text-sm text-slate-600">Return to your bookings to view reservations linked to your account.</p><Link to="/dashboard" className="btn-primary mt-5">My bookings</Link></section> : <>
        <section className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-premium">
          <div className="bg-[#4c1d95] p-7 text-white sm:p-9">
            <div className="flex items-start gap-4"><span className="rounded-2xl bg-[#d8ef73] p-3 text-[#4c1d95]"><CheckCircle2 className="h-7 w-7" /></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d8ef73]">Simulated reservation</p><h1 className="mt-1 font-heading text-2xl font-bold sm:text-3xl">Booking confirmed</h1><p className="mt-2 text-sm text-white/75">Your selected sample seats have been saved.</p></div></div>
            <div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-3"><div><p className="text-xs text-white/65">Simulated PNR</p><p className="mt-1 font-mono text-xl font-bold">{booking.pnr}</p></div><div><p className="text-xs text-white/65">Booking ID</p><p className="mt-1 font-mono text-sm font-semibold">{booking.bookingId}</p></div><div className="col-span-2 sm:col-span-1"><p className="text-xs text-white/65">Status</p><p className="mt-1 font-semibold">{booking.status}</p></div></div>
          </div>
          <div className="space-y-6 p-6 sm:p-8">
            <section><p className="text-xs font-bold uppercase tracking-wider text-violet-800">Journey</p><h2 className="mt-1 text-xl font-bold">{booking.train?.trainNumber} · {booking.train?.name}</h2><p className="mt-2 text-sm text-slate-700">{booking.source?.name} ({booking.source?.code}) → {booking.destination?.name} ({booking.destination?.code})</p><p className="mt-1 text-sm text-slate-600">{booking.date} · {booking.seatClass} · Total ₹{booking.totalFare}</p></section>
            <section><h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-600">Passengers and selected seats</h2><div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{booking.passengers?.map((passenger, index) => <div key={`${passenger.coach}-${passenger.seatNumber}-${index}`} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"><span className="font-medium">{passenger.name} · Age {passenger.age} · {passenger.gender}</span><span className="font-semibold text-violet-900">{passenger.coach}/{passenger.seatNumber} · {passenger.seatType}</span></div>)}</div></section>
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">This is a simulated project reservation. The PNR and PDF are not valid for travel and do not represent an Indian Railways ticket.</p>
            <div className="flex flex-col gap-3 sm:flex-row"><button type="button" onClick={downloadTicket} disabled={downloading} className="btn-primary min-h-11 flex-1 gap-2 disabled:opacity-60">{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{downloading ? 'Preparing ticket…' : 'Download simulated ticket'}</button><Link to="/dashboard" className="btn-secondary min-h-11 flex-1">Go to my bookings</Link></div>
          </div>
        </section>
      </>}
    </div>
  </div>;
}
