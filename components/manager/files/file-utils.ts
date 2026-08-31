import {
  File as FileIcon,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  FileText,
  Folder,
  Image,
  Video,
  Archive,
  type LucideIcon,
} from "lucide-react";

export interface FolderItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
  createdAt?: string;
  _count: { files: number; children: number };
}

export interface FileItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  formattedSize: string;
  url?: string;
  path?: string;
  createdAt: string;
  description?: string;
  uploadedBy?: { id: string; name: string; email?: string };
  folder?: { id: string; name: string };
  client?: { id: string; name: string };
  mission?: { id: string; name: string };
  tags?: string[];
  isStarred?: boolean;
  // Google Drive
  source?: "crm" | "google_drive";
  webViewLink?: string;
  thumbnailLink?: string;
}

export type ViewMode = "grid" | "list";
export type ActiveTab = "crm" | "drive";
export type ItemKind = "file" | "folder";

export type SortField = "name" | "date" | "size" | "type";
export type SortOrder = "asc" | "desc";

export type FileTypeFilter = "all" | "folder" | "image" | "document" | "sheet" | "media" | "archive" | "code";

export type FolderColorKey = "indigo" | "amber" | "emerald" | "rose" | "purple" | "cyan" | "slate" | "blue";

export interface FolderColorConfig {
  key: FolderColorKey;
  label: string;
  folderColor: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  gradient: string;
  ring: string;
}

export const FOLDER_COLORS: Record<FolderColorKey, FolderColorConfig> = {
  amber: {
    key: "amber",
    label: "Ambre",
    folderColor: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-200/80 hover:border-amber-300",
    badgeBg: "bg-amber-50 text-amber-700 ring-amber-200/60",
    badgeText: "text-amber-700",
    gradient: "from-amber-500 to-orange-500",
    ring: "ring-amber-500/20",
  },
  indigo: {
    key: "indigo",
    label: "Indigo",
    folderColor: "text-indigo-600",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-200/80 hover:border-indigo-300",
    badgeBg: "bg-indigo-50 text-indigo-700 ring-indigo-200/60",
    badgeText: "text-indigo-700",
    gradient: "from-indigo-500 to-purple-500",
    ring: "ring-indigo-500/20",
  },
  emerald: {
    key: "emerald",
    label: "Émeraude",
    folderColor: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-200/80 hover:border-emerald-300",
    badgeBg: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    badgeText: "text-emerald-700",
    gradient: "from-emerald-500 to-teal-500",
    ring: "ring-emerald-500/20",
  },
  rose: {
    key: "rose",
    label: "Rose",
    folderColor: "text-rose-500",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-200/80 hover:border-rose-300",
    badgeBg: "bg-rose-50 text-rose-700 ring-rose-200/60",
    badgeText: "text-rose-700",
    gradient: "from-rose-500 to-pink-500",
    ring: "ring-rose-500/20",
  },
  purple: {
    key: "purple",
    label: "Violet",
    folderColor: "text-purple-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-200/80 hover:border-purple-300",
    badgeBg: "bg-purple-50 text-purple-700 ring-purple-200/60",
    badgeText: "text-purple-700",
    gradient: "from-purple-500 to-violet-500",
    ring: "ring-purple-500/20",
  },
  cyan: {
    key: "cyan",
    label: "Cyan",
    folderColor: "text-cyan-600",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-200/80 hover:border-cyan-300",
    badgeBg: "bg-cyan-50 text-cyan-700 ring-cyan-200/60",
    badgeText: "text-cyan-700",
    gradient: "from-cyan-500 to-sky-500",
    ring: "ring-cyan-500/20",
  },
  blue: {
    key: "blue",
    label: "Bleu",
    folderColor: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-200/80 hover:border-blue-300",
    badgeBg: "bg-blue-50 text-blue-700 ring-blue-200/60",
    badgeText: "text-blue-700",
    gradient: "from-blue-500 to-indigo-500",
    ring: "ring-blue-500/20",
  },
  slate: {
    key: "slate",
    label: "Ardoise",
    folderColor: "text-slate-600",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-200/80 hover:border-slate-300",
    badgeBg: "bg-slate-100 text-slate-700 ring-slate-200/60",
    badgeText: "text-slate-700",
    gradient: "from-slate-600 to-slate-800",
    ring: "ring-slate-500/20",
  },
};

export function getFolderColor(colorName?: string): FolderColorConfig {
  if (!colorName) return FOLDER_COLORS.amber;
  const key = colorName.toLowerCase() as FolderColorKey;
  return FOLDER_COLORS[key] || FOLDER_COLORS.amber;
}

export function downloadUrl(fileId: string): string {
  if (typeof window === "undefined") return `/api/files/${fileId}/download`;
  return `${window.location.origin}/api/files/${fileId}/download`;
}

export function previewUrl(fileId: string): string {
  if (typeof window === "undefined") return `/api/files/${fileId}/download`;
  return `/api/files/${fileId}/download`;
}

export function formatDateShort(dateString?: string): string {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateFull(dateString?: string): string {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const v = bytes / Math.pow(1024, i);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export function typeLabel(mimeType?: string): string {
  if (!mimeType) return "Fichier";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Vidéo";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) return "Tableur";
  if (mimeType.includes("word") || mimeType.includes("document") || mimeType.includes("text/rtf")) return "Document";
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar") || mimeType.includes("archive") || mimeType.includes("compressed")) return "Archive";
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("html") || mimeType.includes("code") || mimeType.includes("xml")) return "Code";
  return "Fichier";
}

export interface TypeVisual {
  Icon: LucideIcon;
  bg: string;
  fg: string;
  ring: string;
  border: string;
  pillBg: string;
  pillFg: string;
  gradient: string;
  category: FileTypeFilter;
}

export function typeIcon(mimeType?: string): TypeVisual {
  if (!mimeType) {
    return {
      Icon: FileIcon,
      bg: "bg-slate-100",
      fg: "text-slate-600",
      ring: "ring-slate-200/60",
      border: "border-slate-200",
      pillBg: "bg-slate-100",
      pillFg: "text-slate-700",
      gradient: "from-slate-500 to-slate-700",
      category: "document",
    };
  }

  if (mimeType.startsWith("image/")) {
    return {
      Icon: Image,
      bg: "bg-purple-50",
      fg: "text-purple-600",
      ring: "ring-purple-200/60",
      border: "border-purple-200",
      pillBg: "bg-purple-50",
      pillFg: "text-purple-700",
      gradient: "from-purple-500 to-violet-600",
      category: "image",
    };
  }

  if (mimeType.startsWith("video/")) {
    return {
      Icon: Video,
      bg: "bg-pink-50",
      fg: "text-pink-600",
      ring: "ring-pink-200/60",
      border: "border-pink-200",
      pillBg: "bg-pink-50",
      pillFg: "text-pink-700",
      gradient: "from-pink-500 to-rose-600",
      category: "media",
    };
  }

  if (mimeType.startsWith("audio/")) {
    return {
      Icon: FileAudio,
      bg: "bg-amber-50",
      fg: "text-amber-600",
      ring: "ring-amber-200/60",
      border: "border-amber-200",
      pillBg: "bg-amber-50",
      pillFg: "text-amber-700",
      gradient: "from-amber-500 to-orange-500",
      category: "media",
    };
  }

  if (mimeType.includes("pdf")) {
    return {
      Icon: FileText,
      bg: "bg-rose-50",
      fg: "text-rose-600",
      ring: "ring-rose-200/60",
      border: "border-rose-200",
      pillBg: "bg-rose-50",
      pillFg: "text-rose-700",
      gradient: "from-rose-500 to-red-600",
      category: "document",
    };
  }

  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) {
    return {
      Icon: FileSpreadsheet,
      bg: "bg-emerald-50",
      fg: "text-emerald-600",
      ring: "ring-emerald-200/60",
      border: "border-emerald-200",
      pillBg: "bg-emerald-50",
      pillFg: "text-emerald-700",
      gradient: "from-emerald-500 to-teal-600",
      category: "sheet",
    };
  }

  if (mimeType.includes("word") || mimeType.includes("document") || mimeType.includes("text/rtf")) {
    return {
      Icon: FileText,
      bg: "bg-blue-50",
      fg: "text-blue-600",
      ring: "ring-blue-200/60",
      border: "border-blue-200",
      pillBg: "bg-blue-50",
      pillFg: "text-blue-700",
      gradient: "from-blue-500 to-indigo-600",
      category: "document",
    };
  }

  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar") || mimeType.includes("archive") || mimeType.includes("compressed")) {
    return {
      Icon: Archive,
      bg: "bg-yellow-50",
      fg: "text-yellow-700",
      ring: "ring-yellow-200/60",
      border: "border-yellow-200",
      pillBg: "bg-yellow-50",
      pillFg: "text-yellow-800",
      gradient: "from-yellow-500 to-amber-600",
      category: "archive",
    };
  }

  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("html") || mimeType.includes("code") || mimeType.includes("xml")) {
    return {
      Icon: FileCode,
      bg: "bg-cyan-50",
      fg: "text-cyan-600",
      ring: "ring-cyan-200/60",
      border: "border-cyan-200",
      pillBg: "bg-cyan-50",
      pillFg: "text-cyan-700",
      gradient: "from-cyan-500 to-blue-600",
      category: "code",
    };
  }

  return {
    Icon: FileIcon,
    bg: "bg-slate-100",
    fg: "text-slate-600",
    ring: "ring-slate-200/60",
    border: "border-slate-200",
    pillBg: "bg-slate-100",
    pillFg: "text-slate-700",
    gradient: "from-slate-500 to-slate-700",
    category: "document",
  };
}

export function isImageFile(mimeType?: string): boolean {
  return Boolean(mimeType?.startsWith("image/"));
}

export function isPdfFile(mimeType?: string): boolean {
  return Boolean(mimeType?.includes("pdf"));
}

export function isAudioFile(mimeType?: string): boolean {
  return Boolean(mimeType?.startsWith("audio/"));
}

export function isVideoFile(mimeType?: string): boolean {
  return Boolean(mimeType?.startsWith("video/"));
}

export function isTextOrCodeFile(mimeType?: string): boolean {
  if (!mimeType) return false;
  return (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("xml") ||
    mimeType.includes("csv")
  );
}

export function getFileCategory(mimeType?: string): FileTypeFilter {
  return typeIcon(mimeType).category;
}
