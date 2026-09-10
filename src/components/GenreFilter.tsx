import React from 'react';

interface GenreFilterProps {
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
}

const GENRES = [
  'All',
  'Action',
  'Manhwa',
  'Romance',
  'Fantasy',
  'Isekai',
  'Comedy',
  'Horror',
  'Slice of Life',
  'Sports',
  'Drama',
  'Psychological',
  'Sci-Fi',
  'Adventure',
  'Mystery',
  'Supernatural',
  'System',
  'Reincarnation',
  'Seinen',
  'Shounen',
];

export const GenreFilter: React.FC<GenreFilterProps> = ({ selectedGenre, onSelectGenre }) => {
  return (
    <section className="w-full overflow-hidden">
      <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-1">
        {GENRES.map(genre => {
          const isSelected = selectedGenre.toLowerCase() === genre.toLowerCase();
          return (
            <button
              key={genre}
              onClick={() => onSelectGenre(genre)}
              className={`px-4 py-1.5 rounded-full font-sans text-xs font-semibold shrink-0 transition-all ${
                isSelected
                  ? 'bg-primary text-on-primary shadow-[0_0_12px_rgba(208,188,255,0.4)] scale-105'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </section>
  );
};
