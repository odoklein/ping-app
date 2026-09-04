"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Search,
  Sparkles,
  Phone,
  Zap,
  Lock,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ChevronRight,
  X,
  Trash2,
  Globe,
  Activity,
  Target,
  Mail,
  UserCheck,
  Settings,
  MoreVertical,
  Layers,
  HelpCircle,
  Eye,
  LogOut,
  Radio,
  Clock,
  ShieldCheck,
  CheckCheck,
  PhoneCall,
  Sliders,
  Laptop,
} from "lucide-react";

/* ─── Interfaces & Types ─── */
interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  customDomain?: string | null;
  status: "ACTIVE" | "TRIAL" | "SUSPENDED";
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  maxUsers: number;
  createdAt: string;
  updatedAt?: string;
  branding?: {
    name?: string;
    tagline?: string;
    primaryColor?: string;
    logoUrl?: string;
    logoDarkUrl?: string;
    faviconUrl?: string;
  } | null;
  features?: {
    voipEnabled?: boolean;
    leexiEnabled?: boolean;
    emailHubEnabled?: boolean;
    pdpEnabled?: boolean;
  } | null;
  _count?: {
    users: number;
    clients: number;
    missions: number;
    campaigns?: number;
    actions?: number;
  };
  users?: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    isActive: boolean;
    organizationRole: string | null;
  }>;
}

interface PlatformStats {
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  suspendedOrganizations: number;
  totalUsers: number;
  totalMissions: number;
  totalActions: number;
  totalClients: number;
}

type StatusFilter = "ALL" | "ACTIVE" | "TRIAL" | "SUSPENDED";
type PlanFilter = "ALL" | "STARTER" | "PRO" | "ENTERPRISE";
type SortOption = "newest" | "oldest" | "name" | "users" | "missions";
type ViewMode = "table" | "grid";
type DrawerTab = "general" | "features" | "users" | "support";

export default function SuperAdminPage() {
  const { data: session } = useSession();
  const [, startTransition] = useTransition();

  // Data States
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Controls
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Slide-over Drawer State
  const [selectedOrg, setSelectedOrg] = useState<OrganizationItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("general");
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerForm, setDrawerForm] = useState({
    name: "",
    plan: "PRO" as "STARTER" | "PRO" | "ENTERPRISE",
    maxUsers: 20,
    customDomain: "",
    status: "ACTIVE" as "ACTIVE" | "TRIAL" | "SUSPENDED",
  });
  const [drawerFeatures, setDrawerFeatures] = useState({
    voipEnabled: true,
    leexiEnabled: true,
    emailHubEnabled: true,
    pdpEnabled: false,
  });

  // Provisioning Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    name: "",
    slug: "",
    ownerEmail: "",
    ownerName: "",
    plan: "PRO" as "STARTER" | "PRO" | "ENTERPRISE",
    maxUsers: 20,
    voipEnabled: true,
    leexiEnabled: true,
    emailHubEnabled: true,
    pdpEnabled: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [creationSuccess, setCreationSuccess] = useState<{
    message: string;
    inviteUrl: string;
    orgName: string;
    slug: string;
  } | null>(null);

  // Quick Action / Feedback States
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deleteConfirmOrg, setDeleteConfirmOrg] = useState<OrganizationItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Show floating toast
  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Fetch Organizations & Telemetry
  const fetchOrganizations = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetch("/api/super-admin/organizations");
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/super-admin";
        return;
      }
      const data = await res.json();
      if (data.success) {
        setOrganizations(data.organizations || []);
        if (data.stats) {
          setStats(data.stats);
        } else {
          // Fallback stats computation
          const orgs: OrganizationItem[] = data.organizations || [];
          setStats({
            totalOrganizations: orgs.length,
            activeOrganizations: orgs.filter((o) => o.status === "ACTIVE").length,
            trialOrganizations: orgs.filter((o) => o.status === "TRIAL").length,
            suspendedOrganizations: orgs.filter((o) => o.status === "SUSPENDED").length,
            totalUsers: orgs.reduce((acc, o) => acc + (o._count?.users || 0), 0),
            totalMissions: orgs.reduce((acc, o) => acc + (o._count?.missions || 0), 0),
            totalActions: orgs.reduce((acc, o) => acc + (o._count?.actions || 0), 0),
            totalClients: orgs.reduce((acc, o) => acc + (o._count?.clients || 0), 0),
          });
        }
        if (isManualRefresh) {
          triggerToast("Données de la plateforme actualisées en direct", "success");
        }
      } else {
        triggerToast(data.error || "Accès restreint à la tour de contrôle", "error");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Erreur de connexion à l'API Super Admin", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Copy to clipboard helper
  const copyText = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    triggerToast("Copié dans le presse-papier !", "info");
    setTimeout(() => {
      setCopiedKey((prev) => (prev === keyId ? null : prev));
    }, 2200);
  };

  // Slug generator for provisioning modal
  const handleModalNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setModalForm((prev) => ({
      ...prev,
      name: val,
      slug:
        prev.slug === "" || prev.slug === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
          ? generatedSlug
          : prev.slug,
    }));
  };

  // Create Organization Submission
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError("");

    try {
      const payload = {
        name: modalForm.name.trim(),
        slug: modalForm.slug.trim().toLowerCase(),
        ownerEmail: modalForm.ownerEmail.trim().toLowerCase(),
        ownerName: modalForm.ownerName.trim(),
        plan: modalForm.plan,
        maxUsers: Number(modalForm.maxUsers) || 20,
        features: {
          voipEnabled: modalForm.voipEnabled,
          leexiEnabled: modalForm.leexiEnabled,
          emailHubEnabled: modalForm.emailHubEnabled,
          pdpEnabled: modalForm.pdpEnabled,
        },
      };

      const res = await fetch("/api/super-admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Impossible de créer l'organisation");
      }

      setCreationSuccess({
        message: data.message,
        inviteUrl: data.inviteUrl,
        orgName: modalForm.name,
        slug: modalForm.slug,
      });

      triggerToast(`Espace agence '${modalForm.name}' créé avec succès !`, "success");
      fetchOrganizations();
    } catch (err: any) {
      setModalError(err.message || "Erreur lors du provisionnement de l'agence");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Organization Status (Quick Action)
  const handleToggleStatus = async (org: OrganizationItem, targetStatus?: "ACTIVE" | "SUSPENDED") => {
    const newStatus = targetStatus ?? (org.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
    try {
      const res = await fetch(`/api/super-admin/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrganizations((prev) =>
          prev.map((o) => (o.id === org.id ? { ...o, status: newStatus } : o))
        );
        if (selectedOrg?.id === org.id) {
          setSelectedOrg((prev) => (prev ? { ...prev, status: newStatus } : null));
          setDrawerForm((prev) => ({ ...prev, status: newStatus }));
        }
        triggerToast(
          `Espace ${org.name} ${newStatus === "ACTIVE" ? "réactivé" : "suspendu"}`,
          newStatus === "ACTIVE" ? "success" : "info"
        );
      } else {
        triggerToast(data.error || "Erreur lors de la modification du statut", "error");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Erreur lors de la modification du statut", "error");
    }
  };

  // Open Slide-over Drawer and fetch deep data
  const handleOpenDrawer = async (org: OrganizationItem, initialTab: DrawerTab = "general") => {
    setSelectedOrg(org);
    setDrawerTab(initialTab);
    setDrawerForm({
      name: org.name,
      plan: org.plan,
      maxUsers: org.maxUsers,
      customDomain: org.customDomain || "",
      status: org.status,
    });
    setDrawerFeatures({
      voipEnabled: org.features?.voipEnabled ?? true,
      leexiEnabled: org.features?.leexiEnabled ?? true,
      emailHubEnabled: org.features?.emailHubEnabled ?? true,
      pdpEnabled: org.features?.pdpEnabled ?? false,
    });

    try {
      setDrawerLoading(true);
      const res = await fetch(`/api/super-admin/organizations/${org.id}`);
      const data = await res.json();
      if (data.success && data.organization) {
        setSelectedOrg(data.organization);
        setDrawerForm({
          name: data.organization.name,
          plan: data.organization.plan,
          maxUsers: data.organization.maxUsers,
          customDomain: data.organization.customDomain || "",
          status: data.organization.status,
        });
        if (data.organization.features) {
          setDrawerFeatures({
            voipEnabled: data.organization.features.voipEnabled ?? true,
            leexiEnabled: data.organization.features.leexiEnabled ?? true,
            emailHubEnabled: data.organization.features.emailHubEnabled ?? true,
            pdpEnabled: data.organization.features.pdpEnabled ?? false,
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Save General settings in Drawer
  const handleSaveDrawerGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;

    setDrawerSaving(true);
    try {
      const res = await fetch(`/api/super-admin/organizations/${selectedOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: drawerForm.name.trim(),
          plan: drawerForm.plan,
          maxUsers: Number(drawerForm.maxUsers),
          customDomain: drawerForm.customDomain.trim() || null,
          status: drawerForm.status,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrganizations((prev) =>
          prev.map((o) => (o.id === selectedOrg.id ? { ...o, ...data.organization } : o))
        );
        setSelectedOrg((prev) => (prev ? { ...prev, ...data.organization } : null));
        triggerToast("Modifications de l'agence enregistrées", "success");
      } else {
        triggerToast(data.error || "Erreur de sauvegarde", "error");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Erreur de sauvegarde", "error");
    } finally {
      setDrawerSaving(false);
    }
  };

  // Toggle Feature in Drawer
  const handleToggleFeature = async (featureKey: keyof typeof drawerFeatures) => {
    if (!selectedOrg) return;
    const updatedFeatures = {
      ...drawerFeatures,
      [featureKey]: !drawerFeatures[featureKey],
    };
    setDrawerFeatures(updatedFeatures);

    try {
      const res = await fetch(`/api/super-admin/organizations/${selectedOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: updatedFeatures }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrganizations((prev) =>
          prev.map((o) => (o.id === selectedOrg.id ? { ...o, features: updatedFeatures } : o))
        );
        triggerToast(`Module ${featureKey} mis à jour`, "success");
      } else {
        // Revert on error
        setDrawerFeatures(drawerFeatures);
        triggerToast(data.error || "Impossible d'enregistrer la fonctionnalité", "error");
      }
    } catch (err) {
      setDrawerFeatures(drawerFeatures);
      triggerToast("Erreur de communication", "error");
    }
  };

  // Switch Tenant Support (Impersonation)
  const handleSwitchTenantSupport = (slug: string, name: string) => {
    document.cookie = `active_tenant_slug=${encodeURIComponent(slug)}; path=/; max-age=86400; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    triggerToast(`Bascule sur l'espace '${name}' en cours...`, "info");
    setTimeout(() => {
      window.location.href = "/manager/dashboard";
    }, 600);
  };

  // Delete Organization
  const handleDeleteOrganization = async () => {
    if (!deleteConfirmOrg) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/super-admin/organizations/${deleteConfirmOrg.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrganizations((prev) => prev.filter((o) => o.id !== deleteConfirmOrg.id));
        if (selectedOrg?.id === deleteConfirmOrg.id) {
          setSelectedOrg(null);
        }
        setDeleteConfirmOrg(null);
        triggerToast(`Espace agence supprimé avec succès`, "success");
        fetchOrganizations();
      } else {
        triggerToast(data.error || "Impossible de supprimer l'organisation", "error");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Erreur lors de la suppression", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered & Sorted Organizations
  const filteredOrganizations = useMemo(() => {
    return organizations
      .filter((org) => {
        // Search filter
        const query = search.toLowerCase().trim();
        const matchesQuery =
          !query ||
          org.name.toLowerCase().includes(query) ||
          org.slug.toLowerCase().includes(query) ||
          (org.customDomain && org.customDomain.toLowerCase().includes(query));

        // Status filter
        const matchesStatus = statusFilter === "ALL" || org.status === statusFilter;

        // Plan filter
        const matchesPlan = planFilter === "ALL" || org.plan === planFilter;

        return matchesQuery && matchesStatus && matchesPlan;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "users") {
          return (b._count?.users || 0) - (a._count?.users || 0);
        }
        if (sortBy === "missions") {
          return (b._count?.missions || 0) - (a._count?.missions || 0);
        }
        return 0;
      });
  }, [organizations, search, statusFilter, planFilter, sortBy]);

  // Derived KPI Stats
  const activeCount = organizations.filter((o) => o.status === "ACTIVE").length;
  const trialCount = organizations.filter((o) => o.status === "TRIAL").length;
  const suspendedCount = organizations.filter((o) => o.status === "SUSPENDED").length;
  const totalHostedUsers = stats?.totalUsers ?? organizations.reduce((acc, o) => acc + (o._count?.users || 0), 0);
  const totalMissions = stats?.totalMissions ?? organizations.reduce((acc, o) => acc + (o._count?.missions || 0), 0);
  const totalActions = stats?.totalActions ?? organizations.reduce((acc, o) => acc + (o._count?.actions || 0), 0);
  const totalQuotaAllocated = organizations.reduce((acc, o) => acc + (o.maxUsers || 0), 0);
  const quotaUtilizationPct =
    totalQuotaAllocated > 0 ? Math.min(100, Math.round((totalHostedUsers / totalQuotaAllocated) * 100)) : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-primary/20 selection:text-primary">
      {/* ── Top Header / Command Bar (Clear Theme) ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Brand & Platform Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#0B0F19] text-primary flex items-center justify-center shadow-sm border border-slate-800 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Tour de Contrôle Plateforme
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 text-primary text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Multi-Tenant
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Supervision des agences SaaS, quotas de sièges, modules VoIP & provisioning instantané
              </p>
            </div>
          </div>

          {/* Quick Actions & Navigation */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => fetchOrganizations(true)}
              disabled={refreshing || loading}
              title="Rafraîchir les données"
              className="h-9 w-9 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
            </button>

            <Link
              href="/manager/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200/80 rounded-xl hover:text-slate-950 hover:bg-slate-50 transition-all shadow-2xs"
            >
              <span>Ouvrir le CRM</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <button
              onClick={() => {
                setShowModal(true);
                setCreationSuccess(null);
                setModalError("");
                setModalForm({
                  name: "",
                  slug: "",
                  ownerEmail: "",
                  ownerName: "",
                  plan: "PRO",
                  maxUsers: 20,
                  voipEnabled: true,
                  leexiEnabled: true,
                  emailHubEnabled: true,
                  pdpEnabled: false,
                });
              }}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-[#156cd4] hover:from-[#1e7fd8] hover:to-[#0f5ab5] text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Créer un espace agence (30s)</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        {/* ── KPI Telemetry Strip (Dashboard Theme Luxury Clear Cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Espaces Agences */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Espaces Agences
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-primary flex items-center justify-center border border-blue-100">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {organizations.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">tenants</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {activeCount} active{activeCount > 1 ? "s" : ""}
              </span>
              <span className="text-slate-400 font-medium">
                {suspendedCount > 0 ? `${suspendedCount} suspendue${suspendedCount > 1 ? "s" : ""}` : "0 suspendue"}
              </span>
            </div>
          </div>

          {/* Card 2: Utilisateurs & Sièges */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Sièges Hébergés
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {totalHostedUsers}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                / {totalQuotaAllocated} alloués
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Remplissage global</span>
                <span className="font-bold text-slate-700">{quotaUtilizationPct}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-primary rounded-full transition-all duration-500"
                  style={{ width: `${quotaUtilizationPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Opérations & Missions */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Missions & Campagnes
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {totalMissions}
              </span>
              <span className="text-xs text-slate-500 font-medium">missions actives</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{stats?.totalClients ?? 0} comptes clients</span>
              </span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> En cours
              </span>
            </div>
          </div>

          {/* Card 4: Volume & Téléphonie VoIP */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Actions & Téléphonie
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <PhoneCall className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {totalActions.toLocaleString("fr-FR")}
              </span>
              <span className="text-xs text-slate-500 font-medium">appels & touches</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>WithAllo / Ringover</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                Clés Isolées
              </span>
            </div>
          </div>
        </div>

        {/* ── Organizations Management Panel (Table / Cards) ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          {/* Top Controls Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
            {/* Search Input */}
            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, sous-domaine..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs & Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Segmented Buttons */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                {(
                  [
                    { key: "ALL", label: "Tous", count: organizations.length },
                    { key: "ACTIVE", label: "Actifs", count: activeCount },
                    { key: "TRIAL", label: "Essai", count: trialCount },
                    { key: "SUSPENDED", label: "Suspendus", count: suspendedCount },
                  ] as { key: StatusFilter; label: string; count: number }[]
                ).map((tab) => {
                  const isSelected = statusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? "bg-slate-100 text-slate-800 font-bold" : "text-slate-400"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Plan Filter */}
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
              >
                <option value="ALL">Tous les plans</option>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
              >
                <option value="newest">Plus récents</option>
                <option value="name">Nom (A-Z)</option>
                <option value="users">Plus d'utilisateurs</option>
                <option value="missions">Plus de missions</option>
                <option value="oldest">Plus anciens</option>
              </select>

              {/* View Switcher (Table vs Grid) */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70">
                <button
                  onClick={() => setViewMode("table")}
                  title="Vue Tableau"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  title="Vue Grille"
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Table View ── */}
          {viewMode === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                    <th className="px-6 py-3.5">Espace Agence & Domaine</th>
                    <th className="px-6 py-3.5">Statut</th>
                    <th className="px-6 py-3.5">Formule & Quota</th>
                    <th className="px-6 py-3.5">Modules Actifs</th>
                    <th className="px-6 py-3.5">Activité</th>
                    <th className="px-6 py-3.5">Création</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        <p className="font-semibold text-slate-600">Chargement des espaces agences...</p>
                      </td>
                    </tr>
                  ) : filteredOrganizations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <p className="text-slate-700 font-bold text-sm">Aucun espace agence trouvé</p>
                        <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                          {search || statusFilter !== "ALL" || planFilter !== "ALL"
                            ? "Modifiez vos filtres ou réinitialisez la recherche pour voir tous les espaces."
                            : "Créez votre première agence en 30 secondes pour démarrer."}
                        </p>
                        {(search || statusFilter !== "ALL" || planFilter !== "ALL") && (
                          <button
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("ALL");
                              setPlanFilter("ALL");
                            }}
                            className="mt-3 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Réinitialiser les filtres
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredOrganizations.map((org) => {
                      const userCount = org._count?.users ?? 0;
                      const quotaPct = Math.min(100, Math.round((userCount / (org.maxUsers || 1)) * 100));

                      return (
                        <tr
                          key={org.id}
                          className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                          onClick={() => handleOpenDrawer(org, "general")}
                        >
                          {/* Agence & Domaine */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/60 flex items-center justify-center text-primary font-black text-sm uppercase shrink-0">
                                {org.name.slice(0, 2)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm">
                                    {org.name}
                                  </span>
                                  {org.slug === "default" && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-primary border border-blue-200/60">
                                      Principal
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                                  <span>{org.slug}.ping-crm.com</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyText(`https://${org.slug}.ping-crm.com`, org.id);
                                    }}
                                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                                    title="Copier l'URL"
                                  >
                                    {copiedKey === org.id ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Statut */}
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleStatus(org)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                                org.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100"
                                  : org.status === "TRIAL"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100"
                                  : "bg-red-50 text-red-700 border border-red-200/80 hover:bg-red-100"
                              }`}
                              title="Cliquer pour changer le statut"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  org.status === "ACTIVE"
                                    ? "bg-emerald-500 animate-pulse"
                                    : org.status === "TRIAL"
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                              />
                              <span>
                                {org.status === "ACTIVE" ? "Actif" : org.status === "TRIAL" ? "Essai" : "Suspendu"}
                              </span>
                            </button>
                          </td>

                          {/* Formule & Quota */}
                          <td className="px-6 py-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                                    org.plan === "ENTERPRISE"
                                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                                      : org.plan === "PRO"
                                      ? "bg-blue-50 text-primary border border-blue-200"
                                      : "bg-slate-100 text-slate-700 border border-slate-200"
                                  }`}
                                >
                                  {org.plan}
                                </span>
                                <span className="text-[11px] font-bold text-slate-700">
                                  {userCount} / {org.maxUsers}
                                </span>
                              </div>
                              <div className="w-28 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    quotaPct >= 90
                                      ? "bg-red-500"
                                      : quotaPct >= 70
                                      ? "bg-amber-500"
                                      : "bg-primary"
                                  }`}
                                  style={{ width: `${quotaPct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Modules Actifs */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                title="Module VoIP (Allo / Ringover)"
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                                  org.features?.voipEnabled !== false
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                    : "bg-slate-100 text-slate-400 opacity-60"
                                }`}
                              >
                                <Phone className="w-2.5 h-2.5" /> VoIP
                              </span>
                              <span
                                title="Analyse IA Leexi"
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                                  org.features?.leexiEnabled !== false
                                    ? "bg-purple-50 text-purple-700 border border-purple-200/60"
                                    : "bg-slate-100 text-slate-400 opacity-60"
                                }`}
                              >
                                <Sparkles className="w-2.5 h-2.5" /> IA
                              </span>
                              <span
                                title="Hub Email"
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                                  org.features?.emailHubEnabled !== false
                                    ? "bg-blue-50 text-primary border border-blue-200/60"
                                    : "bg-slate-100 text-slate-400 opacity-60"
                                }`}
                              >
                                <Mail className="w-2.5 h-2.5" /> Mail
                              </span>
                            </div>
                          </td>

                          {/* Activité */}
                          <td className="px-6 py-4">
                            <div className="text-slate-700 font-semibold">
                              {org._count?.missions ?? 0} mission{org._count?.missions && org._count.missions > 1 ? "s" : ""}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {org._count?.clients ?? 0} client{org._count?.clients && org._count.clients > 1 ? "s" : ""}
                            </div>
                          </td>

                          {/* Date de création */}
                          <td className="px-6 py-4 text-slate-500 text-[11px]">
                            {new Date(org.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1.5">
                              {/* Bouton Support / Switch Tenant */}
                              <button
                                type="button"
                                onClick={() => handleSwitchTenantSupport(org.slug, org.name)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-primary text-[11px] font-bold border border-blue-200/80 transition-all shadow-2xs cursor-pointer"
                                title="Prendre la main sur cet espace agence"
                              >
                                <span>Support</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>

                              {/* Bouton Gérer / Inspecter */}
                              <button
                                type="button"
                                onClick={() => handleOpenDrawer(org, "general")}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                              >
                                Gérer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── Cards View ── */
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredOrganizations.map((org) => {
                const userCount = org._count?.users ?? 0;
                const quotaPct = Math.min(100, Math.round((userCount / (org.maxUsers || 1)) * 100));

                return (
                  <div
                    key={org.id}
                    onClick={() => handleOpenDrawer(org, "general")}
                    className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-primary font-black text-sm uppercase flex items-center justify-center">
                            {org.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors text-base">
                                {org.name}
                              </h3>
                              {org.slug === "default" && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-primary border border-blue-200/60">
                                  Défaut
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-mono">{org.slug}.ping-crm.com</p>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            org.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : org.status === "TRIAL"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {org.status}
                        </span>
                      </div>

                      {/* Quota Meter */}
                      <div className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" /> Sièges occupés
                          </span>
                          <span>
                            {userCount} / {org.maxUsers}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${quotaPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Mini Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 text-[11px] block">Missions</span>
                          <span className="font-bold text-slate-800">{org._count?.missions ?? 0}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Clients</span>
                          <span className="font-bold text-slate-800">{org._count?.clients ?? 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div
                      className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleSwitchTenantSupport(org.slug, org.name)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-primary text-xs font-bold border border-blue-200/80 transition-all cursor-pointer"
                      >
                        <span>Support</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleOpenDrawer(org, "general")}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        Gérer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Slide-Over Organization Detail & Inspector Drawer ── */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setSelectedOrg(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200/80 bg-slate-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white font-black text-lg flex items-center justify-center shadow-md shadow-primary/20">
                      {selectedOrg.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900">{selectedOrg.name}</h2>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            selectedOrg.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : selectedOrg.status === "TRIAL"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {selectedOrg.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        https://{selectedOrg.slug}.ping-crm.com
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Tab Navigation */}
                <div className="flex items-center gap-2 mt-6 border-b border-slate-200 pb-px">
                  {[
                    { key: "general", label: "Général & Quotas", icon: Settings },
                    { key: "features", label: "Modules & IA", icon: Sparkles },
                    { key: "users", label: `Membres (${selectedOrg.users?.length ?? selectedOrg._count?.users ?? 0})`, icon: Users },
                    { key: "support", label: "Accès & Danger", icon: Shield },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = drawerTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setDrawerTab(tab.key as DrawerTab)}
                        className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 ${
                          isActive
                            ? "border-primary text-primary"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {drawerLoading ? (
                  <div className="py-20 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-xs font-semibold">Chargement des détails de l'agence...</p>
                  </div>
                ) : drawerTab === "general" ? (
                  /* TAB 1: General & Quotas */
                  <form onSubmit={handleSaveDrawerGeneral} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Nom de l'agence
                      </label>
                      <input
                        type="text"
                        required
                        value={drawerForm.name}
                        onChange={(e) => setDrawerForm({ ...drawerForm, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Formule / Plan
                        </label>
                        <select
                          value={drawerForm.plan}
                          onChange={(e) => setDrawerForm({ ...drawerForm, plan: e.target.value as any })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                        >
                          <option value="STARTER">Starter</option>
                          <option value="PRO">Pro</option>
                          <option value="ENTERPRISE">Enterprise</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Limite de sièges
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          value={drawerForm.maxUsers}
                          onChange={(e) => setDrawerForm({ ...drawerForm, maxUsers: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Statut de l'espace
                      </label>
                      <select
                        value={drawerForm.status}
                        onChange={(e) => setDrawerForm({ ...drawerForm, status: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                      >
                        <option value="ACTIVE">Actif (Accès autorisé)</option>
                        <option value="TRIAL">Période d'essai (Trial)</option>
                        <option value="SUSPENDED">Suspendu (Accès bloqué)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Domaine personnalisé (Optionnel)
                      </label>
                      <div className="flex items-center">
                        <input
                          type="text"
                          placeholder="app.mon-agence.com"
                          value={drawerForm.customDomain}
                          onChange={(e) => setDrawerForm({ ...drawerForm, customDomain: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Permet à l'agence de pointer un CNAME vers Ping pour du 100% marque blanche.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-200 flex justify-end">
                      <button
                        type="submit"
                        disabled={drawerSaving}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                      >
                        {drawerSaving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Enregistrement...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Enregistrer les modifications</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : drawerTab === "features" ? (
                  /* TAB 2: Modules & Feature Flags */
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Activez ou désactivez les fonctionnalités et intégrations API pour cette agence.
                      Les modifications prennent effet immédiatement.
                    </p>

                    {/* Feature 1: VoIP Calling */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Module VoIP Téléphonie</h4>
                          <p className="text-[11px] text-slate-500">
                            Intégration WithAllo, Ringover et OnOff pour les appels en direct
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFeature("voipEnabled")}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          drawerFeatures.voipEnabled ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                            drawerFeatures.voipEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Feature 2: Leexi AI Analysis */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Analyse IA & Transcriptions (Leexi)</h4>
                          <p className="text-[11px] text-slate-500">
                            Transcription automatique des appels, extraction d'objections & scoring
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFeature("leexiEnabled")}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          drawerFeatures.leexiEnabled ? "bg-purple-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                            drawerFeatures.leexiEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Feature 3: Email Hub */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-primary flex items-center justify-center border border-blue-200">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Hub Email & Boîtes Mail Multiples</h4>
                          <p className="text-[11px] text-slate-500">
                            Synchronisation IMAP/SMTP et campagnes d'emails automatiques
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFeature("emailHubEnabled")}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          drawerFeatures.emailHubEnabled ? "bg-primary" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                            drawerFeatures.emailHubEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Feature 4: Prospect Data Platform (PDP) */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                          <Target className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Plateforme de Données Prospects (PDP)</h4>
                          <p className="text-[11px] text-slate-500">
                            Enrichissement automatique, cascade de téléphones et sandbox
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleFeature("pdpEnabled")}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          drawerFeatures.pdpEnabled ? "bg-amber-500" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                            drawerFeatures.pdpEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ) : drawerTab === "users" ? (
                  /* TAB 3: Hosted Users */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Collaborateurs rattachés ({selectedOrg.users?.length ?? 0})
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleSwitchTenantSupport(selectedOrg.slug, selectedOrg.name)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <span>Inviter un utilisateur via le CRM</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {(!selectedOrg.users || selectedOrg.users.length === 0) ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200">
                        <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700">Aucun utilisateur actif</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          L'invitation du propriétaire est en attente ou aucun membre n'a encore rejoint.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                        {selectedOrg.users.map((u) => (
                          <div key={u.id} className="p-3.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                                {u.name ? u.name.slice(0, 2).toUpperCase() : u.email.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900">{u.name || "Sans nom"}</span>
                                  {u.organizationRole === "OWNER" && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      Propriétaire
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500">{u.email}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {u.role}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  u.isActive ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                                title={u.isActive ? "Actif" : "Inactif"}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* TAB 4: Support & Danger Zone */
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                      <div className="flex items-center gap-2.5 text-primary font-bold text-xs">
                        <ExternalLink className="w-4 h-4" />
                        <span>Session de Support Administrateur</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Vous pouvez vous connecter instantanément à cet espace agence avec les privilèges complets
                        sans demander les identifiants du client.
                      </p>
                      <button
                        onClick={() => handleSwitchTenantSupport(selectedOrg.slug, selectedOrg.name)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
                      >
                        <span>Se connecter comme Administrateur sur cet espace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl border border-red-200 bg-red-50/30 space-y-3">
                      <div className="flex items-center gap-2 text-red-600 font-bold text-xs">
                        <AlertCircle className="w-4 h-4" />
                        <span>Zone de Danger</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        La suspension bloque immédiatement les SDRs et Managers. La suppression efface définitivement
                        l'agence et l'ensemble de ses données.
                      </p>

                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(selectedOrg)}
                          className="w-full sm:w-auto flex-1 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          {selectedOrg.status === "ACTIVE" ? "Suspendre l'espace" : "Réactiver l'espace"}
                        </button>

                        {selectedOrg.slug !== "default" && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmOrg(selectedOrg)}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Supprimer l'agence
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 30-Second Provisioning Modal (Clean Modern Clear Theme) ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 p-6 sm:p-7 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/80 text-primary flex items-center justify-center shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    Déployer un espace agence
                  </h3>
                  <p className="text-xs text-slate-500">
                    Environnement multi-tenant isolé en 30 secondes chrono
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {creationSuccess ? (
              /* Success Celebration Screen */
              <div className="py-4 space-y-5">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <div className="flex items-center gap-2 font-black text-emerald-700 text-sm mb-1">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Espace agence provisionné avec succès !</span>
                  </div>
                  <p>{creationSuccess.message}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Lien d'activation immédiate pour le dirigeant :
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={creationSuccess.inviteUrl}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => copyText(creationSuccess.inviteUrl, "modal-invite")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold cursor-pointer hover:bg-primary-hover shadow-sm"
                    >
                      {copiedKey === "modal-invite" ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={() => handleSwitchTenantSupport(creationSuccess.slug, creationSuccess.orgName)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    <span>Ouvrir l'espace agence</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Provisioning Form */
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                {modalError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Nom & Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nom de l'agence *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Growth Lab Agency"
                      value={modalForm.name}
                      onChange={handleModalNameChange}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sous-domaine réservé *
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        placeholder="growthlab"
                        value={modalForm.slug}
                        onChange={(e) =>
                          setModalForm({ ...modalForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                      https://{modalForm.slug || "slug"}.ping-crm.com
                    </span>
                  </div>
                </div>

                {/* Propriétaire */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email du Dirigeant (Owner) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="fondateur@agence.com"
                      value={modalForm.ownerEmail}
                      onChange={(e) => setModalForm({ ...modalForm, ownerEmail: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nom du Dirigeant
                    </label>
                    <input
                      type="text"
                      placeholder="Alexandre Martin"
                      value={modalForm.ownerName}
                      onChange={(e) => setModalForm({ ...modalForm, ownerName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Plan Selection Cards */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Formule & Quota de sièges
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { plan: "STARTER", label: "Starter", seats: 5, desc: "Petite équipe" },
                      { plan: "PRO", label: "Pro", seats: 20, desc: "Recommandé" },
                      { plan: "ENTERPRISE", label: "Enterprise", seats: 100, desc: "Grand compte" },
                    ].map((item) => {
                      const isSelected = modalForm.plan === item.plan;
                      return (
                        <div
                          key={item.plan}
                          onClick={() =>
                            setModalForm({
                              ...modalForm,
                              plan: item.plan as any,
                              maxUsers: item.seats,
                            })
                          }
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-blue-50/50 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900">{item.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <p className="text-[11px] font-bold text-slate-600 mt-1">{item.seats} SDRs</p>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Modules Toggles */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Modules activés d'office :
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modalForm.voipEnabled}
                        onChange={(e) => setModalForm({ ...modalForm, voipEnabled: e.target.checked })}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="font-semibold text-slate-700">VoIP Phone</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modalForm.leexiEnabled}
                        onChange={(e) => setModalForm({ ...modalForm, leexiEnabled: e.target.checked })}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="font-semibold text-slate-700">Analyse IA</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modalForm.emailHubEnabled}
                        onChange={(e) => setModalForm({ ...modalForm, emailHubEnabled: e.target.checked })}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="font-semibold text-slate-700">Hub Email</span>
                    </label>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#156cd4] hover:from-[#1e7fd8] hover:to-[#0f5ab5] text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Provisioning en cours...</span>
                      </>
                    ) : (
                      <>
                        <span>Provisionner l'agence</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Confirmation Modal for Delete ── */}
      {deleteConfirmOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Supprimer l'espace agence ?</h3>
                <p className="text-xs text-slate-500">Cette action est irréversible.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Êtes-vous certain de vouloir supprimer définitivement l'espace{" "}
              <strong className="text-slate-900">{deleteConfirmOrg.name}</strong> ({deleteConfirmOrg.slug}) ?
              Tous les utilisateurs, missions et données associés seront effacés.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOrg(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteOrganization}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Toast Notification ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
              toast.type === "success"
                ? "bg-slate-900 text-white border-slate-800"
                : toast.type === "error"
                ? "bg-red-600 text-white border-red-700"
                : "bg-blue-600 text-white border-blue-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
