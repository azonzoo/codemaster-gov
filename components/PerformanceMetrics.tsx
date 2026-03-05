import React, { useMemo } from 'react';
import { RequestItem, User, Role, RequestStatus, StageTimestamp } from '../types';
import { Award, Clock, CheckCircle, Briefcase, TrendingUp, Zap, Users } from 'lucide-react';

interface PerformanceMetricsProps {
  requests: RequestItem[];
  users: User[];
}

interface SpecialistMetrics {
  userId: string;
  name: string;
  role: Role;
  avgProcessingHours: number | null;
  requestsThisWeek: number;
  requestsThisMonth: number;
  activeWorkload: number;
  completionRate: number;
  totalAssigned: number;
  totalCompleted: number;
}

/**
 * Get the duration in hours between the ASSIGNED stage and UNDER_TECHNICAL_VALIDATION stage
 * using stageTimestamps data.
 */
function getProcessingDuration(request: RequestItem): number | null {
  const assignedStage = request.stageTimestamps.find(
    (st: StageTimestamp) => st.status === RequestStatus.ASSIGNED
  );
  const techValidationStage = request.stageTimestamps.find(
    (st: StageTimestamp) => st.status === RequestStatus.UNDER_TECHNICAL_VALIDATION
  );

  if (assignedStage?.enteredAt && techValidationStage?.enteredAt) {
    const start = new Date(assignedStage.enteredAt).getTime();
    const end = new Date(techValidationStage.enteredAt).getTime();
    if (end > start) {
      return (end - start) / (1000 * 60 * 60);
    }
  }

  // Fallback: sum durationHours for ASSIGNED + UNDER_SPECIALIST_REVIEW stages
  let totalHours = 0;
  let found = false;

  const assignedDuration = request.stageTimestamps.find(
    (st: StageTimestamp) => st.status === RequestStatus.ASSIGNED && st.durationHours != null
  );
  if (assignedDuration?.durationHours) {
    totalHours += assignedDuration.durationHours;
    found = true;
  }

  const reviewDuration = request.stageTimestamps.find(
    (st: StageTimestamp) => st.status === RequestStatus.UNDER_SPECIALIST_REVIEW && st.durationHours != null
  );
  if (reviewDuration?.durationHours) {
    totalHours += reviewDuration.durationHours;
    found = true;
  }

  return found ? totalHours : null;
}

/**
 * Determines if a request had a status change during a given time window.
 */
function hadStatusChangeInWindow(request: RequestItem, windowStart: Date, windowEnd: Date): boolean {
  return request.stageTimestamps.some((st: StageTimestamp) => {
    const entered = new Date(st.enteredAt);
    return entered >= windowStart && entered <= windowEnd;
  });
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatHours(hours: number | null): string {
  if (hours === null) return '--';
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = Math.floor(hours / 24);
  const remaining = hours % 24;
  return `${days}d ${Math.round(remaining)}h`;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ requests, users }) => {
  const metrics = useMemo<SpecialistMetrics[]>(() => {
    const now = new Date();
    const weekStart = getStartOfWeek(now);
    const monthStart = getStartOfMonth(now);

    // Get specialists and technical reviewers
    const relevantUsers = users.filter(
      (u) => u.role === Role.SPECIALIST || u.role === Role.TECHNICAL_REVIEWER
    );

    const result: SpecialistMetrics[] = relevantUsers.map((user) => {
      // All requests assigned to this specialist
      const assigned = requests.filter((r) => r.assignedSpecialistId === user.id);

      if (assigned.length === 0) {
        return {
          userId: user.id,
          name: user.name,
          role: user.role,
          avgProcessingHours: null,
          requestsThisWeek: 0,
          requestsThisMonth: 0,
          activeWorkload: 0,
          completionRate: 0,
          totalAssigned: 0,
          totalCompleted: 0,
        };
      }

      // Average processing time
      const durations = assigned
        .map((r) => getProcessingDuration(r))
        .filter((d): d is number => d !== null);
      const avgProcessingHours =
        durations.length > 0
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : null;

      // Requests handled this week
      const requestsThisWeek = assigned.filter((r) =>
        hadStatusChangeInWindow(r, weekStart, now)
      ).length;

      // Requests handled this month
      const requestsThisMonth = assigned.filter((r) =>
        hadStatusChangeInWindow(r, monthStart, now)
      ).length;

      // Active workload (not completed/rejected)
      const activeWorkload = assigned.filter(
        (r) =>
          r.status !== RequestStatus.COMPLETED && r.status !== RequestStatus.REJECTED
      ).length;

      // Completion rate
      const totalCompleted = assigned.filter(
        (r) => r.status === RequestStatus.COMPLETED
      ).length;
      const completionRate =
        assigned.length > 0 ? (totalCompleted / assigned.length) * 100 : 0;

      return {
        userId: user.id,
        name: user.name,
        role: user.role,
        avgProcessingHours,
        requestsThisWeek,
        requestsThisMonth,
        activeWorkload,
        completionRate,
        totalAssigned: assigned.length,
        totalCompleted,
      };
    });

    // Filter out users with no assignments, then sort by avg processing time (fastest first)
    return result
      .filter((m) => m.totalAssigned > 0)
      .sort((a, b) => {
        if (a.avgProcessingHours === null && b.avgProcessingHours === null) return 0;
        if (a.avgProcessingHours === null) return 1;
        if (b.avgProcessingHours === null) return -1;
        return a.avgProcessingHours - b.avgProcessingHours;
      });
  }, [requests, users]);

  // Find best performer (highest completion rate with at least some assignments)
  const topPerformerId = useMemo(() => {
    if (metrics.length === 0) return null;
    const withCompletions = metrics.filter((m) => m.totalCompleted > 0);
    if (withCompletions.length === 0) return null;
    return withCompletions.reduce((best, m) =>
      m.completionRate > best.completionRate ||
      (m.completionRate === best.completionRate &&
        (m.avgProcessingHours ?? Infinity) < (best.avgProcessingHours ?? Infinity))
        ? m
        : best
    ).userId;
  }, [metrics]);

  // Find max values for relative bar widths
  const maxValues = useMemo(() => {
    if (metrics.length === 0)
      return { avgHours: 1, weekly: 1, monthly: 1, active: 1, rate: 100 };
    return {
      avgHours: Math.max(...metrics.map((m) => m.avgProcessingHours ?? 0), 1),
      weekly: Math.max(...metrics.map((m) => m.requestsThisWeek), 1),
      monthly: Math.max(...metrics.map((m) => m.requestsThisMonth), 1),
      active: Math.max(...metrics.map((m) => m.activeWorkload), 1),
      rate: 100,
    };
  }, [metrics]);

  // Empty state
  if (metrics.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60 p-10">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 mb-4">
            <Users size={36} className="text-slate-300 dark:text-slate-500" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
            No specialist performance data available
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
            Assign requests to specialists to see their metrics here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60 p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Users size={18} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                Active Specialists
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {metrics.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60 p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={18} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                Total Completed
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {metrics.reduce((sum, m) => sum + m.totalCompleted, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60 p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              <Clock size={18} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                Avg Processing
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatHours(
                  metrics.filter((m) => m.avgProcessingHours !== null).length > 0
                    ? metrics
                        .filter((m) => m.avgProcessingHours !== null)
                        .reduce((sum, m) => sum + (m.avgProcessingHours ?? 0), 0) /
                      metrics.filter((m) => m.avgProcessingHours !== null).length
                    : null
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60 p-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Briefcase size={18} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                Active Workload
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {metrics.reduce((sum, m) => sum + m.activeWorkload, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Specialist cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {metrics.map((m, index) => {
          const isTopPerformer = m.userId === topPerformerId;
          return (
            <div
              key={m.userId}
              className={`relative bg-white dark:bg-slate-800 rounded-xl shadow-premium border ${
                isTopPerformer
                  ? 'border-amber-300/60 dark:border-amber-500/40 ring-1 ring-amber-200/50 dark:ring-amber-500/20'
                  : 'border-slate-200/60 dark:border-slate-700/60'
              } p-5 transition-shadow hover:shadow-premium-md`}
            >
              {/* Top performer badge */}
              {isTopPerformer && (
                <div className="absolute -top-2.5 right-4 flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                  <Award size={11} />
                  Top Performer
                </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                    isTopPerformer
                      ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white'
                      : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                  }`}
                >
                  {m.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {m.name}
                    </h4>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                      #{index + 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {m.role} &middot; {m.totalAssigned} total assigned
                  </p>
                </div>
              </div>

              {/* Metrics grid */}
              <div className="space-y-3">
                {/* Avg Processing Time */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Zap size={11} className="text-violet-500 dark:text-violet-400" />
                      Avg Processing Time
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {formatHours(m.avgProcessingHours)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-500 transition-all duration-500"
                      style={{
                        width:
                          m.avgProcessingHours !== null
                            ? `${Math.min(100, (m.avgProcessingHours / maxValues.avgHours) * 100)}%`
                            : '0%',
                      }}
                    />
                  </div>
                </div>

                {/* Requests This Week / Month */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        This Week
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {m.requestsThisWeek}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (m.requestsThisWeek / maxValues.weekly) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        This Month
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {m.requestsThisMonth}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (m.requestsThisMonth / maxValues.monthly) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Active Workload */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Briefcase size={11} className="text-amber-500 dark:text-amber-400" />
                      Active Workload
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {m.activeWorkload}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.activeWorkload > maxValues.active * 0.8
                          ? 'bg-gradient-to-r from-rose-400 to-rose-500'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (m.activeWorkload / maxValues.active) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Completion Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <CheckCircle size={11} className="text-emerald-500 dark:text-emerald-400" />
                      Completion Rate
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {m.completionRate.toFixed(0)}%
                      <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
                        ({m.totalCompleted}/{m.totalAssigned})
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        m.completionRate >= 80
                          ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                          : m.completionRate >= 50
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : 'bg-gradient-to-r from-rose-400 to-rose-500'
                      }`}
                      style={{
                        width: `${m.completionRate}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
