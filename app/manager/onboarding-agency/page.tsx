"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Sparkles,
  Phone,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  Check,
  Rocket,
} from "lucide-react";
import { BRAND_COLOR_PRESETS } from "@/lib/brand/types";

export default function AgencyOnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [testingVoip, setTestingVoip] = useState(false);
  const [voipTestResult, setVoipTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form State
  const [agencyData, setAgencyData] = useState({
    name: "",
    tagline: "Plateforme d'exécution commerciale",
    primaryColor: "#2890F8",
    logoUrl: "",
    voipProvider: "ALLO",
    alloApiKey: "",
    ringoverApiKey: "",
    inviteEmails: "",
  });

  const handleTestVoip = async () => {
    setTestingVoip(true);
    setVoipTestResult(null);

    const apiKey =
      agencyData.voipProvider === "ALLO"
        ? agencyData.alloApiKey
        : agencyData.ringoverApiKey;

    try {
      const res = await fetch("/api/tenant/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: agencyData.voipProvider,
          credentials: { apiKey },
        }),
      });
      const data = await res.json();
      setVoipTestResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? "Connexion réussie !" : "Échec de connexion"),
      });
    } catch (err: any) {
      setVoipTestResult({ success: false, message: `Erreur : ${err.message}` });
    } finally {
      setTestingVoip(false);
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      // 1. Save agency config
      await fetch("/api/tenant/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agencyData.name,
          branding: {
            name: agencyData.name,
            tagline: agencyData.tagline,
            primaryColor: agencyData.primaryColor,
            logoUrl: agencyData.logoUrl || null,
          },
          voipConfig: {
            provider: agencyData.voipProvider,
            alloApiKey: agencyData.alloApiKey,
            ringoverApiKey: agencyData.ringoverApiKey,
          },
        }),
      });

      // 2. Send invitations to SDR emails if entered
      if (agencyData.inviteEmails.trim()) {
        const emails = agencyData.inviteEmails
          .split(/[\n,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        for (const email of emails) {
          await fetch("/api/invitations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              role: "SDR",
            }),
          }).catch(() => {});
        }
      }

      // 3. Mark complete and redirect to dashboard
      router.push("/manager/dashboard");
    } catch (err) {
      console.error(err);
      router.push("/manager/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Step Progress Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <Rocket className="w-4 h-4" />
              <span>Initialisation de votre espace agence</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Étape {currentStep} sur 3
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            {currentStep === 1 && "Donnez une identité à votre CRM"}
            {currentStep === 2 && "Branchez votre téléphonie d'appels"}
            {currentStep === 3 && "Invitez votre équipe commerciale"}
          </h1>
          <p className="text-xs text-slate-400">
            {currentStep === 1 && "Vos SDRs et vos clients verront votre nom, votre logo et vos couleurs."}
            {currentStep === 2 && "Chaque appel sera automatiquement enregistré et transcrit par l'IA."}
            {currentStep === 3 && "Ajoutez les adresses emails des SDRs qui prospecteront sur votre espace."}
          </p>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-6 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {/* STEP 1 : BRANDING */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Nom commercial de votre agence *
                </label>
                <input
                  type="text"
                  placeholder="Ex: ScaleGen Partners"
                  value={agencyData.name}
                  onChange={(e) => setAgencyData({ ...agencyData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Couleur principale de la marque
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {BRAND_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setAgencyData({ ...agencyData, primaryColor: preset.hex })}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        agencyData.primaryColor === preset.hex
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span className="text-xs font-medium text-slate-800 truncate">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  URL de votre logo (Optionnel)
                </label>
                <input
                  type="url"
                  placeholder="https://votre-site.com/logo.png"
                  value={agencyData.logoUrl}
                  onChange={(e) => setAgencyData({ ...agencyData, logoUrl: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-primary"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Si non renseigné, un monogramme moderne aux couleurs de votre agence sera généré.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2 : VOIP */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-2">
                  Choisissez votre solution téléphonique
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "ALLO", name: "WithAllo (Recommandé)", desc: "WebRTC moderne avec détection de répondeur" },
                    { id: "RINGOVER", name: "Ringover", desc: "Téléphonie d'entreprise & call centers" },
                  ].map((p) => (
                    <label
                      key={p.id}
                      className={`p-3.5 rounded-xl border cursor-pointer flex flex-col transition-all ${
                        agencyData.voipProvider === p.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{p.name}</span>
                        <input
                          type="radio"
                          name="voipProviderWizard"
                          checked={agencyData.voipProvider === p.id}
                          onChange={() => setAgencyData({ ...agencyData, voipProvider: p.id })}
                          className="accent-primary"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500">{p.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-900">
                    Clé API {agencyData.voipProvider === "ALLO" ? "WithAllo" : "Ringover"}
                  </label>
                  <button
                    type="button"
                    onClick={handleTestVoip}
                    disabled={testingVoip}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    {testingVoip ? "Test en cours..." : "Tester la clé maintenant"}
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Collez votre clé API ici..."
                  value={
                    agencyData.voipProvider === "ALLO"
                      ? agencyData.alloApiKey
                      : agencyData.ringoverApiKey
                  }
                  onChange={(e) =>
                    setAgencyData({
                      ...agencyData,
                      ...(agencyData.voipProvider === "ALLO"
                        ? { alloApiKey: e.target.value }
                        : { ringoverApiKey: e.target.value }),
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-hidden focus:border-primary"
                />
              </div>

              {voipTestResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    voipTestResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {voipTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span className="font-medium">{voipTestResult.message}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 : TEAM INVITATIONS */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1.5">
                  Adresses emails des premiers SDRs (Optionnel)
                </label>
                <textarea
                  rows={4}
                  placeholder="sdr1@votre-agence.com&#10;sdr2@votre-agence.com"
                  value={agencyData.inviteEmails}
                  onChange={(e) => setAgencyData({ ...agencyData, inviteEmails: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-primary font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Un email d'invitation avec lien d'activation sécurisé leur sera automatiquement envoyé. Vous pourrez en ajouter d'autres à tout moment.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Récapitulatif de votre espace :
                </div>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>Agence : <strong>{agencyData.name || "Mon Agence"}</strong></li>
                  <li>Téléphonie : <strong>{agencyData.voipProvider}</strong></li>
                  <li>Marque blanche configurée & isolée</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Précédent</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <span>Continuer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
              >
                <span>{submitting ? "Finalisation..." : "Accéder à mon espace CRM"}</span>
                <Rocket className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
