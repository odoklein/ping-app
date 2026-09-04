import nodemailer from "nodemailer";

export interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  error?: string;
}

/**
 * Tests WithAllo API key by querying /v1/users
 */
export async function testWithAllo(apiKey: string): Promise<TestResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { success: false, message: "Clé API WithAllo manquante" };
  }

  try {
    const res = await fetch("https://api.withallo.com/v1/users", {
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        message: "Clé API WithAllo invalide ou expirée (Code 401/403). Vérifiez votre clé dans votre console Allo.",
      };
    }

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const userCount = Array.isArray(data?.users) ? data.users.length : (Array.isArray(data) ? data.length : 1);
      return {
        success: true,
        message: `Connexion WithAllo réussie (${userCount} utilisateur${userCount > 1 ? "s" : ""} / ligne${userCount > 1 ? "s" : ""} détectée${userCount > 1 ? "s" : ""})`,
        details: { userCount },
      };
    }

    // Some WithAllo accounts query /v1/calls or /v1/me
    const fallbackRes = await fetch("https://api.withallo.com/v1/me", {
      headers: { Authorization: `Bearer ${cleanKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (fallbackRes.ok) {
      return {
        success: true,
        message: "Connexion WithAllo réussie (Profil agence authentifié).",
      };
    }

    return {
      success: false,
      message: `Erreur WithAllo (${res.status} ${res.statusText}).`,
    };
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      return { success: false, message: "Délai de connexion dépassé vers l'API WithAllo (Timeout)." };
    }
    return { success: false, message: `Erreur réseau : ${err.message}` };
  }
}

/**
 * Tests Ringover API Key
 */
export async function testRingover(apiKey: string): Promise<TestResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { success: false, message: "Clé API Ringover manquante" };
  }

  try {
    const res = await fetch("https://public-api.ringover.com/v2/users", {
      headers: {
        Authorization: cleanKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        message: "Clé API Ringover non reconnue. Vérifiez vos droits d'accès API dans votre espace Ringover.",
      };
    }

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const list = data?.user_list || data?.users || [];
      return {
        success: true,
        message: `Connexion Ringover réussie (${list.length} utilisateur${list.length > 1 ? "s" : ""} actif${list.length > 1 ? "s" : ""}).`,
        details: { userCount: list.length },
      };
    }

    return {
      success: false,
      message: `Erreur Ringover (${res.status} ${res.statusText}).`,
    };
  } catch (err: any) {
    return { success: false, message: `Erreur Ringover : ${err.message}` };
  }
}

/**
 * Tests Leexi API Credentials
 */
export async function testLeexi(keyId: string, keySecret: string): Promise<TestResult> {
  const id = keyId.trim();
  const secret = keySecret.trim();
  if (!id || !secret) {
    return { success: false, message: "Identifiant et Secret Leexi requis" };
  }

  try {
    const res = await fetch("https://api.leexi.ai/v1/sessions?limit=1", {
      headers: {
        "X-Key-Id": id,
        "X-Key-Secret": secret,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        message: "Identifiants Leexi invalides (Key ID ou Key Secret incorrect).",
      };
    }

    if (res.ok) {
      return {
        success: true,
        message: "Connexion Leexi réussie. Les sessions et synthèses IA sont prêtes.",
      };
    }

    return {
      success: false,
      message: `Réponse Leexi inattendue (${res.status}).`,
    };
  } catch (err: any) {
    return { success: false, message: `Erreur connexion Leexi : ${err.message}` };
  }
}

/**
 * Tests SMTP credentials by opening transport and sending handshake
 */
export async function testSmtp(config: {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}): Promise<TestResult> {
  if (!config.host || !config.user || !config.pass) {
    return { success: false, message: "Paramètres SMTP incomplets (hôte, utilisateur et mot de passe requis)." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host.trim(),
      port: Number(config.port) || 587,
      secure: Boolean(config.secure || config.port === 465),
      auth: {
        user: config.user.trim(),
        pass: config.pass.trim(),
      },
      connectionTimeout: 8000,
    });

    await transporter.verify();

    return {
      success: true,
      message: `Serveur SMTP connecté avec succès (${config.host}:${config.port}).`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Échec connexion SMTP : ${err.message || "Impossible de se connecter au serveur mail"}`,
    };
  }
}
