import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { RequestStatus, Role, RequestItem, Classification } from '../types';
import { Clock, CheckCircle, AlertCircle, FileText, ArrowRight, RotateCcw, Filter, Search, ChevronLeft, ChevronRight, ArrowUpDown, AlertTriangle } from 'lucide-react';

const PAGE_SIZE = 15;

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { requests, currentUser, priorities, users } = useStore();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'priority' | 'status'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

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

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.COMPLETED: return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10';
      case RequestStatus.REJECTED: return 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/10';
      case RequestStatus.RETURNED_FOR_CLARIFICATION: return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10';
      case RequestStatus.PENDING_APPROVAL: return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/10';
      case RequestStatus.SUBMITTED_TO_POC: return 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10';
      case RequestStatus.UNDER_SPECIALIST_REVIEW: return 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/10';
      case RequestStatus.UNDER_TECHNICAL_VALIDATION: return 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-600/10';
      case RequestStatus.PENDING_ORACLE_CREATION: return 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/10';
      default: return 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/10';
    }
  };

  const getPriorityDisplay = (priorityId: string) => {
    const p = priorities.find(p => p.id === priorityId);
    if (!p) return { name: 'Unknown', className: 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/10' };
    const ln = p.name.toLowerCase();
    if (ln.includes('critical')) return { name: p.name, className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/10' };
    if (ln.includes('urgent')) return { name: p.name, className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10' };
    return { name: p.name, className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10' };
  };

  // SLA Badge calculation
  const getSLABadge = (req: RequestItem) => {
    if (req.status === RequestStatus.COMPLETED || req.status === RequestStatus.REJECTED) return null;
    const p = priorities.find(p => p.id === req.priorityId);
    if (!p?.slaHours) return null;
    const elapsed = (Date.now() - new Date(req.createdAt).getTime()) / (1000 * 60 * 60);
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
        const elapsed = (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
        return elapsed >= p.slaHours;
      }).length,
    };
  }, [requests, currentUser, priorities]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-premium border border-slate-200/60 card-accent-left hover:shadow-premium-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 icon-container icon-container-blue"><Clock size={22} strokeWidth={1.75} /></div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Active</p>
              <p className="text-2xl font-bold text-slate-900">{kpis.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-premium border border-slate-200/60 card-accent-left hover:shadow-premium-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 icon-container icon-container-emerald"><CheckCircle size={22} strokeWidth={1.75} /></div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-slate-900">{kpis.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-premium border border-slate-200/60 card-accent-left hover:shadow-premium-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 icon-container icon-container-rose"><AlertCircle size={22} strokeWidth={1.75} /></div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">Attention</p>
              <p className="text-2xl font-bold text-slate-900">{kpis.attention}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-premium border border-slate-200/60 card-accent-left hover:shadow-premium-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 icon-container icon-container-amber"><AlertTriangle size={22} strokeWidth={1.75} /></div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide">SLA Breached</p>
              <p className="text-2xl font-bold text-slate-900">{kpis.breached}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Request Table */}
      <div className="bg-white rounded-xl shadow-premium border border-slate-200/60 overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ID, title, or project..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg input-premium"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter size={14} className="text-slate-400" />
              <select className="text-sm border-slate-200 rounded-md shadow-sm py-2 px-3" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="attention">Needs Attention</option>
                <option value="completed">Completed</option>
              </select>
              <select className="text-sm border-slate-200 rounded-md shadow-sm py-2 px-3" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                <option value="all">All Priority</option>
                {priorities.filter(p => p.active).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select className="text-sm border-slate-200 rounded-md shadow-sm py-2 px-3" value={filterClassification} onChange={e => setFilterClassification(e.target.value)}>
                <option value="all">All Types</option>
                <option value={Classification.ITEM}>Material (Item)</option>
                <option value={Classification.SERVICE}>Service</option>
              </select>
              {projectCodes.length > 0 && (
                <select className="text-sm border-slate-200 rounded-md shadow-sm py-2 px-3" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                  <option value="all">All Projects</option>
                  {projectCodes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-400">{sortedRequests.length} request{sortedRequests.length !== 1 ? 's' : ''} found</div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3 pl-4">ID</th>
                <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('priority')}>
                  <span className="flex items-center gap-1">Priority <ArrowUpDown size={12} /></span>
                </th>
                <th className="p-3">Title</th>
                <th className="p-3">Classification</th>
                <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  <span className="flex items-center gap-1">Status <ArrowUpDown size={12} /></span>
                </th>
                <th className="p-3">Specialist</th>
                <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>
                  <span className="flex items-center gap-1">Created <ArrowUpDown size={12} /></span>
                </th>
                <th className="p-3 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRequests.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center">
                  <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No requests found</p>
                  <p className="text-slate-400 text-xs mt-1">
                    {searchQuery || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'Create a new request to get started.'}
                  </p>
                </td></tr>
              ) : (
                paginatedRequests.map(req => {
                  const priorityMeta = getPriorityDisplay(req.priorityId);
                  const isRequesterAttention = currentUser.id === req.requesterId && (req.status === RequestStatus.REJECTED || req.status === RequestStatus.RETURNED_FOR_CLARIFICATION);
                  const slaBadge = getSLABadge(req);

                  return (
                    <tr key={req.id} className="table-row-hover">
                      <td className="p-3 pl-4">
                        <span className="font-medium text-blue-600 text-xs font-mono">{req.id}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${priorityMeta.className}`}>{priorityMeta.name}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate max-w-[200px]">{req.title}</span>
                          {slaBadge && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${slaBadge.className}`}>{slaBadge.label}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="badge-refined bg-slate-50 text-slate-600 ring-1 ring-slate-200">{req.classification}</span>
                      </td>
                      <td className="p-3">
                        <span className={`badge-refined ${getStatusColor(req.status)}`}>{req.status}</span>
                      </td>
                      <td className="p-3 text-xs text-slate-500">{getSpecialistName(req.assignedSpecialistId)}</td>
                      <td className="p-3 text-slate-500 text-xs">{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-right pr-4">
                        {isRequesterAttention ? (
                          <button onClick={() => navigate(`/requests/${req.id}/edit`)} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs font-bold hover:bg-blue-100 flex items-center gap-1 ml-auto border border-blue-200/60">
                            Modify <RotateCcw size={12} />
                          </button>
                        ) : (
                          <button onClick={() => navigate(`/requests/${req.id}`)} className="text-slate-400 hover:text-blue-600 font-medium flex items-center gap-1 justify-end w-full text-xs transition-colors">
                            View <ArrowRight size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
            <span>Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const num = start + i;
                if (num > totalPages) return null;
                return (
                  <button key={num} onClick={() => setPage(num)} className={`px-3 py-1 rounded text-xs font-medium ${num === page ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-100'}`}>{num}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
