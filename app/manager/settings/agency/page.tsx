"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Phone,
  Sparkles,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowRight,
  ExternalLink,
  Zap,
  Globe,
  Lock,
} from "lucide-react";

export default function AgencySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form State
  const [orgData, setOrgData] = useState<any>({
    name: "",
    slug: "",
    customDomain: "",
    plan: "PRO",
    voipConfig: {
      provider: "ALLO",
      alloApiKey: "",
      ringoverApiKey: "",
      onoffApiToken: "",
    },
    leexiConfig: {
      keyId: "",
      keySecret: "",
    },
    smtpConfig: {
      host: "",
      port: 587,
      user: "",
      pass: "",
      fromName: "",
      fromEmail: "",
    },
  });

  // Test Connection States
  const [testingVoip, setTestingVoip] = useState(false);
  const [voipTestResult, setVoipTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingLeexi, setTestingLeexi] = useState(false);
  const [leexiTestResult, setLeexiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const res = await fetch("/api/tenant/config");
        const data = await res.json();
        if (data.success && data.organization) {
          setOrgData(data.organization);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/tenant/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orgData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'enregistrement");
      }

      setSuccessMsg("Paramètres de votre espace agence enregistrés avec succès !");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleTestVoip = async () => {
    setTestingVoip(true);
    setVoipTestResult(null);

    const provider = orgData.voipConfig.provider;
    const apiKey =
      provider === "ALLO"
        ? orgData.voipConfig.alloApiKey
        : provider === "RINGOVER"
        ? orgData.voipConfig.ringoverApiKey
        : orgData.voipConfig.onoffApiToken;

    try {
      const res = await fetch("/api/tenant/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          credentials: { apiKey },
        }),
      });
      const data = await res.json();
      setVoipTestResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? "Connexion réussie !" : "Échec de connexion"),
      });
    } catch (err: any) {
      setVoipTestResult({ success: false, message: `Erreur réseau : ${err.message}` });
    } finally {
      setTestingVoip(false);
    }
  };

  const handleTestLeexi = async () => {
    setTestingLeexi(true);
    setLeexiTestResult(null);

    try {
      const res = await fetch("/api/tenant/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "LEEXI",
          credentials: {
            keyId: orgData.leexiConfig.keyId,
            keySecret: orgData.leexiConfig.keySecret,
          },
        }),
      });
      const data = await res.json();
      setLeexiTestResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? "Connexion Leexi réussie !" : "Échec de connexion"),
      });
    } catch (err: any) {
      setLeexiTestResult({ success: false, message: `Erreur réseau : ${err.message}` });
    } finally {
      setTestingLeexi(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);

    try {
      const res = await fetch("/api/tenant/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "SMTP",
          credentials: orgData.smtpConfig,
        }),
      });
      const data = await res.json();
      setSmtpTestResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? "Serveur SMTP opérationnel !" : "Échec de connexion SMTP"),
      });
    } catch (err: any) {
      setSmtpTestResult({ success: false, message: `Erreur réseau : ${err.message}` });
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-slate-500 text-sm">
        Chargement de la configuration de votre espace agence...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Mon Espace Agence & APIs</h1>
              <p className="text-xs text-slate-500">
                Gérez vos intégrations téléphonie, clés d'APIs et configuration multi-tenant
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/manager/settings/appearance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Personnaliser la Marque Blanche</span>
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Enregistrement..." : "Enregistrer les modifications"}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1 : Informations Générales de l'Agence */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-600" />
              Identité de l'Espace
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
              Plan {orgData.plan}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nom de l'agence
              </label>
              <input
                type="text"
                value={orgData.name || ""}
                onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sous-domaine dédié
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  readOnly
                  value={`${orgData.slug || "default"}.ping-crm.com`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2 : Téléphonie & VoIP avec Testeur en Direct */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Téléphonie & VoIP Dédiée
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chaque agence utilise son propre compte d'appels. Les clés sont chiffrées en base.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestVoip}
              disabled={testingVoip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{testingVoip ? "Test en cours..." : "Tester la connexion"}</span>
            </button>
          </div>

          {voipTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
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
              <span>{voipTestResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "ALLO", label: "WithAllo", desc: "Téléphonie WebRTC & CTI moderne" },
              { id: "RINGOVER", label: "Ringover", desc: "Solution européenne pour centres de prospection" },
              { id: "ONOFF", label: "Onoff Business", desc: "Gestion des numéros mobiles professionnels" },
            ].map((p) => (
              <label
                key={p.id}
                className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                  orgData.voipConfig?.provider === p.id
                    ? "border-primary bg-primary/5 text-slate-900 font-medium"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900">{p.label}</span>
                  <input
                    type="radio"
                    name="voipProvider"
                    checked={orgData.voipConfig?.provider === p.id}
                    onChange={() =>
                      setOrgData({
                        ...orgData,
                        voipConfig: { ...orgData.voipConfig, provider: p.id },
                      })
                    }
                    className="accent-primary"
                  />
                </div>
                <span className="text-[11px] text-slate-500">{p.desc}</span>
              </label>
            ))}
          </div>

          {orgData.voipConfig?.provider === "ALLO" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Clé API WithAllo (Bearer Token)
              </label>
              <input
                type="password"
                placeholder="Ex: allo_live_xxxxxxxxxxxxxxxx"
                value={orgData.voipConfig?.alloApiKey || ""}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    voipConfig: { ...orgData.voipConfig, alloApiKey: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-primary"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Générée depuis votre console WithAllo &gt; Paramètres &gt; API &amp; Webhooks.
              </p>
            </div>
          )}

          {orgData.voipConfig?.provider === "RINGOVER" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Clé API Ringover
              </label>
              <input
                type="password"
                placeholder="Ex: ringover_api_key_xxxxxxxx"
                value={orgData.voipConfig?.ringoverApiKey || ""}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    voipConfig: { ...orgData.voipConfig, ringoverApiKey: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-primary"
              />
            </div>
          )}

          {orgData.voipConfig?.provider === "ONOFF" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Token API Onoff Business
              </label>
              <input
                type="password"
                placeholder="Ex: onoff_token_xxxxxxxx"
                value={orgData.voipConfig?.onoffApiToken || ""}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    voipConfig: { ...orgData.voipConfig, onoffApiToken: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-primary"
              />
            </div>
          )}
        </div>

        {/* Section 3 : Transcriptions & IA (Leexi) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Intelligence Artificielle & Synthèse (Leexi)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Connexion pour synchroniser les enregistrements d'appels et synthèses IA.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestLeexi}
              disabled={testingLeexi}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <span>{testingLeexi ? "Test en cours..." : "Tester la connexion Leexi"}</span>
            </button>
          </div>

          {leexiTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                leexiTestResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {leexiTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{leexiTestResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                X-Key-Id Leexi
              </label>
              <input
                type="text"
                placeholder="Identifiant de clé Leexi"
                value={orgData.leexiConfig?.keyId || ""}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    leexiConfig: { ...orgData.leexiConfig, keyId: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                X-Key-Secret Leexi
              </label>
              <input
                type="password"
                placeholder="Secret Leexi"
                value={orgData.leexiConfig?.keySecret || ""}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    leexiConfig: { ...orgData.leexiConfig, keySecret: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 4 : Serveur Email Transactionnel (SMTP dédié) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                Serveur Email Sortant (SMTP Personnalisé)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pour envoyer les notifications de RDV et invitations avec le domaine de votre agence.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={testingSmtp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>{testingSmtp ? "Test en cours..." : "Tester le serveur SMTP"}</span>
            </button>
          </div>

          {smtpTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                smtpTestResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {smtpTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{smtpTestResult.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hôte SMTP (ex: smtp.mailgun.org)
              </label>
              <input
                type="text"
                placeholder="smtp.votredomaine.com"
                value={orgData.smtpConfig?.host || ""}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    smtpConfig: { ...orgData.smtpConfig, host: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Port</label>
              <input
                type="number"
                placeholder="587"
                value={orgData.smtpConfig?.port || 587}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    smtpConfig: { ...orgData.smtpConfig, port: Number(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Utilisateur SMTP</label>
              <input
                type="text"
                placeholder="postmaster@votredomaine.com"
                value={orgData.smtpConfig?.user || ""}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    smtpConfig: { ...orgData.smtpConfig, user: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mot de passe SMTP</label>
              <input
                type="password"
                placeholder="Mot de passe ou API Token"
                value={orgData.smtpConfig?.pass || ""}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    smtpConfig: { ...orgData.smtpConfig, pass: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono focus:outline-hidden focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nom de l'expéditeur</label>
              <input
                type="text"
                placeholder="Ex: Équipe LeadPro"
                value={orgData.smtpConfig?.fromName || ""}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    smtpConfig: { ...orgData.smtpConfig, fromName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email de l'expéditeur</label>
              <input
                type="email"
                placeholder="contact@votredomaine.com"
                value={orgData.smtpConfig?.fromEmail || ""}
                onChange={(e) =>
                  setOrgData({
                    ...orgData,
                    smtpConfig: { ...orgData.smtpConfig, fromEmail: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Floating / Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Enregistrement..." : "Enregistrer tous les paramètres"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
