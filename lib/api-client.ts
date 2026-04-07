export type ApiPayload<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  details?: unknown;
};

type ParsedApiPayload<T> = {
  payload: ApiPayload<T> | null;
  rawText: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeResponseText(rawText: string) {
  return rawText
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePayload<T>(
  rawText: string,
  contentType: string | null,
): ApiPayload<T> | null {
  const trimmed = rawText.trim();

  if (!trimmed) {
    return null;
  }

  const looksJson =
    contentType?.includes("application/json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");

  if (!looksJson) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    return isRecord(parsed) ? (parsed as ApiPayload<T>) : null;
  } catch {
    return null;
  }
}

export async function readApiPayload<T>(
  response: Response,
): Promise<ParsedApiPayload<T>> {
  const rawText = await response.text();

  return {
    payload: parsePayload<T>(rawText, response.headers.get("content-type")),
    rawText,
  };
}

export function hasApiData<T>(
  payload: ApiPayload<T> | null,
): payload is ApiPayload<T> & { data: T } {
  return Boolean(payload && payload.success !== false && "data" in payload);
}

export function getApiErrorMessage(
  response: Response,
  rawText: string,
  payload: ApiPayload<unknown> | null,
  fallbackError: string,
) {
  if (typeof payload?.error === "string" && payload.error.trim()) {
    return payload.error;
  }

  const normalizedText = normalizeResponseText(rawText);

  if (/ENOSPC|os error 112|not enough space on the disk/i.test(normalizedText)) {
    return "The server is out of local disk space, so the request could not be completed.";
  }

  if (/internal server error/i.test(normalizedText) && response.status >= 500) {
    return "The server failed before it could return a valid response. If you're running locally, check disk space and server logs.";
  }

  if (normalizedText && !response.ok) {
    return normalizedText.length > 240
      ? `${normalizedText.slice(0, 237).trimEnd()}...`
      : normalizedText;
  }

  if (!response.ok && response.status >= 500) {
    return "The server returned an invalid error response. If you're running locally, check disk space and server logs.";
  }

  return fallbackError;
}
