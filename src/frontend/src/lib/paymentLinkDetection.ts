export interface PaymentLinkMatch {
  fullMatch: string;
  username: string;
  amount?: string;
  currency?: string;
  url: string;
}

export function detectPaymentLinks(text: string): PaymentLinkMatch[] {
  const results: PaymentLinkMatch[] = [];

  // Match absolute URLs for rosedate.net, caffeine.xyz, or localhost
  const absoluteRegex =
    /https?:\/\/[\w.-]*(?:rosedate\.net|caffeine\.xyz|localhost(?::\d+)?)?\/pay\/([-\w]+)(\?[^\s]*)?/g;

  // Match relative paths like /pay/:username
  const relativeRegex = /(?:^|\s|["'(])(\/pay\/([-\w]+)(\?[^\s"')]*)?)/g;

  let match: RegExpExecArray | null;

  // Process absolute URL matches
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop pattern
  while ((match = absoluteRegex.exec(text)) !== null) {
    const [fullMatch, username, queryString] = match;
    const url = fullMatch;
    const parsed = parseQueryString(queryString ?? "");
    results.push({
      fullMatch,
      username,
      url,
      ...(parsed.amount !== undefined ? { amount: parsed.amount } : {}),
      ...(parsed.currency !== undefined ? { currency: parsed.currency } : {}),
    });
  }

  // Process relative path matches
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop pattern
  while ((match = relativeRegex.exec(text)) !== null) {
    const relativePath = match[1];
    const username = match[2];
    const queryString = match[3] ?? "";

    // Skip if already captured as part of an absolute URL
    const alreadyCaptured = results.some((r) => r.url.includes(relativePath));
    if (alreadyCaptured) continue;

    const parsed = parseQueryString(queryString);
    results.push({
      fullMatch: relativePath,
      username,
      url: relativePath,
      ...(parsed.amount !== undefined ? { amount: parsed.amount } : {}),
      ...(parsed.currency !== undefined ? { currency: parsed.currency } : {}),
    });
  }

  return results;
}

function parseQueryString(qs: string): { amount?: string; currency?: string } {
  if (!qs) return {};

  const params = new URLSearchParams(qs.startsWith("?") ? qs.slice(1) : qs);
  const result: { amount?: string; currency?: string } = {};

  const amount = params.get("amount");
  if (amount !== null) result.amount = amount;

  const currency = params.get("currency");
  if (currency !== null) result.currency = currency;

  return result;
}
