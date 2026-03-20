// =============================================================
// Update the DEFAULT_API_URL at the top of the file to
// your actual Render URL, e.g.:
//
//   const DEFAULT_API_URL = "https://a11y-scanner-api.onrender.com";
// =============================================================

import { useState, useMemo, useCallback, useRef } from "react";

const DEFAULT_API_URL = "https://your-scanner.onrender.com";

const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const IMPACT_COLORS = { critical: "#dc2626", serious: "#ea580c", moderate: "#ca8a04", minor: "#6b7280" };

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
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 9999,
      fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
      background: color + "18", color, border: `1px solid ${color}40`, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function ImpactBadge({ impact }) {
  return <Badge label={impact} color={IMPACT_COLORS[impact] || "#6b7280"} />;
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "var(--card, #fff)", border: "1px solid var(--border, #e5e7eb)",
      borderRadius: 10, padding: 16, ...style, ...(onClick ? { cursor: "pointer" } : {}),
    }}>{children}</div>
  );
}

function Btn({ children, onClick, variant = "primary", style, disabled }) {
  const base = {
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: "none", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 6, ...style,
  };
  const v = {
    primary: { ...base, background: "#2563eb", color: "#fff" },
    secondary: { ...base, background: "var(--bg-secondary, #f3f4f6)", color: "var(--text, #1f2937)", border: "1px solid var(--border, #e5e7eb)" },
    danger: { ...base, background: "#dc2626", color: "#fff" },
    ghost: { ...base, background: "transparent", color: "#2563eb" },
  };
  return <button style={v[variant]} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Input({ label, value, onChange, type = "text", placeholder, style }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #6b7280)" }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #e5e7eb)", fontSize: 14, background: "var(--card, #fff)", color: "var(--text, #1f2937)" }} />
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: wide ? 600 : 480, maxWidth: "95vw", maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <Btn variant="ghost" onClick={onClose} style={{ padding: 4, fontSize: 18 }}>✕</Btn>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginConfigForm({ config, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, background: "var(--bg-secondary, #f8f9fa)", borderRadius: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary, #6b7280)" }}>Login Configuration</div>
      <Input label="Login Page URL" value={config.loginUrl} onChange={v => onChange({ ...config, loginUrl: v })} placeholder="https://example.com/login" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Username Field Label" value={config.usernameLabel} onChange={v => onChange({ ...config, usernameLabel: v })} placeholder="Email" />
        <Input label="Username Value" value={config.usernameValue} onChange={v => onChange({ ...config, usernameValue: v })} placeholder="user@example.com" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Password Field Label" value={config.passwordLabel} onChange={v => onChange({ ...config, passwordLabel: v })} placeholder="Password" />
        <Input label="Password Value" type="password" value={config.passwordValue} onChange={v => onChange({ ...config, passwordValue: v })} placeholder="••••••••" />
      </div>
      {config.extraFields.map((f, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <Input label={`Extra Field ${i + 1} Label`} value={f.label} onChange={v => { const nf = [...config.extraFields]; nf[i] = { ...nf[i], label: v }; onChange({ ...config, extraFields: nf }); }} />
          <Input label="Value" value={f.value} onChange={v => { const nf = [...config.extraFields]; nf[i] = { ...nf[i], value: v }; onChange({ ...config, extraFields: nf }); }} />
          <Btn variant="danger" style={{ padding: "8px 10px" }} onClick={() => onChange({ ...config, extraFields: config.extraFields.filter((_, j) => j !== i) })}>✕</Btn>
        </div>
      ))}
      <Btn variant="secondary" style={{ alignSelf: "flex-start", fontSize: 12 }} onClick={() => onChange({ ...config, extraFields: [...config.extraFields, { label: "", value: "" }] })}>+ Add Extra Field</Btn>
    </div>
  );
}

const EMPTY_LOGIN = { loginUrl: "", usernameLabel: "Email", usernameValue: "", passwordLabel: "Password", passwordValue: "", extraFields: [] };

function buildLoginPayload(urlEntry) {
  if (!urlEntry.requiresAuth) return undefined;
  const c = urlEntry.loginConfig;
  const fields = [];
  if (c.usernameLabel && c.usernameValue) fields.push({ label: c.usernameLabel, value: c.usernameValue });
  if (c.passwordLabel && c.passwordValue) fields.push({ label: c.passwordLabel, value: c.passwordValue });
  for (const f of c.extraFields) {
    if (f.label && f.value) fields.push({ label: f.label, value: f.value });
  }
  if (!c.loginUrl || fields.length === 0) return undefined;
  return { loginUrl: c.loginUrl, fields };
}

function UrlForm({ onSave, onCancel, initial }) {
  const [url, setUrl] = useState(initial?.url || "");
  const [label, setLabel] = useState(initial?.label || "");
  const [requiresAuth, setRequiresAuth] = useState(initial?.requiresAuth || false);
  const [loginConfig, setLoginConfig] = useState(initial?.loginConfig || { ...EMPTY_LOGIN });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Input label="URL" value={url} onChange={setUrl} placeholder="https://app.example.com/dashboard" />
      <Input label="Label (optional)" value={label} onChange={setLabel} placeholder="Dashboard" />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
        <input type="checkbox" checked={requiresAuth} onChange={e => setRequiresAuth(e.target.checked)} />
        Requires authentication to scan
      </label>
      {requiresAuth && <LoginConfigForm config={loginConfig} onChange={setLoginConfig} />}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn onClick={() => onSave({ url, label: label || url, requiresAuth, loginConfig })} disabled={!url}>
          {initial ? "Save Changes" : "Add URL"}
        </Btn>
      </div>
    </div>
  );
}

function exportCSV(urls, scans) {
  const rows = [["Label", "URL", "Scan Date", "Rule ID", "WCAG Criterion", "Impact", "Description", "Selector", "HTML Snippet"]];
  for (const u of urls) {
    const urlScans = scans.filter(s => s.urlId === u.id);
    const latest = urlScans[urlScans.length - 1];
    if (!latest) continue;
    for (const v of latest.violations) {
      for (const n of v.nodes) {
        rows.push([u.label, u.url, new Date(latest.timestamp).toLocaleString(), v.ruleId, v.criterion || "—", v.impact, v.desc, n.selector, n.html].map(c => `"${String(c).replace(/"/g, '""')}"`));
      }
    }
  }
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "a11y-violations.csv";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function ScanResultsView({ urls, scans, impactFilter, setImpactFilter, criterionFilter, setCriterionFilter, expandedV, setExpandedV }) {
  const urlsWithResults = useMemo(() => {
    return urls.map(u => {
      const urlScans = scans.filter(s => s.urlId === u.id);
      const latest = urlScans.length > 0 ? urlScans[urlScans.length - 1] : null;
      return { ...u, latest };
    }).filter(u => u.latest);
  }, [urls, scans]);

  const allCriteria = useMemo(() => {
    const s = new Set();
    urlsWithResults.forEach(u => u.latest.violations.forEach(v => { if (v.criterion && v.criterion !== "—") s.add(v.criterion); }));
    return [...s].sort();
  }, [urlsWithResults]);

  const filtered = useMemo(() => {
    return urlsWithResults.map(u => ({
      ...u,
      violations: u.latest.violations
        .filter(v => impactFilter === "all" || v.impact === impactFilter)
        .filter(v => criterionFilter === "all" || v.criterion === criterionFilter)
        .sort((a, b) => (IMPACT_ORDER[a.impact] ?? 4) - (IMPACT_ORDER[b.impact] ?? 4)),
    }));
  }, [urlsWithResults, impactFilter, criterionFilter]);

  const totalV = filtered.reduce((s, u) => s + u.violations.length, 0);
  const totalN = filtered.reduce((s, u) => s + u.violations.reduce((ns, v) => ns + v.nodes.length, 0), 0);

  if (urlsWithResults.length === 0) {
    return (
      <Card style={{ textAlign: "center", padding: 32, color: "var(--text-secondary, #6b7280)" }}>
        No scan results yet. Add URLs and run a scan to see results here.
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card style={{ flex: 1, padding: 12, textAlign: "center", minWidth: 100 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#dc2626" }}>{totalV}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary, #6b7280)", fontWeight: 600 }}>RULES VIOLATED</div>
        </Card>
        <Card style={{ flex: 1, padding: 12, textAlign: "center", minWidth: 100 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#ea580c" }}>{totalN}</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary, #6b7280)", fontWeight: 600 }}>TOTAL ELEMENTS</div>
        </Card>
        {Object.entries(IMPACT_COLORS).map(([imp, col]) => {
          const c = filtered.reduce((s, u) => s + u.violations.filter(v => v.impact === imp).length, 0);
          return (
            <Card key={imp} style={{ flex: 1, padding: 12, textAlign: "center", minWidth: 90 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: col }}>{c}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary, #6b7280)", fontWeight: 600, textTransform: "uppercase" }}>{imp}</div>
            </Card>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #6b7280)" }}>Severity:</span>
          {["all", "critical", "serious", "moderate", "minor"].map(f => (
            <Btn key={f} variant={impactFilter === f ? "primary" : "secondary"} onClick={() => setImpactFilter(f)}
              style={{ padding: "4px 10px", fontSize: 12 }}>{f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</Btn>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #6b7280)" }}>WCAG:</span>
          <select value={criterionFilter} onChange={e => setCriterionFilter(e.target.value)}
            style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid var(--border, #e5e7eb)", fontSize: 12, background: "var(--card, #fff)", color: "var(--text, #1f2937)" }}>
            <option value="all">All Criteria</option>
            {allCriteria.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <Btn variant="secondary" onClick={() => exportCSV(urls, scans)} style={{ fontSize: 12 }}>↓ Export CSV</Btn>
      </div>

      {filtered.map(u => (
        <Card key={u.id} style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "var(--bg-secondary, #f8f9fa)", borderBottom: "1px solid var(--border, #e5e7eb)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{u.label}</div>
              {u.label !== u.url && <div style={{ fontSize: 12, color: "var(--text-secondary, #6b7280)" }}>{u.url}</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {u.latest.error ? (
                <Badge label="Scan Error" color="#dc2626" />
              ) : (
                <>
                  <span style={{ fontSize: 11, color: "var(--text-secondary, #9ca3af)" }}>{new Date(u.latest.timestamp).toLocaleString()}</span>
                  <Badge label={`${u.violations.length} violation${u.violations.length !== 1 ? "s" : ""}`} color={u.violations.length > 0 ? "#dc2626" : "#16a34a"} />
                </>
              )}
            </div>
          </div>
          {u.latest.error ? (
            <div style={{ padding: 16, color: "#dc2626", fontSize: 13 }}>
              <strong>Scan failed:</strong> {u.latest.error}
            </div>
          ) : u.violations.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-secondary, #6b7280)", fontSize: 14 }}>
              No violations found{impactFilter !== "all" || criterionFilter !== "all" ? " matching filters" : ""} ✓
            </div>
          ) : (
            u.violations.map(v => {
              const key = `${u.id}-${v.id}`;
              const isExp = expandedV === key;
              return (
                <div key={v.id} style={{ borderBottom: "1px solid var(--border, #e5e7eb)" }}>
                  <div onClick={() => setExpandedV(isExp ? null : key)}
                    style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, background: isExp ? "var(--bg-secondary, #fafafa)" : "transparent" }}>
                    <span style={{ fontSize: 12, transform: isExp ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
                    <ImpactBadge impact={v.impact} />
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{v.ruleId}</span>
                    {v.criterion && v.criterion !== "—" && <Badge label={`WCAG ${v.criterion}`} color="#2563eb" />}
                    <span style={{ fontSize: 12, color: "var(--text-secondary, #6b7280)" }}>{v.nodes.length} element{v.nodes.length !== 1 ? "s" : ""}</span>
                  </div>
                  {isExp && (
                    <div style={{ padding: "0 16px 12px 44px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontSize: 13, color: "var(--text-secondary, #4b5563)" }}>{v.desc}</div>
                      {v.help && <a href={v.help} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#2563eb" }}>How to fix →</a>}
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #6b7280)", marginTop: 4 }}>Affected Elements:</div>
                      {v.nodes.map((n, ni) => (
                        <div key={ni} style={{ background: "var(--bg-secondary, #f3f4f6)", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ fontFamily: "monospace", fontSize: 12, color: "#2563eb" }}>{n.selector}</div>
                          <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 11, color: "#dc2626", background: "#fef2f2", padding: "6px 8px", borderRadius: 4, overflowX: "auto", whiteSpace: "pre-wrap" }}>{n.html}</pre>
                          {n.failureSummary && (
                            <div style={{ fontSize: 12, color: "var(--text-secondary, #4b5563)", marginTop: 4 }}>{n.failureSummary}</div>
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
      ))}
    </div>
  );
}

function ScanProgress({ progress }) {
  const done = progress.filter(p => p.status !== "scanning").length;
  const total = progress.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Scanning... {done}/{total} complete</span>
        <span style={{ fontSize: 13, color: "var(--text-secondary, #6b7280)" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-secondary, #e5e7eb)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#2563eb", borderRadius: 3, transition: "width 0.3s ease" }} />
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        {progress.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 18, textAlign: "center" }}>
              {p.status === "scanning" ? "⟳" : p.status === "done" ? "✓" : "✕"}
            </span>
            <span style={{ color: "var(--text-secondary, #6b7280)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.url}</span>
            {p.status === "done" && <Badge label={`${p.violationCount} violations`} color={p.violationCount > 0 ? "#dc2626" : "#16a34a"} />}
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
  const [showSettings, setShowSettings] = useState(false);
  const [apiError, setApiError] = useState(null);
  const abortRef = useRef(null);

  const addUrl = (data) => {
    setUrls(prev => [...prev, { ...data, id: Date.now().toString() }]);
    setShowAddUrl(false);
  };

  const updateUrl = (data) => {
    setUrls(prev => prev.map(u => u.id === editingUrl.id ? { ...u, ...data } : u));
    setEditingUrl(null);
  };

  const deleteUrl = (id) => {
    setUrls(prev => prev.filter(u => u.id !== id));
    setScans(prev => prev.filter(s => s.urlId !== id));
    setSelectedUrls(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const toggleSelect = (id) => {
    setSelectedUrls(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    setSelectedUrls(prev => prev.size === urls.length ? new Set() : new Set(urls.map(u => u.id)));
  };

  const runScan = useCallback(async () => {
    const toScan = selectedUrls.size > 0 ? urls.filter(u => selectedUrls.has(u.id)) : urls;
    if (toScan.length === 0) return;

    setScanning(true);
    setApiError(null);
    setScanProgress(toScan.map(u => ({ url: u.url, status: "scanning", violationCount: 0 })));

    const batchPayload = toScan.map(u => {
      const login = buildLoginPayload(u);
      return login ? { url: u.url, login } : { url: u.url };
    });

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(`${apiUrl.replace(/\/+$/, "")}/scan/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: batchPayload }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
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
            const matchingUrl = toScan.find(u => u.url === result.url);
            if (!matchingUrl) continue;

            if (result.status === "done") {
              const violations = result.violations.map((v, vi) => ({
                ...v,
                id: `${v.ruleId}-${vi}`,
                criterion: extractCriterion(v.tags),
              }));
              setScans(prev => [...prev, {
                id: `${matchingUrl.id}-${Date.now()}`,
                urlId: matchingUrl.id,
                timestamp: result.timestamp,
                violations,
                passes: result.passes,
              }]);
              setScanProgress(prev => prev.map(p =>
                p.url === result.url ? { ...p, status: "done", violationCount: result.violations.length } : p
              ));
            } else if (result.status === "error") {
              setScans(prev => [...prev, {
                id: `${matchingUrl.id}-${Date.now()}`,
                urlId: matchingUrl.id,
                timestamp: Date.now(),
                violations: [],
                error: result.error,
              }]);
              setScanProgress(prev => prev.map(p =>
                p.url === result.url ? { ...p, status: "error" } : p
              ));
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
  }, [urls, selectedUrls, apiUrl]);

  const cancelScan = () => {
    if (abortRef.current) abortRef.current.abort();
    setScanning(false);
  };

  const hasResults = scans.length > 0;
  const apiConfigured = apiUrl && apiUrl !== DEFAULT_API_URL;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: 24, maxWidth: 1100, margin: "0 auto", color: "var(--text, #1f2937)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>WCAG Watcher</h1>
          <div style={{ fontSize: 13, color: "var(--text-secondary, #6b7280)" }}>WCAG 2.1 Continuous Monitoring</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn variant="ghost" onClick={() => setShowSettings(true)} style={{ fontSize: 12, padding: "6px 10px" }}>⚙ API Settings</Btn>
          {scanning ? (
            <Btn variant="danger" onClick={cancelScan}>Cancel Scan</Btn>
          ) : (
            <Btn onClick={runScan} disabled={urls.length === 0 || !apiConfigured}>
              {selectedUrls.size > 0 ? `▶ Scan Selected (${selectedUrls.size})` : "▶ Scan All"}
            </Btn>
          )}
        </div>
      </div>

      {!apiConfigured && (
        <Card style={{ padding: 12, marginBottom: 16, background: "#fef3c7", border: "1px solid #f59e0b40" }}>
          <div style={{ fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
            <span>⚠</span>
            <span>Set your Scanner API URL in <strong>API Settings</strong> before running scans.</span>
          </div>
        </Card>
      )}

      {apiError && (
        <Card style={{ padding: 12, marginBottom: 16, background: "#fef2f2", border: "1px solid #dc262640" }}>
          <div style={{ fontSize: 13, color: "#dc2626", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span><strong>Scan error:</strong> {apiError}</span>
            <Btn variant="ghost" onClick={() => setApiError(null)} style={{ padding: "2px 8px", fontSize: 12, color: "#dc2626" }}>✕</Btn>
          </div>
        </Card>
      )}

      {scanning && <div style={{ marginBottom: 16 }}><ScanProgress progress={scanProgress} /></div>}

      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid var(--border, #e5e7eb)" }}>
        {[
          { key: "urls", label: `URLs (${urls.length})` },
          { key: "results", label: "Results", disabled: !hasResults },
        ].map(t => (
          <button key={t.key} disabled={t.disabled} onClick={() => setTab(t.key)} style={{
            padding: "8px 20px", fontSize: 14, fontWeight: 600, border: "none", cursor: t.disabled ? "default" : "pointer",
            background: "transparent", color: tab === t.key ? "#2563eb" : t.disabled ? "var(--text-secondary, #ccc)" : "var(--text-secondary, #6b7280)",
            borderBottom: tab === t.key ? "2px solid #2563eb" : "2px solid transparent", marginBottom: -2,
            opacity: t.disabled ? 0.4 : 1,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "urls" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {urls.length > 0 && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "var(--text-secondary, #6b7280)" }}>
                <input type="checkbox" checked={selectedUrls.size === urls.length && urls.length > 0} onChange={toggleAll} />
                {selectedUrls.size > 0 ? `${selectedUrls.size} selected` : "Select all"}
              </label>
            )}
            <div style={{ flex: 1 }} />
            <Btn onClick={() => setShowAddUrl(true)} style={{ fontSize: 13 }}>+ Add URL</Btn>
          </div>

          {urls.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No URLs configured</div>
              <div style={{ color: "var(--text-secondary, #6b7280)", fontSize: 14, marginBottom: 16 }}>Add URLs to begin monitoring for accessibility violations.</div>
              <Btn onClick={() => setShowAddUrl(true)}>+ Add Your First URL</Btn>
            </Card>
          ) : (
            urls.map(u => {
              const urlScans = scans.filter(s => s.urlId === u.id);
              const latest = urlScans[urlScans.length - 1];
              const totalV = latest && !latest.error ? latest.violations.length : null;
              return (
                <Card key={u.id} style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="checkbox" checked={selectedUrls.has(u.id)} onChange={() => toggleSelect(u.id)} style={{ cursor: "pointer" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.label}</div>
                    {u.label !== u.url && <div style={{ fontSize: 12, color: "var(--text-secondary, #6b7280)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.url}</div>}
                  </div>
                  {u.requiresAuth && <Badge label="Auth" color="#7c3aed" />}
                  {latest?.error && <Badge label="Error" color="#dc2626" />}
                  {totalV !== null && <Badge label={`${totalV} violations`} color={totalV > 0 ? "#dc2626" : "#16a34a"} />}
                  {latest && !latest.error && <span style={{ fontSize: 11, color: "var(--text-secondary, #9ca3af)", whiteSpace: "nowrap" }}>{new Date(latest.timestamp).toLocaleDateString()}</span>}
                  <Btn variant="ghost" onClick={() => setEditingUrl(u)} style={{ padding: "4px 8px", fontSize: 12 }}>Edit</Btn>
                  <Btn variant="ghost" onClick={() => deleteUrl(u.id)} style={{ padding: "4px 8px", fontSize: 12, color: "#dc2626" }}>Delete</Btn>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "results" && (
        <ScanResultsView
          urls={urls} scans={scans}
          impactFilter={impactFilter} setImpactFilter={setImpactFilter}
          criterionFilter={criterionFilter} setCriterionFilter={setCriterionFilter}
          expandedV={expandedV} setExpandedV={setExpandedV}
        />
      )}

      {showAddUrl && (
        <Modal title="Add URL" onClose={() => setShowAddUrl(false)} wide>
          <UrlForm onSave={addUrl} onCancel={() => setShowAddUrl(false)} />
        </Modal>
      )}
      {editingUrl && (
        <Modal title="Edit URL" onClose={() => setEditingUrl(null)} wide>
          <UrlForm initial={editingUrl} onSave={updateUrl} onCancel={() => setEditingUrl(null)} />
        </Modal>
      )}
      {showSettings && (
        <Modal title="API Settings" onClose={() => setShowSettings(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Scanner API URL" value={apiUrl} onChange={setApiUrl} placeholder="https://your-scanner.onrender.com" />
            <div style={{ fontSize: 12, color: "var(--text-secondary, #6b7280)" }}>
              The URL of your deployed scanner API. The frontend will call <code style={{ background: "var(--bg-secondary, #f3f4f6)", padding: "1px 4px", borderRadius: 3 }}>/scan/batch</code> on this host.
            </div>
            <Btn variant="secondary" onClick={async () => {
              try {
                const r = await fetch(`${apiUrl.replace(/\/+$/, "")}/health`);
                const d = await r.json();
                alert(d.status === "ok" ? "Connected successfully!" : "Unexpected response");
              } catch (e) {
                alert(`Connection failed: ${e.message}`);
              }
            }} style={{ alignSelf: "flex-start" }}>Test Connection</Btn>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn onClick={() => setShowSettings(false)}>Done</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}