import React, { useMemo } from 'react';
import { StageTimestamp, RequestStatus } from '../types';
import { Clock, CheckCircle, AlertTriangle, XCircle, Loader } from 'lucide-react';

interface RequestTimelineProps {
  stageTimestamps: StageTimestamp[];
  currentStatus: RequestStatus;
}

/** Statuses that are considered negative / interrupted flow */
const NEGATIVE_STATUSES = new Set<RequestStatus>([
  RequestStatus.REJECTED,
  RequestStatus.RETURNED_FOR_CLARIFICATION,
]);

/** Canonical ordered pipeline for "normal" flow */
const STATUS_ORDER: RequestStatus[] = [
  RequestStatus.DRAFT,
  RequestStatus.PENDING_APPROVAL,
  RequestStatus.SUBMITTED_TO_POC,
  RequestStatus.ASSIGNED,
  RequestStatus.UNDER_SPECIALIST_REVIEW,
  RequestStatus.UNDER_TECHNICAL_VALIDATION,
  RequestStatus.PENDING_ORACLE_CREATION,
  RequestStatus.COMPLETED,
];

type SegmentKind = 'completed' | 'current' | 'future' | 'negative';

interface TimelineSegment {
  status: RequestStatus;
  kind: SegmentKind;
  durationHours: number | null;
  enteredAt: string | null;
  exitedAt: string | null;
}

/**
 * Format a duration in hours into a human-friendly string.
 * < 1 h  -> "< 1h"
 * 1-48 h -> "Xh"
 * > 48 h -> "Xd Yh"
 */
function formatDuration(hours: number | null): string {
  if (hours == null) return 'Active';
  if (hours < 0.1) return '< 1m';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours <= 48) return `${Math.round(hours * 10) / 10}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

/**
 * Short label for a status to fit in smaller viewports.
 */
function shortLabel(status: RequestStatus): string {
  const map: Record<string, string> = {
    [RequestStatus.DRAFT]: 'Draft',
    [RequestStatus.PENDING_APPROVAL]: 'Approval',
    [RequestStatus.SUBMITTED_TO_POC]: 'POC',
    [RequestStatus.ASSIGNED]: 'Assigned',
    [RequestStatus.UNDER_SPECIALIST_REVIEW]: 'Specialist',
    [RequestStatus.RETURNED_FOR_CLARIFICATION]: 'Returned',
    [RequestStatus.REJECTED]: 'Rejected',
    [RequestStatus.UNDER_TECHNICAL_VALIDATION]: 'Validation',
    [RequestStatus.PENDING_ORACLE_CREATION]: 'Oracle',
    [RequestStatus.COMPLETED]: 'Completed',
  };
  return map[status] ?? status;
}

/** Color classes per segment kind. */
const kindColors: Record<SegmentKind, { bg: string; text: string; border: string; dot: string; label: string }> = {
  completed: {
    bg: 'bg-gradient-to-r from-emerald-500 to-emerald-400 dark:from-emerald-600 dark:to-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-700',
    dot: 'bg-emerald-500',
    label: 'text-emerald-700 dark:text-emerald-400',
  },
  current: {
    bg: 'bg-gradient-to-r from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-300 dark:border-blue-700',
    dot: 'bg-blue-500 animate-timeline-pulse',
    label: 'text-blue-700 dark:text-blue-400',
  },
  future: {
    bg: 'bg-slate-200 dark:bg-slate-700',
    text: 'text-slate-400 dark:text-slate-500',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-300 dark:bg-slate-600',
    label: 'text-slate-400 dark:text-slate-500',
  },
  negative: {
    bg: 'bg-gradient-to-r from-rose-500 to-rose-400 dark:from-rose-600 dark:to-rose-500',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-300 dark:border-rose-700',
    dot: 'bg-rose-500',
    label: 'text-rose-700 dark:text-rose-400',
  },
};

/** Icon per segment kind (small, for the vertical timeline) */
function KindIcon({ kind, size = 14 }: { kind: SegmentKind; size?: number }) {
  switch (kind) {
    case 'completed':
      return <CheckCircle size={size} className="text-emerald-500 dark:text-emerald-400" strokeWidth={2} />;
    case 'current':
      return <Loader size={size} className="text-blue-500 dark:text-blue-400 animate-spin" style={{ animationDuration: '3s' }} strokeWidth={2} />;
    case 'future':
      return <Clock size={size} className="text-slate-400 dark:text-slate-500" strokeWidth={2} />;
    case 'negative':
      return <XCircle size={size} className="text-rose-500 dark:text-rose-400" strokeWidth={2} />;
  }
}

export const RequestTimeline: React.FC<RequestTimelineProps> = ({ stageTimestamps, currentStatus }) => {
  const segments: TimelineSegment[] = useMemo(() => {
    if (!stageTimestamps || stageTimestamps.length === 0) {
      return [];
    }

    // Build a lookup from status -> timestamp entry
    const stampMap = new Map<RequestStatus, StageTimestamp>();
    for (const st of stageTimestamps) {
      stampMap.set(st.status, st);
    }

    // Determine which statuses are in the "completed past" by looking at
    // the canonical order up to the current status
    const currentIdx = STATUS_ORDER.indexOf(currentStatus);

    const result: TimelineSegment[] = [];

    // First, add all stages that actually happened (from stageTimestamps) in order
    // Then fill in any future stages from the canonical pipeline

    // Add stages from actual timestamps (preserves non-canonical stages like RETURNED)
    const addedStatuses = new Set<RequestStatus>();

    for (const st of stageTimestamps) {
      const isNegative = NEGATIVE_STATUSES.has(st.status);
      const isCurrent = st.status === currentStatus;
      const isCompleted = !isCurrent && st.exitedAt != null;

      let kind: SegmentKind;
      if (isNegative) kind = 'negative';
      else if (isCurrent) kind = 'current';
      else if (isCompleted) kind = 'completed';
      else kind = 'future';

      result.push({
        status: st.status,
        kind,
        durationHours: st.durationHours ?? null,
        enteredAt: st.enteredAt,
        exitedAt: st.exitedAt ?? null,
      });
      addedStatuses.add(st.status);
    }

    // If the request is not in a terminal state, add future stages from canonical pipeline
    const terminalStatuses = new Set<RequestStatus>([
      RequestStatus.COMPLETED,
      RequestStatus.REJECTED,
    ]);

    if (!terminalStatuses.has(currentStatus)) {
      for (const status of STATUS_ORDER) {
        if (!addedStatuses.has(status)) {
          // Only add stages that come AFTER the current one in the pipeline
          const statusIdx = STATUS_ORDER.indexOf(status);
          if (statusIdx > currentIdx) {
            result.push({
              status,
              kind: 'future',
              durationHours: null,
              enteredAt: null,
              exitedAt: null,
            });
          }
        }
      }
    }

    return result;
  }, [stageTimestamps, currentStatus]);

  if (segments.length === 0) {
    return null;
  }

  // Calculate proportional widths for horizontal bar
  const segmentsWithDuration = segments.filter(s => s.durationHours != null && s.durationHours > 0);
  const totalDuration = segmentsWithDuration.reduce((sum, s) => sum + (s.durationHours ?? 0), 0);
  const hasDurationData = totalDuration > 0;

  // If we have duration data, each segment's width is proportional to its duration
  // with a minimum width so labels remain visible
  const MIN_SEGMENT_PERCENT = 8;

  function getSegmentWidth(segment: TimelineSegment): number {
    if (!hasDurationData) {
      // Equal widths when no duration data
      return 100 / segments.length;
    }
    if (segment.durationHours == null || segment.durationHours <= 0) {
      // Future / current with no duration yet: give a fixed small width
      return MIN_SEGMENT_PERCENT;
    }
    const raw = (segment.durationHours / totalDuration) * 100;
    return Math.max(raw, MIN_SEGMENT_PERCENT);
  }

  // Normalize widths so they sum to 100
  const rawWidths = segments.map(getSegmentWidth);
  const rawTotal = rawWidths.reduce((a, b) => a + b, 0);
  const normalizedWidths = rawWidths.map(w => (w / rawTotal) * 100);

  return (
    <div
      className="bg-white dark:bg-slate-800 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60 p-5 animate-fadeIn"
      aria-label="Request timeline"
      role="region"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg icon-container-blue flex items-center justify-center">
          <Clock size={14} strokeWidth={2} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
          Request Timeline
        </h3>
      </div>

      {/* ===== HORIZONTAL TIMELINE (md and above) ===== */}
      <div className="hidden md:block">
        {/* Duration labels row */}
        <div className="flex mb-1" aria-hidden="true">
          {segments.map((seg, i) => (
            <div
              key={`dur-${i}`}
              className="text-center px-0.5"
              style={{ width: `${normalizedWidths[i]}%` }}
            >
              <span className={`text-[10px] font-mono font-medium ${kindColors[seg.kind].text}`}>
                {seg.kind === 'future' ? '' : formatDuration(seg.durationHours)}
              </span>
            </div>
          ))}
        </div>

        {/* Bar row */}
        <div className="flex h-3 rounded-full overflow-hidden shadow-inner bg-slate-100 dark:bg-slate-900/50" role="progressbar">
          {segments.map((seg, i) => {
            const isFirst = i === 0;
            const isLast = i === segments.length - 1;
            return (
              <div
                key={`bar-${i}`}
                className={`
                  h-full transition-all duration-500 relative
                  ${kindColors[seg.kind].bg}
                  ${isFirst ? 'rounded-l-full' : ''}
                  ${isLast ? 'rounded-r-full' : ''}
                  ${seg.kind === 'current' ? 'animate-timeline-pulse' : ''}
                `}
                style={{ width: `${normalizedWidths[i]}%` }}
                title={`${seg.status}: ${formatDuration(seg.durationHours)}`}
              >
                {/* Subtle right border between segments */}
                {!isLast && (
                  <div className="absolute right-0 top-0 bottom-0 w-px bg-white/30 dark:bg-slate-900/30" />
                )}
              </div>
            );
          })}
        </div>

        {/* Stage name labels row */}
        <div className="flex mt-2" aria-hidden="true">
          {segments.map((seg, i) => (
            <div
              key={`lbl-${i}`}
              className="text-center px-0.5 min-w-0"
              style={{ width: `${normalizedWidths[i]}%` }}
            >
              <span
                className={`text-[10px] font-medium leading-tight block truncate ${kindColors[seg.kind].label}`}
                title={seg.status}
              >
                {shortLabel(seg.status)}
              </span>
            </div>
          ))}
        </div>

        {/* Dot indicators row */}
        <div className="flex mt-1" aria-hidden="true">
          {segments.map((seg, i) => (
            <div
              key={`dot-${i}`}
              className="flex justify-center"
              style={{ width: `${normalizedWidths[i]}%` }}
            >
              <div
                className={`w-2 h-2 rounded-full ${kindColors[seg.kind].dot}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ===== VERTICAL TIMELINE (mobile, below md) ===== */}
      <div className="md:hidden">
        <div className="relative pl-8">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-1 bottom-1 w-0.5 bg-gradient-to-b from-slate-300 to-slate-100 dark:from-slate-600 dark:to-slate-800" />

          <div className="space-y-4">
            {segments.map((seg, i) => (
              <div key={`v-${i}`} className="relative flex items-start gap-3">
                {/* Dot / icon on the line */}
                <div className="absolute -left-8 top-0.5 flex items-center justify-center w-6 h-6">
                  <div
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center border-2
                      ${seg.kind === 'completed' ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-950 dark:border-emerald-500' : ''}
                      ${seg.kind === 'current' ? 'bg-blue-50 border-blue-500 dark:bg-blue-950 dark:border-blue-500 animate-timeline-pulse' : ''}
                      ${seg.kind === 'future' ? 'bg-slate-50 border-slate-300 dark:bg-slate-800 dark:border-slate-600' : ''}
                      ${seg.kind === 'negative' ? 'bg-rose-50 border-rose-500 dark:bg-rose-950 dark:border-rose-500' : ''}
                    `}
                  >
                    <KindIcon kind={seg.kind} size={12} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold truncate ${kindColors[seg.kind].label}`}>
                      {seg.status}
                    </span>
                    {seg.kind !== 'future' && (
                      <span className={`text-[10px] font-mono font-medium whitespace-nowrap ${kindColors[seg.kind].text}`}>
                        {formatDuration(seg.durationHours)}
                      </span>
                    )}
                  </div>
                  {seg.enteredAt && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(seg.enteredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary footer */}
      {hasDurationData && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">
            Total elapsed
          </span>
          <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
            {formatDuration(totalDuration)}
          </span>
        </div>
      )}
    </div>
  );
};
