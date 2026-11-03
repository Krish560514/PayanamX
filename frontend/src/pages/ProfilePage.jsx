import React, { useState, useContext, useEffect } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { User, Lock, Mail, Phone, Shield, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user, checkAuth } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('profile');

  // Profile State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savedTravellers, setSavedTravellers] = useState([]);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setSavedTravellers(user.savedTravellers || []);
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileMessage('');

    if (!name.trim()) {
      return setProfileError('Enter your full name.');
    }

    if (phone && !/^[+\d\s()-]{7,20}$/.test(phone)) {
      return setProfileError('Enter a valid phone number.');
    }

    if (
      savedTravellers.some(
        p =>
          !p.name?.trim() ||
          !Number.isInteger(Number(p.age)) ||
          Number(p.age) < 1 ||
          Number(p.age) > 120 ||
          !['Male', 'Female', 'Other'].includes(p.gender)
      )
    ) {
      return setProfileError(
        'Complete each saved passenger name, age, and gender or remove that passenger.'
      );
    }

    setSavingProfile(true);

    try {
      const res = await api.put('/api/auth/profile', {
        name,
        phone,
        savedTravellers
      });

      if (res.data.success) {
        setProfileMessage('Profile updated successfully');
        await checkAuth();
      }
    } catch (err) {
      setProfileError(
        err.response?.data?.message || 'Failed to update profile'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      return setPasswordError('New passwords do not match');
    }

    setSavingPassword(true);

    try {
      const res = await api.put('/api/auth/change-password', {
        currentPassword,
        newPassword
      });

      if (res.data.success) {
        setPasswordMessage('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || 'Failed to update password'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <h1 className="text-3xl font-bold font-heading text-slate-800 mb-8">
          Account Settings
        </h1>

        <div className="flex flex-col md:flex-row gap-8">

          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

              <div className="p-6 text-center border-b border-slate-100 bg-slate-50">
                <div
                  aria-hidden="true"
                  className="w-24 h-24 bg-gradient-to-br from-violet-700 to-violet-950 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-violet-900/20"
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <h3 className="font-bold text-slate-800">{user.name}</h3>
                <p className="text-xs text-slate-500">{user.role}</p>
              </div>

              <div className="p-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-3 transition ${
                    activeTab === 'profile'
                      ? 'bg-violet-50 text-[#6d28d9]'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Personal Details</span>
                </button>

                <button
                  onClick={() => setActiveTab('password')}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center space-x-3 transition ${
                    activeTab === 'password'
                      ? 'bg-violet-50 text-[#6d28d9]'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Security</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">

            {activeTab === 'profile' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800">
                    Personal Details
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Update your personal information and contact details.
                  </p>
                </div>

                <div className="p-6">
                  {profileError && (
                    <div
                      role="alert"
                      className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-xl font-medium"
                    >
                      {profileError}
                    </div>
                  )}

                  {profileMessage && (
                    <div className="mb-6 p-3 bg-violet-50 text-violet-700 text-sm rounded font-medium">
                      {profileMessage}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                      <div className="space-y-1.5">
                        <label
                          htmlFor="profile-name"
                          className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
                        >
                          Full Name
                        </label>

                        <div className="relative">
                          <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                          <input
                            id="profile-name"
                            type="text"
                            autoComplete="name"
                            maxLength="100"
                            className="form-input pl-10"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="profile-email"
                          className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
                        >
                          Email Address
                        </label>

                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                          <input
                            id="profile-email"
                            type="email"
                            autoComplete="email"
                            className="form-input pl-10 bg-slate-50 text-slate-500 cursor-not-allowed"
                            value={user.email}
                            disabled
                          />
                        </div>

                        <p className="text-[10px] text-slate-400">
                          Email cannot be changed.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="profile-phone"
                          className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
                        >
                          Phone Number
                        </label>

                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                          <input
                            id="profile-phone"
                            type="tel"
                            autoComplete="tel"
                            inputMode="tel"
                            maxLength="20"
                            className="form-input pl-10"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            aria-describedby="profile-phone-help"
                          />
                        </div>

                        <p
                          id="profile-phone-help"
                          className="text-[10px] text-slate-400"
                        >
                          Include country code if needed.
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h3 className="font-bold text-slate-800">
                            Saved passengers
                          </h3>
                          <p className="text-xs text-slate-500">
                            Keep frequently used passenger details for later bookings.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSavedTravellers([
                              ...savedTravellers,
                              { name: '', age: '', gender: 'Male' }
                            ])
                          }
                          disabled={savedTravellers.length >= 20}
                          className="text-sm font-semibold text-[#6d28d9] disabled:opacity-40"
                        >
                          Add passenger
                        </button>
                      </div>

                      <div className="space-y-3">
                        {savedTravellers.map((traveller, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                          >
                            <input
                              aria-label={`Saved passenger ${index + 1} full name`}
                              autoComplete="off"
                              maxLength="100"
                              className="form-input sm:col-span-6"
                              placeholder="Full name"
                              value={traveller.name}
                              onChange={e =>
                                setSavedTravellers(
                                  savedTravellers.map((p, i) =>
                                    i === index
                                      ? { ...p, name: e.target.value }
                                      : p
                                  )
                                )
                              }
                            />

                            <input
                              aria-label={`Saved passenger ${index + 1} age`}
                              className="form-input sm:col-span-2"
                              type="number"
                              min="1"
                              max="120"
                              placeholder="Age"
                              value={traveller.age}
                              onChange={e =>
                                setSavedTravellers(
                                  savedTravellers.map((p, i) =>
                                    i === index
                                      ? { ...p, age: e.target.value }
                                      : p
                                  )
                                )
                              }
                            />

                            <select
                              aria-label={`Saved passenger ${index + 1} gender`}
                              className="form-input sm:col-span-3"
                              value={traveller.gender}
                              onChange={e =>
                                setSavedTravellers(
                                  savedTravellers.map((p, i) =>
                                    i === index
                                      ? { ...p, gender: e.target.value }
                                      : p
                                  )
                                )
                              }
                            >
                              <option>Male</option>
                              <option>Female</option>
                              <option>Other</option>
                            </select>

                            <button
                              type="button"
                              aria-label={`Remove saved passenger ${index + 1}`}
                              onClick={() =>
                                setSavedTravellers(
                                  savedTravellers.filter((_, i) => i !== index)
                                )
                              }
                              className="min-h-11 rounded-lg px-2 text-red-700 hover:bg-red-50 sm:col-span-1"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="btn-primary py-2.5 px-6 flex items-center"
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-800">
                    Change Password
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Ensure your account is using a long, random password to stay secure.
                  </p>
                </div>

                <div className="p-6">
                  {passwordError && (
                    <div
                      role="alert"
                      className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-xl font-medium"
                    >
                      {passwordError}
                    </div>
                  )}

                  {passwordMessage && (
                    <div className="mb-6 p-3 bg-violet-50 text-violet-700 text-sm rounded font-medium">
                      {passwordMessage}
                    </div>
                  )}

                  <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-md">

                    <div className="space-y-1.5">
                      <label
                        htmlFor="current-password"
                        className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
                      >
                        Current Password
                      </label>

                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input
                          id="current-password"
                          type="password"
                          autoComplete="current-password"
                          className="form-input pl-10"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="new-password"
                        className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
                      >
                        New Password
                      </label>

                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input
                          id="new-password"
                          type="password"
                          autoComplete="new-password"
                          className="form-input pl-10"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          minLength="8"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="confirm-password"
                        className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
                      >
                        Confirm New Password
                      </label>

                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                        <input
                          id="confirm-password"
                          type="password"
                          autoComplete="new-password"
                          className="form-input pl-10"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          minLength="8"
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={savingPassword}
                        className="btn-primary py-2.5 px-6 flex items-center w-full justify-center"
                      >
                        {savingPassword ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}