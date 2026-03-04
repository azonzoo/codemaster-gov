import React, { useMemo } from 'react';
import { useStore } from '../store';
import { RequestStatus, Role } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ArrowLeft, TrendingUp, Users, Clock, Target } from 'lucide-react';

interface ReportsProps {
  onNavigate: (page: string) => void;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

export const Reports: React.FC<ReportsProps> = ({ onNavigate }) => {
  const { requests, priorities, users } = useStore();

  // Status Distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [requests]);

  // Priority Distribution
  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(r => {
      const name = priorities.find(p => p.id === r.priorityId)?.name || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [requests, priorities]);

  // SLA Compliance
  const completedRequests = useMemo(() => requests.filter(r => r.status === RequestStatus.COMPLETED), [requests]);

  const slaData = useMemo(() => completedRequests.map(req => {
    const created = new Date(req.createdAt).getTime();
    const completedLog = req.history.find(h => h.action.includes('completed') || h.action.includes('Completed') || h.action.includes('Code Created'));
    const completed = completedLog ? new Date(completedLog.timestamp).getTime() : new Date(req.updatedAt).getTime();
    const durationHours = (completed - created) / (1000 * 60 * 60);
    const prio = priorities.find(p => p.id === req.priorityId);
    const sla = prio?.slaHours || 24;
    return { id: req.id.slice(-8), actual: Math.round(durationHours * 10) / 10, sla, metSla: durationHours <= sla };
  }), [completedRequests, priorities]);

  const metSlaCount = slaData.filter(d => d.metSla).length;
  const complianceRate = slaData.length > 0 ? ((metSlaCount / slaData.length) * 100).toFixed(1) : 'N/A';

  // Per-stage average durations
  const stageAvgData = useMemo(() => {
    const stageDurations: Record<string, number[]> = {};
    requests.forEach(req => {
      (req.stageTimestamps || []).forEach(st => {
        if (st.durationHours != null) {
          if (!stageDurations[st.status]) stageDurations[st.status] = [];
          stageDurations[st.status].push(st.durationHours);
        }
      });
    });
    return Object.entries(stageDurations).map(([stage, durations]) => ({
      stage: stage.length > 20 ? stage.slice(0, 18) + '...' : stage,
      avgHours: Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10,
      count: durations.length,
    }));
  }, [requests]);

  // Specialist performance
  const specialistData = useMemo(() => {
    const specialists = users.filter(u => u.role === Role.SPECIALIST);
    return specialists.map(spec => {
      const assigned = requests.filter(r => r.assignedSpecialistId === spec.id);
      const completed = assigned.filter(r => r.status === RequestStatus.COMPLETED);
      const avgTime = completed.length > 0
        ? completed.reduce((sum, r) => {
            const dur = (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
            return sum + dur;
          }, 0) / completed.length
        : 0;
      const slaCompliant = completed.filter(r => {
        const prio = priorities.find(p => p.id === r.priorityId);
        if (!prio?.slaHours) return true;
        const dur = (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
        return dur <= prio.slaHours;
      }).length;
      return {
        name: spec.name,
        assigned: assigned.length,
        completed: completed.length,
        inProgress: assigned.length - completed.length,
        avgHours: Math.round(avgTime * 10) / 10,
        slaRate: completed.length > 0 ? Math.round((slaCompliant / completed.length) * 100) : 0,
      };
    }).filter(s => s.assigned > 0);
  }, [requests, users, priorities]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-200 rounded-full transition"><ArrowLeft size={20} strokeWidth={1.75} /></button>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Performance Reports</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-premium border border-slate-200/60 card-accent-left">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2"><TrendingUp size={16} strokeWidth={1.75} /> Total Requests</div>
          <p className="text-3xl font-bold text-slate-900">{requests.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-premium border border-slate-200/60">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2"><Target size={16} strokeWidth={1.75} /> Completed</div>
          <p className="text-3xl font-bold text-emerald-600">{completedRequests.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-premium border border-slate-200/60">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2"><Clock size={16} strokeWidth={1.75} /> SLA Compliance</div>
          <p className={`text-3xl font-bold ${complianceRate !== 'N/A' && parseFloat(complianceRate) >= 90 ? 'text-emerald-600' : 'text-amber-500'}`}>{complianceRate}{complianceRate !== 'N/A' ? '%' : ''}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-premium border border-slate-200/60">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2"><Users size={16} strokeWidth={1.75} /> Active Specialists</div>
          <p className="text-3xl font-bold text-blue-600">{specialistData.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-premium border border-slate-200/60">
          <h3 className="font-bold text-slate-800 mb-4">Status Distribution</h3>
          {statusData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-64 flex items-center justify-center text-slate-400 italic">No data</div>}
        </div>

        {/* Priority Volume */}
        <div className="bg-white p-6 rounded-xl shadow-premium border border-slate-200/60">
          <h3 className="font-bold text-slate-800 mb-4">Volume by Priority</h3>
          {priorityData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" name="Requests" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-64 flex items-center justify-center text-slate-400 italic">No data</div>}
        </div>

        {/* Average Time per Stage */}
        {stageAvgData.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-premium border border-slate-200/60">
            <h3 className="font-bold text-slate-800 mb-4">Average Time per Stage (Hours)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageAvgData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => `${val}h`} />
                  <Bar dataKey="avgHours" fill="#10b981" name="Avg Hours" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* SLA Performance */}
        <div className="bg-white p-6 rounded-xl shadow-premium border border-slate-200/60">
          <h3 className="font-bold text-slate-800 mb-4">SLA Performance - Actual vs Target</h3>
          {slaData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="id" tick={{ fontSize: 10 }} />
                  <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="actual" fill="#10b981" name="Actual" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sla" fill="#f59e0b" name="SLA Target" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-64 flex items-center justify-center text-slate-400 italic">No completed requests to analyze yet.</div>}
        </div>
      </div>

      {/* Specialist Performance Table */}
      {specialistData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-premium border border-slate-200/60">
          <h3 className="font-bold text-slate-800 mb-4">Specialist Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="p-3 text-xs uppercase tracking-wider">Specialist</th>
                  <th className="p-3 text-center text-xs uppercase tracking-wider">Assigned</th>
                  <th className="p-3 text-center text-xs uppercase tracking-wider">Completed</th>
                  <th className="p-3 text-center text-xs uppercase tracking-wider">In Progress</th>
                  <th className="p-3 text-center text-xs uppercase tracking-wider">Avg Time (h)</th>
                  <th className="p-3 text-center text-xs uppercase tracking-wider">SLA Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {specialistData.map(spec => (
                  <tr key={spec.name} className="table-row-hover">
                    <td className="p-3 font-medium text-slate-900">{spec.name}</td>
                    <td className="p-3 text-center">{spec.assigned}</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">{spec.completed}</td>
                    <td className="p-3 text-center text-blue-600">{spec.inProgress}</td>
                    <td className="p-3 text-center font-mono">{spec.avgHours}</td>
                    <td className="p-3 text-center">
                      <span className={`badge-refined ring-1 ${spec.slaRate >= 90 ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10' : spec.slaRate >= 70 ? 'bg-amber-50 text-amber-700 ring-amber-600/10' : 'bg-rose-50 text-rose-700 ring-rose-600/10'}`}>
                        {spec.slaRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
