import React, { useContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Train, LayoutDashboard, MapPin, Search, User, LogOut, Shield, Menu, X, Bell } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    if (!user) return;
    try { const response = await api.get('/api/auth/notifications'); setNotifications(response.data.notifications || []); }
    catch { setNotifications([]); }
  };
  useEffect(() => { loadNotifications(); }, [user?.id, user?._id]);

  const markRead = async (notification) => {
    if (notification.read) return;
    try { await api.put(`/api/auth/notifications/${notification._id}/read`); setNotifications(current => current.map(item => item._id === notification._id ? { ...item, read: true } : item)); }
    catch { /* keep the notice unread so the user can retry */ }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(item => !item.read);
    try {
      await Promise.all(unread.map(item => api.put(`/api/auth/notifications/${item._id}/read`)));
      setNotifications(current => current.map(item => ({ ...item, read: true })));
    } catch { /* retain unread indicators if one update fails */ }
  };

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, authRequired: true },
    { name: 'Live Tracker', path: '/tracker', icon: MapPin, authRequired: false },
    { name: 'PNR Checker', path: '/pnr', icon: Search, authRequired: false }
  ];

  return (
    <nav className="site-nav sticky top-0 z-40 border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="brand-link flex items-center space-x-2 text-primary">
              <div className="brand-mark rounded-md border p-2">
                <Train className="h-5 w-5" />
              </div>
              <span className="brand-name font-heading font-semibold text-xl tracking-tight">
              PayanamX
              </span>
            </Link>
          </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => {
                if (link.authRequired && !user) return null;
                const Icon = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive(link.path)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-blue-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}

              {/* Admin Portal Shortcut */}
              {user && user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/admin')
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold'
                      : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              )}
            </div>

            {/* Action Buttons & Profile */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  {/* Notification Bell */}
                  <div className="relative">
                    <button 
                      onClick={() => { const open = !notifOpen; setNotifOpen(open); if (open) loadNotifications(); }}
                      aria-label={`Notifications${notifications.some(item => !item.read) ? ', unread items' : ''}`}
                      aria-expanded={notifOpen}
                      aria-haspopup="true"
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"
                    >
                      <Bell className="h-5 w-5" />
                      {notifications.some(item => !item.read) && <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />}
                    </button>
                    
                    {notifOpen && (
                      <div role="region" aria-label="Recent notifications" className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-slate-100 text-sm">
                          <span className="font-semibold text-slate-900">Recent Notifications</span>
                          {notifications.some(item => !item.read) && <button type="button" onClick={markAllRead} className="min-h-9 text-xs font-semibold text-blue-600 hover:underline">Mark all read</button>}
                        </div>
                        <div className="max-h-60 overflow-y-auto px-4 py-2 text-xs text-slate-600 space-y-2">
                          {notifications.length ? notifications.map(notification => <button key={notification._id} onClick={() => markRead(notification)} className={`block w-full text-left p-2 rounded-lg border ${notification.read ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-blue-50/60 border-blue-100 text-slate-800'}`}><p className="font-semibold text-blue-900">{notification.title}</p><p className="text-slate-600">{notification.message}</p></button>) : <p className="py-4 text-center text-slate-500">No notifications yet.</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Dropdown / Profile Link */}
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 rounded-full border border-slate-200 bg-slate-50 p-1 pr-3 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt="Avatar"
                        className="h-8 w-8 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-slate-800">{user.name.split(' ')[0]}</span>
                  </Link>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/login"
                    className="text-slate-600 hover:text-blue-700 text-sm font-medium px-3 py-2 transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="nav-mobile md:hidden border-t border-slate-200 bg-white py-3 px-4 space-y-2">
          {navLinks.map((link) => {
            if (link.authRequired && !user) return null;
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 w-full p-2.5 rounded-lg text-base font-medium ${
                  isActive(link.path)
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                    : 'text-slate-700 hover:text-blue-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          {user && user.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 w-full p-2.5 rounded-lg text-base font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 font-semibold"
            >
              <Shield className="h-5 w-5" />
              <span>Admin Panel</span>
            </Link>
          )}

          {user && (
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 w-full p-2.5 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700"
            >
              <User className="h-5 w-5" />
              <span>My Profile</span>
            </Link>
          )}

          <div className="pt-4 border-t border-slate-200 flex flex-col space-y-2">
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center justify-center space-x-2 w-full p-2.5 rounded-lg text-base font-medium bg-red-600 hover:bg-red-700 text-white"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full p-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-full p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

