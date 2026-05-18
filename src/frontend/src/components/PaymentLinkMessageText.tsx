import { useNavigate } from "@tanstack/react-router";
import {
  type PaymentLinkMatch,
  detectPaymentLinks,
} from "../lib/paymentLinkDetection";

interface Props {
  text: string;
}

export default function PaymentLinkMessageText({ text }: Props) {
  const navigate = useNavigate();
  const matches = detectPaymentLinks(text);

  // Build alternating text/link segments
  type Segment =
    | { kind: "text"; content: string }
    | { kind: "link"; match: PaymentLinkMatch };

  const segments: Segment[] = [];
  let cursor = 0;

  for (const m of matches) {
    const idx = text.indexOf(m.fullMatch, cursor);
    if (idx === -1) continue;
    if (idx > cursor) {
      segments.push({ kind: "text", content: text.slice(cursor, idx) });
    }
    segments.push({ kind: "link", match: m });
    cursor = idx + m.fullMatch.length;
  }

  if (cursor < text.length) {
    segments.push({ kind: "text", content: text.slice(cursor) });
  }

  return (
    <span className="text-xs sm:text-sm break-words">
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i}>{seg.content}</span>;
        }
        const { username, amount, currency } = seg.match;
        let label = `Send Rose to @${username}`;
        if (amount !== undefined && currency === "usd") {
          label = `Send $${amount} to @${username}`;
        } else if (amount !== undefined) {
          label = `Send ${amount} Rose to @${username}`;
        }
        const handleClick = () => {
          const params: Record<string, string> = {};
          if (amount !== undefined) params.amount = String(amount);
          if (currency) params.currency = currency;
          navigate({
            to: `/pay/${username}`,
            search: params,
          });
        };
        return (
          <span
            key={i}
            role="button"
            tabIndex={0}
            data-ocid={`payment_link.item.${i + 1}`}
            onClick={handleClick}
            onKeyDown={(e) => e.key === "Enter" && handleClick()}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-pink-600 text-sm font-medium hover:bg-pink-100 cursor-pointer transition-colors duration-200"
          >
            <span aria-hidden>🌹</span>
            {label}
          </span>
        );
      })}
    </span>
  );
}
