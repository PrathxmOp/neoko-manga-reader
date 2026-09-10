import React, { useState, useEffect } from 'react';
import { getReadingStats, resetReadingStats } from '../services/storage';
import { ReadingStats } from '../types/manga';
import { BarChart3, Flame, Clock, BookOpen, Sparkles, Trophy, Calendar, Award, RotateCcw } from 'lucide-react';

export const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<ReadingStats>(getReadingStats());

  useEffect(() => {
    const handleStatsChange = () => {
      setStats(getReadingStats());
    };
    window.addEventListener('neoko_stats_changed', handleStatsChange);
    return () => window.removeEventListener('neoko_stats_changed', handleStatsChange);
  }, []);

  const handleResetStats = () => {
    if (confirm('Recalculate and reset reading statistics based on actual read chapters?')) {
      const reset = resetReadingStats();
      setStats(reset);
    }
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
              Reading Statistics
            </h1>
            <p className="text-xs text-[#7c779b]">
              Insights and analytics on your manga reading habits
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
    </main>
  );
};

export default StatsPage;
