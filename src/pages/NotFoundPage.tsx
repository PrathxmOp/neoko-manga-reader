import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Home, Compass, BookOpen, Clock, Layers, Search, ArrowLeft, Sparkles } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Neon Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#9d86e9]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full text-center relative z-10 flex flex-col items-center">
        
        {/* Animated 404 Visual Header */}
        <div className="relative mb-6 group cursor-default">
          <div className="text-[7rem] sm:text-[9rem] font-display font-black leading-none tracking-tighter bg-gradient-to-r from-[#9d86e9] via-purple-400 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(157,134,233,0.3)] animate-pulse">
            404
          </div>
          <div className="absolute -top-3 -right-6 sm:-right-8 px-3 py-1 bg-[#1e1b38] border border-[#9d86e9]/40 rounded-full text-xs font-semibold text-[#9d86e9] shadow-lg flex items-center gap-1.5 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            Chapter Not Found
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white mb-3">
          Lost in Another Dimension?
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-md mb-8 leading-relaxed">
          The chapter or page you are looking for has been moved, renamed, or redacted from this realm.
        </p>

        {/* Quick Search Bar */}
        <form 
          onSubmit={handleSearchSubmit} 
          className="w-full max-w-md mb-8 relative flex items-center"
        >
          <Search className="absolute left-4 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search manga title or genre..."
            className="w-full pl-11 pr-24 py-3 rounded-2xl bg-[#161327]/80 border border-[#2b2746] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#9d86e9] focus:ring-2 focus:ring-[#9d86e9]/20 transition-all backdrop-blur-md"
          />
          <button
            type="submit"
            className="absolute right-2 px-3.5 py-1.5 rounded-xl bg-[#9d86e9] hover:bg-[#8b72e0] text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            Search
          </button>
        </form>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-[#9d86e9] hover:bg-[#8b72e0] text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#9d86e9]/20 transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            to="/browse"
            className="px-5 py-2.5 rounded-xl bg-[#1d1936] hover:bg-[#272247] border border-[#2b2746] text-white font-semibold text-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Compass className="w-4 h-4 text-[#9d86e9]" />
            Browse Manga
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-semibold text-sm flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Quick Links Section */}
        <div className="w-full pt-8 border-t border-[#231f3c]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Popular Destinations
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/library"
              className="p-3.5 rounded-2xl bg-[#141126]/60 hover:bg-[#1c1836] border border-[#262242] text-left transition-all group flex flex-col gap-1"
            >
              <BookOpen className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform mb-1" />
              <span className="text-xs font-bold text-white">My Library</span>
              <span className="text-[11px] text-slate-400">Saved titles</span>
            </Link>

            <Link
              to="/updates"
              className="p-3.5 rounded-2xl bg-[#141126]/60 hover:bg-[#1c1836] border border-[#262242] text-left transition-all group flex flex-col gap-1"
            >
              <Sparkles className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1" />
              <span className="text-xs font-bold text-white">Updates</span>
              <span className="text-[11px] text-slate-400">Latest releases</span>
            </Link>

            <Link
              to="/history"
              className="p-3.5 rounded-2xl bg-[#141126]/60 hover:bg-[#1c1836] border border-[#262242] text-left transition-all group flex flex-col gap-1"
            >
              <Clock className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform mb-1" />
              <span className="text-xs font-bold text-white">History</span>
              <span className="text-[11px] text-slate-400">Recent reads</span>
            </Link>

            <Link
              to="/collections"
              className="p-3.5 rounded-2xl bg-[#141126]/60 hover:bg-[#1c1836] border border-[#262242] text-left transition-all group flex flex-col gap-1"
            >
              <Layers className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform mb-1" />
              <span className="text-xs font-bold text-white">Collections</span>
              <span className="text-[11px] text-slate-400">Custom lists</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NotFoundPage;
