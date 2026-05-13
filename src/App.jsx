import { useState, useMemo, useCallback, useRef } from "react";

const DEFAULT_API_URL = "https://wcag-watcher-api.onrender.com";
const DEFAULT_WCAG_LEVEL = "wcag21aa";
const URL_WILDCARD_TOKEN = "*";
const WCAG_LEVEL_OPTIONS = [
  { value: "wcag2a", label: "WCAG 2.0 A" },
  { value: "wcag2aa", label: "WCAG 2.0 AA" },
  { value: "wcag2aaa", label: "WCAG 2.0 AAA" },
  { value: "wcag21a", label: "WCAG 2.1 A" },
  { value: "wcag21aa", label: "WCAG 2.1 AA" },
  { value: "wcag21aaa", label: "WCAG 2.1 AAA" },
  { value: "wcag22a", label: "WCAG 2.2 A" },
  { value: "wcag22aa", label: "WCAG 2.2 AA" },
  { value: "wcag22aaa", label: "WCAG 2.2 AAA" },
];

const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const IMPACT_COLORS = {
  critical: "#dc2626",
  serious: "#ea580c",
  moderate: "#ca8a04",
  minor: "#6b7280",
};

function extractCriterion(tags) {
  if (!tags) return "—";
  for (const t of tags) {
    const m = t.match(/^wcag(\d)(\d)(\d+)$/);
    if (m) return `${m[1]}.${m[2]}.${m[3]}`;
  }
  return "—";
}

function Badge({ label, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        background: color + "18",
        color,
        border: `1px solid ${color}40`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function ImpactBadge({ impact }) {
  return <Badge label={impact} color={IMPACT_COLORS[impact] || "#6b7280"} />;
}

function Card({ children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--card, #fff)",
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: 10,
        padding: 16,
        ...style,
        ...(onClick ? { cursor: "pointer" } : {}),
      }}
    >
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", style, disabled }) {
  const base = {
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    ...style,
  };
  const v = {
    primary: { ...base, background: "#2563eb", color: "#fff" },
    secondary: {
      ...base,
      background: "var(--bg-secondary, #f3f4f6)",
      color: "var(--text, #1f2937)",
      border: "1px solid var(--border, #e5e7eb)",
    },
    danger: { ...base, background: "#dc2626", color: "#fff" },
    ghost: { ...base, background: "transparent", color: "#2563eb" },
  };
  return (
    <button style={v[variant]} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {label && (
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary, #6b7280)",
          }}
        >
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid var(--border, #e5e7eb)",
          fontSize: 14,
          background: "var(--card, #fff)",
          color: "var(--text, #1f2937)",
        }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options, style, disabled }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {label && (
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary, #6b7280)",
          }}
        >
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid var(--border, #e5e7eb)",
          fontSize: 14,
          background: "var(--card, #fff)",
          color: "var(--text, #1f2937)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: wide ? 600 : 480,
          maxWidth: "95vw",
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <Btn
            variant="ghost"
            onClick={onClose}
            style={{ padding: 4, fontSize: 18 }}
          >
            ✕
          </Btn>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginConfigForm({ config, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 12,
        background: "var(--bg-secondary, #f8f9fa)",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-secondary, #6b7280)",
        }}
      >
        Login Configuration
      </div>
      <Input
        label="Login Page URL"
        value={config.loginUrl}
        onChange={(v) => onChange({ ...config, loginUrl: v })}
        placeholder="https://example.com/login"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Username Field Label"
          value={config.usernameLabel}
          onChange={(v) => onChange({ ...config, usernameLabel: v })}
          placeholder="Email"
        />
        <Input
          label="Username Value"
          value={config.usernameValue}
          onChange={(v) => onChange({ ...config, usernameValue: v })}
          placeholder="user@example.com"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input
          label="Password Field Label"
          value={config.passwordLabel}
          onChange={(v) => onChange({ ...config, passwordLabel: v })}
          placeholder="Password"
        />
        <Input
          label="Password Value"
          type="password"
          value={config.passwordValue}
          onChange={(v) => onChange({ ...config, passwordValue: v })}
          placeholder="••••••••"
        />
      </div>
      <Input
        label="Submit Button Selector (id or label)"
        value={config.submitSelector}
        onChange={(v) => onChange({ ...config, submitSelector: v })}
        placeholder="signin-button"
      />
      {config.extraFields.map((f, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <Input
            label={`Extra Field ${i + 1} Label`}
            value={f.label}
            onChange={(v) => {
              const nf = [...config.extraFields];
              nf[i] = { ...nf[i], label: v };
              onChange({ ...config, extraFields: nf });
            }}
          />
          <Input
            label="Value"
            value={f.value}
            onChange={(v) => {
              const nf = [...config.extraFields];
              nf[i] = { ...nf[i], value: v };
              onChange({ ...config, extraFields: nf });
            }}
          />
          <Btn
            variant="danger"
            style={{ padding: "8px 10px" }}
            onClick={() =>
              onChange({
                ...config,
                extraFields: config.extraFields.filter((_, j) => j !== i),
              })
            }
          >
            ✕
          </Btn>
        </div>
      ))}
      <Btn
        variant="secondary"
        style={{ alignSelf: "flex-start", fontSize: 12 }}
        onClick={() =>
          onChange({
            ...config,
            extraFields: [...config.extraFields, { label: "", value: "" }],
          })
        }
      >
        + Add Extra Field
      </Btn>
    </div>
  );
}

const EMPTY_LOGIN = {
  loginUrl: "https://studio.code.org/users/sign_in",
  usernameLabel: "user_login",
  usernameValue: "",
  passwordLabel: "user_password",
  passwordValue: "",
  submitSelector: "signin-button",
  extraFields: [],
};

function buildLoginPayload(urlEntry) {
  if (!urlEntry.requiresAuth) return undefined;
  const c = urlEntry.loginConfig;
  const fields = [];
  if (c.usernameLabel && c.usernameValue)
    fields.push({ label: c.usernameLabel, value: c.usernameValue });
  if (c.passwordLabel && c.passwordValue)
    fields.push({ label: c.passwordLabel, value: c.passwordValue });
  for (const f of c.extraFields) {
    if (f.label && f.value) fields.push({ label: f.label, value: f.value });
  }
  if (!c.loginUrl || fields.length === 0) return undefined;
  return {
    loginUrl: c.loginUrl,
    fields,
    submitSelector: c.submitSelector || undefined,
  };
}

function expandUrlEntry(urlEntry) {
  if (!urlEntry.wildcard?.enabled) {
    return [{ ...urlEntry, sourceUrlId: urlEntry.id }];
  }

  const start = Number.parseInt(urlEntry.wildcard.start, 10);
  const end = Number.parseInt(urlEntry.wildcard.end, 10);
  if (
    !urlEntry.url.includes(URL_WILDCARD_TOKEN) ||
    Number.isNaN(start) ||
    Number.isNaN(end)
  ) {
    return [{ ...urlEntry, sourceUrlId: urlEntry.id }];
  }

  const step = start <= end ? 1 : -1;
  const expanded = [];
  for (let value = start; step > 0 ? value <= end : value >= end; value += step) {
    const valueText = String(value);
    expanded.push({
      ...urlEntry,
      id: `${urlEntry.id}:${valueText}`,
      sourceUrlId: urlEntry.id,
      wildcardValue: valueText,
      url: urlEntry.url.replaceAll(URL_WILDCARD_TOKEN, valueText),
      label: (urlEntry.label || urlEntry.url).includes(URL_WILDCARD_TOKEN)
        ? (urlEntry.label || urlEntry.url).replaceAll(
            URL_WILDCARD_TOKEN,
            valueText,
          )
        : `${urlEntry.label || urlEntry.url} ${valueText}`,
    });
  }
  return expanded;
}

function expandUrlEntries(urls) {
  return urls.flatMap(expandUrlEntry);
}

function normalizeWildcardConfig(urlEntry) {
  const wildcard = urlEntry.wildcard || {};
  const range = urlEntry.range || {};
  const start =
    wildcard.start ??
    range.start ??
    urlEntry.wildcardStart ??
    urlEntry.rangeStart ??
    "1";
  const end =
    wildcard.end ??
    range.end ??
    urlEntry.wildcardEnd ??
    urlEntry.rangeEnd ??
    "13";
  const hasImportedRange =
    urlEntry.wildcard ||
    urlEntry.range ||
    urlEntry.wildcardStart !== undefined ||
    urlEntry.wildcardEnd !== undefined ||
    urlEntry.rangeStart !== undefined ||
    urlEntry.rangeEnd !== undefined;

  return {
    enabled: Boolean(
      wildcard.enabled ??
        range.enabled ??
        (hasImportedRange &&
          String(urlEntry.url || "").includes(URL_WILDCARD_TOKEN)),
    ),
    start: String(start),
    end: String(end),
  };
}

function normalizeFindingText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getFindingFingerprint(finding) {
  const nodeKey = (finding.nodes || [])
    .map(
      (node) =>
        `${normalizeFindingText(node.selector)}|${normalizeFindingText(
          node.html,
        )}|${normalizeFindingText(node.failureSummary)}`,
    )
    .sort()
    .join("||");
  return [
    finding.ruleId,
    finding.criterion || "",
    finding.impact || "",
    normalizeFindingText(finding.desc),
    nodeKey,
  ].join("::");
}

function UrlForm({ onSave, onCancel, initial }) {
  const [url, setUrl] = useState(initial?.url || "");
  const [label, setLabel] = useState(initial?.label || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [wildcardEnabled, setWildcardEnabled] = useState(
    initial?.wildcard?.enabled || false,
  );
  const [wildcardStart, setWildcardStart] = useState(
    initial?.wildcard?.start ?? "1",
  );
  const [wildcardEnd, setWildcardEnd] = useState(
    initial?.wildcard?.end ?? "13",
  );
  const [requiresAuth, setRequiresAuth] = useState(
    initial?.requiresAuth || false,
  );
  const [loginConfig, setLoginConfig] = useState(
    initial?.loginConfig || { ...EMPTY_LOGIN },
  );
  const wildcardRangeValid =
    !wildcardEnabled ||
    (url.includes(URL_WILDCARD_TOKEN) &&
      wildcardStart !== "" &&
      wildcardEnd !== "" &&
      !Number.isNaN(Number.parseInt(wildcardStart, 10)) &&
      !Number.isNaN(Number.parseInt(wildcardEnd, 10)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Input
        label="URL"
        value={url}
        onChange={setUrl}
        placeholder="https://app.example.com/levels/*"
      />
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={wildcardEnabled}
          onChange={(e) => setWildcardEnabled(e.target.checked)}
        />
        Expand wildcard range
      </label>
      {wildcardEnabled && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: 12,
            background: "var(--bg-secondary, #f8f9fa)",
            borderRadius: 8,
          }}
        >
          <Input
            label="Range start"
            type="number"
            value={wildcardStart}
            onChange={setWildcardStart}
            placeholder="1"
          />
          <Input
            label="Range end"
            type="number"
            value={wildcardEnd}
            onChange={setWildcardEnd}
            placeholder="13"
          />
          <div
            style={{
              gridColumn: "1 / -1",
              fontSize: 12,
              color: wildcardRangeValid
                ? "var(--text-secondary, #6b7280)"
                : "#dc2626",
            }}
          >
            Use * in the URL where the range value should go.
          </div>
        </div>
      )}
      <Input
        label="Label (optional)"
        value={label}
        onChange={setLabel}
        placeholder="Dashboard"
      />
      <Input
        label="Description (optional)"
        value={description}
        onChange={setDescription}
        placeholder="Brief note about this page"
      />
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={requiresAuth}
          onChange={(e) => setRequiresAuth(e.target.checked)}
        />
        Requires authentication to scan
      </label>
      {requiresAuth && (
        <LoginConfigForm config={loginConfig} onChange={setLoginConfig} />
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn
          onClick={() =>
            onSave({
              url,
              label: label || url,
              description,
              wildcard: {
                enabled: wildcardEnabled,
                start: wildcardStart,
                end: wildcardEnd,
              },
              requiresAuth,
              loginConfig,
            })
          }
          disabled={!url || !wildcardRangeValid}
        >
          {initial ? "Save Changes" : "Add URL"}
        </Btn>
      </div>
    </div>
  );
}

function exportCSV(urls, scans) {
  const resultUrls = expandUrlEntries(urls);
  const rows = [
    [
      "Label",
      "URL",
      "Scan Date",
      "Type",
      "Rule ID",
      "WCAG Criterion",
      "Impact",
      "Description",
      "Selector",
      "HTML Snippet",
    ],
  ];
  for (const u of resultUrls) {
    const urlScans = scans.filter((s) => s.urlId === u.id);
    const latest = urlScans[urlScans.length - 1];
    if (!latest) continue;
    const addRows = (items, type) => {
      for (const v of items) {
        for (const n of v.nodes) {
          rows.push(
            [
              u.label,
              u.url,
              new Date(latest.timestamp).toLocaleString(),
              type,
              v.ruleId,
              v.criterion || "—",
              v.impact,
              v.desc,
              n.selector,
              n.html,
            ].map((c) => `"${String(c).replace(/"/g, '""')}"`),
          );
        }
      }
    };
    addRows(latest.violations, "Violation");
    addRows(latest.incomplete || [], "Potential Issue");
  }
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "a11y-violations.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ScanResultsView({
  urls,
  scans,
  impactFilter,
  setImpactFilter,
  criterionFilter,
  setCriterionFilter,
  expandedV,
  setExpandedV,
}) {
  const [resultType, setResultType] = useState("violations");
  const [scopeFilter, setScopeFilter] = useState("all");

  const urlsWithResults = useMemo(() => {
    return expandUrlEntries(urls)
      .map((u) => {
        const urlScans = scans.filter((s) => s.urlId === u.id);
        const latest =
          urlScans.length > 0 ? urlScans[urlScans.length - 1] : null;
        return { ...u, latest };
      })
      .filter((u) => u.latest);
  }, [urls, scans]);

  const allCriteria = useMemo(() => {
    const s = new Set();
    urlsWithResults.forEach((u) => {
      const items =
        resultType === "violations"
          ? u.latest.violations
          : u.latest.incomplete || [];
      items.forEach((v) => {
        if (v.criterion && v.criterion !== "—") s.add(v.criterion);
      });
    });
    return [...s].sort();
  }, [urlsWithResults, resultType]);

  const occurrenceByFingerprint = useMemo(() => {
    const occurrences = new Map();
    urlsWithResults.forEach((u) => {
      const items =
        resultType === "violations"
          ? u.latest.violations
          : u.latest.incomplete || [];
      items.forEach((item) => {
        const fingerprint = getFindingFingerprint(item);
        if (!occurrences.has(fingerprint)) {
          occurrences.set(fingerprint, { urlSet: new Set() });
        }
        const occurrence = occurrences.get(fingerprint);
        occurrence.urlSet.add(u.url);
      });
    });
    return new Map(
      [...occurrences.entries()].map(([fingerprint, occurrence]) => {
        const occurrenceUrls = [...occurrence.urlSet];
        return [
          fingerprint,
          { count: occurrenceUrls.length, urls: occurrenceUrls },
        ];
      }),
    );
  }, [urlsWithResults, resultType]);

  const filtered = useMemo(() => {
    return urlsWithResults.map((u) => {
      const items =
        resultType === "violations"
          ? u.latest.violations
          : u.latest.incomplete || [];
      return {
        ...u,
        displayItems: items
          .map((v) => {
            const occurrence =
              occurrenceByFingerprint.get(getFindingFingerprint(v)) || {};
            return {
              ...v,
              occurrenceCount: occurrence.count || 1,
              occurrenceUrls: occurrence.urls || [u.url],
            };
          })
          .filter((v) => impactFilter === "all" || v.impact === impactFilter)
          .filter(
            (v) => criterionFilter === "all" || v.criterion === criterionFilter,
          )
          .filter(
            (v) =>
              scopeFilter === "all" ||
              (scopeFilter === "unique" && v.occurrenceCount === 1) ||
              (scopeFilter === "recurring" && v.occurrenceCount > 1),
          )
          .sort(
            (a, b) =>
              (IMPACT_ORDER[a.impact] ?? 4) - (IMPACT_ORDER[b.impact] ?? 4),
          ),
      };
    });
  }, [
    urlsWithResults,
    impactFilter,
    criterionFilter,
    resultType,
    scopeFilter,
    occurrenceByFingerprint,
  ]);

  const totalViolations = urlsWithResults.reduce(
    (s, u) => s + u.latest.violations.length,
    0,
  );
  const totalIncomplete = urlsWithResults.reduce(
    (s, u) => s + (u.latest.incomplete || []).length,
    0,
  );

  const unfilteredItems = useMemo(() => {
    return urlsWithResults.flatMap((u) => {
      const items =
        resultType === "violations"
          ? u.latest.violations
          : u.latest.incomplete || [];
      return items.map((item) => {
        const occurrence =
          occurrenceByFingerprint.get(getFindingFingerprint(item)) || {};
        return {
          ...item,
          occurrenceCount: occurrence.count || 1,
          occurrenceUrls: occurrence.urls || [u.url],
        };
      });
    });
  }, [urlsWithResults, resultType, occurrenceByFingerprint]);

  const resultGroups = useMemo(() => {
    const sourceById = new Map(urls.map((u) => [u.id, u]));
    const groups = [];
    const groupById = new Map();

    filtered.forEach((u) => {
      const source = sourceById.get(u.sourceUrlId) || u;
      const groupId = source.wildcard?.enabled ? source.id : u.id;
      if (!groupById.has(groupId)) {
        const group = {
          id: groupId,
          source,
          isWildcard: Boolean(source.wildcard?.enabled),
          urls: [],
        };
        groupById.set(groupId, group);
        groups.push(group);
      }
      groupById.get(groupId).urls.push(u);
    });

    return groups;
  }, [filtered, urls]);

  const renderResultPage = (u, grouped = false) => (
    <Card
      key={u.id}
      style={{
        padding: 0,
        overflow: "hidden",
        ...(grouped
          ? {
              borderRadius: 0,
              borderLeft: "none",
              borderRight: "none",
              borderBottom: "none",
            }
          : {}),
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          background: "var(--bg-secondary, #f8f9fa)",
          borderBottom: "1px solid var(--border, #e5e7eb)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{u.label}</div>
          {u.label !== u.url && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary, #6b7280)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {u.url}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {u.latest.error ? (
            <Badge label="Scan Error" color="#dc2626" />
          ) : (
            <>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary, #9ca3af)",
                  whiteSpace: "nowrap",
                }}
              >
                {new Date(u.latest.timestamp).toLocaleString()}
              </span>
              <Badge
                label={`${u.displayItems.length} ${
                  resultType === "violations" ? "violation" : "potential issue"
                }${u.displayItems.length !== 1 ? "s" : ""}`}
                color={
                  u.displayItems.length > 0
                    ? resultType === "violations"
                      ? "#dc2626"
                      : "#ca8a04"
                    : "#16a34a"
                }
              />
            </>
          )}
        </div>
      </div>
      {u.latest.error ? (
        <div style={{ padding: 16, color: "#dc2626", fontSize: 13 }}>
          <strong>Scan failed:</strong> {u.latest.error}
        </div>
      ) : u.displayItems.length === 0 ? (
        <div
          style={{
            padding: 20,
            textAlign: "center",
            color: "var(--text-secondary, #6b7280)",
            fontSize: 14,
          }}
        >
          No {resultType === "violations" ? "violations" : "potential issues"}{" "}
          found
          {impactFilter !== "all" ||
          criterionFilter !== "all" ||
          scopeFilter !== "all"
            ? " matching filters"
            : ""}{" "}
          ✓
        </div>
      ) : (
        u.displayItems.map((v) => {
          const key = `${u.id}-${v.id}`;
          const isExp = expandedV === key;
          return (
            <div
              key={v.id}
              style={{ borderBottom: "1px solid var(--border, #e5e7eb)" }}
            >
              <div
                onClick={() => setExpandedV(isExp ? null : key)}
                style={{
                  padding: "10px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: isExp
                    ? "var(--bg-secondary, #fafafa)"
                    : "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    transform: isExp ? "rotate(90deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                >
                  ▶
                </span>
                <ImpactBadge impact={v.impact} />
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
                  {v.ruleId}
                </span>
                {v.criterion && v.criterion !== "—" && (
                  <Badge label={`WCAG ${v.criterion}`} color="#2563eb" />
                )}
                {v.occurrenceCount > 1 && (
                  <Badge
                    label={`Appears on ${v.occurrenceCount} pages`}
                    color="#7c3aed"
                  />
                )}
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary, #6b7280)",
                  }}
                >
                  {v.nodes.length} element{v.nodes.length !== 1 ? "s" : ""}
                </span>
              </div>
              {isExp && (
                <div
                  style={{
                    padding: "0 16px 12px 44px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary, #4b5563)",
                    }}
                  >
                    {v.desc}
                  </div>
                  {v.help && (
                    <a
                      href={v.help}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: "#2563eb" }}
                    >
                      How to fix →
                    </a>
                  )}
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-secondary, #6b7280)",
                      marginTop: 4,
                    }}
                  >
                    Affected Elements:
                  </div>
                  {v.nodes.map((n, ni) => (
                    <div
                      key={ni}
                      style={{
                        background: "var(--bg-secondary, #f3f4f6)",
                        borderRadius: 8,
                        padding: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: "#2563eb",
                        }}
                      >
                        {n.selector}
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: "#dc2626",
                          background: "#fef2f2",
                          padding: "6px 8px",
                          borderRadius: 4,
                          overflowX: "auto",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {n.html}
                      </pre>
                      {n.failureSummary && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary, #4b5563)",
                            marginTop: 4,
                          }}
                        >
                          {n.failureSummary}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </Card>
  );

  if (urlsWithResults.length === 0) {
    return (
      <Card
        style={{
          textAlign: "center",
          padding: 32,
          color: "var(--text-secondary, #6b7280)",
        }}
      >
        No scan results yet. Add URLs and run a scan to see results here.
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card
          style={{
            flex: 1,
            padding: 12,
            textAlign: "center",
            minWidth: 100,
            cursor: "pointer",
            outline: resultType === "violations" ? "2px solid #dc2626" : "none",
          }}
          onClick={() => setResultType("violations")}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: "#dc2626" }}>
            {totalViolations}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary, #6b7280)",
              fontWeight: 600,
            }}
          >
            VIOLATIONS
          </div>
        </Card>
        <Card
          style={{
            flex: 1,
            padding: 12,
            textAlign: "center",
            minWidth: 100,
            cursor: "pointer",
            outline: resultType === "incomplete" ? "2px solid #ca8a04" : "none",
          }}
          onClick={() => setResultType("incomplete")}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: "#ca8a04" }}>
            {totalIncomplete}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-secondary, #6b7280)",
              fontWeight: 600,
            }}
          >
            POTENTIAL ISSUES
          </div>
        </Card>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary, #6b7280)",
            }}
          >
            Severity:
          </span>
          {["all", "critical", "serious", "moderate", "minor"].map((f) => {
            const count =
              f === "all"
                ? unfilteredItems.length
                : unfilteredItems.filter((v) => v.impact === f).length;
            const label =
              f === "all"
                ? `All (${count})`
                : `${f.charAt(0).toUpperCase() + f.slice(1)} (${count})`;
            return (
              <Btn
                key={f}
                variant={impactFilter === f ? "primary" : "secondary"}
                onClick={() => setImpactFilter(f)}
                style={{ padding: "4px 10px", fontSize: 12 }}
              >
                {label}
              </Btn>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary, #6b7280)",
            }}
          >
            Scope:
          </span>
          {[
            { key: "all", label: "All" },
            { key: "unique", label: "Unique" },
            { key: "recurring", label: "Recurring" },
          ].map((scope) => {
            const scopedItems = unfilteredItems
              .filter(
                (v) => impactFilter === "all" || v.impact === impactFilter,
              )
              .filter(
                (v) =>
                  criterionFilter === "all" || v.criterion === criterionFilter,
              );
            const count =
              scope.key === "all"
                ? scopedItems.length
                : scopedItems.filter((v) =>
                    scope.key === "unique"
                      ? v.occurrenceCount === 1
                      : v.occurrenceCount > 1,
                  ).length;
            return (
              <Btn
                key={scope.key}
                variant={scopeFilter === scope.key ? "primary" : "secondary"}
                onClick={() => setScopeFilter(scope.key)}
                style={{ padding: "4px 10px", fontSize: 12 }}
              >
                {scope.label} ({count})
              </Btn>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary, #6b7280)",
            }}
          >
            WCAG:
          </span>
          <select
            value={criterionFilter}
            onChange={(e) => setCriterionFilter(e.target.value)}
            style={{
              padding: "5px 8px",
              borderRadius: 8,
              border: "1px solid var(--border, #e5e7eb)",
              fontSize: 12,
              background: "var(--card, #fff)",
              color: "var(--text, #1f2937)",
            }}
          >
            <option value="all">All Criteria</option>
            {allCriteria.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <Btn
          variant="secondary"
          onClick={() => exportCSV(urls, scans)}
          style={{ fontSize: 12 }}
        >
          ↓ Export CSV
        </Btn>
      </div>

      {resultGroups.map((group) => {
        if (!group.isWildcard) return renderResultPage(group.urls[0]);

        const totalDisplayItems = group.urls.reduce(
          (sum, u) => sum + u.displayItems.length,
          0,
        );
        const errorCount = group.urls.filter((u) => u.latest.error).length;

        return (
          <div
            key={group.id}
            style={{
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--card, #fff)",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                background: "var(--bg-secondary, #eef2ff)",
                borderBottom: "1px solid var(--border, #e5e7eb)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {group.source.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary, #6b7280)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {group.source.url}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexShrink: 0,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <Badge label={`${group.urls.length} pages`} color="#2563eb" />
                <Badge
                  label={`${totalDisplayItems} ${
                    resultType === "violations"
                      ? "violations"
                      : "potential issues"
                  }`}
                  color={totalDisplayItems > 0 ? "#dc2626" : "#16a34a"}
                />
                {errorCount > 0 && (
                  <Badge label={`${errorCount} errors`} color="#dc2626" />
                )}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {group.urls.map((u) => renderResultPage(u, true))}
            </div>
          </div>
        );
      })}

    </div>
  );
}

function ScanProgress({ progress }) {
  const done = progress.filter((p) => p.status !== "scanning").length;
  const total = progress.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <Card style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          Scanning... {done}/{total} complete
        </span>
        <span style={{ fontSize: 13, color: "var(--text-secondary, #6b7280)" }}>
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "var(--bg-secondary, #e5e7eb)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "#2563eb",
            borderRadius: 3,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 10,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {progress.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
            }}
          >
            <span style={{ width: 18, textAlign: "center" }}>
              {p.status === "scanning" ? "⟳" : p.status === "done" ? "✓" : "✕"}
            </span>
            <span
              style={{
                color: "var(--text-secondary, #6b7280)",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {p.url}
            </span>
            {p.status === "done" && (
              <>
                <Badge
                  label={`${p.violationCount} violations`}
                  color={p.violationCount > 0 ? "#dc2626" : "#16a34a"}
                />
                {p.incompleteCount > 0 && (
                  <Badge
                    label={`${p.incompleteCount} potential issue${p.incompleteCount !== 1 ? "s" : ""}`}
                    color="#ca8a04"
                  />
                )}
              </>
            )}
            {p.status === "error" && <Badge label="Error" color="#dc2626" />}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function App() {
  const [urls, setUrls] = useState([]);
  const [scans, setScans] = useState([]);
  const [tab, setTab] = useState("urls");
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [editingUrl, setEditingUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState([]);
  const [impactFilter, setImpactFilter] = useState("all");
  const [criterionFilter, setCriterionFilter] = useState("all");
  const [expandedV, setExpandedV] = useState(null);
  const [selectedUrls, setSelectedUrls] = useState(new Set());
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [wcagLevel, setWcagLevel] = useState(DEFAULT_WCAG_LEVEL);
  const [showSettings, setShowSettings] = useState(false);
  const [apiError, setApiError] = useState(null);
  const abortRef = useRef(null);

  const addUrl = (data) => {
    setUrls((prev) => [...prev, { ...data, id: Date.now().toString() }]);
    setShowAddUrl(false);
  };

  const importConfig = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        if (!config.urls || !Array.isArray(config.urls)) {
          setApiError("Invalid config file: missing 'urls' array");
          return;
        }

        const auth = config.auth || {};
        const cleanVal = (v) => (!v || v.startsWith("FILL_IN") ? "" : v);
        const needsCreds =
          config.urls.some((u) => u.requiresAuth) &&
          auth.username &&
          auth.password;

        const newUrls = config.urls.map((entry, i) => {
          const u = typeof entry === "string" ? { url: entry } : entry;
          return {
            id: `${Date.now()}-${i}`,
            url: u.url,
            label: u.label || u.url,
            description: u.description || "",
            wildcard: normalizeWildcardConfig(u),
            requiresAuth: u.requiresAuth || false,
            loginConfig: u.requiresAuth
              ? {
                  loginUrl: auth.loginUrl || EMPTY_LOGIN.loginUrl,
                  usernameLabel:
                    auth.usernameSelector || EMPTY_LOGIN.usernameLabel,
                  usernameValue: cleanVal(auth.username),
                  passwordLabel:
                    auth.passwordSelector || EMPTY_LOGIN.passwordLabel,
                  passwordValue: cleanVal(auth.password),
                  submitSelector:
                    auth.submitSelector || EMPTY_LOGIN.submitSelector,
                  extraFields: [],
                }
              : { ...EMPTY_LOGIN },
          };
        });

        setUrls(newUrls);
        setScans([]);
        setSelectedUrls(new Set());
        setTab("urls");
      } catch (err) {
        setApiError(`Failed to parse config file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }, []);

  const exportConfig = useCallback(() => {
    const firstAuth = urls.find((u) => u.requiresAuth)?.loginConfig;
    const config = {
      name: "WCAG Watcher Scan Config",
      auth: firstAuth
        ? {
            loginUrl: firstAuth.loginUrl,
            usernameSelector: firstAuth.usernameLabel,
            passwordSelector: firstAuth.passwordLabel,
            submitSelector: firstAuth.submitSelector,
            username: "",
            password: "",
          }
        : undefined,
      urls: urls.map((u) => ({
        url: u.url,
        label: u.label,
        description: u.description || "",
        wildcard: u.wildcard,
        requiresAuth: u.requiresAuth,
      })),
    };
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wcag-watcher-config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [urls]);

  const fileInputRef = useRef(null);

  const updateUrl = (data) => {
    setUrls((prev) =>
      prev.map((u) => (u.id === editingUrl.id ? { ...u, ...data } : u)),
    );
    setEditingUrl(null);
  };

  const deleteUrl = (id) => {
    setUrls((prev) => prev.filter((u) => u.id !== id));
    setScans((prev) =>
      prev.filter((s) => s.urlId !== id && s.sourceUrlId !== id),
    );
    setSelectedUrls((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  };

  const toggleSelect = (id) => {
    setSelectedUrls((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    setSelectedUrls((prev) =>
      prev.size === urls.length ? new Set() : new Set(urls.map((u) => u.id)),
    );
  };

  const runScan = useCallback(async () => {
    const selectedEntries =
      selectedUrls.size > 0 ? urls.filter((u) => selectedUrls.has(u.id)) : urls;
    const toScan = expandUrlEntries(selectedEntries);
    if (toScan.length === 0) return;
    if (toScan.length > 20) {
      setApiError(
        "Maximum 20 URLs per scan. Narrow the wildcard range or selection.",
      );
      return;
    }

    setScanning(true);
    setApiError(null);
    setScanProgress(
      toScan.map((u) => ({
        url: u.url,
        status: "scanning",
        violationCount: 0,
        incompleteCount: 0,
      })),
    );

    const batchPayload = toScan.map((u) => {
      const login = buildLoginPayload(u);
      return login ? { url: u.url, login } : { url: u.url };
    });

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${apiUrl.replace(/\/+$/, "")}/scan/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: batchPayload, wcagLevel }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const result = JSON.parse(line);
            const matchingUrl = toScan.find((u) => u.url === result.url);
            if (!matchingUrl) continue;

            if (result.status === "done") {
              const violations = result.violations.map((v, vi) => ({
                ...v,
                id: `${v.ruleId}-${vi}`,
                criterion: extractCriterion(v.tags),
              }));
              const incomplete = (result.incomplete || []).map((v, vi) => ({
                ...v,
                id: `${v.ruleId}-inc-${vi}`,
                criterion: extractCriterion(v.tags),
              }));
              setScans((prev) => [
                ...prev,
                {
                  id: `${matchingUrl.id}-${Date.now()}`,
                  urlId: matchingUrl.id,
                  sourceUrlId: matchingUrl.sourceUrlId,
                  url: matchingUrl.url,
                  timestamp: result.timestamp,
                  violations,
                  incomplete,
                  passes: result.passes,
                  wcagLevel,
                },
              ]);
              setScanProgress((prev) =>
                prev.map((p) =>
                  p.url === result.url
                    ? {
                        ...p,
                        status: "done",
                        violationCount: result.violations.length,
                        incompleteCount: (result.incomplete || []).length,
                      }
                    : p,
                ),
              );
            } else if (result.status === "error") {
              setScans((prev) => [
                ...prev,
                {
                  id: `${matchingUrl.id}-${Date.now()}`,
                  urlId: matchingUrl.id,
                  sourceUrlId: matchingUrl.sourceUrlId,
                  url: matchingUrl.url,
                  timestamp: Date.now(),
                  violations: [],
                  incomplete: [],
                  error: result.error,
                },
              ]);
              setScanProgress((prev) =>
                prev.map((p) =>
                  p.url === result.url ? { ...p, status: "error" } : p,
                ),
              );
            }
          } catch {}
        }
      }

      setTab("results");
    } catch (err) {
      if (err.name === "AbortError") return;
      setApiError(err.message);
    } finally {
      setScanning(false);
      abortRef.current = null;
    }
  }, [urls, selectedUrls, apiUrl, wcagLevel]);

  const cancelScan = () => {
    if (abortRef.current) abortRef.current.abort();
    setScanning(false);
  };

  const hasResults = scans.length > 0;
  const apiConfigured = apiUrl && apiUrl.startsWith("http");

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: 24,
        maxWidth: 1100,
        margin: "0 auto",
        color: "var(--text, #1f2937)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>WCAG Watcher</h1>
          <div
            style={{ fontSize: 13, color: "var(--text-secondary, #6b7280)" }}
          >
            WCAG Continuous Monitoring
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Btn
            variant="ghost"
            onClick={() => setShowSettings(true)}
            style={{ fontSize: 12, padding: "8px 10px" }}
          >
            ⚙ API Settings
          </Btn>
          <Select
            label="WCAG level"
            value={wcagLevel}
            onChange={setWcagLevel}
            options={WCAG_LEVEL_OPTIONS}
            disabled={scanning}
            style={{ minWidth: 150 }}
          />
          {scanning ? (
            <Btn variant="danger" onClick={cancelScan}>
              Cancel Scan
            </Btn>
          ) : (
            <Btn
              onClick={runScan}
              disabled={urls.length === 0 || !apiConfigured}
            >
              {selectedUrls.size > 0
                ? `▶ Scan Selected (${selectedUrls.size})`
                : "▶ Scan All"}
            </Btn>
          )}
        </div>
      </div>

      {!apiConfigured && (
        <Card
          style={{
            padding: 12,
            marginBottom: 16,
            background: "#fef3c7",
            border: "1px solid #f59e0b40",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#92400e",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>⚠</span>
            <span>
              Set your Scanner API URL in <strong>API Settings</strong> before
              running scans.
            </span>
          </div>
        </Card>
      )}

      {apiError && (
        <Card
          style={{
            padding: 12,
            marginBottom: 16,
            background: "#fef2f2",
            border: "1px solid #dc262640",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#dc2626",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              <strong>Scan error:</strong> {apiError}
            </span>
            <Btn
              variant="ghost"
              onClick={() => setApiError(null)}
              style={{ padding: "2px 8px", fontSize: 12, color: "#dc2626" }}
            >
              ✕
            </Btn>
          </div>
        </Card>
      )}

      {scanning && (
        <div style={{ marginBottom: 16 }}>
          <ScanProgress progress={scanProgress} />
        </div>
      )}

      {urls.some((u) => u.requiresAuth && !u.loginConfig?.usernameValue) && (
        <Card
          style={{
            padding: 12,
            marginBottom: 16,
            background: "#fef3c7",
            border: "1px solid #f59e0b40",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#92400e",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>🔑</span>
            <span>
              Some URLs require authentication but are missing credentials.
              Click <strong>Edit</strong> on those URLs to fill in the username
              and password.
            </span>
          </div>
        </Card>
      )}

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          borderBottom: "2px solid var(--border, #e5e7eb)",
        }}
      >
        {[
          { key: "urls", label: `URLs (${urls.length})` },
          { key: "results", label: "Results", disabled: !hasResults },
        ].map((t) => (
          <button
            key={t.key}
            disabled={t.disabled}
            onClick={() => setTab(t.key)}
            style={{
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: t.disabled ? "default" : "pointer",
              background: "transparent",
              color:
                tab === t.key
                  ? "#2563eb"
                  : t.disabled
                    ? "var(--text-secondary, #ccc)"
                    : "var(--text-secondary, #6b7280)",
              borderBottom:
                tab === t.key ? "2px solid #2563eb" : "2px solid transparent",
              marginBottom: -2,
              opacity: t.disabled ? 0.4 : 1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "urls" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {urls.length > 0 && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  cursor: "pointer",
                  color: "var(--text-secondary, #6b7280)",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedUrls.size === urls.length && urls.length > 0}
                  onChange={toggleAll}
                />
                {selectedUrls.size > 0
                  ? `${selectedUrls.size} selected`
                  : "Select all"}
              </label>
            )}
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files[0]) {
                    importConfig(e.target.files[0]);
                    e.target.value = "";
                  }
                }}
              />
              <Btn
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: 12 }}
              >
                ↑ Import JSON
              </Btn>
              {urls.length > 0 && (
                <Btn
                  variant="secondary"
                  onClick={exportConfig}
                  style={{ fontSize: 12 }}
                >
                  ↓ Export JSON
                </Btn>
              )}
              <Btn onClick={() => setShowAddUrl(true)} style={{ fontSize: 13 }}>
                + Add URL
              </Btn>
            </div>
          </div>

          {urls.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                No URLs configured
              </div>
              <div
                style={{
                  color: "var(--text-secondary, #6b7280)",
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                Add URLs manually or import a JSON config file to get started.
              </div>
              <div
                style={{ display: "flex", gap: 8, justifyContent: "center" }}
              >
                <Btn
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  ↑ Import JSON
                </Btn>
                <Btn onClick={() => setShowAddUrl(true)}>+ Add URL</Btn>
              </div>
            </Card>
          ) : (
            urls.map((u) => {
              const expandedUrls = expandUrlEntry(u);
              const latestScans = expandedUrls
                .map((expandedUrl) => {
                  const urlScans = scans.filter(
                    (s) => s.urlId === expandedUrl.id,
                  );
                  return urlScans[urlScans.length - 1];
                })
                .filter(Boolean);
              const latest = latestScans[latestScans.length - 1];
              const totalV =
                latestScans.length > 0
                  ? latestScans.reduce(
                      (sum, scan) =>
                        scan.error ? sum : sum + scan.violations.length,
                      0,
                    )
                  : null;
              return (
                <Card
                  key={u.id}
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedUrls.has(u.id)}
                    onChange={() => toggleSelect(u.id)}
                    style={{ cursor: "pointer" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {u.label}
                    </div>
                    {u.label !== u.url && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary, #6b7280)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {u.url}
                      </div>
                    )}
                    {u.wildcard?.enabled && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary, #6b7280)",
                          marginTop: 2,
                        }}
                      >
                        Expands {u.wildcard.start} to {u.wildcard.end}
                      </div>
                    )}
                    {u.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary, #9ca3af)",
                          marginTop: 2,
                        }}
                      >
                        {u.description}
                      </div>
                    )}
                  </div>
                  {u.requiresAuth && !u.loginConfig?.usernameValue && (
                    <Badge label="Needs Credentials" color="#f59e0b" />
                  )}
                  {u.requiresAuth && u.loginConfig?.usernameValue && (
                    <Badge label="Auth" color="#7c3aed" />
                  )}
                  {latest?.error && <Badge label="Error" color="#dc2626" />}
                  {totalV !== null && (
                    <Badge
                      label={`${totalV} violations`}
                      color={totalV > 0 ? "#dc2626" : "#16a34a"}
                    />
                  )}
                  {latest && !latest.error && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary, #9ca3af)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(latest.timestamp).toLocaleDateString()}
                    </span>
                  )}
                  <Btn
                    variant="ghost"
                    onClick={() => setEditingUrl(u)}
                    style={{ padding: "4px 8px", fontSize: 12 }}
                  >
                    Edit
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => deleteUrl(u.id)}
                    style={{
                      padding: "4px 8px",
                      fontSize: 12,
                      color: "#dc2626",
                    }}
                  >
                    Delete
                  </Btn>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "results" && (
        <ScanResultsView
          urls={urls}
          scans={scans}
          impactFilter={impactFilter}
          setImpactFilter={setImpactFilter}
          criterionFilter={criterionFilter}
          setCriterionFilter={setCriterionFilter}
          expandedV={expandedV}
          setExpandedV={setExpandedV}
        />
      )}

      {showAddUrl && (
        <Modal title="Add URL" onClose={() => setShowAddUrl(false)} wide>
          <UrlForm onSave={addUrl} onCancel={() => setShowAddUrl(false)} />
        </Modal>
      )}
      {editingUrl && (
        <Modal title="Edit URL" onClose={() => setEditingUrl(null)} wide>
          <UrlForm
            initial={editingUrl}
            onSave={updateUrl}
            onCancel={() => setEditingUrl(null)}
          />
        </Modal>
      )}
      {showSettings && (
        <Modal title="API Settings" onClose={() => setShowSettings(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input
              label="Scanner API URL"
              value={apiUrl}
              onChange={setApiUrl}
              placeholder="https://your-scanner.onrender.com"
            />
            <div
              style={{ fontSize: 12, color: "var(--text-secondary, #6b7280)" }}
            >
              The URL of your deployed scanner API. The frontend will call{" "}
              <code
                style={{
                  background: "var(--bg-secondary, #f3f4f6)",
                  padding: "1px 4px",
                  borderRadius: 3,
                }}
              >
                /scan/batch
              </code>{" "}
              on this host.
            </div>
            <Btn
              variant="secondary"
              onClick={async () => {
                try {
                  const r = await fetch(`${apiUrl.replace(/\/+$/, "")}/health`);
                  const d = await r.json();
                  alert(
                    d.status === "ok"
                      ? "Connected successfully!"
                      : "Unexpected response",
                  );
                } catch (e) {
                  alert(`Connection failed: ${e.message}`);
                }
              }}
              style={{ alignSelf: "flex-start" }}
            >
              Test Connection
            </Btn>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn onClick={() => setShowSettings(false)}>Done</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
