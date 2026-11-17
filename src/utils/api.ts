export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init);
  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();

  const looksLikeHtml =
    rawText.trimStart().toLowerCase().startsWith('<!doctype') ||
    rawText.trimStart().toLowerCase().startsWith('<html');

  if (looksLikeHtml || (!contentType.includes('application/json') && rawText.trim().length > 0 && !rawText.trim().startsWith('{') && !rawText.trim().startsWith('['))) {
    throw new Error(
      `API endpoint returned non-JSON response (HTTP ${res.status}). The backend server may still be restarting or the route is unavailable.`
    );
  }

  let parsed: any = {};
  if (rawText.trim().length > 0) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error(`Invalid JSON payload returned from server (HTTP ${res.status}).`);
    }
  }

  if (!res.ok) {
    const serverMsg = parsed?.error || parsed?.message || `HTTP ${res.status} request failed`;
    throw new Error(serverMsg);
  }

  return parsed as T;
}
