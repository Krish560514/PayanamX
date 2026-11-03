import React from 'react';
import { Train, ExternalLink, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2 text-white">
              <Train className="h-6 w-6 text-blue-500" />
              <span className="font-heading font-bold text-xl tracking-tight text-white">
                PayanamX
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">
              PayanamX is a train reservation demonstration with sample timetables, user-selected seats, and simulated booking status.
            </p>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-violet-500" />
              <span>Simulated payment only · no real charge</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="/dashboard" className="hover:text-white transition">My Dashboard</a></li>
              <li><a href="/tracker" className="hover:text-white transition">Running Status</a></li>
              <li><a href="/pnr" className="hover:text-white transition">PNR Status</a></li>
              <li><a href="/profile" className="hover:text-white transition">User Account</a></li>
            </ul>
          </div>

          {/* Help & Support */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Help & Support</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#about" className="hover:text-white transition">About Us</a></li>
              <li><a href="#faq" className="hover:text-white transition">FAQs</a></li>
              <li><a href="#terms" className="hover:text-white transition">Terms of Service</a></li>
              <li><a href="#contact" className="hover:text-white transition">Contact Support</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 space-y-4 md:space-y-0">
          <p>© 2026 PayanamX booking demo.</p>
        </div>
      </div>
    </footer>
  );
}

