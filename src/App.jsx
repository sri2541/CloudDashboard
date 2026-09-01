import { useState, useEffect, useMemo } from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion, ChevronDown, Upload, Trash2, Plus, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Mock seed data — shaped exactly like ScanResult from cloud_upload_scanner.py
// ---------------------------------------------------------------------------
const SEED_SCANS = [
  {
    id: "s1", path: "quarterly_report_draft.docx", provider: "onedrive",
    timestamp: "2026-06-24T09:12:00", malwareClean: true, malwareFindings: [],
    secretFindings: [], passed: true,
  },
  {
    id: "s2", path: "deploy_config.env", provider: "dropbox",
    timestamp: "2026-06-24T09:18:00", malwareClean: true, malwareFindings: [],
    secretFindings: ["AWS Access Key matched at offset 142", "Password Assignment matched at offset 310"],
    passed: false,
  },
  {
    id: "s3", path: "vacation_photos.zip", provider: "gdrive",
    timestamp: "2026-06-24T08:55:00", malwareClean: null, malwareFindings: [],
    secretFindings: [], passed: true,
  },
  {
    id: "s4", path: "invoice_template.xlsx", provider: "protondrive",
    timestamp: "2026-06-23T17:40:00", malwareClean: true, malwareFindings: [],
    secretFindings: [], passed: true,
  },
  {
    id: "s5", path: "installer_patch.exe", provider: "dropbox",
    timestamp: "2026-06-23T16:02:00", malwareClean: false,
    malwareFindings: ["Win.Trojan.Generic-FOUND"], secretFindings: [], passed: false,
  },
  {
    id: "s6", path: "client_notes.txt", provider: "onedrive",
    timestamp: "2026-06-23T11:21:00", malwareClean: true, malwareFindings: [],
    secretFindings: ["High-entropy string detected (possible token): 9af3kd2x..."], passed: false,
  },
  {
    id: "s7", path: "team_offsite.pdf", provider: "gdrive",
    timestamp: "2026-06-22T14:08:00", malwareClean: true, malwareFindings: [],
    secretFindings: [], passed: true,
  },
];

const PROVIDER_LABEL = {
  onedrive: "OneDrive", dropbox: "Dropbox", gdrive: "Google Drive",
  protondrive: "Proton Drive", icloud: "iCloud",
};

const STORAGE_KEY = "scans:list";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ scan }) {
  const [swept, setSwept] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSwept(true), 400 + Math.random() * 400);
    return () => clearTimeout(t);
  }, []);

  const blocked = !scan.passed;
  const unknown = scan.malwareClean === null && scan.secretFindings.length === 0 && scan.passed;

  const color = blocked ? "#F85149" : unknown ? "#D29922" : "#3FB950";
  const label = blocked ? "BLOCKED" : unknown ? "PASS*" : "PASS";

  return (
    <span
      className="relative inline-flex items-center font-mono text-[11px] tracking-wider px-2 py-1 border overflow-hidden"
      style={{ color, borderColor: color + "55", backgroundColor: color + "14" }}
    >
      <span className="relative z-10">[ {label} ]</span>
      {!swept && (
        <span
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}55, transparent)`,
            animation: "sweep 0.6s ease-out forwards",
          }}
        />
      )}
    </span>
  );
}

function ProviderPill({ provider }) {
  return (
    <span className="font-mono text-[11px] text-[#8B949E] border border-[#30363D] rounded-sm px-1.5 py-0.5">
      {PROVIDER_LABEL[provider] || provider}
    </span>
  );
}

function SummaryStat({ label, value, color, sub }) {
  return (
    <div className="flex-1 border border-[#30363D] bg-[#0D1117] px-4 py-3">
      <div className="text-[11px] font-mono uppercase tracking-wider text-[#8B949E]">{label}</div>
      <div className="text-2xl font-mono mt-1" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-[#6E7681] mt-0.5">{sub}</div>}
    </div>
  );
}

function FindingsList({ scan }) {
  const items = [
    ...scan.malwareFindings.map((f) => ({ kind: "malware", text: f })),
    ...scan.secretFindings.map((f) => ({ kind: "secret", text: f })),
  ];

  if (items.length === 0) {
    return (
      <div className="text-[#3FB950] font-mono text-xs flex items-center gap-2">
        <ShieldCheck size={14} /> No findings — clean scan
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 font-mono text-xs">
          <span
            className="mt-0.5 shrink-0 uppercase text-[10px] px-1 border"
            style={{
              color: item.kind === "malware" ? "#F85149" : "#D29922",
              borderColor: item.kind === "malware" ? "#F8514955" : "#D2992255",
            }}
          >
            {item.kind}
          </span>
          <span className="text-[#C9D1D9]">{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function ScanRow({ scan, onDelete }) {
  const [open, setOpen] = useState(false);
  const hasFindings = scan.malwareFindings.length + scan.secretFindings.length > 0;

  return (
    <div className="border-b border-[#21262D] last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#161B22] transition-colors group"
      >
        <ChevronDown
          size={14}
          className="text-[#6E7681] transition-transform shrink-0"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
        <span className="font-mono text-sm text-[#C9D1D9] truncate flex-1">{scan.path}</span>
        <ProviderPill provider={scan.provider} />
        <span className="text-[11px] text-[#6E7681] font-mono w-16 text-right shrink-0">
          {timeAgo(scan.timestamp)}
        </span>
        <StatusBadge scan={scan} />
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onDelete(scan.id); }}
          className="opacity-0 group-hover:opacity-100 text-[#6E7681] hover:text-[#F85149] transition-opacity p-1 shrink-0"
          aria-label="Delete scan record"
        >
          <Trash2 size={13} />
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-11 -mt-1">
          <FindingsList scan={scan} />
          {scan.malwareClean === null && (
            <div className="mt-2 text-[11px] text-[#D29922] font-mono flex items-center gap-1.5">
              <ShieldQuestion size={12} /> ClamAV unavailable at scan time — malware check skipped
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddScanModal({ onAdd, onClose }) {
  const [path, setPath] = useState("");
  const [provider, setProvider] = useState("dropbox");
  const [passed, setPassed] = useState("pass");
  const [secrets, setSecrets] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const submit = () => {
    if (!selectedFile) {
  alert("Please choose a file.");
  return;
}
    if (!path.trim()) return;
    onAdd({
      id: "s" + Math.random().toString(36).slice(2, 9),
      path: path.trim(),
      provider,
      timestamp: new Date().toISOString(),
      malwareClean: passed === "malware" ? false : true,
      malwareFindings: passed === "malware" ? ["Manual.Entry.Flagged-FOUND"] : [],
      secretFindings: secrets.trim() ? secrets.split(",").map((s) => s.trim()).filter(Boolean) : [],
      passed: passed === "pass" && !secrets.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#0D1117] border border-[#30363D] w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-sm text-[#C9D1D9] tracking-wide">LOG SCAN RESULT</h3>
          <button onClick={onClose} className="text-[#6E7681] hover:text-[#C9D1D9]"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-mono text-[#8B949E] block mb-1">FILENAME</label>
            <input
  type="file"
  className="w-full bg-[#161B22] border border-[#30363D] text-[#C9D1D9] font-mono text-sm px-2.5 py-1.5"
  onChange={(e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPath(file.name);
    }
  }}
/>
          </div>
          <div>
            <label className="text-[11px] font-mono text-[#8B949E] block mb-1">PROVIDER</label>
            <select
              value={provider} onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-[#161B22] border border-[#30363D] text-[#C9D1D9] font-mono text-sm px-2.5 py-1.5 outline-none focus:border-[#3FB950]"
            >
              {Object.entries(PROVIDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-mono text-[#8B949E] block mb-1">RESULT</label>
            <select
              value={passed} onChange={(e) => setPassed(e.target.value)}
              className="w-full bg-[#161B22] border border-[#30363D] text-[#C9D1D9] font-mono text-sm px-2.5 py-1.5 outline-none focus:border-[#3FB950]"
            >
              <option value="pass">Clean</option>
              <option value="malware">Malware found</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-mono text-[#8B949E] block mb-1">SECRET FINDINGS (comma-separated, optional)</label>
            <input
              value={secrets} onChange={(e) => setSecrets(e.target.value)}
              placeholder="e.g. AWS Access Key matched at offset 12"
              className="w-full bg-[#161B22] border border-[#30363D] text-[#C9D1D9] font-mono text-sm px-2.5 py-1.5 outline-none focus:border-[#3FB950]"
            />
          </div>
        </div>
        <button
          onClick={submit}
          className="mt-4 w-full bg-[#3FB950] text-[#0D1117] font-mono text-xs tracking-wider py-2 hover:bg-[#56D364] transition-colors"
        >
          ADD RECORD
        </button>
      </div>
    </div>
  );
}

export default function ScanDashboard() {
  const [scans, setScans] = useState(SEED_SCANS);
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res?.value) setScans(JSON.parse(res.value));
      } catch (_) {
        // no stored data yet — keep seed data
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
   localStorage.setItem(STORAGE_KEY, JSON.stringify(scans)); 
  }, [scans, loaded]);

  const stats = useMemo(() => {
    const total = scans.length;
    const blocked = scans.filter((s) => !s.passed).length;
    const malware = scans.filter((s) => s.malwareClean === false).length;
    const secrets = scans.reduce((acc, s) => acc + s.secretFindings.length, 0);
    return { total, blocked, malware, secrets, passed: total - blocked };
  }, [scans]);

  const filtered = useMemo(() => {
    if (filter === "all") return scans;
    if (filter === "blocked") return scans.filter((s) => !s.passed);
    if (filter === "passed") return scans.filter((s) => s.passed);
    return scans;
  }, [scans, filter]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [filtered]
  );

  const addScan = (scan) => setScans((prev) => [scan, ...prev]);
  const deleteScan = (id) => setScans((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="min-h-screen bg-[#010409] text-[#C9D1D9] p-4 sm:p-6" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <style>{`
        @keyframes sweep {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 text-[#3FB950]">
              <ShieldCheck size={18} />
              <h1 className="font-mono text-sm tracking-[0.15em] uppercase">Upload Scan Log</h1>
            </div>
            <p className="text-[11px] text-[#6E7681] mt-1">
              Pre-upload security checks · cloud_upload_scanner.py
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#161B22] border border-[#30363D] text-[#C9D1D9] text-xs font-mono px-3 py-1.5 hover:border-[#3FB950] hover:text-[#3FB950] transition-colors"
          >
            <Plus size={13} /> LOG SCAN
          </button>
        </div>

        {/* Summary strip */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <SummaryStat label="Total Scanned" value={stats.total} color="#C9D1D9" />
          <SummaryStat label="Passed" value={stats.passed} color="#3FB950" />
          <SummaryStat label="Blocked" value={stats.blocked} color="#F85149" sub={`${stats.malware} malware · ${stats.secrets} secrets`} />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-3 font-mono text-[11px]">
          {[["all", "ALL"], ["passed", "PASSED"], ["blocked", "BLOCKED"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-3 py-1.5 border transition-colors"
              style={{
                borderColor: filter === key ? "#3FB950" : "#30363D",
                color: filter === key ? "#3FB950" : "#6E7681",
                backgroundColor: filter === key ? "#3FB95014" : "transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="border border-[#30363D] bg-[#0D1117]">
          {sorted.length === 0 ? (
            <div className="p-8 text-center text-[#6E7681] text-sm font-mono">
              No scans match this filter. Run a different filter or log a new scan.
            </div>
          ) : (
            sorted.map((scan) => (
              <ScanRow key={scan.id} scan={scan} onDelete={deleteScan} />
            ))
          )}
        </div>

        <p className="text-[11px] text-[#6E7681] mt-4 flex items-center gap-1.5">
          <Upload size={12} /> Data persists locally to your account via artifact storage.
        </p>
      </div>

      {modalOpen && <AddScanModal onAdd={addScan} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
