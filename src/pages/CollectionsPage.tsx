import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCollections, saveCollection, deleteCollection } from '../services/storage';
import { MangaCollection } from '../types/manga';
import { useToast } from '../contexts/ToastContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { FolderHeart, Plus, Trash2, Edit2, BookOpen, Layers, X, Folder } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

export const CollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [collections, setCollections] = useState<MangaCollection[]>(getCollections());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<MangaCollection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useBodyScrollLock(showCreateModal);

  // Form State
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [colorInput, setColorInput] = useState('#9d86e9');

  useEffect(() => {
    document.title = 'Collections — NEOKO';
    const handleCollectionsChange = () => {
      setCollections(getCollections());
    };
    window.addEventListener('neoko_collections_changed', handleCollectionsChange);
    return () => window.removeEventListener('neoko_collections_changed', handleCollectionsChange);
  }, []);

  const openCreateModal = () => {
    setEditingCollection(null);
    setNameInput('');
    setDescInput('');
    setColorInput('#9d86e9');
    setShowCreateModal(true);
  };

  const openEditModal = (col: MangaCollection) => {
    setEditingCollection(col);
    setNameInput(col.name);
    setDescInput(col.description || '');
    setColorInput(col.color || '#9d86e9');
    setShowCreateModal(true);
  };

  const handleSave = () => {
    if (!nameInput.trim()) {
      showToast('Collection name is required', 'warning');
      return;
    }
    const updated = saveCollection({
      id: editingCollection?.id,
      name: nameInput.trim(),
      description: descInput.trim(),
      color: colorInput,
    });
    setCollections(updated);
    setShowCreateModal(false);
    showToast(editingCollection ? 'Collection updated!' : 'Collection created!', 'success');
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      const updated = deleteCollection(deleteTarget.id);
      setCollections(updated);
      showToast(`Collection "${deleteTarget.name}" deleted`, 'info');
      setDeleteTarget(null);
    }
  };

  const colorPresets = ['#9d86e9', '#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <main className="flex flex-col relative w-full pt-16 sm:pt-20 pb-24 px-3 sm:px-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#2b2746]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#9d86e9]/10 text-[#9d86e9] border border-[#9d86e9]/20">
            <FolderHeart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              Manga Collections
            </h1>
            <p className="text-xs text-[#7c779b]">
              Organize your reading library into custom categorized lists
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-[#9d86e9] hover:bg-[#8b72e0] text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Collections Grid */}
      {collections.length === 0 ? (
        <div className="text-center py-16 bg-[#161327] border border-[#2b2746] rounded-2xl flex flex-col items-center gap-3">
          <Folder className="w-12 h-12 text-[#7c779b]" />
          <h3 className="font-display font-bold text-lg text-white">No collections created yet</h3>
          <p className="text-xs text-[#7c779b] max-w-sm">
            Create custom reading lists like "Must Read", "Summer 2026", or "Favorite Isekai".
          </p>
          <button
            onClick={openCreateModal}
            className="mt-2 px-4 py-2 rounded-xl bg-[#9d86e9] text-white font-bold text-xs"
          >
            Create First Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((col) => (
            <div
              key={col.id}
              className="p-5 rounded-2xl bg-[#161327] border border-[#2b2746] hover:border-[#9d86e9]/40 flex flex-col justify-between gap-4 transition-all shadow-lg group"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: col.color || '#9d86e9' }}
                    />
                    <h3 className="font-display font-bold text-base text-white truncate">
                      {col.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(col)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                      title="Edit Collection"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {col.id !== 'default_favorites' && (
                      <button
                        onClick={() => handleDelete(col.id, col.name)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors"
                        title="Delete Collection"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-[#7c779b] line-clamp-2 min-h-[32px]">
                  {col.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#2b2746]/60 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <BookOpen className="w-3.5 h-3.5 text-[#9d86e9]" />
                  {col.mangaIds.length} Manga items
                </span>
                <button
                  onClick={() => navigate('/library')}
                  className="text-[#9d86e9] font-bold hover:underline"
                >
                  Manage Items →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Collection Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#161327] border border-[#2b2746] rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[#2b2746] flex items-center justify-between bg-[#120f23]">
              <h3 className="font-display font-bold text-base text-white">
                {editingCollection ? 'Edit Collection' : 'Create New Collection'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-[#7c779b] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Collection Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. ⭐ Favorites, Completed, Reading List"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#231f3d] border border-[#2b2746] focus:border-[#9d86e9] text-white text-xs outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Description (Optional)</label>
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="Brief note about what this collection contains..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#231f3d] border border-[#2b2746] focus:border-[#9d86e9] text-white text-xs outline-none transition-all resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Color Tag</label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColorInput(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${colorInput === c ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2b2746]">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#231f3d] text-slate-300 text-xs font-semibold hover:bg-[#2c274d] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-[#9d86e9] hover:bg-[#8b72e0] text-white text-xs font-bold transition-colors"
                >
                  {editingCollection ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Collection Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Collection"
        message={deleteTarget ? `Are you sure you want to delete the collection "${deleteTarget.name}"? Manga inside will not be deleted from library.` : ''}
        confirmLabel="Delete Collection"
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
};

export default CollectionsPage;
