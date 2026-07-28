import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import {
  Activity, Database, Clock, MemoryStick, AlertTriangle,
  AlertCircle, Info, Zap, RefreshCw, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

interface HealthStatus {
  status:    'healthy' | 'degraded';
  database:  string;
  uptime:    number;
  memory:    { heapUsed: number; heapTotal: number; rss: number };
  last24h:   { errors: number; warnings: number; critical: number };
}

interface SystemLog {
  id:         string;
  level:      LogLevel;
  source:     string;
  module:     string;
  message:    string;
  stackTrace: string | null;
  tenantId:   string | null;
  createdAt:  string;
}

interface LogsResponse {
  total: number;
  page:  number;
  limit: number;
  logs:  SystemLog[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<LogLevel, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  INFO:     { label: 'INFO',     color: 'text-sky-600',   bg: 'bg-sky-50   border-sky-200',    icon: Info          },
  WARN:     { label: 'WARN',     color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200',  icon: AlertTriangle },
  ERROR:    { label: 'ERROR',    color: 'text-rose-600',  bg: 'bg-rose-50  border-rose-200',   icon: AlertCircle   },
  CRITICAL: { label: 'CRITICAL', color: 'text-fuchsia-700', bg: 'bg-fuchsia-50 border-fuchsia-200', icon: Zap       },
};

function LevelBadge({ level }: { level: LogLevel }) {
  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.INFO;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function fmt(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600)  / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SystemHealth() {
  const [status,  setStatus]  = useState<HealthStatus | null>(null);
  const [logsRes, setLogsRes] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters
  const [level,  setLevel]  = useState('');
  const [source, setSource] = useState('');
  const [module, setModule] = useState('');
  const [page,   setPage]   = useState(1);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, logsData] = await Promise.all([
        api.get<HealthStatus>('/super-admin/health'),
        api.get<LogsResponse>('/super-admin/health/logs', {
          params: { level: level || undefined, source: source || undefined, module: module || undefined, page, limit: 50 },
        }),
      ]);
      setStatus(statusRes.data);
      setLogsRes(logsData.data);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, [level, source, module, page]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const applyFilters = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchAll(); };

  const totalPages = logsRes ? Math.ceil(logsRes.total / logsRes.limit) : 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">System Health</h1>
          <p className="text-sm text-slate-500 mt-0.5">ตรวจสอบสถานะระบบและ Error Log แบบ Real-time</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm font-semibold disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรช
        </button>
      </div>

      {/* Status cards */}
      {status && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* DB Status */}
          <div className={`rounded-2xl border p-4 ${status.status === 'healthy' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Database className={`w-4 h-4 ${status.status === 'healthy' ? 'text-emerald-600' : 'text-rose-600'}`} />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Database</span>
            </div>
            <p className={`text-lg font-black ${status.status === 'healthy' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {status.database}
            </p>
          </div>

          {/* Uptime */}
          <div className="rounded-2xl border bg-white border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Uptime</span>
            </div>
            <p className="text-lg font-black text-slate-800">{fmt(status.uptime)}</p>
          </div>

          {/* Memory */}
          <div className="rounded-2xl border bg-white border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <MemoryStick className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Heap Used</span>
            </div>
            <p className="text-lg font-black text-slate-800">
              {status.memory.heapUsed} <span className="text-sm font-semibold text-slate-400">/ {status.memory.heapTotal} MB</span>
            </p>
          </div>

          {/* Errors 24h */}
          <div className={`rounded-2xl border p-4 ${status.last24h.critical > 0 ? 'bg-fuchsia-50 border-fuchsia-200' : status.last24h.errors > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Activity className={`w-4 h-4 ${status.last24h.critical > 0 ? 'text-fuchsia-600' : status.last24h.errors > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">24h Issues</span>
            </div>
            <p className="text-sm font-black text-slate-800 leading-tight">
              <span className="text-rose-600">{status.last24h.errors} errors</span>
              {' · '}
              <span className="text-amber-600">{status.last24h.warnings} warns</span>
              {' · '}
              <span className="text-fuchsia-600">{status.last24h.critical} crit</span>
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <form onSubmit={applyFilters} className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Level</label>
            <select
              value={level}
              onChange={e => setLevel(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">ทั้งหมด</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Source</label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">ทั้งหมด</option>
              <option value="BACKEND">BACKEND</option>
              <option value="FRONTEND">FRONTEND</option>
              <option value="DATABASE">DATABASE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Module</label>
            <input
              type="text"
              placeholder="ค้นหา module..."
              value={module}
              onChange={e => setModule(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-500 w-40"
            />
          </div>
          <button
            type="submit"
            className="h-9 flex items-center gap-2 px-4 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all"
          >
            <Filter className="w-3.5 h-3.5" />
            กรอง
          </button>
        </div>
      </form>

      {/* Logs table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-black text-slate-700">
            System Logs
            {logsRes && <span className="ml-2 text-slate-400 font-semibold">({logsRes.total.toLocaleString()} รายการ)</span>}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wide">Level</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wide">Source</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wide">Module</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wide w-full">Message</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wide whitespace-nowrap">Tenant</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-wide whitespace-nowrap">เวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && !logsRes && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">กำลังโหลด...</td></tr>
              )}
              {!loading && logsRes?.logs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">ไม่พบ Log</td></tr>
              )}
              {logsRes?.logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3"><LevelBadge level={log.level} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">{log.source}</td>
                    <td className="px-4 py-3 text-xs font-bold text-violet-700">{log.module}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-md">
                      <p className="truncate">{log.message}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{log.tenantId ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                  </tr>
                  {expanded === log.id && log.stackTrace && (
                    <tr>
                      <td colSpan={6} className="px-4 pb-4">
                        <pre className="bg-slate-950 text-emerald-400 text-xs p-4 rounded-xl overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                          {log.stackTrace}
                        </pre>
                      </td>
                    </tr>
                  )}
                  {expanded === log.id && !log.stackTrace && (
                    <tr>
                      <td colSpan={6} className="px-4 pb-3">
                        <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-3">ไม่มี Stack Trace</p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logsRes && totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              หน้า {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
