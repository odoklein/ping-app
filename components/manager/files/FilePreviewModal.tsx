"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Copy,
  Check,
  FileText,
  FileCode,
  Sparkles,
  Info,
  Calendar,
  User,
  HardDrive,
  Cloud,
} from "lucide-react";
import {
  type FileItem,
  typeIcon,
  typeLabel,
  formatBytes,
  formatDateFull,
  downloadUrl,
  isImageFile,
  isPdfFile,
  isAudioFile,
  isVideoFile,
  isTextOrCodeFile,
} from "./file-utils";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  allFiles: FileItem[];
  onNavigateFile?: (file: FileItem) => void;
}

export function FilePreviewModal({
  isOpen,
  onClose,
  file,
  allFiles,
  onNavigateFile,
}: FilePreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);

  // Reset zoom & rotation when file changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setTextContent(null);
  }, [file?.id]);

  // Find index in files array
  const currentIndex = file ? allFiles.findIndex((f) => f.id === file.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allFiles.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev && onNavigateFile) {
      onNavigateFile(allFiles[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, allFiles, onNavigateFile]);

  const goToNext = useCallback(() => {
    if (hasNext && onNavigateFile) {
      onNavigateFile(allFiles[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, allFiles, onNavigateFile]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        goToPrev();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, goToPrev, goToNext]);

  // Load text or code content if text file
  useEffect(() => {
    if (!isOpen || !file) return;
    if (isTextOrCodeFile(file.mimeType)) {
      setLoadingText(true);
      fetch(downloadUrl(file.id))
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load");
          return res.text();
        })
        .then((text) => setTextContent(text.slice(0, 50000))) // limit size
        .catch(() => setTextContent(null))
        .finally(() => setLoadingText(false));
    }
  }, [isOpen, file]);

  const handleCopyLink = async () => {
    if (!file) return;
    try {
      const link = downloadUrl(file.id);
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    if (!file) return;
    const a = document.createElement("a");
    a.href = downloadUrl(file.id);
    a.download = file.originalName || file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen || !file || typeof document === "undefined") return null;

  const typeVis = typeIcon(file.mimeType);
  const isImage = isImageFile(file.mimeType);
  const isPdf = isPdfFile(file.mimeType);
  const isAudio = isAudioFile(file.mimeType);
  const isVideo = isVideoFile(file.mimeType);
  const isText = isTextOrCodeFile(file.mimeType);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/90 backdrop-blur-xl animate-fade-in text-white select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0 max-w-[50%]">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${typeVis.bg} ${typeVis.ring} ring-1 shrink-0`}>
            <typeVis.Icon className={`w-4 h-4 ${typeVis.fg}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{file.name}</h3>
            <p className="text-xs text-slate-400">
              {typeLabel(file.mimeType)} • {file.formattedSize || formatBytes(file.size)}
              {allFiles.length > 1 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px]">
                  {currentIndex + 1} / {allFiles.length}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isImage && (
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl mr-2">
              <button
                onClick={() => setZoom((z) => Math.max(0.2, z - 0.25))}
                className="p-1.5 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                title="Zoom arrière"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-slate-300">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                className="p-1.5 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                title="Zoom avant"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                title="Pivoter (90°)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                }}
                className="p-1.5 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                title="Réinitialiser"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-200 transition-colors"
            title="Copier le lien"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Copié !" : "Copier le lien"}</span>
          </button>

          {file.source === "google_drive" && file.webViewLink && (
            <a
              href={file.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-xs font-medium text-white transition-colors"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Ouvrir sur Drive</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          )}

          {file.source !== "google_drive" && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors shadow-sm"
              title="Télécharger le fichier"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger</span>
            </button>
          )}

          <button
            onClick={() => setShowInfoSidebar((v) => !v)}
            className={`p-2 rounded-xl border transition-colors ${
              showInfoSidebar
                ? "bg-white/20 border-white/30 text-white"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
            title="Détails"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-slate-300 hover:text-white transition-colors ml-1"
            title="Fermer (Échap)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Arrow */}
        {hasPrev && (
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white/80 hover:text-white border border-white/10 backdrop-blur-md shadow-2xl transition-all transform hover:scale-110 active:scale-95"
            title="Fichier précédent (Flèche gauche)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Right Arrow */}
        {hasNext && (
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white/80 hover:text-white border border-white/10 backdrop-blur-md shadow-2xl transition-all transform hover:scale-110 active:scale-95"
            style={showInfoSidebar ? { right: "330px" } : undefined}
            title="Fichier suivant (Flèche droite)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Center Viewer Canvas */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
          {/* 1. Image Viewer */}
          {isImage && (
            <div className="relative flex items-center justify-center max-w-full max-h-full overflow-hidden">
              <img
                src={downloadUrl(file.id)}
                alt={file.name}
                className="max-h-[82vh] max-w-[85vw] object-contain rounded-lg shadow-2xl transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
            </div>
          )}

          {/* 2. PDF Viewer */}
          {isPdf && (
            <div className="w-full h-full max-w-5xl bg-slate-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
              <iframe
                src={`${downloadUrl(file.id)}#toolbar=1`}
                title={file.name}
                className="w-full h-full flex-1 border-0"
              />
            </div>
          )}

          {/* 3. Audio Player */}
          {isAudio && (
            <div className="w-full max-w-xl p-8 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-2xl text-center space-y-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
                <typeVis.Icon className="w-12 h-12 text-white" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white truncate">{file.name}</h4>
                <p className="text-sm text-slate-400 mt-1">{file.formattedSize}</p>
              </div>
              <audio controls className="w-full mt-4 rounded-xl accent-indigo-500" src={downloadUrl(file.id)}>
                Votre navigateur ne supporte pas l&apos;élément audio.
              </audio>
            </div>
          )}

          {/* 4. Video Player */}
          {isVideo && (
            <div className="w-full max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl flex items-center justify-center">
              <video controls className="w-full h-full max-h-[80vh] object-contain" src={downloadUrl(file.id)}>
                Votre navigateur ne supporte pas la lecture de vidéo.
              </video>
            </div>
          )}

          {/* 5. Text / Code Viewer */}
          {isText && (
            <div className="w-full max-w-4xl h-[78vh] rounded-2xl border border-white/10 bg-slate-900/95 overflow-hidden flex flex-col shadow-2xl">
              <div className="px-4 py-2.5 bg-slate-800/80 border-b border-white/10 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-slate-300">{file.originalName || file.name}</span>
                </div>
                <span>{textContent ? `${textContent.split("\n").length} lignes` : ""}</span>
              </div>
              <div className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed">
                {loadingText ? (
                  <div className="p-8 text-center text-slate-400">Chargement du contenu…</div>
                ) : textContent !== null ? (
                  <pre className="whitespace-pre-wrap select-text">{textContent}</pre>
                ) : (
                  <div className="p-8 text-center text-slate-400">Impossible de charger l&apos;aperçu texte.</div>
                )}
              </div>
            </div>
          )}

          {/* 6. Generic / Document / Spreadsheet / Archive Card */}
          {!isImage && !isPdf && !isAudio && !isVideo && !isText && (
            <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-2xl text-center space-y-6 animate-scale-in">
              <div
                className={`w-24 h-24 rounded-3xl bg-gradient-to-tr ${typeVis.gradient} mx-auto flex items-center justify-center shadow-xl ring-4 ring-white/10`}
              >
                <typeVis.Icon className="w-12 h-12 text-white" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-white break-words">{file.name}</h4>
                <p className="text-sm text-slate-400 mt-1">
                  {typeLabel(file.mimeType)} • {file.formattedSize || formatBytes(file.size)}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Type MIME</span>
                  <span className="text-slate-200 font-mono">{file.mimeType || "Inconnu"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date d&apos;ajout</span>
                  <span className="text-slate-200">{formatDateFull(file.createdAt)}</span>
                </div>
                {file.uploadedBy && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ajouté par</span>
                    <span className="text-slate-200">{file.uploadedBy.name}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium text-sm text-white shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Télécharger le fichier
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Info Slide-over Panel */}
        {showInfoSidebar && (
          <div className="w-80 border-l border-white/10 bg-slate-900/95 backdrop-blur-xl p-5 overflow-y-auto space-y-6 text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h4 className="font-semibold text-white">Métadonnées</h4>
              <button
                onClick={() => setShowInfoSidebar(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <p className="text-slate-400 mb-1">Nom du fichier</p>
                <p className="text-slate-200 font-medium break-words select-text">{file.name}</p>
              </div>

              <div>
                <p className="text-slate-400 mb-1">Type de document</p>
                <span className="px-2 py-1 rounded-md bg-white/10 text-slate-200 font-medium">
                  {typeLabel(file.mimeType)}
                </span>
              </div>

              <div>
                <p className="text-slate-400 mb-1">Taille</p>
                <p className="text-slate-200 font-mono">{formatBytes(file.size)} ({file.size.toLocaleString()} octets)</p>
              </div>

              <div>
                <p className="text-slate-400 mb-1">Date de création</p>
                <p className="text-slate-200">{formatDateFull(file.createdAt)}</p>
              </div>

              {file.uploadedBy && (
                <div>
                  <p className="text-slate-400 mb-1">Téléchargé par</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                      {file.uploadedBy.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-slate-200">{file.uploadedBy.name}</span>
                  </div>
                </div>
              )}

              {file.client && (
                <div>
                  <p className="text-slate-400 mb-1">Client associé</p>
                  <span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-medium">
                    {file.client.name}
                  </span>
                </div>
              )}

              {file.tags && file.tags.length > 0 && (
                <div>
                  <p className="text-slate-400 mb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {file.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[11px]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Tip */}
      <div className="px-5 py-2 border-t border-white/10 bg-slate-900/60 text-center text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[11px]">
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">→</kbd> Naviguer</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">Échap</kbd> Fermer</span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          ID: {file.id}
        </div>
      </div>
    </div>,
    document.body
  );
}
