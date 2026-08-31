"use client";

import { Check, Copy, Download, Move, Trash2, X, CheckSquare, Layers } from "lucide-react";
import { createPortal } from "react-dom";

interface FileBulkActionBarProps {
  selectedFileIds: Set<string>;
  selectedFolderIds: Set<string>;
  onClearSelection: () => void;
  onBulkCopyLinks: () => void;
  onBulkMove: () => void;
  onBulkDelete: () => void;
}

export function FileBulkActionBar({
  selectedFileIds,
  selectedFolderIds,
  onClearSelection,
  onBulkCopyLinks,
  onBulkMove,
  onBulkDelete,
}: FileBulkActionBarProps) {
  const totalSelected = selectedFileIds.size + selectedFolderIds.size;

  if (totalSelected === 0 || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990] animate-slide-up">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/95 text-white backdrop-blur-xl border border-white/15 shadow-2xl shadow-slate-950/40 ring-1 ring-white/10">
        {/* Count badge */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/15">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
            {totalSelected}
          </div>
          <span className="text-xs font-semibold tracking-wide whitespace-nowrap">
            {totalSelected === 1 ? "1 élément sélectionné" : `${totalSelected} éléments sélectionnés`}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {selectedFileIds.size > 0 && (
            <button
              onClick={onBulkCopyLinks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-200 transition-colors"
              title="Copier les liens de partage"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copier les liens</span>
            </button>
          )}

          <button
            onClick={onBulkMove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-200 transition-colors"
            title="Déplacer la sélection"
          >
            <Move className="w-3.5 h-3.5" />
            <span>Déplacer</span>
          </button>

          <button
            onClick={onBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-xs font-medium text-red-300 hover:text-red-200 transition-colors"
            title="Supprimer les éléments sélectionnés"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Supprimer</span>
          </button>
        </div>

        {/* Clear selection */}
        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-xl hover:bg-white/15 text-slate-400 hover:text-white transition-colors ml-1"
          title="Désélectionner tout"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}
