import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte key from NEXTAUTH_SECRET or a fallback secret
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || "default_fallback_tenant_secret_32_bytes_ping!";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a sensitive string (API key, token, password) with AES-256-GCM
 */
export function encryptSecret(plainText: string): string {
  if (!plainText || !plainText.trim()) return "";
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("[CRYPTO_ENCRYPT_ERROR]", error);
    return plainText;
  }
}

/**
 * Decrypts an encrypted string
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText || !cipherText.includes(":")) return cipherText;
  try {
    const [ivHex, tagHex, encryptedHex] = cipherText.split(":");
    if (!ivHex || !tagHex || !encryptedHex) return cipherText;

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[CRYPTO_DECRYPT_ERROR]", error);
    return "";
  }
}

/**
 * Masks an API key for safe UI display (e.g. "allo_live_••••••••3a1f")
 */
export function maskApiKey(key: string | null | undefined): string {
  if (!key) return "";
  const decrypted = decryptSecret(key);
  if (decrypted.length <= 8) return "••••••••";
  const start = decrypted.slice(0, 4);
  const end = decrypted.slice(-4);
  return `${start}••••••••${end}`;
}
