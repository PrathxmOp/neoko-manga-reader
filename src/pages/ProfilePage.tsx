import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getHistory, getBookmarks } from '../services/storage';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Edit3, BookOpen, Clock, Star, Settings, ChevronRight } from 'lucide-react';

const AVATARS = ['🔮', '⚡', '🔥', '🌸', '🎭', '🐉', '🌙', '💎', '🎨', '🦊', '🌊', '⭐'];

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  useBodyScrollLock(isEditing);
  const [editName, setEditName] = useState(user?.username || 'Reader');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '🔮');

  const history = getHistory();
  const bookmarks = getBookmarks();
  const chaptersRead = history.length;
  const mangaInLibrary = bookmarks.length;
  const readingTime = Math.round(chaptersRead * 4.5);

  const handleSave = () => {
    updateProfile({ username: editName.trim() || 'Reader', avatar: editAvatar });
    setIsEditing(false);
  };

  const stats = [
    { label: 'Chapters Read', value: chaptersRead, icon: BookOpen, color: 'text-primary' },
    { label: 'In Library', value: mangaInLibrary, icon: Star, color: 'text-secondary' },
    { label: 'Reading Time', value: `${readingTime}m`, icon: Clock, color: 'text-tertiary' },
  ];

  return (
    <main className="flex flex-col relative w-full pt-20 pb-28 px-gutter-mobile max-w-3xl mx-auto space-y-space-xl animate-fade-in">
      {/* Profile Card */}
      <div className="glass-panel-strong rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        
        <div className="relative z-10 flex flex-col items-center gap-4">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-3xl bg-surface-container-high flex items-center justify-center text-5xl shadow-glow-primary border-2 border-primary/20">
            {editAvatar || user?.avatar || '🔮'}
          </div>

          {/* Name */}
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl text-on-surface">{user?.username || 'Reader'}</h1>
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold">
              NEOKO Reader
            </span>
          </div>

          {/* Edit Button */}
          <button
            onClick={() => setIsEditing(true)}
            className="px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-bold text-xs flex items-center gap-2 border border-surface-container-highest transition-colors"
          >
            <Edit3 className="w-4 h-4 text-primary" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="p-4 rounded-2xl bg-surface-container border border-surface-container-high flex flex-col items-center text-center gap-2">
              <Icon className={`w-5 h-5 ${stat.color}`} />
              <span className="font-display font-extrabold text-xl text-on-surface">{stat.value}</span>
              <span className="text-[11px] text-outline font-semibold">{stat.label}</span>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="flex flex-col gap-2">
        <button onClick={() => navigate('/settings')} className="p-4 rounded-2xl bg-surface-container border border-surface-container-high hover:border-primary/40 flex items-center justify-between transition-all">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-primary" />
            <span className="font-sans text-sm font-semibold text-on-surface">Settings & Preferences</span>
          </div>
          <ChevronRight className="w-4 h-4 text-outline" />
        </button>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in" onClick={() => setIsEditing(false)}>
          <div className="w-full max-w-md glass-panel-strong rounded-3xl p-6 space-y-5 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h2 className="font-display font-extrabold text-xl text-on-surface">Edit Profile</h2>

            <div className="space-y-3">
              <label className="font-sans text-xs font-bold text-on-surface">Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map(avatar => (
                  <button
                    key={avatar}
                    onClick={() => setEditAvatar(avatar)}
                    className={`w-full aspect-square rounded-2xl text-2xl flex items-center justify-center transition-all ${
                      editAvatar === avatar ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-surface-container-high hover:scale-105'
                    }`}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-sans text-xs font-bold text-on-surface">Display Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-3 text-on-surface font-sans text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-glow-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ProfilePage;
