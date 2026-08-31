"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal, ModalFooter, Button, Input } from "@/components/ui";
import {
  Folder,
  FolderPlus,
  Link2,
  UserPlus,
  Pencil,
  Move,
  Check,
  Search,
  Loader2,
  ExternalLink,
  Copy,
  Home,
  User,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  type FolderItem,
  type FileItem,
  type ItemKind,
  type FolderColorKey,
  FOLDER_COLORS,
  getFolderColor,
  downloadUrl,
} from "./file-utils";

/* ══════════════════════════════════════════════════════════════
   1. CREATE FOLDER MODAL
══════════════════════════════════════════════════════════════ */
interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string, description?: string) => Promise<void>;
  isLoading: boolean;
}

const COLOR_OPTIONS: Array<{ key: FolderColorKey; label: string; bg: string; border: string }> = [
  { key: "amber", label: "Ambre", bg: "bg-amber-500", border: "border-amber-400" },
  { key: "indigo", label: "Indigo", bg: "bg-indigo-600", border: "border-indigo-400" },
  { key: "emerald", label: "Émeraude", bg: "bg-emerald-600", border: "border-emerald-400" },
  { key: "rose", label: "Rose", bg: "bg-rose-500", border: "border-rose-400" },
  { key: "purple", label: "Violet", bg: "bg-purple-600", border: "border-purple-400" },
  { key: "cyan", label: "Cyan", bg: "bg-cyan-500", border: "border-cyan-400" },
  { key: "blue", label: "Bleu", bg: "bg-blue-600", border: "border-blue-400" },
  { key: "slate", label: "Ardoise", bg: "bg-slate-600", border: "border-slate-400" },
];

export function CreateFolderModal({ isOpen, onClose, onSubmit, isLoading }: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<FolderColorKey>("amber");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName("");
      setColor("amber");
      setDescription("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit(name.trim(), color, description.trim() || undefined);
  };

  const selectedColorConfig = FOLDER_COLORS[color];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer un nouveau dossier"
      description="Organisez vos fichiers et documents par catégorie ou projet."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Visual Folder Header Preview */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${selectedColorConfig.gradient} flex items-center justify-center shadow-md text-white`}
          >
            <Folder className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {name.trim() || "Nom du dossier"}
            </p>
            <p className="text-xs text-slate-500">Couleur: {selectedColorConfig.label}</p>
          </div>
        </div>

        {/* Name input */}
        <Input
          label="Nom du dossier"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Contrats 2026, Devis, Ressources..."
          autoFocus
          required
        />

        {/* Color Palette Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Couleur du dossier
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                type="button"
                key={c.key}
                onClick={() => setColor(c.key)}
                className={`relative h-10 rounded-xl ${c.bg} flex items-center justify-center transition-transform hover:scale-105 shadow-sm ${
                  color === c.key ? "ring-2 ring-offset-2 ring-slate-900 scale-105" : "opacity-85 hover:opacity-100"
                }`}
                title={c.label}
              >
                {color === c.key && <Check className="w-4 h-4 text-white drop-shadow" />}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Description */}
        <Input
          label="Description (Optionnel)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brève note sur l'usage de ce dossier..."
        />

        <ModalFooter>
          <Button variant="ghost" onClick={onClose} type="button">
            Annuler
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isLoading}
            disabled={!name.trim() || isLoading}
            className="gap-2"
          >
            <FolderPlus className="w-4 h-4" />
            Créer le dossier
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. SHARE MODAL (LINK + DIRECT TEAM)
══════════════════════════════════════════════════════════════ */
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: { kind: ItemKind; item: FileItem | FolderItem } | null;
  initialMode?: "link" | "direct";
  users: Array<{ id: string; name: string | null; email: string | null; role?: string }>;
  isLoadingUsers: boolean;
  onDirectShare: (userIds: string[]) => Promise<void>;
  isSubmittingDirect: boolean;
}

export function ShareModal({
  isOpen,
  onClose,
  target,
  initialMode = "link",
  users,
  isLoadingUsers,
  onDirectShare,
  isSubmittingDirect,
}: ShareModalProps) {
  const [mode, setMode] = useState<"link" | "direct">(initialMode);
  const [copied, setCopied] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSelectedUserIds([]);
      setUserSearch("");
      setCopied(false);
    }
  }, [isOpen, initialMode]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) => (u.name && u.name.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, userSearch]);

  if (!target) return null;

  const isFile = target.kind === "file";
  const shareLink = isFile ? downloadUrl((target.item as FileItem).id) : window.location.href;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Partage de document"
      description={`Partager « ${target.item.name} » avec l'équipe ou via un lien.`}
    >
      <div className="space-y-4">
        {/* Mode Switcher Tabs */}
        <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setMode("link")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === "link"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Lien d&apos;accès
          </button>
          <button
            type="button"
            onClick={() => setMode("direct")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === "direct"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Membres de l&apos;équipe
          </button>
        </div>

        {/* Tab 1: Share by Link */}
        {mode === "link" && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-slate-500">
              Ce lien permet aux utilisateurs connectés autorisés d&apos;accéder au fichier.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareLink}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copié !" : "Copier"}</span>
              </button>
            </div>

            {isFile && (
              <div className="flex justify-end pt-1">
                <a
                  href={shareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ouvrir dans un nouvel onglet
                </a>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Direct Team Share */}
        {mode === "direct" && (
          <div className="space-y-3 pt-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Rechercher un membre par nom ou email…"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {isLoadingUsers ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                <span className="text-xs">Chargement des membres…</span>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id);
                  return (
                    <label
                      key={user.id}
                      className={`flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                        isSelected ? "bg-indigo-50/70" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUser(user.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {(user.name || user.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {user.name || "Utilisateur"}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      {user.role && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0">
                          {user.role}
                        </span>
                      )}
                    </label>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <p className="text-center py-6 text-xs text-slate-400">Aucun utilisateur trouvé.</p>
                )}
              </div>
            )}

            <ModalFooter>
              <Button variant="ghost" onClick={onClose}>
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={() => onDirectShare(selectedUserIds)}
                isLoading={isSubmittingDirect}
                disabled={selectedUserIds.length === 0 || isSubmittingDirect}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Partager avec ({selectedUserIds.length})
              </Button>
            </ModalFooter>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════
   3. MOVE MODAL (DESTINATION TREE SELECTOR)
══════════════════════════════════════════════════════════════ */
interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: { kind: ItemKind; item: FileItem | FolderItem } | null;
  folders: FolderItem[];
  onSubmit: (destinationFolderId: string | null) => Promise<void>;
  isLoading: boolean;
}

export function MoveModal({ isOpen, onClose, target, folders, onSubmit, isLoading }: MoveModalProps) {
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedDestination(null);
      setSearch("");
    }
  }, [isOpen]);

  if (!target) return null;

  // Filter out target itself if it's a folder to prevent circular move
  const availableFolders = folders.filter((f) => {
    if (target.kind === "folder" && f.id === target.item.id) return false;
    if (search.trim()) return f.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Déplacer l'élément"
      description={`Choisissez le dossier de destination pour « ${target.item.name} ».`}
    >
      <div className="space-y-3">
        {/* Search destination */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer les dossiers…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Tree List */}
        <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
          {/* Root Destination */}
          <button
            type="button"
            onClick={() => setSelectedDestination(null)}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs transition-colors ${
              selectedDestination === null ? "bg-indigo-50 text-indigo-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
            }`}
          >
            <Home className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="flex-1">Racine / Espace principal</span>
            {selectedDestination === null && <Check className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Folder items */}
          {availableFolders.map((f) => {
            const isSelected = selectedDestination === f.id;
            const colorCfg = getFolderColor(f.color);
            return (
              <button
                type="button"
                key={f.id}
                onClick={() => setSelectedDestination(f.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs transition-colors ${
                  isSelected ? "bg-indigo-50 text-indigo-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <Folder className={`w-4 h-4 ${colorCfg.folderColor} shrink-0`} />
                <span className="flex-1 truncate">{f.name}</span>
                {f._count?.files > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-normal">
                    {f._count.files} fichiers
                  </span>
                )}
                {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
              </button>
            );
          })}

          {availableFolders.length === 0 && search.trim() && (
            <p className="text-center py-6 text-xs text-slate-400">Aucun dossier correspondant.</p>
          )}
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={() => onSubmit(selectedDestination)}
            isLoading={isLoading}
            disabled={isLoading}
            className="gap-2"
          >
            <Move className="w-4 h-4" />
            Déplacer ici
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════
   4. RENAME MODAL
══════════════════════════════════════════════════════════════ */
interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: { kind: ItemKind; item: FileItem | FolderItem } | null;
  onSubmit: (newName: string) => Promise<void>;
  isLoading: boolean;
}

export function RenameModal({ isOpen, onClose, target, onSubmit, isLoading }: RenameModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (isOpen && target) {
      setName(target.item.name);
    }
  }, [isOpen, target]);

  if (!target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit(name.trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={target.kind === "file" ? "Renommer le fichier" : "Renommer le dossier"}
      description="Modifiez le libellé sans altérer le contenu."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nouveau nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} type="button">
            Annuler
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isLoading}
            disabled={!name.trim() || isLoading}
            className="gap-2"
          >
            <Pencil className="w-4 h-4" />
            Enregistrer
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════
   5. IMPORT FROM GOOGLE DRIVE MODAL
══════════════════════════════════════════════════════════════ */
interface ImportDriveProgressModalProps {
  isOpen: boolean;
  fileName: string | null;
}

export function ImportDriveProgressModal({ isOpen, fileName }: ImportDriveProgressModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Import Google Drive vers le CRM"
      description={fileName ? `Importation de « ${fileName} »…` : "Copie sécurisée du fichier dans votre espace CRM…"}
      size="sm"
      showCloseButton={false}
      closeOnOverlay={false}
      closeOnEscape={false}
    >
      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner ring-1 ring-indigo-200/60">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-900">Transfert en cours</p>
        <p className="text-xs text-slate-500 max-w-xs">
          Veuillez patienter pendant que le fichier est synchronisé et stocké dans le CRM.
        </p>
      </div>
    </Modal>
  );
}
