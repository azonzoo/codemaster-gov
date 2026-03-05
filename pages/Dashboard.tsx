import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequestStore, useUserStore, useAdminStore, useLayoutStore } from '../stores';
import { RequestStatus, Role, RequestItem, Classification } from '../types';
import { calculateBusinessHours } from '../lib/businessHours';
import { useToastStore } from '../stores';
import { useTableKeyboardNav } from '../hooks/useTableKeyboardNav';
import { Clock, CheckCircle, AlertCircle, FileText, ArrowRight, RotateCcw, Filter, Search, ChevronLeft, ChevronRight, ArrowUpDown, AlertTriangle, UserPlus, XCircle, Columns, TrendingUp, Users as UsersIcon, BarChart2, ChevronDown, ChevronUp, FileSpreadsheet, LayoutGrid, FileDown, Award } from 'lucide-react';
import { exportRequestsToExcel } from '../lib/exportExcel';
import { exportBatchPdf } from '../lib/exportBatchPdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { DashboardLayoutEditor } from '../components/DashboardLayoutEditor';
import { PerformanceMetrics } from '../components/PerformanceMetrics';
import { SLACountdown } from '../components/SLACountdown';

const PAGE_SIZE = 15;
const ANALYTICS_COLORS = ['#2563eb', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const requests = useRequestStore((s) => s.requests);
  const currentUser = useUserStore((s) => s.currentUser);
  const priorities = useAdminStore((s) => s.priorities);
  const attributes = useAdminStore((s) => s.attributes);
  const users = useUserStore((s) => s.users);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'priority' | 'status'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const updateRequestStatus = useRequestStore((s) => s.updateRequestStatus);
  const updateRequest = useRequestStore((s) => s.updateRequest);
  const addToast = useToastStore((s) => s.addToast);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);

  // Layout store
  const layoutWidgets = useLayoutStore((s) => s.widgets);
  const compactMode = useLayoutStore((s) => s.compactMode);
  const sortedLayoutWidgets = useMemo(
    () => [...layoutWidgets].sort((a, b) => a.order - b.order),
    [layoutWidgets]
  );
  const isWidgetVisible = (id: string) => layoutWidgets.find((w) => w.id === id)?.visible ?? true;

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['id', 'priority', 'title', 'classification', 'status', 'specialist', 'created', 'action'])
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const columnDefs = [
    { key: 'id', label: 'ID' },
    { key: 'priority', label: 'Priority' },
    { key: 'title', label: 'Title' },
    { key: 'classification', label: 'Classification' },
    { key: 'status', label: 'Status' },
    { key: 'specialist', label: 'Specialist' },
    { key: 'created', label: 'Created' },
    { key: 'action', label: 'Action' },
  ];

  const toggleColumnVisibility = (key: string) => {
    if (key === 'title' || key === 'action') return; // Always visible
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resetColumns = () => {
    setVisibleColumns(new Set(columnDefs.map(c => c.key)));
  };

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAssignId, setBulkAssignId] = useState('');

  const canBulkAction = currentUser.role === Role.ADMIN || currentUser.role === Role.POC || currentUser.role === Role.MANAGER;
  const specialists = users.filter(u => u.role === Role.SPECIALIST);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRequests.map(r => r.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkAssign = () => {
    if (!bulkAssignId) { addToast('Select a specialist first.', 'warning'); return; }
    const specialist = users.find(u => u.id === bulkAssignId);
    selectedIds.forEach(id => {
      const req = requests.find(r => r.id === id);
      if (req && [RequestStatus.SUBMITTED_TO_POC, RequestStatus.ASSIGNED].includes(req.status)) {
        updateRequest(id, {
          assignedSpecialistId: bulkAssignId,
          status: RequestStatus.ASSIGNED,
        });
      }
    });
    addToast(`Assigned ${selectedIds.size} request(s) to ${specialist?.name || 'specialist'}.`, 'success');
    clearSelection();
    setBulkAssignId('');
  };

  // Get unique project codes for filter dropdown
  const projectCodes = useMemo(() => {
    const codes = new Set(requests.map(r => r.project).filter(Boolean));
    return Array.from(codes).sort();
  }, [requests]);

  // Filter requests based on role visibility AND selected filters
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      // Role-based visibility
      let visible = false;
      if (currentUser.role === Role.ADMIN) visible = true;
      else if (currentUser.role === Role.REQUESTER) visible = r.requesterId === currentUser.id;
      else if (currentUser.role === Role.MANAGER) visible = r.managerId === currentUser.id || r.status === RequestStatus.PENDING_APPROVAL;
      else if (currentUser.role === Role.POC) visible = [RequestStatus.SUBMITTED_TO_POC, RequestStatus.ASSIGNED, RequestStatus.UNDER_SPECIALIST_REVIEW, RequestStatus.UNDER_TECHNICAL_VALIDATION, RequestStatus.PENDING_ORACLE_CREATION].includes(r.status);
      else if (currentUser.role === Role.SPECIALIST) visible = r.assignedSpecialistId === currentUser.id || r.status === RequestStatus.ASSIGNED;
      else if (currentUser.role === Role.TECHNICAL_REVIEWER) visible = r.technicalReviewerId === currentUser.id || r.status === RequestStatus.UNDER_TECHNICAL_VALIDATION;
      if (!visible) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!r.id.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q) && !(r.project || '').toLowerCase().includes(q)) return false;
      }

      // Status filter
      if (filterStatus === 'active' && (r.status === RequestStatus.COMPLETED || r.status === RequestStatus.REJECTED)) return false;
      if (filterStatus === 'completed' && r.status !== RequestStatus.COMPLETED) return false;
      if (filterStatus === 'attention' && r.status !== RequestStatus.REJECTED && r.status !== RequestStatus.RETURNED_FOR_CLARIFICATION) return false;

      // Priority filter
      if (filterPriority !== 'all' && r.priorityId !== filterPriority) return false;

      // Classification filter
      if (filterClassification !== 'all' && r.classification !== filterClassification) return false;

      // Project filter
      if (filterProject !== 'all' && r.project !== filterProject) return false;

      return true;
    });
  }, [requests, currentUser, filterStatus, filterPriority, filterClassification, filterProject, searchQuery]);

  // Sorting
  const sortedRequests = useMemo(() => {
    const sorted = [...filteredRequests];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'priority') {
        const pa = priorities.find(p => p.id === a.priorityId);
        const pb = priorities.find(p => p.id === b.priorityId);
        cmp = (pa?.displayOrder || 0) - (pb?.displayOrder || 0);
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [filteredRequests, sortField, sortDir, priorities]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRequests.length / PAGE_SIZE));
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRequests.slice(start, start + PAGE_SIZE);
  }, [sortedRequests, page]);

  // Reset page when filters change
  useMemo(() => { setPage(1); }, [filterStatus, filterPriority, filterClassification, filterProject, searchQuery]);

  // Keyboard navigation for table
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const handleTableEnter = useCallback(
    (index: number) => {
      const req = paginatedRequests[index];
      if (!req) return;
      const isRequesterAttention =
        currentUser.id === req.requesterId &&
        (req.status === RequestStatus.REJECTED || req.status === RequestStatus.RETURNED_FOR_CLARIFICATION);
      if (isRequesterAttention) {
        navigate(`/requests/${req.id}/edit`);
      } else {
        navigate(`/requests/${req.id}`);
      }
    },
    [paginatedRequests, currentUser, navigate]
  );

  const { focusedIndex, setFocusedIndex, handleKeyDown: handleTableKeyDown } = useTableKeyboardNav({
    rowCount: paginatedRequests.length,
    onEnter: handleTableEnter,
    tableRef: tbodyRef as React.RefObject<HTMLTableSectionElement>,
  });

  // Reset focused index when page, filters, or search change
  useMemo(() => { setFocusedIndex(-1); }, [page, filterStatus, filterPriority, filterClassification, filterProject, searchQuery]);

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.COMPLETED: return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-500/20';
      case RequestStatus.REJECTED: return 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/10 dark:bg-rose-950 dark:text-rose-400 dark:ring-rose-500/20';
      case RequestStatus.RETURNED_FOR_CLARIFICATION: return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-500/20';
      case RequestStatus.PENDING_APPROVAL: return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/10 dark:bg-yellow-950 dark:text-yellow-400 dark:ring-yellow-500/20';
      case RequestStatus.SUBMITTED_TO_POC: return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10 dark:bg-blue-950 dark:text-blue-400 dark:ring-blue-500/20';
      case RequestStatus.UNDER_SPECIALIST_REVIEW: return 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/10 dark:bg-violet-950 dark:text-violet-400 dark:ring-violet-500/20';
      case RequestStatus.UNDER_TECHNICAL_VALIDATION: return 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-600/10 dark:bg-cyan-950 dark:text-cyan-400 dark:ring-cyan-500/20';
      case RequestStatus.PENDING_ORACLE_CREATION: return 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/10 dark:bg-teal-950 dark:text-teal-400 dark:ring-teal-500/20';
      default: return 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/10 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-500/20';
    }
  };

  const getPriorityDisplay = (priorityId: string) => {
    const p = priorities.find(p => p.id === priorityId);
    if (!p) return { name: 'Unknown', className: 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/10 dark:bg-slate-800 dark:text-slate-400' };
    const ln = p.name.toLowerCase();
    if (ln.includes('critical')) return { name: p.name, className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/10 dark:bg-rose-950 dark:text-rose-400' };
    if (ln.includes('urgent')) return { name: p.name, className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10 dark:bg-amber-950 dark:text-amber-400' };
    return { name: p.name, className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10 dark:bg-blue-950 dark:text-blue-400' };
  };

  // SLA Badge calculation (using business hours)
  const getSLABadge = (req: RequestItem) => {
    if (req.status === RequestStatus.COMPLETED || req.status === RequestStatus.REJECTED) return null;
    const p = priorities.find(p => p.id === req.priorityId);
    if (!p?.slaHours) return null;
    const elapsed = calculateBusinessHours(req.createdAt, new Date());
    const ratio = elapsed / p.slaHours;
    if (ratio >= 1) return { label: 'SLA Breached', className: 'bg-red-500 text-white' };
    if (ratio >= 0.75) return { label: 'SLA At Risk', className: 'bg-amber-500 text-white' };
    return null;
  };

  const getSpecialistName = (id?: string) => {
    if (!id) return '-';
    const u = users.find(u => u.id === id);
    return u?.name || '-';
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const all = requests.filter(r => {
      if (currentUser.role === Role.ADMIN) return true;
      if (currentUser.role === Role.REQUESTER) return r.requesterId === currentUser.id;
      return true;
    });
    return {
      active: all.filter(r => r.status !== RequestStatus.COMPLETED && r.status !== RequestStatus.REJECTED).length,
      completed: all.filter(r => r.status === RequestStatus.COMPLETED).length,
      attention: all.filter(r => r.status === RequestStatus.REJECTED || r.status === RequestStatus.RETURNED_FOR_CLARIFICATION).length,
      breached: all.filter(r => {
        if (r.status === RequestStatus.COMPLETED || r.status === RequestStatus.REJECTED) return false;
        const p = priorities.find(p => p.id === r.priorityId);
        if (!p?.slaHours) return false;
        const elapsed = calculateBusinessHours(r.createdAt, new Date());
        return elapsed >= p.slaHours;
      }).length,
    };
  }, [requests, currentUser, priorities]);

  // Analytics: Requests trend over last 30 days
  const trendData = useMemo(() => {
    const days = 30;
    const now = new Date();
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const count = requests.filter(r => r.createdAt.slice(0, 10) === dateStr).length;
      data.push({ date: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }), count });
    }
    return data;
  }, [requests]);

  // Analytics: Workload by specialist
  const workloadData = useMemo(() => {
    const specs = users.filter(u => u.role === Role.SPECIALIST);
    return specs.map(s => ({
      name: s.name.split(' ')[0],
      active: requests.filter(r => r.assignedSpecialistId === s.id && r.status !== RequestStatus.COMPLETED && r.status !== RequestStatus.REJECTED).length,
    })).filter(s => s.active > 0);
  }, [requests, users]);

  // Analytics: Priority distribution
  const priorityDistData = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => {
      const pName = priorities.find(p => p.id === r.priorityId)?.name || 'Unknown';
      counts[pName] = (counts[pName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [requests, priorities]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowLayoutEditor((prev) => !prev)}
              className="p-2 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
              aria-label="Customize dashboard layout"
              title="Customize"
            >
              <LayoutGrid size={18} strokeWidth={1.75} />
            </button>
            <DashboardLayoutEditor isOpen={showLayoutEditor} onClose={() => setShowLayoutEditor(false)} />
          </div>
          <button
            onClick={() => exportRequestsToExcel(filteredRequests, priorities, users)}
            className="p-2 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
            aria-label="Export filtered requests to Excel"
            title="Export to Excel"
          >
            <FileSpreadsheet size={18} strokeWidth={1.75} />
          </button>
          {(currentUser.role === Role.REQUESTER || currentUser.role === Role.ADMIN) && (
            <button
              onClick={() => navigate('/requests/new')}
              className="btn-primary text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium text-sm shadow-sm"
            >
              <FileText size={18} />
              Create Request
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Widgets - rendered in user-configured order */}
      {sortedLayoutWidgets.map((widget) => {
        if (!widget.visible) return null;

        if (widget.id === 'kpi-cards') {
          return (
            <div key={widget.id} className={`grid grid-cols-2 md:grid-cols-4 ${compactMode ? 'gap-2' : 'gap-4'}`}>
              <div className={`bg-white dark:bg-slate-800 ${compactMode ? 'p-3' : 'p-5'} rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60 card-accent-left hover:shadow-premium-md transition-shadow duration-200`} role="status" aria-label={`Active requests: ${kpis.active}`}>
                <div className="flex items-center gap-3">
                  <div className={`${compactMode ? 'p-1.5' : 'p-2.5'} icon-container icon-container-blue`}><Clock size={compactMode ? 18 : 22} strokeWidth={1.75} /></div>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Active</p>
                    <p className={`${compactMode ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 dark:text-slate-100`}>{kpis.active}</p>
                  </div>
                </div>
              </div>
              <div className={`bg-white dark:bg-slate-800 ${compactMode ? 'p-3' : 'p-5'} rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60 card-accent-left hover:shadow-premium-md transition-shadow duration-200`} role="status" aria-label={`Completed requests: ${kpis.completed}`}>
                <div className="flex items-center gap-3">
                  <div className={`${compactMode ? 'p-1.5' : 'p-2.5'} icon-container icon-container-emerald`}><CheckCircle size={compactMode ? 18 : 22} strokeWidth={1.75} /></div>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Completed</p>
                    <p className={`${compactMode ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 dark:text-slate-100`}>{kpis.completed}</p>
                  </div>
                </div>
              </div>
              <div className={`bg-white dark:bg-slate-800 ${compactMode ? 'p-3' : 'p-5'} rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60 card-accent-left hover:shadow-premium-md transition-shadow duration-200`} role="status" aria-label={`Attention requests: ${kpis.attention}`}>
                <div className="flex items-center gap-3">
                  <div className={`${compactMode ? 'p-1.5' : 'p-2.5'} icon-container icon-container-rose`}><AlertCircle size={compactMode ? 18 : 22} strokeWidth={1.75} /></div>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">Attention</p>
                    <p className={`${compactMode ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 dark:text-slate-100`}>{kpis.attention}</p>
                  </div>
                </div>
              </div>
              <div className={`bg-white dark:bg-slate-800 ${compactMode ? 'p-3' : 'p-5'} rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60 card-accent-left hover:shadow-premium-md transition-shadow duration-200`} role="status" aria-label={`SLA breached requests: ${kpis.breached}`}>
                <div className="flex items-center gap-3">
                  <div className={`${compactMode ? 'p-1.5' : 'p-2.5'} icon-container icon-container-amber`}><AlertTriangle size={compactMode ? 18 : 22} strokeWidth={1.75} /></div>
                  <div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">SLA Breached</p>
                    <p className={`${compactMode ? 'text-xl' : 'text-2xl'} font-bold text-slate-900 dark:text-slate-100`}>{kpis.breached}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (widget.id === 'analytics') {
          return (
            <React.Fragment key={widget.id}>
              {/* Analytics Toggle */}
              <div className="flex items-center">
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  aria-expanded={showAnalytics}
                  aria-controls="analytics-panel"
                >
                  <BarChart2 size={16} />
                  Analytics
                  {showAnalytics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Analytics Widgets */}
              {showAnalytics && (
                <div id="analytics-panel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                  {/* Widget 1: Requests Over Time */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={16} className="text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Requests Trend (30 days)</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="count" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Widget 2: Specialist Workload */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-2 mb-4">
                      <UsersIcon size={16} className="text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Specialist Workload</h3>
                    </div>
                    {workloadData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={workloadData} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} width={60} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9', fontSize: '12px' }} />
                          <Bar dataKey="active" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-slate-400 dark:text-slate-500 text-sm">
                        No active specialist assignments
                      </div>
                    )}
                  </div>

                  {/* Widget 3: Priority Distribution */}
                  <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart2 size={16} className="text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">By Priority</h3>
                    </div>
                    {priorityDistData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={priorityDistData}
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            innerRadius={35}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                            fontSize={10}
                          >
                            {priorityDistData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-slate-400 dark:text-slate-500 text-sm">
                        No request data available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        }

        if (widget.id === 'performance') {
          // Only show for Admin and POC roles
          if (currentUser.role !== Role.ADMIN && currentUser.role !== Role.POC) return null;
          return (
            <React.Fragment key={widget.id}>
              {/* Specialist Performance Toggle */}
              <div className="flex items-center">
                <button
                  onClick={() => setShowPerformance(!showPerformance)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  aria-expanded={showPerformance}
                  aria-controls="performance-panel"
                >
                  <Award size={16} className="text-amber-500" />
                  Specialist Performance
                  {showPerformance ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Performance Metrics Panel */}
              {showPerformance && (
                <div id="performance-panel" className="animate-fadeIn">
                  <PerformanceMetrics requests={requests} users={users} />
                </div>
              )}
            </React.Fragment>
          );
        }

        if (widget.id === 'request-table') {
          return (
            <React.Fragment key={widget.id}>
      {/* Request Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60 overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, title, or project..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg input-premium dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search requests"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={14} className="text-slate-400" />
              <select className="text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-md shadow-sm py-2 px-3" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} aria-label="Filter by status">
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="attention">Needs Attention</option>
                <option value="completed">Completed</option>
              </select>
              <select className="text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-md shadow-sm py-2 px-3" value={filterPriority} onChange={e => setFilterPriority(e.target.value)} aria-label="Filter by priority">
                <option value="all">All Priority</option>
                {priorities.filter(p => p.active).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select className="text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-md shadow-sm py-2 px-3" value={filterClassification} onChange={e => setFilterClassification(e.target.value)} aria-label="Filter by classification">
                <option value="all">All Types</option>
                <option value={Classification.ITEM}>Material (Item)</option>
                <option value={Classification.SERVICE}>Service</option>
              </select>
              {projectCodes.length > 0 && (
                <select className="text-sm border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-md shadow-sm py-2 px-3" value={filterProject} onChange={e => setFilterProject(e.target.value)} aria-label="Filter by project">
                  <option value="all">All Projects</option>
                  {projectCodes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}

              {/* Column Visibility Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowColumnPicker(prev => !prev)}
                  className="flex items-center gap-1.5 text-sm border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-md shadow-sm py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                  aria-label="Toggle column visibility"
                  aria-expanded={showColumnPicker}
                >
                  <Columns size={14} />
                  <span>Columns</span>
                </button>
                {showColumnPicker && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowColumnPicker(false)} />
                    <div className="absolute right-0 top-full mt-1 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-2 w-52">
                      <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Show Columns</span>
                        <button
                          onClick={resetColumns}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Reset
                        </button>
                      </div>
                      {columnDefs.map(col => {
                        const isLocked = col.key === 'title' || col.key === 'action';
                        return (
                          <label
                            key={col.key}
                            className={`flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns.has(col.key)}
                              onChange={() => toggleColumnVisibility(col.key)}
                              disabled={isLocked}
                              className="rounded text-blue-600 focus:ring-blue-500/20 disabled:opacity-50"
                            />
                            <span className="text-slate-700 dark:text-slate-300">{col.label}</span>
                            {isLocked && <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">Required</span>}
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400">{sortedRequests.length} request{sortedRequests.length !== 1 ? 's' : ''} found</div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider">
              <tr>
                {canBulkAction && (
                  <th scope="col" className="p-3 pl-4 w-10">
                    <input
                      type="checkbox"
                      checked={paginatedRequests.length > 0 && selectedIds.size === paginatedRequests.length}
                      onChange={toggleSelectAll}
                      className="rounded text-blue-600 focus:ring-blue-500/20"
                      aria-label="Select all requests on this page"
                    />
                  </th>
                )}
                {visibleColumns.has('id') && <th scope="col" className="p-3 pl-4">ID</th>}
                {visibleColumns.has('priority') && (
                  <th scope="col" className="p-3 cursor-pointer select-none" onClick={() => toggleSort('priority')} aria-sort={sortField === 'priority' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <span className="flex items-center gap-1">Priority <ArrowUpDown size={12} /></span>
                  </th>
                )}
                {visibleColumns.has('title') && <th scope="col" className="p-3">Title</th>}
                {visibleColumns.has('classification') && <th scope="col" className="p-3">Classification</th>}
                {visibleColumns.has('status') && (
                  <th scope="col" className="p-3 cursor-pointer select-none" onClick={() => toggleSort('status')} aria-sort={sortField === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <span className="flex items-center gap-1">Status <ArrowUpDown size={12} /></span>
                  </th>
                )}
                {visibleColumns.has('specialist') && <th scope="col" className="p-3">Specialist</th>}
                {visibleColumns.has('created') && (
                  <th scope="col" className="p-3 cursor-pointer select-none" onClick={() => toggleSort('createdAt')} aria-sort={sortField === 'createdAt' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <span className="flex items-center gap-1">Created <ArrowUpDown size={12} /></span>
                  </th>
                )}
                {visibleColumns.has('action') && <th scope="col" className="p-3 text-right pr-4">Action</th>}
              </tr>
            </thead>
            <tbody
              ref={tbodyRef}
              className="divide-y divide-slate-100 dark:divide-slate-700"
              onKeyDown={handleTableKeyDown}
              onFocus={(e) => {
                // When tbody or a row receives focus and no row is focused yet, focus the first row
                if (focusedIndex < 0 && paginatedRequests.length > 0) {
                  const target = e.target as HTMLElement;
                  if (target.tagName === 'TR' || target === tbodyRef.current) {
                    setFocusedIndex(0);
                  }
                }
              }}
            >
              {paginatedRequests.length === 0 ? (
                <tr><td colSpan={visibleColumns.size + (canBulkAction ? 1 : 0)} className="p-12 text-center" role="status">
                  <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No requests found</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                    {searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'Create a new request to get started.'}
                  </p>
                </td></tr>
              ) : (
                paginatedRequests.map((req, rowIdx) => {
                  const priorityMeta = getPriorityDisplay(req.priorityId);
                  const isRequesterAttention = currentUser.id === req.requesterId && (req.status === RequestStatus.REJECTED || req.status === RequestStatus.RETURNED_FOR_CLARIFICATION);
                  const reqPriority = priorities.find(p => p.id === req.priorityId);
                  const isRowFocused = focusedIndex === rowIdx;

                  return (
                    <tr
                      key={req.id}
                      data-row-index={rowIdx}
                      className={`table-row-hover outline-none ${isRowFocused ? 'ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                      tabIndex={isRowFocused ? 0 : -1}
                      role="link"
                      aria-label={`Request ${req.id}: ${req.title}, status ${req.status}`}
                      onClick={() => setFocusedIndex(rowIdx)}
                    >
                      {canBulkAction && (
                        <td className="p-3 pl-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(req.id)}
                            onChange={(e) => { e.stopPropagation(); toggleSelect(req.id); }}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded text-blue-600 focus:ring-blue-500/20"
                            aria-label={`Select request ${req.id}`}
                          />
                        </td>
                      )}
                      {visibleColumns.has('id') && (
                        <td className="p-3 pl-4">
                          <span className="font-medium text-blue-600 dark:text-blue-400 text-xs font-mono">{req.id}</span>
                        </td>
                      )}
                      {visibleColumns.has('priority') && (
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${priorityMeta.className}`}>{priorityMeta.name}</span>
                        </td>
                      )}
                      {visibleColumns.has('title') && (
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px]">{req.title}</span>
                            <SLACountdown request={req} priority={reqPriority} />
                          </div>
                        </td>
                      )}
                      {visibleColumns.has('classification') && (
                        <td className="p-3">
                          <span className="badge-refined bg-slate-50 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600">{req.classification}</span>
                        </td>
                      )}
                      {visibleColumns.has('status') && (
                        <td className="p-3">
                          <span className={`badge-refined ${getStatusColor(req.status)}`}>{req.status}</span>
                        </td>
                      )}
                      {visibleColumns.has('specialist') && (
                        <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{getSpecialistName(req.assignedSpecialistId)}</td>
                      )}
                      {visibleColumns.has('created') && (
                        <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">{new Date(req.createdAt).toLocaleDateString()}</td>
                      )}
                      {visibleColumns.has('action') && (
                        <td className="p-3 text-right pr-4">
                          {isRequesterAttention ? (
                            <button onClick={() => navigate(`/requests/${req.id}/edit`)} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-md text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center gap-1 ml-auto border border-blue-200/60 dark:border-blue-700/60">
                              Modify <RotateCcw size={12} />
                            </button>
                          ) : (
                            <button onClick={() => navigate(`/requests/${req.id}`)} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium flex items-center gap-1 justify-end w-full text-xs transition-colors">
                              View <ArrowRight size={14} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Keyboard Navigation Hint */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-4">
            {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
            {paginatedRequests.length > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500" aria-label="Keyboard navigation hints">
                &#8593;&#8595; Navigate rows &middot; Enter to open &middot; Esc to deselect
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Previous page">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const num = start + i;
                if (num > totalPages) return null;
                return (
                  <button key={num} onClick={() => setPage(num)} className={`px-3 py-1 rounded text-xs font-medium ${num === page ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`} aria-label={`Page ${num}`} aria-current={num === page ? 'page' : undefined}>{num}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Next page">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
            </React.Fragment>
          );
        }

        return null;
      })}

      {/* Bulk Action Toolbar */}
      {canBulkAction && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 dark:bg-slate-700 text-white rounded-xl shadow-premium-xl px-6 py-3 flex items-center gap-4 animate-fadeIn border border-slate-700 dark:border-slate-600">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="h-5 w-px bg-slate-600" />

          {/* Assign to specialist */}
          {(currentUser.role === Role.POC || currentUser.role === Role.ADMIN) && (
            <div className="flex items-center gap-2">
              <select
                value={bulkAssignId}
                onChange={e => setBulkAssignId(e.target.value)}
                className="text-xs bg-slate-800 dark:bg-slate-600 border border-slate-600 dark:border-slate-500 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-blue-500"
                aria-label="Select specialist for bulk assignment"
              >
                <option value="">Assign to...</option>
                {specialists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkAssignId}
                className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg font-medium transition"
                aria-label="Assign selected requests to specialist"
              >
                <UserPlus size={14} /> Assign
              </button>
            </div>
          )}

          <button
            onClick={() => {
              const selected = requests.filter(r => selectedIds.has(r.id));
              exportBatchPdf(selected, priorities, users, attributes);
            }}
            className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium transition"
            aria-label="Export selected requests as batch PDF"
          >
            <FileDown size={14} /> Batch PDF
          </button>

          <button
            onClick={clearSelection}
            className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2 py-1.5 rounded-lg transition"
            aria-label="Clear selection"
          >
            <XCircle size={14} /> Clear
          </button>
        </div>
      )}
    </div>
  );
};
