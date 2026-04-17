export interface SvixHeaders {
  "svix-id": string;
  "svix-timestamp": string;
  "svix-signature": string;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function verifySvixSignature(
  rawBody: string,
  headers: SvixHeaders,
  secret: string
): Promise<boolean> {
  const { "svix-id": svixId, "svix-timestamp": svixTimestamp, "svix-signature": svixSignature } = headers;

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const timestamp = parseInt(svixTimestamp, 10);
  if (isNaN(timestamp) || Date.now() - timestamp * 1000 > FIVE_MINUTES_MS) return false;

  const rawSecret = secret.replace(/^whsec_/, "");
  let secretBytes: Uint8Array;
  try {
    secretBytes = Uint8Array.from(atob(rawSecret), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computedSig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

  const signatures = svixSignature.split(" ").map((s) => s.replace(/^v1,/, ""));
  return signatures.some((sig) => sig === computedSig);
}

export function makeSvixHeaders(partial: Partial<SvixHeaders> = {}): SvixHeaders {
  return {
    "svix-id": partial["svix-id"] ?? "msg_test",
    "svix-timestamp": partial["svix-timestamp"] ?? Math.floor(Date.now() / 1000).toString(),
    "svix-signature": partial["svix-signature"] ?? "",
  };
}
