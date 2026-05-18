/**
 * Utilities for detecting and extracting profile links from text
 */

export interface TextSegment {
  type: "text" | "profileLink";
  content: string;
  userId?: string; // Only present for profileLink segments
}

/**
 * Detects profile links in text and returns structured segments
 * Supports both absolute URLs and relative paths
 * @param text - The text to parse
 * @returns Array of text segments
 */
export function parseProfileLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const currentOrigin = window.location.origin;

  // Pattern matches both:
  // - /users/<principal> (old format: 5-segment lowercase alphanumeric with hyphens)
  // - /users/<username>  (new format: 3-30 chars, alphanumeric + underscores, no hyphens at start)
  // Both absolute (with origin) and relative forms are matched.
  const profileLinkPattern = new RegExp(
    `(?:${escapeRegex(currentOrigin)})?/users/([a-zA-Z0-9_][a-zA-Z0-9_-]{2,29})`,
    "gi",
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop pattern
  while ((match = profileLinkPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore) {
        segments.push({
          type: "text",
          content: textBefore,
        });
      }
    }

    // Add the profile link
    segments.push({
      type: "profileLink",
      content: match[0],
      userId: match[1],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  // If no matches found, return the entire text as a single segment
  if (segments.length === 0) {
    segments.push({
      type: "text",
      content: text,
    });
  }

  return segments;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Checks if a text contains any profile links
 */
export function containsProfileLink(text: string): boolean {
  const segments = parseProfileLinks(text);
  return segments.some((seg) => seg.type === "profileLink");
}
