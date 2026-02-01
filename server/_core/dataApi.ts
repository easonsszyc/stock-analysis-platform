/**
 * Quick example (matches curl usage):
 *   await callDataApi("Youtube/search", {
 *     query: { gl: "US", hl: "en", q: "manus" },
 *   })
 */
import { ENV } from "./env";

export type DataApiCallOptions = {
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  formData?: Record<string, unknown>;
};

async function callYahooFinanceDirectly(options: DataApiCallOptions): Promise<unknown> {
  const query = options.query || {};
  const symbol = query.symbol as string;

  if (!symbol) {
    throw new Error("Symbol is required for Yahoo Finance API");
  }

  // Build query string
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key !== 'symbol' && value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?${params.toString()}`;

  console.log(`[YahooFinance] Direct fetch: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[YahooFinance] Error ${response.status}: ${text}`);
      throw new Error(`Yahoo Finance API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[YahooFinance] Direct fetch failed", error);
    throw error;
  }
}

export async function callDataApi(
  apiId: string,
  options: DataApiCallOptions = {}
): Promise<unknown> {
  if (!ENV.forgeApiUrl) {
    if (apiId === 'YahooFinance/get_stock_chart') {
      return callYahooFinanceDirectly(options);
    }
    throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  }
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  // Build the full URL by appending the service path to the base URL
  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("webdevtoken.v1.WebDevService/CallApi", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      apiId,
      query: options.query,
      body: options.body,
      path_params: options.pathParams,
      multipart_form_data: options.formData,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Data API request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const payload = await response.json().catch(() => ({}));
  if (payload && typeof payload === "object" && "jsonData" in payload) {
    try {
      return JSON.parse((payload as Record<string, string>).jsonData ?? "{}");
    } catch {
      return (payload as Record<string, unknown>).jsonData;
    }
  }
  return payload;
}
