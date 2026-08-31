"use client";

import { useMemo } from "react";
import {
  HardDrive,
  FileText,
  Folder,
  Cloud,
  Layers,
  Image as ImageIcon,
  FileSpreadsheet,
  Film,
  FileCode,
  Archive,
  Info,
} from "lucide-react";
import { type FileItem, formatBytes, getFileCategory } from "./file-utils";

interface FileStorageBarProps {
  files: FileItem[];
  foldersCount: number;
  driveConnected: boolean;
  driveEmail: string | null;
  onConnectDrive?: () => void;
}

interface CategoryStats {
  label: string;
  count: number;
  bytes: number;
  percentage: number;
  color: string;
  bgClass: string;
  textClass: string;
  Icon: any;
}

export function FileStorageBar({
  files,
  foldersCount,
  driveConnected,
  driveEmail,
  onConnectDrive,
}: FileStorageBarProps) {
  const stats = useMemo(() => {
    let totalBytes = 0;
    const catBytes: Record<string, { count: number; bytes: number }> = {
      image: { count: 0, bytes: 0 },
      document: { count: 0, bytes: 0 },
      sheet: { count: 0, bytes: 0 },
      media: { count: 0, bytes: 0 },
      code: { count: 0, bytes: 0 },
      archive: { count: 0, bytes: 0 },
    };

    for (const f of files) {
      const size = Number.isFinite(f.size) && f.size > 0 ? f.size : 0;
      totalBytes += size;
      const cat = getFileCategory(f.mimeType);
      if (catBytes[cat]) {
        catBytes[cat].count += 1;
        catBytes[cat].bytes += size;
      } else {
        catBytes.document.count += 1;
        catBytes.document.bytes += size;
      }
    }

    const categories: CategoryStats[] = [
      {
        label: "Images",
        count: catBytes.image.count,
        bytes: catBytes.image.bytes,
        percentage: totalBytes > 0 ? Math.round((catBytes.image.bytes / totalBytes) * 100) : 0,
        color: "#9333ea", // purple
        bgClass: "bg-purple-500",
        textClass: "text-purple-600",
        Icon: ImageIcon,
      },
      {
        label: "Documents & PDF",
        count: catBytes.document.count,
        bytes: catBytes.document.bytes,
        percentage: totalBytes > 0 ? Math.round((catBytes.document.bytes / totalBytes) * 100) : 0,
        color: "#e11d48", // rose
        bgClass: "bg-rose-500",
        textClass: "text-rose-600",
        Icon: FileText,
      },
      {
        label: "Tableurs",
        count: catBytes.sheet.count,
        bytes: catBytes.sheet.bytes,
        percentage: totalBytes > 0 ? Math.round((catBytes.sheet.bytes / totalBytes) * 100) : 0,
        color: "#059669", // emerald
        bgClass: "bg-emerald-500",
        textClass: "text-emerald-600",
        Icon: FileSpreadsheet,
      },
      {
        label: "Médias",
        count: catBytes.media.count,
        bytes: catBytes.media.bytes,
        percentage: totalBytes > 0 ? Math.round((catBytes.media.bytes / totalBytes) * 100) : 0,
        color: "#ea580c", // orange
        bgClass: "bg-orange-500",
        textClass: "text-orange-600",
        Icon: Film,
      },
      {
        label: "Code & Données",
        count: catBytes.code.count,
        bytes: catBytes.code.bytes,
        percentage: totalBytes > 0 ? Math.round((catBytes.code.bytes / totalBytes) * 100) : 0,
        color: "#0284c7", // sky
        bgClass: "bg-sky-500",
        textClass: "text-sky-600",
        Icon: FileCode,
      },
      {
        label: "Archives",
        count: catBytes.archive.count,
        bytes: catBytes.archive.bytes,
        percentage: totalBytes > 0 ? Math.round((catBytes.archive.bytes / totalBytes) * 100) : 0,
        color: "#ca8a04", // yellow
        bgClass: "bg-yellow-500",
        textClass: "text-yellow-600",
        Icon: Archive,
      },
    ].filter((c) => c.count > 0);

    return {
      totalBytes,
      totalFiles: files.length,
      categories,
    };
  }, [files]);

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Top summary row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/60 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Fichiers CRM</p>
              <p className="text-base font-bold text-slate-900">{stats.totalFiles}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/60 flex items-center justify-center shrink-0">
              <Folder className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Dossiers</p>
              <p className="text-base font-bold text-slate-900">{foldersCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Stockage utilisé</p>
              <p className="text-base font-bold text-slate-900">{formatBytes(stats.totalBytes)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ${
                driveConnected
                  ? "bg-blue-50 text-blue-600 ring-blue-200/60"
                  : "bg-slate-100 text-slate-400 ring-slate-200/60"
              }`}
            >
              <Cloud className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Google Drive</p>
              <p className="text-xs font-semibold text-slate-900 truncate">
                {driveConnected ? (driveEmail ? driveEmail.split("@")[0] : "Connecté") : "Non relié"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Segmented bar */}
      {stats.totalBytes > 0 && stats.categories.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
            {stats.categories.map((cat, idx) => (
              <div
                key={cat.label}
                className={`${cat.bgClass} transition-all duration-500 hover:opacity-90 relative group`}
                style={{
                  width: `${Math.max(2, cat.percentage)}%`,
                }}
                title={`${cat.label}: ${formatBytes(cat.bytes)} (${cat.count} fichiers)`}
              />
            ))}
          </div>

          {/* Legend row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5">
            {stats.categories.map((cat) => (
              <div key={cat.label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cat.bgClass}`} />
                <span className="text-slate-700 font-medium">{cat.label}</span>
                <span className="text-slate-400 font-mono text-[11px]">{formatBytes(cat.bytes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
