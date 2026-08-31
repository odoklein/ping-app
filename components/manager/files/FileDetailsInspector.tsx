"use client";

import { useState, useEffect } from "react";
import {
  X,
  Download,
  Link2,
  UserPlus,
  Pencil,
  Move,
  Trash2,
  ExternalLink,
  Eye,
  Tag,
  Plus,
  FileText,
  Calendar,
  User,
  HardDrive,
  Building2,
  Cloud,
  Check,
  Sparkles,
  Layers,
  Star,
} from "lucide-react";
import {
  type FileItem,
  type FolderItem,
  type ItemKind,
  typeIcon,
  typeLabel,
  formatBytes,
  formatDateFull,
  formatDateShort,
  getFolderColor,
  downloadUrl,
  isImageFile,
} from "./file-utils";

interface FileDetailsInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  target: { kind: ItemKind; item: FileItem | FolderItem } | null;
  onPreview?: (file: FileItem) => void;
  onShareLink: (kind: ItemKind, item: FileItem | FolderItem) => void;
  onShareDirect: (kind: ItemKind, item: FileItem | FolderItem) => void;
  onRename: (kind: ItemKind, item: FileItem | FolderItem) => void;
  onMove: (kind: ItemKind, item: FileItem | FolderItem) => void;
  onDelete: (kind: ItemKind, item: FileItem | FolderItem) => void;
  onUpdateTags?: (file: FileItem, tags: string[]) => void;
  onOpenExternal?: (url: string) => void;
}

const PRESET_TAGS = ["contrat", "devis", "kpi", "facture", "brief", "presentation", "urgent", "validé"];

export function FileDetailsInspector({
  isOpen,
  onClose,
  target,
  onPreview,
  onShareLink,
  onShareDirect,
  onRename,
  onMove,
  onDelete,
  onUpdateTags,
  onOpenExternal,
}: FileDetailsInspectorProps) {
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !target) return null;

  const isFile = target.kind === "file";
  const file = isFile ? (target.item as FileItem) : null;
  const folder = !isFile ? (target.item as FolderItem) : null;

  const typeVis = file ? typeIcon(file.mimeType) : null;
  const folderColor = folder ? getFolderColor(folder.color) : null;
  const isImage = file ? isImageFile(file.mimeType) : false;

  const currentTags = file?.tags ?? [];

  const handleAddTag = (tagToAdd?: string) => {
    if (!file || !onUpdateTags) return;
    const tag = (tagToAdd || newTagInput).trim().toLowerCase();
    if (!tag || currentTags.includes(tag)) return;
    const updated = [...currentTags, tag];
    onUpdateTags(file, updated);
    setNewTagInput("");
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!file || !onUpdateTags) return;
    const updated = currentTags.filter((t) => t !== tagToRemove);
    onUpdateTags(file, updated);
  };

  const handleCopyLink = async () => {
    try {
      const link = isFile && file ? downloadUrl(file.id) : window.location.href;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full xl:w-84 2xl:w-92 shrink-0 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/40 p-5 flex flex-col gap-5 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isFile ? "Détails du fichier" : "Détails du dossier"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          title="Fermer le panneau"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Hero preview card */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/60 p-4 border border-slate-200/60 text-center overflow-hidden group">
        {isFile && file && (
          <>
            {isImage ? (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900/5 mb-3 flex items-center justify-center">
                <img
                  src={downloadUrl(file.id)}
                  alt={file.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {onPreview && (
                  <button
                    onClick={() => onPreview(file)}
                    className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-medium backdrop-blur-xs"
                  >
                    <Eye className="w-4 h-4" />
                    Plein écran
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${typeVis?.gradient} mx-auto mb-3 flex items-center justify-center shadow-lg ring-4 ring-white`}
              >
                {typeVis && <typeVis.Icon className="w-8 h-8 text-white" />}
              </div>
            )}
            <h3 className="font-semibold text-slate-900 text-sm truncate px-2" title={file.name}>
              {file.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {typeLabel(file.mimeType)} • {file.formattedSize || formatBytes(file.size)}
            </p>
          </>
        )}

        {!isFile && folder && (
          <>
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${folderColor?.gradient} mx-auto mb-3 flex items-center justify-center shadow-lg ring-4 ring-white`}
            >
              <Layers className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm truncate px-2" title={folder.name}>
              {folder.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {folder._count?.files || 0} fichier(s) • {folder._count?.children || 0} sous-dossier(s)
            </p>
          </>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {isFile && file && onPreview && (
          <button
            onClick={() => onPreview(file)}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Aperçu
          </button>
        )}

        {isFile && file && file.source !== "google_drive" && (
          <button
            onClick={() => {
              const a = document.createElement("a");
              a.href = downloadUrl(file.id);
              a.download = file.originalName || file.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger
          </button>
        )}

        {file?.source === "google_drive" && file.webViewLink && (
          <button
            onClick={() => window.open(file.webViewLink, "_blank")}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ouvrir Drive
          </button>
        )}

        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
          {copiedLink ? "Lien copié" : "Partager lien"}
        </button>

        <button
          onClick={() => onShareDirect(target.kind, target.item)}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Partager équipe
        </button>
      </div>

      {/* Metadata Properties */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Propriétés</h4>

        <div className="divide-y divide-slate-100 text-xs">
          {isFile && file && (
            <>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  Taille
                </span>
                <span className="font-medium text-slate-900">{file.formattedSize || formatBytes(file.size)}</span>
              </div>

              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Format
                </span>
                <span className="font-medium text-slate-900">{file.mimeType || "Inconnu"}</span>
              </div>

              {file.uploadedBy && (
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Auteur
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                      {file.uploadedBy.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-900">{file.uploadedBy.name}</span>
                  </div>
                </div>
              )}

              {file.client && (
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Client
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium text-[11px] ring-1 ring-emerald-200/60">
                    {file.client.name}
                  </span>
                </div>
              )}

              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Créé le
                </span>
                <span className="font-medium text-slate-900">{formatDateShort(file.createdAt)}</span>
              </div>
            </>
          )}

          {!isFile && folder && (
            <>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  Contenu
                </span>
                <span className="font-medium text-slate-900">
                  {folder._count?.files || 0} fichiers, {folder._count?.children || 0} dossiers
                </span>
              </div>

              {folder.createdAt && (
                <div className="py-2 flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Créé le
                  </span>
                  <span className="font-medium text-slate-900">{formatDateShort(folder.createdAt)}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Interactive Tag Manager (for files) */}
      {isFile && file && onUpdateTags && (
        <div className="space-y-2.5 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              Tags
            </h4>
            {!isAddingTag && (
              <button
                onClick={() => setIsAddingTag(true)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Ajouter
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {currentTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors group/tag"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors"
                  title="Supprimer le tag"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {currentTags.length === 0 && !isAddingTag && (
              <span className="text-xs text-slate-400 italic">Aucun tag associé</span>
            )}
          </div>

          {isAddingTag && (
            <div className="space-y-2 pt-1 animate-scale-in">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTag();
                    if (e.key === "Escape") setIsAddingTag(false);
                  }}
                  placeholder="Nouveau tag…"
                  autoFocus
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleAddTag()}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium"
                >
                  OK
                </button>
                <button
                  onClick={() => setIsAddingTag(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1 pt-1">
                {PRESET_TAGS.filter((t) => !currentTags.includes(t)).slice(0, 4).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleAddTag(preset)}
                    className="px-2 py-0.5 rounded-md bg-indigo-50/70 hover:bg-indigo-100 text-indigo-600 text-[10px] transition-colors"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Secondary Management Actions */}
      <div className="pt-3 border-t border-slate-100 space-y-1.5">
        <button
          onClick={() => onRename(target.kind, target.item)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-left"
        >
          <Pencil className="w-3.5 h-3.5 text-slate-400" />
          Renommer {isFile ? "le fichier" : "le dossier"}
        </button>

        <button
          onClick={() => onMove(target.kind, target.item)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-left"
        >
          <Move className="w-3.5 h-3.5 text-slate-400" />
          Déplacer vers un autre dossier
        </button>

        <button
          onClick={() => onDelete(target.kind, target.item)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          Supprimer définitivement
        </button>
      </div>
    </div>
  );
}
