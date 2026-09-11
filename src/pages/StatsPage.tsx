import React, { useState, useEffect } from 'react';
import { getReadingStats, resetReadingStats } from '../services/storage';
import { getSiteStats } from '../services/suwayomiApi';
import { ReadingStats, SiteStats } from '../types/manga';
import { BarChart3, Flame, Clock, BookOpen, Sparkles, Trophy, Calendar, Award, RotateCcw, Database, Layers, Radio, Library, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<ReadingStats>(getReadingStats());
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);
  const [siteStatsLoading, setSiteStatsLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    document.title = 'Reading Stats — NEOKO';
  }, []);

  useEffect(() => {
    const handleStatsChange = () => {
      setStats(getReadingStats());
    };
    window.addEventListener('neoko_stats_changed', handleStatsChange);
    return () => window.removeEventListener('neoko_stats_changed', handleStatsChange);
  }, []);

  useEffect(() => {
    loadSiteStats();
  }, []);

  const loadSiteStats = async () => {
    setSiteStatsLoading(true);
    try {
      const data = await getSiteStats();
      setSiteStats(data);
    } catch (e) {
      console.error('Failed to load site stats:', e);
    } finally {
      setSiteStatsLoading(false);
    }
  };

  const handleResetStats = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    const reset = resetReadingStats();
    setStats(reset);
    setShowResetConfirm(false);
  };

  const totalHours = Math.floor(stats.totalReadingTimeMinutes / 60);
  const remainingMins = stats.totalReadingTimeMinutes % 60;

  // Genre breakdown array sorted by count
  const sortedGenres = Object.entries(stats.genresRead || {})
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);

  const topGenre = sortedGenres.length > 0 ? sortedGenres[0].genre : 'N/A';
  const totalGenreReads = sortedGenres.reduce((acc, curr) => acc + curr.count, 0) || 1;

  // Last 7 days dates array
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const maxDailyCount = Math.max(1, ...last7Days.map(date => stats.historyByDate[date] || 0));

  // Format large numbers with abbreviations
  const formatCount = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
    if (n >= 1_000) return n.toLocaleString();
    return String(n);
  };

  return (
    <main className="flex flex-col relative w-full pt-16 sm:pt-20 pb-24 px-3 sm:px-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#2b2746]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#9d86e9]/10 text-[#9d86e9] border border-[#9d86e9]/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              Statistics
            </h1>
            <p className="text-xs text-[#7c779b]">
              Site catalog overview & personal reading analytics
            </p>
          </div>
        </div>

        <button
          onClick={handleResetStats}
          className="px-3 py-1.5 rounded-xl bg-[#1c1833] hover:bg-[#252042] text-slate-300 hover:text-white border border-[#2b2746] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Recalculate & Sync Stats"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#9d86e9]" />
          <span className="hidden sm:inline">Recalculate</span>
        </button>
      </div>

      {/* ─── Site Overview Section ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h2 className="font-display font-bold text-base text-white">Site Overview</h2>
          </div>
          <button
            onClick={loadSiteStats}
            disabled={siteStatsLoading}
            className="px-2.5 py-1 rounded-lg bg-[#1c1833] hover:bg-[#252042] text-slate-400 hover:text-white border border-[#2b2746] text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh site stats"
          >
            <RefreshCw className={`w-3 h-3 ${siteStatsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {siteStatsLoading && !siteStats ? (
          <div className="p-8 rounded-2xl bg-[#161327] border border-[#2b2746] flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#9d86e9]" />
            <span className="text-xs font-semibold text-[#7c779b]">Loading catalog stats from server...</span>
          </div>
        ) : siteStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Total Manga */}
            <div className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-2 relative overflow-hidden shadow-lg group hover:border-emerald-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-bl-[40px] transition-all group-hover:bg-emerald-500/10" />
              <div className="flex items-center justify-between relative">
                <span className="text-[11px] text-[#7c779b] font-semibold uppercase tracking-wider">Total Titles</span>
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-white relative">{formatCount(siteStats.totalManga)}</span>
              <span className="text-[10px] text-emerald-400 font-medium">Manga in database</span>
            </div>

            {/* Total Chapters */}
            <div className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-2 relative overflow-hidden shadow-lg group hover:border-sky-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/5 rounded-bl-[40px] transition-all group-hover:bg-sky-500/10" />
              <div className="flex items-center justify-between relative">
                <span className="text-[11px] text-[#7c779b] font-semibold uppercase tracking-wider">Chapters</span>
                <BookOpen className="w-4 h-4 text-sky-400" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-white relative">{formatCount(siteStats.totalChapters)}</span>
              <span className="text-[10px] text-sky-400 font-medium">Total available</span>
            </div>

            {/* Active Sources */}
            <div className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-2 relative overflow-hidden shadow-lg group hover:border-amber-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-bl-[40px] transition-all group-hover:bg-amber-500/10" />
              <div className="flex items-center justify-between relative">
                <span className="text-[11px] text-[#7c779b] font-semibold uppercase tracking-wider">Sources</span>
                <Radio className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-white relative">{siteStats.activeSources}</span>
              <span className="text-[10px] text-amber-400 font-medium">Active extensions</span>
            </div>

            {/* Library Size */}
            <div className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-2 relative overflow-hidden shadow-lg group hover:border-[#9d86e9]/30 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-[#9d86e9]/5 rounded-bl-[40px] transition-all group-hover:bg-[#9d86e9]/10" />
              <div className="flex items-center justify-between relative">
                <span className="text-[11px] text-[#7c779b] font-semibold uppercase tracking-wider">Library</span>
                <Library className="w-4 h-4 text-[#9d86e9]" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-white relative">{formatCount(siteStats.librarySize)}</span>
              <span className="text-[10px] text-[#9d86e9] font-medium">Saved titles</span>
            </div>

            {/* Recent Updates */}
            <div className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-2 relative overflow-hidden shadow-lg group hover:border-rose-500/30 transition-colors col-span-2 sm:col-span-1">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/5 rounded-bl-[40px] transition-all group-hover:bg-rose-500/10" />
              <div className="flex items-center justify-between relative">
                <span className="text-[11px] text-[#7c779b] font-semibold uppercase tracking-wider">Updates (7d)</span>
                <TrendingUp className="w-4 h-4 text-rose-400" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-white relative">{siteStats.recentChapters7d > 0 ? `+${formatCount(siteStats.recentChapters7d)}` : '0'}</span>
              <span className="text-[10px] text-rose-400 font-medium">New chapters this week</span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#161327] border border-[#2b2746] text-center">
            <p className="text-xs text-[#7c779b]">Could not load site stats. Make sure the Suwayomi server is running.</p>
          </div>
        )}
      </div>

      {/* Divider between Site and Personal */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex-1 h-px bg-[#2b2746]" />
        <span className="text-[11px] font-bold text-[#7c779b] uppercase tracking-widest shrink-0">Your Reading Stats</span>
        <div className="flex-1 h-px bg-[#2b2746]" />
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#7c779b] font-semibold">Chapters Read</span>
            <BookOpen className="w-4 h-4 text-[#9d86e9]" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white">{stats.totalChaptersRead}</span>
          <span className="text-[10px] text-emerald-400 font-medium">↑ Total completed</span>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#7c779b] font-semibold">Reading Time</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white">
            {totalHours > 0 ? `${totalHours}h ${remainingMins}m` : `${remainingMins}m`}
          </span>
          <span className="text-[10px] text-amber-400 font-medium">Active reading time</span>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#7c779b] font-semibold">Daily Streak</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white">{stats.dailyStreak}</span>
            <span className="text-xs text-rose-400 font-bold">days</span>
          </div>
          <span className="text-[10px] text-rose-400 font-medium">Keep it going! 🔥</span>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-2 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#7c779b] font-semibold">Top Genre</span>
            <Trophy className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-white truncate">{topGenre}</span>
          <span className="text-[10px] text-indigo-400 font-medium">Most read category</span>
        </div>
      </div>

      {/* 7-Day Activity Chart */}
      <div className="p-5 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#9d86e9]" />
            <h2 className="font-display font-bold text-base text-white">Daily Reading Activity (Last 7 Days)</h2>
          </div>
          <span className="text-xs text-[#7c779b]">Chapters per day</span>
        </div>

        <div className="flex items-end justify-between gap-2 h-44 pt-6 pb-2 border-b border-[#2b2746]">
          {last7Days.map((dateStr) => {
            const count = stats.historyByDate[dateStr] || 0;
            const heightPct = (count / maxDailyCount) * 100;
            const dayName = new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' });
            return (
              <div key={dateStr} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity bg-[#231f3d] px-1.5 py-0.5 rounded">
                  {count}
                </span>
                <div className="w-full max-w-[36px] bg-[#231f3d] rounded-t-lg overflow-hidden flex items-end h-full">
                  <div
                    className="w-full bg-gradient-to-t from-[#9d86e9]/40 to-[#9d86e9] rounded-t-lg transition-all duration-500 group-hover:brightness-125"
                    style={{ height: `${Math.max(5, heightPct)}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-[#7c779b]">{dayName}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Genre Distribution Section */}
      <div className="p-5 rounded-2xl bg-[#161327] border border-[#2b2746] flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#9d86e9]" />
          <h2 className="font-display font-bold text-base text-white">Genre Breakdown</h2>
        </div>

        {sortedGenres.length === 0 ? (
          <p className="text-xs text-[#7c779b] italic py-4 text-center">No genre data logged yet. Read some manga chapters to generate stats!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sortedGenres.slice(0, 8).map((item) => {
              const pct = Math.round((item.count / totalGenreReads) * 100);
              return (
                <div key={item.genre} className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#231f3d]/60 border border-[#2b2746]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{item.genre}</span>
                    <span className="text-[#9d86e9] font-bold">{item.count} chapters ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#161327] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#9d86e9] to-[#cbbcf6] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reset Stats Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Recalculate Reading Stats"
        message="Are you sure you want to recalculate and reset your reading statistics based on your actual read chapters history?"
        confirmLabel="Recalculate Stats"
        cancelLabel="Cancel"
        isDanger={false}
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </main>
  );
};

export default StatsPage;
