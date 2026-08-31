/**
 * Chromium path helper for PDF generation on Vercel.
 * Prefer a prebuilt hosted chromium-pack.tar so deploys do not rebuild Chromium assets.
 */
let cachedExecutablePath: string | null = null;
let downloadPromise: Promise<string> | null = null;

export async function getChromiumExecutablePath(): Promise<string> {
    if (cachedExecutablePath) return cachedExecutablePath;
    const chromiumPackUrl = process.env.CHROMIUM_PACK_URL;
    if (!chromiumPackUrl) {
        throw new Error("CHROMIUM_PACK_URL is required when analytics PDF export is enabled");
    }
    if (!downloadPromise) {
        const chromium = (await import("@sparticuz/chromium-min")).default;
        downloadPromise = chromium
            .executablePath(chromiumPackUrl)
            .then((path) => {
                cachedExecutablePath = path;
                return path;
            })
            .catch((err) => {
                downloadPromise = null;
                throw err;
            });
    }
    return downloadPromise;
}
