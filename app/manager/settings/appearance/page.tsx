"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Palette,
  Sparkles,
  Save,
  RotateCcw,
  Check,
  CheckCircle2,
  TrendingUp,
  Building2,
  Sliders,
  ExternalLink,
} from "lucide-react";
import { useBrand } from "@/components/brand/BrandProvider";
import { BRAND_COLOR_PRESETS, DEFAULT_BRAND, BrandConfig } from "@/lib/brand/types";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";

export default function BrandAppearancePage() {
  const { brand, setBrand, setLivePrimaryColor } = useBrand();

  const [formState, setFormState] = useState<BrandConfig>({
    name: brand.name || DEFAULT_BRAND.name,
    tagline: brand.tagline || DEFAULT_BRAND.tagline,
    primaryColor: brand.primaryColor || DEFAULT_BRAND.primaryColor,
    accentColor: brand.accentColor || DEFAULT_BRAND.accentColor,
    logoUrl: brand.logoUrl || "",
    logoDarkUrl: brand.logoDarkUrl || "",
    faviconUrl: brand.faviconUrl || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSimulatorTab, setActiveSimulatorTab] = useState("overview");

  // Handle color change with live CSS variable update
  const handleColorChange = (hex: string) => {
    setFormState((prev) => ({ ...prev, primaryColor: hex }));
    setLivePrimaryColor(hex);
  };

  // Reset to default
  const handleReset = () => {
    setFormState(DEFAULT_BRAND);
    setLivePrimaryColor(DEFAULT_BRAND.primaryColor);
  };

  // Save to backend
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/brand/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      const data = await res.json();
      if (data.success) {
        setBrand(data.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Erreur sauvegarde marque", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="elan-page max-w-6xl mx-auto">
      {/* ── Breadcrumb & Navigation ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/manager/settings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux paramètres
        </Link>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary-light text-primary border border-primary/20">
          Marque Blanche &amp; Multi-Tenant
        </span>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-3">
            <Palette className="w-7 h-7 text-primary" />
            Personnalisation de la Marque
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl leading-relaxed">
            Adaptez l&apos;interface aux couleurs et à l&apos;identité de votre agence.
            Toutes les modifications s&apos;appliquent en temps réel sur l&apos;ensemble de vos portails (Manager, SDR, Client).
          </p>
        </div>

        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <Button variant="outline" size="sm" onClick={handleReset} type="button">
            <RotateCcw className="w-3.5 h-3.5" />
            Par défaut
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            isLoading={isSaving}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                Enregistré !
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Enregistrer la marque
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Main Grid: Settings (Left) & Simulator (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Configuration */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Section: Identité de Base */}
          <div className="card space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Identité de l&apos;Espace
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Nom de votre structure / marque
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormState((prev) => ({ ...prev, name }));
                    setBrand((prev) => ({ ...prev, name }));
                  }}
                  className="planning-input"
                  placeholder="Ex: Ping, Agence LeadPro, Zenith Sales"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1.5">
                  Slogan ou description courte
                </label>
                <input
                  type="text"
                  value={formState.tagline || ""}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, tagline: e.target.value }))
                  }
                  className="planning-input"
                  placeholder="Ex: Plateforme d'exécution commerciale"
                />
              </div>
            </div>
          </div>

          {/* Section: Palette de Couleurs */}
          <div className="card space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              Couleur Principale (Theme Color)
            </h2>

            {/* Color Presets */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted">Palettes recommandées :</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {BRAND_COLOR_PRESETS.map((preset) => {
                  const isSelected =
                    formState.primaryColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleColorChange(preset.hex)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary-light/40 shadow-xs"
                          : "border-border bg-surface hover:bg-subtle"
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full shrink-0 shadow-xs border border-white"
                        style={{ background: preset.hex }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink truncate">{preset.name}</p>
                        <p className="text-[10px] text-muted font-mono">{preset.hex}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Input */}
            <div className="pt-3 border-t border-border flex items-center gap-4">
              <div className="relative">
                <input
                  type="color"
                  id="primaryColorPicker"
                  value={formState.primaryColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-11 h-11 rounded-xl cursor-pointer border border-border p-1 bg-white"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="primaryColorPicker"
                  className="block text-xs font-bold text-ink"
                >
                  Couleur sur-mesure (Hex)
                </label>
                <input
                  type="text"
                  value={formState.primaryColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="mt-1 h-9 px-3 rounded-lg border border-border text-xs font-mono font-bold text-ink w-32 focus:border-primary focus:outline-none"
                  placeholder="#2890F8"
                />
              </div>
            </div>
          </div>

          {/* Section: Logos & Assets */}
          <div className="card space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" />
              Logos &amp; Visuels (Optionnel)
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  URL du logo principal (Fond clair)
                </label>
                <input
                  type="url"
                  value={formState.logoUrl || ""}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, logoUrl: e.target.value }))
                  }
                  className="planning-input"
                  placeholder="https://votre-domaine.com/logo.png"
                />
                <p className="text-[11px] text-muted mt-1">
                  Format recommandé : PNG ou SVG transparent, hauteur minimum 40px.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  URL du logo blanc / dark mode (Fond sombre)
                </label>
                <input
                  type="url"
                  value={formState.logoDarkUrl || ""}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, logoDarkUrl: e.target.value }))
                  }
                  className="planning-input"
                  placeholder="https://votre-domaine.com/logo-white.png"
                />
                <p className="text-[11px] text-muted mt-1">
                  Utilisé pour l&apos;écran de connexion sombre et les interfaces d&apos;accueil.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Right Preview: Live White-Label Simulator */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Simulateur d&apos;Interface en Direct
            </h2>
            <span className="text-[10px] font-mono text-muted">Zéro Rechargement</span>
          </div>

          {/* Device Mockup */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-md space-y-5">
            {/* Mock Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <BrandLogo compact />
              </div>
              <Badge variant="primary">Actif</Badge>
            </div>

            {/* Mock Tabs */}
            <div>
              <Tabs
                variant="pills"
                tabs={[
                  { id: "overview", label: "Aperçu", badge: "Live" },
                  { id: "actions", label: "Missions", badge: 4 },
                ]}
                activeTab={activeSimulatorTab}
                onTabChange={setActiveSimulatorTab}
              />
            </div>

            {/* Mock Card with Primary Elements */}
            <div className="rounded-xl border border-border bg-subtle/50 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted">Performance du jour</p>
                  <p className="text-xl font-bold text-ink mt-0.5">84 Rendez-vous</p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <TrendingUp className="w-3 h-3" /> +18%
                </span>
              </div>

              {/* Progress bar using primary token */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-medium text-muted">
                  <span>Objectif mensuel</span>
                  <span className="text-primary font-bold">78%</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: "78%" }}
                  />
                </div>
              </div>
            </div>

            {/* Mock Action Buttons */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold text-muted">Boutons &amp; Appels à l&apos;action :</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm">
                  Bouton Principal
                </Button>
                <Button variant="secondary" size="sm">
                  Secondaire
                </Button>
                <Button variant="outline" size="sm">
                  Contour
                </Button>
              </div>
            </div>

            {/* Mock Input */}
            <div className="pt-1">
              <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">
                Champ de saisie actif (Focus Ring)
              </label>
              <input
                type="text"
                defaultValue="Cliquez pour tester l'anneau de focus"
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-ink font-medium"
              />
            </div>

            {/* Live Indicator */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Token actif :
              </span>
              <span className="font-mono font-bold text-primary">
                {formState.primaryColor}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
