'use client';

import { useState } from 'react';
import { updateProfile, updatePassword } from './actions';

export default function ProfileForms({ user }: { user: any }) {
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileMsg({ type: '', text: '' });
    
    const formData = new FormData(e.currentTarget);
    const res = await updateProfile(formData);
    
    if (res.error) {
      setProfileMsg({ type: 'error', text: res.error });
    } else {
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    }
    setLoadingProfile(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingPwd(true);
    setPwdMsg({ type: '', text: '' });
    
    const formData = new FormData(e.currentTarget);
    const res = await updatePassword(formData);
    
    if (res.error) {
      setPwdMsg({ type: 'error', text: res.error });
    } else {
      setPwdMsg({ type: 'success', text: 'Password updated successfully!' });
      (e.target as HTMLFormElement).reset();
    }
    setLoadingPwd(false);
  };

  return (
    <div className="space-y-8">
      {/* Basic Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
        <form onSubmit={handleProfileUpdate as any} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
              <input 
                type="email" 
                value={user.email} 
                disabled 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-2">Email cannot be changed.</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
              <input 
                type="text" 
                name="fullName"
                defaultValue={user.user_metadata?.full_name || ''} 
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number (Optional)</label>
              <input 
                type="tel" 
                name="phone"
                defaultValue={user.user_metadata?.phone || ''} 
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {profileMsg.text && (
            <div className={`p-4 rounded-xl text-sm font-medium ${profileMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {profileMsg.text}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={loadingProfile}
              className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loadingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Security</h2>
        <form onSubmit={handlePasswordUpdate as any} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
              <input 
                type="password" 
                name="password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
                minLength={6}
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Confirm New Password</label>
              <input 
                type="password" 
                name="confirmPassword"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
                minLength={6}
              />
            </div>
          </div>

          {pwdMsg.text && (
            <div className={`p-4 rounded-xl text-sm font-medium ${pwdMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {pwdMsg.text}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={loadingPwd}
              className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50"
            >
              {loadingPwd ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
