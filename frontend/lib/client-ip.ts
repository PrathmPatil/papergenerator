let cachedPublicIp = "";
let inflight: Promise<string> | null = null;

export const getPublicClientIp = async () => {
  if (typeof window === "undefined") return "";
  if (cachedPublicIp) return cachedPublicIp;
  if (inflight) return inflight;

  inflight = (async () => {
    const endpoints = [
      "https://api.ipify.org?format=json",
      "https://api64.ipify.org?format=json",
    ];
    for (const url of endpoints) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) continue;
        const data = await response.json();
        const ip = String(data?.ip || "").trim();
        if (ip) {
          cachedPublicIp = ip;
          return ip;
        }
      } catch {
        /* try next */
      }
    }
    return "";
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
};
