import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RequestItem, Priority, RequestStatus } from '../types';
import { calculateBusinessHours, getSLADeadline } from '../lib/businessHours';
import { Clock, AlertTriangle } from 'lucide-react';

interface SLACountdownProps {
  request: RequestItem;
  priority: Priority | undefined;
  /** If true, renders a larger format suitable for detail pages */
  expanded?: boolean;
}

interface CountdownState {
  totalSeconds: number;
  isOverdue: boolean;
  ratio: number; // elapsed / slaHours — >= 1 means overdue
}

/**
 * Calculates the countdown state using business hours when possible,
 * falling back to raw clock-time offset from the SLA deadline.
 */
function computeCountdown(createdAt: string, slaHours: number): CountdownState {
  const now = new Date();
  const elapsed = calculateBusinessHours(createdAt, now);
  const ratio = slaHours > 0 ? elapsed / slaHours : 0;
  const remainingHours = slaHours - elapsed;
  const isOverdue = remainingHours <= 0;

  // Convert remaining business hours to seconds for countdown display.
  // We use the absolute value so we can show "overdue by X" for negative values.
  const totalSeconds = Math.abs(Math.round(remainingHours * 3600));

  return { totalSeconds, isOverdue, ratio };
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m';

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Returns Tailwind classes for the badge based on SLA urgency.
 *
 * Visual states:
 * - Green:     > 50% time remaining  (ratio < 0.5)
 * - Amber:     25-50% remaining      (ratio 0.5 - 0.75)
 * - Red:       < 25% remaining       (ratio 0.75 - 1.0)
 * - Dark red + pulse: Overdue        (ratio >= 1.0)
 */
function getTimerClasses(ratio: number, isOverdue: boolean): string {
  if (isOverdue) {
    return 'bg-rose-600 text-white ring-rose-500/30 dark:bg-rose-700 dark:ring-rose-500/20 animate-pulse';
  }
  if (ratio >= 0.75) {
    // < 25% remaining
    return 'bg-red-500 text-white ring-red-500/20 dark:bg-red-600 dark:ring-red-500/20';
  }
  if (ratio >= 0.5) {
    // 25-50% remaining
    return 'bg-amber-500 text-white ring-amber-500/20 dark:bg-amber-600 dark:ring-amber-500/20';
  }
  // > 50% remaining
  return 'bg-emerald-50 text-emerald-800 ring-emerald-600/10 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-500/20';
}

const TERMINAL_STATUSES = new Set<RequestStatus>([
  RequestStatus.COMPLETED,
  RequestStatus.REJECTED,
]);

export const SLACountdown: React.FC<SLACountdownProps> = React.memo(({ request, priority, expanded = false }) => {
  // Don't render for completed/rejected requests or if no SLA configured
  if (TERMINAL_STATUSES.has(request.status) || !priority?.slaHours) {
    return null;
  }

  const slaHours = priority.slaHours;

  const [state, setState] = useState<CountdownState>(() =>
    computeCountdown(request.createdAt, slaHours)
  );

  const updateCountdown = useCallback(() => {
    setState(computeCountdown(request.createdAt, slaHours));
  }, [request.createdAt, slaHours]);

  useEffect(() => {
    // Compute immediately on mount / prop change
    updateCountdown();

    // Update every second
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [updateCountdown]);

  const displayText = formatCountdown(state.totalSeconds);
  const timerClasses = getTimerClasses(state.ratio, state.isOverdue);

  const ariaLabel = state.isOverdue
    ? `SLA overdue by ${displayText}`
    : `SLA ${displayText} remaining`;

  if (expanded) {
    // Larger format for detail / header areas
    return (
      <span
        role="timer"
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ring-1 ${timerClasses}`}
      >
        {state.isOverdue ? (
          <>
            <AlertTriangle size={14} strokeWidth={2} />
            <span>Overdue by {displayText}</span>
          </>
        ) : (
          <>
            <Clock size={14} strokeWidth={2} />
            <span>{displayText} remaining</span>
          </>
        )}
      </span>
    );
  }

  // Compact badge for table rows
  return (
    <span
      role="timer"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ring-1 shrink-0 whitespace-nowrap ${timerClasses}`}
    >
      {state.isOverdue ? (
        <>
          <AlertTriangle size={10} strokeWidth={2.5} />
          <span>-{displayText}</span>
        </>
      ) : (
        <>
          <Clock size={10} strokeWidth={2.5} />
          <span>{displayText}</span>
        </>
      )}
    </span>
  );
});

SLACountdown.displayName = 'SLACountdown';
