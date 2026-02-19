import { Badge } from "@/components/ui/badge";
import type { CriteriaTag } from "@/lib/sc-action-classification";

const CRITERIA_COLORS: Record<CriteriaTag, string> = {
  "Emergency Safety":         "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  "Token Operations":         "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "Governance Participation": "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "Ownership / Admin":        "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "Proxy Upgrades":           "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  "Protocol Parameters":      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "Treasury Operations":      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  "Registry / Address":       "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  "Governance Control":       "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

const DIRECT_CATEGORIES: Array<{ name: CriteriaTag; desc: string }> = [
  { name: "Emergency Safety", desc: "Immediate exploit response" },
  { name: "Token Operations", desc: "No protocol parameter changes" },
  { name: "Governance Participation", desc: "Participates in governance, not controls it" },
];

const VETO_CATEGORIES: Array<{ name: CriteriaTag; desc: string }> = [
  { name: "Ownership / Admin", desc: "Changes protocol ownership" },
  { name: "Proxy Upgrades", desc: "Replaces contract logic entirely" },
  { name: "Protocol Parameters", desc: "Changes economic / governance rules" },
  { name: "Treasury Operations", desc: "DAO fund management (requires governance)" },
  { name: "Registry / Address", desc: "Changes protocol infrastructure" },
  { name: "Governance Control", desc: "Can manipulate governance outcomes" },
];

function CategoryGrid({
  items,
}: {
  items: Array<{ name: CriteriaTag; desc: string }>;
}) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm pl-4">
      {items.map((cat) => (
        <div key={cat.name} className="contents">
          <dt>
            <span className={`inline-block text-[11px] font-medium px-1.5 py-0.5 rounded ${CRITERIA_COLORS[cat.name]}`}>
              {cat.name}
            </span>
          </dt>
          <dd className="text-[var(--text-tertiary)] self-center">{cat.desc}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ClassificationCriteria() {
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)]">
      <div className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
        Classification Criteria
      </div>

      <div className="border-t border-[var(--border-primary)] px-4 py-4 space-y-4">
        {/* Direct Execution */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[var(--fg-warning)]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Direct Execution
            </span>
            <Badge variant="warning" size="sm">
              SC can execute directly
            </Badge>
          </div>
          <CategoryGrid items={DIRECT_CATEGORIES} />
        </div>

        <hr className="border-[var(--border-primary)]" />

        {/* Veto Only */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[var(--fg-info)]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Veto Only
            </span>
            <Badge variant="info" size="sm">
              Requires governance approval
            </Badge>
          </div>
          <CategoryGrid items={VETO_CATEGORIES} />
        </div>

        {/* Footnote */}
        <p className="text-xs text-[var(--text-tertiary)]">
          * Functions not explicitly registered as Direct Execution default to
          Veto Only.
        </p>
      </div>
    </div>
  );
}
