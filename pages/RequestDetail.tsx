import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRequestStore, useUserStore, useAdminStore, useToastStore } from '../stores';
import { RequestStatus, Role, Classification, ClarificationComment } from '../types';
import { DynamicForm } from '../components/DynamicForm';
import { calculateBusinessHours, formatBusinessHours } from '../lib/businessHours';
import { ArrowLeft, CheckCircle, XCircle, UserPlus, AlertTriangle, FileCheck, Mail, Edit3, RotateCcw, CornerUpLeft, Paperclip, Download, User as UserIcon, MessageSquare, Send, Clock, RefreshCw } from 'lucide-react';

export const RequestDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const requests = useRequestStore((s) => s.requests);
  const currentUser = useUserStore((s) => s.currentUser);
  const updateRequestStatus = useRequestStore((s) => s.updateRequestStatus);
  const updateRequest = useRequestStore((s) => s.updateRequest);
  const users = useUserStore((s) => s.users);
  const priorities = useAdminStore((s) => s.priorities);
  const attributes = useAdminStore((s) => s.attributes);
  const addToast = useToastStore((s) => s.addToast);
  const request = requests.find(r => r.id === id);

  const [comment, setComment] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [oracleCode, setOracleCode] = useState('');
  const [finalDesc, setFinalDesc] = useState('');
  const [clarificationMessage, setClarificationMessage] = useState('');
  const [showReassign, setShowReassign] = useState(false);
  const [reassignId, setReassignId] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);

  useEffect(() => {
    if (request) {
      setFinalDesc(request.finalDescription || request.generatedDescription || '');
    }
  }, [request]);

  if (!request) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} className="text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Request not found</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">The request may have been deleted or the ID is invalid.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline text-sm">Back to Dashboard</button>
      </div>
    );
  }

  const priority = priorities.find(p => p.id === request.priorityId);
  const assignedSpecialist = users.find(u => u.id === request.assignedSpecialistId);

  // SLA calculation (business hours)
  const getSLAInfo = () => {
    if (!priority?.slaHours) return null;
    const elapsed = calculateBusinessHours(request.createdAt, new Date());
    const remaining = priority.slaHours - elapsed;
    const ratio = elapsed / priority.slaHours;
    return {
      elapsed: Math.round(elapsed * 10) / 10,
      remaining: Math.round(remaining * 10) / 10,
      ratio,
      breached: ratio >= 1,
      elapsedFormatted: formatBusinessHours(elapsed),
      remainingFormatted: remaining > 0 ? formatBusinessHours(remaining) : 'Overdue',
    };
  };
  const slaInfo = getSLAInfo();

  // Manager validation
  const isRequestManager = currentUser.role === Role.MANAGER && (
    request.managerId === currentUser.id ||
    request.managerEmail?.toLowerCase() === currentUser.email.toLowerCase() ||
    (!request.managerId && !request.managerEmail)
  );

  // Workflow Action Handlers
  const handleManagerApprove = () => {
    updateRequestStatus(request.id, RequestStatus.SUBMITTED_TO_POC, comment || 'Approved by Manager');
  };

  const handlePOCAssign = () => {
    if (!assigneeId) {
      addToast('Please select a specialist before assigning.', 'warning');
      return;
    }
    const specialist = users.find(u => u.id === assigneeId);
    updateRequestStatus(request.id, RequestStatus.ASSIGNED, comment || `Assigned to ${specialist?.name}`, { assignedSpecialistId: assigneeId });
  };

  const handleReassign = () => {
    if (!reassignId) {
      addToast('Please select a specialist.', 'warning');
      return;
    }
    const specialist = users.find(u => u.id === reassignId);
    updateRequest(request.id, { assignedSpecialistId: reassignId }, `Reassigned to ${specialist?.name}`);
    setShowReassign(false);
    setReassignId('');
  };

  const handleSpecialistReview = () => {
    if (!finalDesc.trim()) {
      addToast('A description is required before sending for validation.', 'warning');
      return;
    }
    updateRequestStatus(request.id, RequestStatus.UNDER_TECHNICAL_VALIDATION, comment || 'Sent for technical validation', { finalDescription: finalDesc });
  };

  const handleTechValidation = () => {
    if (!finalDesc.trim()) {
      addToast('Final description cannot be empty.', 'warning');
      return;
    }
    updateRequestStatus(request.id, RequestStatus.PENDING_ORACLE_CREATION, comment || 'Description validated', { finalDescription: finalDesc });
  };

  const handleCreateCode = () => {
    if (!oracleCode.trim()) {
      addToast('Please enter the Oracle Code before completing.', 'warning');
      return;
    }
    updateRequestStatus(request.id, RequestStatus.COMPLETED, comment || 'Oracle code created', { oracleCode: oracleCode.trim(), finalDescription: request.finalDescription || request.generatedDescription });
  };

  const handleReject = () => {
    if (!comment.trim()) {
      addToast('A comment is required for rejection.', 'warning');
      return;
    }
    if (!confirmReject) {
      setConfirmReject(true);
      return;
    }
    updateRequestStatus(request.id, RequestStatus.REJECTED, comment, { rejectionReason: comment });
    setConfirmReject(false);
  };

  const handleReturn = () => {
    if (!comment.trim()) {
      addToast('A comment is required when returning a request.', 'warning');
      return;
    }
    updateRequestStatus(request.id, RequestStatus.RETURNED_FOR_CLARIFICATION, comment);
  };

  const handleAddClarification = () => {
    if (!clarificationMessage.trim()) return;
    const newComment: ClarificationComment = {
      id: crypto.getRandomValues(new Uint32Array(1))[0].toString(36),
      userId: currentUser.id,
      userName: currentUser.name,
      message: clarificationMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    const updatedThread = [...(request.clarificationThread || []), newComment];
    updateRequest(request.id, { clarificationThread: updatedThread }, `Added clarification comment`);
    setClarificationMessage('');
  };

  const renderActions = () => {
    // Requester Actions
    if (currentUser.id === request.requesterId && (request.status === RequestStatus.REJECTED || request.status === RequestStatus.RETURNED_FOR_CLARIFICATION)) {
      return (
        <div className="flex gap-2">
          <button onClick={() => navigate(`/requests/${request.id}/edit`)} aria-label={`Modify and resubmit request ${request.title}`} className="btn-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
            <RotateCcw size={16} strokeWidth={1.75} /> Modify & Resubmit
          </button>
        </div>
      );
    }

    // Manager Actions
    if (isRequestManager && request.status === RequestStatus.PENDING_APPROVAL) {
      return (
        <div className="flex flex-wrap gap-2">
          <button onClick={handleManagerApprove} aria-label={`Approve request ${request.title}`} className="btn-success text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
            <CheckCircle size={16} strokeWidth={1.75} /> Approve
          </button>
          <button onClick={handleReturn} aria-label={`Return request ${request.title} for clarification`} className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-700 dark:hover:bg-amber-500 transition">
            <CornerUpLeft size={16} strokeWidth={1.75} /> Return
          </button>
          <button onClick={handleReject} aria-label={`Reject request ${request.title}`} className={`${confirmReject ? 'bg-rose-800' : 'bg-rose-600'} text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-rose-700 dark:hover:bg-rose-500 transition`}>
            <XCircle size={16} strokeWidth={1.75} /> {confirmReject ? 'Confirm Reject' : 'Reject'}
          </button>
        </div>
      );
    }

    // POC Actions
    if (currentUser.role === Role.POC && request.status === RequestStatus.SUBMITTED_TO_POC) {
      const specialists = users.filter(u => u.role === Role.SPECIALIST);
      return (
        <div className="flex gap-2 items-center flex-wrap">
          <select aria-label="Select specialist to assign" className="border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition dark:bg-slate-700 dark:text-slate-200" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
            <option value="">Select Specialist...</option>
            {specialists.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={handlePOCAssign} aria-label={`Assign request ${request.title} to specialist`} className="btn-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
            <UserPlus size={16} strokeWidth={1.75} /> Assign
          </button>
        </div>
      );
    }

    // POC Reassignment
    if (currentUser.role === Role.POC && request.status === RequestStatus.ASSIGNED) {
      const specialists = users.filter(u => u.role === Role.SPECIALIST);
      return (
        <div className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">Currently assigned to <strong>{assignedSpecialist?.name}</strong></p>
          {!showReassign ? (
            <button onClick={() => setShowReassign(true)} aria-label={`Reassign request ${request.title}`} className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-700 dark:hover:bg-amber-500 transition text-sm">
              <RefreshCw size={14} strokeWidth={1.75} /> Reassign
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <select aria-label="Select new specialist for reassignment" className="border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition dark:bg-slate-700 dark:text-slate-200" value={reassignId} onChange={e => setReassignId(e.target.value)}>
                <option value="">Select New Specialist...</option>
                {specialists.filter(s => s.id !== request.assignedSpecialistId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button onClick={handleReassign} aria-label="Confirm specialist reassignment" className="btn-primary text-white px-3 py-2 rounded-lg text-sm transition">Confirm</button>
              <button onClick={() => setShowReassign(false)} className="text-slate-500 dark:text-slate-400 text-sm hover:text-slate-700 dark:hover:text-slate-300 transition">Cancel</button>
            </div>
          )}
        </div>
      );
    }

    // Specialist Actions
    if (currentUser.role === Role.SPECIALIST && request.assignedSpecialistId === currentUser.id && request.status === RequestStatus.ASSIGNED) {
      return (
        <button onClick={() => updateRequestStatus(request.id, RequestStatus.UNDER_SPECIALIST_REVIEW, 'Started review')} aria-label={`Start review of request ${request.title}`} className="btn-primary text-white px-4 py-2 rounded-lg transition">
          Start Review
        </button>
      );
    }

    if (currentUser.role === Role.SPECIALIST && request.assignedSpecialistId === currentUser.id && request.status === RequestStatus.UNDER_SPECIALIST_REVIEW) {
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Draft Final Description</label>
            <textarea aria-label="Draft final description" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm font-mono focus:border-blue-500 focus:ring-blue-500/20 transition dark:bg-slate-700 dark:text-slate-200" rows={2} value={finalDesc} onChange={e => setFinalDesc(e.target.value)} placeholder="Edit the auto-generated description if needed..." />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleSpecialistReview} aria-label={`Send request ${request.title} for technical validation`} className="btn-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition">
              <CheckCircle size={14} strokeWidth={1.75} /> Send for Technical Validation
            </button>
            <button onClick={handleReturn} aria-label={`Return request ${request.title} for clarification`} className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-amber-700 dark:hover:bg-amber-500 transition">
              <CornerUpLeft size={14} strokeWidth={1.75} /> Return for Clarification
            </button>
            <button onClick={handleReject} aria-label={`Reject request ${request.title}`} className={`${confirmReject ? 'bg-rose-800' : 'bg-rose-600'} text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-rose-700 dark:hover:bg-rose-500 transition`}>
              <XCircle size={14} strokeWidth={1.75} /> {confirmReject ? 'Confirm Reject' : 'Reject'}
            </button>
          </div>
        </div>
      );
    }

    // Specialist Code Creation
    if (currentUser.role === Role.SPECIALIST && request.status === RequestStatus.PENDING_ORACLE_CREATION) {
      return (
        <div className="space-y-3">
          <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200/60 dark:border-emerald-700/60 rounded-xl p-3">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1 tracking-wide">Validated Description</p>
            <p className="font-mono text-sm text-emerald-900 dark:text-emerald-300">{request.finalDescription || request.generatedDescription}</p>
          </div>
          <div className="flex gap-2 items-center">
            <input type="text" placeholder="Enter Oracle Code..." aria-label="Enter Oracle code" className="border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 flex-1 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition dark:bg-slate-700 dark:text-slate-200" value={oracleCode} onChange={e => setOracleCode(e.target.value)} />
            <button onClick={handleCreateCode} aria-label={`Complete request ${request.title} with Oracle code`} className="btn-success text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm">
              <FileCheck size={14} strokeWidth={1.75} /> Complete
            </button>
          </div>
        </div>
      );
    }

    // Tech Reviewer Actions
    if (currentUser.role === Role.TECHNICAL_REVIEWER && request.status === RequestStatus.UNDER_TECHNICAL_VALIDATION) {
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1"><Edit3 size={12} /> Final Description (Editable)</label>
            <textarea aria-label="Final description for validation" className="w-full border border-blue-300 dark:border-blue-600 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-700 transition dark:bg-slate-700 dark:text-slate-200" rows={3} value={finalDesc} onChange={e => setFinalDesc(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleTechValidation} aria-label={`Validate description for request ${request.title}`} className="btn-success text-white px-4 py-2 rounded-lg flex items-center gap-2 transition text-sm">
              <CheckCircle size={14} strokeWidth={1.75} /> Validate Description
            </button>
            <button onClick={() => {
              if (!comment.trim()) { addToast('Add a comment explaining what needs correction.', 'warning'); return; }
              updateRequestStatus(request.id, RequestStatus.UNDER_SPECIALIST_REVIEW, comment);
            }} aria-label={`Return request ${request.title} to specialist`} className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-700 dark:hover:bg-amber-500 transition text-sm">
              <CornerUpLeft size={14} strokeWidth={1.75} /> Return to Specialist
            </button>
          </div>
        </div>
      );
    }

    return <p className="text-sm text-slate-500 dark:text-slate-400 italic">No actions available for your role at this stage.</p>;
  };

  const showWorkflowActions = request.status !== RequestStatus.COMPLETED;

  const stageTimestamps = request.stageTimestamps || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/')} aria-label="Back to dashboard" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"><ArrowLeft size={20} strokeWidth={1.75} className="text-slate-700 dark:text-slate-300" /></button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{request.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{request.id} &bull; {request.classification} &bull; {request.requestType || 'New'}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {slaInfo && request.status !== RequestStatus.COMPLETED && request.status !== RequestStatus.REJECTED && (
            <span role="status" aria-label={slaInfo.breached ? `SLA breached, ${Math.abs(slaInfo.remaining)} hours overdue` : `SLA ${slaInfo.remaining} hours remaining`} className={`badge-refined ring-1 font-bold ${slaInfo.breached ? 'bg-rose-500 text-white ring-rose-500/20' : slaInfo.ratio >= 0.75 ? 'bg-amber-500 text-white ring-amber-500/20' : 'bg-emerald-50 text-emerald-800 ring-emerald-600/10 dark:bg-emerald-950 dark:text-emerald-400'}`}>
              {slaInfo.breached ? `SLA Breached (${Math.abs(slaInfo.remaining)}h over)` : `${slaInfo.remaining}h remaining`}
            </span>
          )}
          <span role="status" aria-label={`Status: ${request.status}`} className={`badge-refined ring-1 font-bold ${
            request.status === RequestStatus.REJECTED ? 'bg-rose-50 text-rose-800 ring-rose-600/10 dark:bg-rose-950 dark:text-rose-400' :
            request.status === RequestStatus.RETURNED_FOR_CLARIFICATION ? 'bg-amber-50 text-amber-800 ring-amber-600/10 dark:bg-amber-950 dark:text-amber-400' :
            request.status === RequestStatus.COMPLETED ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/10 dark:bg-emerald-950 dark:text-emerald-400' :
            'bg-blue-50 text-blue-800 ring-blue-600/10 dark:bg-blue-950 dark:text-blue-400'
          }`}>
            {request.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Technical Attributes */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">Technical Attributes</h3>
            <DynamicForm
              attributes={attributes.filter(a => a.active && (a.visibleForClassification ? a.visibleForClassification.includes(request.classification) : true))}
              values={request.attributes}
              onChange={() => {}}
              readOnly={true}
            />
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wide">Auto-Generated Description</span>
              <div className="text-sm font-mono text-slate-600 dark:text-slate-400 mt-1">{request.generatedDescription || '-'}</div>
            </div>
            {request.finalDescription && request.status !== RequestStatus.UNDER_TECHNICAL_VALIDATION && (
              <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950 rounded-xl border border-emerald-200/60 dark:border-emerald-700/60">
                <span className="text-xs uppercase font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 tracking-wide"><CheckCircle size={12} /> Final Description</span>
                <div className="text-base font-mono text-emerald-900 dark:text-emerald-300 mt-1">{request.finalDescription}</div>
              </div>
            )}
            {request.oracleCode && (
              <div className="mt-4 p-4 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl text-white shadow-lg">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wide">Oracle Code</span>
                <div className="text-2xl font-bold mt-1 tracking-wider">{request.oracleCode}</div>
              </div>
            )}
          </div>

          {/* Clarification Thread */}
          {(request.status === RequestStatus.RETURNED_FOR_CLARIFICATION || (request.clarificationThread && request.clarificationThread.length > 0)) && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-premium border border-amber-200/60 dark:border-amber-700/60" aria-label="Clarification thread" role="log">
              <h3 className="text-sm uppercase font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2 tracking-wide"><MessageSquare size={16} strokeWidth={1.75} /> Clarification Thread</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {(request.clarificationThread || []).map(c => (
                  <div key={c.id} className={`p-3 rounded-xl text-sm ${c.userId === request.requesterId ? 'bg-blue-50 dark:bg-blue-950 border border-blue-100/60 dark:border-blue-700/60 ml-4' : 'bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/60 mr-4'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{c.userName}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(c.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{c.message}</p>
                  </div>
                ))}
                {(!request.clarificationThread || request.clarificationThread.length === 0) && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">No messages yet. Use the form below to add a clarification.</p>
                )}
              </div>
              {request.status === RequestStatus.RETURNED_FOR_CLARIFICATION && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Enter clarification message"
                    className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition dark:bg-slate-700 dark:text-slate-200"
                    placeholder="Type your message..."
                    value={clarificationMessage}
                    onChange={e => setClarificationMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddClarification(); }}
                  />
                  <button onClick={handleAddClarification} aria-label="Send clarification" className="bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-700 dark:hover:bg-amber-500 transition text-sm">
                    <Send size={14} strokeWidth={1.75} /> Send
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Workflow Actions */}
          {showWorkflowActions && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-premium border border-blue-100/60 dark:border-blue-700/60 ring-1 ring-blue-50 dark:ring-blue-900/30">
              <h3 className="text-sm uppercase font-bold text-blue-800 dark:text-blue-400 mb-4 tracking-wide">Workflow Actions</h3>
              <div className="space-y-4">
                {!(currentUser.id === request.requesterId && (request.status === RequestStatus.REJECTED || request.status === RequestStatus.RETURNED_FOR_CLARIFICATION)) && (
                  <textarea aria-label="Workflow action comment" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:ring-blue-500/20 transition dark:bg-slate-700 dark:text-slate-200" placeholder="Add comments (required for rejection/return)..." value={comment} onChange={e => setComment(e.target.value)} rows={2} />
                )}
                {renderActions()}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Request Details */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Request Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Priority</dt>
                <dd className={`font-medium badge-refined ring-1 ${priority?.name.toLowerCase().includes('critical') ? 'bg-rose-50 text-rose-800 ring-rose-600/10 dark:bg-rose-950 dark:text-rose-400' : priority?.name.toLowerCase().includes('urgent') ? 'bg-amber-50 text-amber-800 ring-amber-600/10 dark:bg-amber-950 dark:text-amber-400' : 'bg-blue-50 text-blue-800 ring-blue-600/10 dark:bg-blue-950 dark:text-blue-400'}`}>{priority?.name ?? 'Unknown'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Classification</dt>
                <dd className="font-medium dark:text-slate-200">{request.classification}</dd>
              </div>
              {request.materialSubType && <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Sub-Type</dt><dd className="font-medium dark:text-slate-200">{request.materialSubType}</dd></div>}
              {request.serviceSubType && <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Sub-Type</dt><dd className="font-medium dark:text-slate-200">{request.serviceSubType}</dd></div>}
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Project</dt>
                <dd className="font-medium dark:text-slate-200">{request.project}</dd>
              </div>
              {request.unspscCode && <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">UNSPSC</dt><dd className="font-medium dark:text-slate-200">{request.unspscCode}</dd></div>}
              {request.uom && <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">UOM</dt><dd className="font-medium dark:text-slate-200">{request.uom}</dd></div>}
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Requester</dt>
                <dd className="font-medium dark:text-slate-200">{users.find(u => u.id === request.requesterId)?.name ?? 'Unknown'}</dd>
              </div>
              {assignedSpecialist && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <dt className="text-slate-500 dark:text-slate-400 mb-1">Assigned Specialist</dt>
                  <dd className="font-medium flex items-center gap-2 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 p-2 rounded-lg"><UserIcon size={16} strokeWidth={1.75} />{assignedSpecialist.name}</dd>
                </div>
              )}
              <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Created</dt><dd className="font-medium dark:text-slate-200">{new Date(request.createdAt).toLocaleString()}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500 dark:text-slate-400">Updated</dt><dd className="font-medium dark:text-slate-200">{new Date(request.updatedAt).toLocaleString()}</dd></div>
              {request.justification && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <dt className="text-slate-500 dark:text-slate-400 mb-1">Justification</dt>
                  <dd className="italic text-slate-600 dark:text-slate-400 text-xs bg-amber-50 dark:bg-amber-950 p-2 rounded-lg border border-amber-200/60 dark:border-amber-700/60">{request.justification}</dd>
                </div>
              )}
              {request.managerName && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <dt className="text-slate-500 dark:text-slate-400 mb-1">Approving Manager</dt>
                  <dd className="font-medium dark:text-slate-200">
                    {request.managerName}
                    <a href={`mailto:${request.managerEmail}`} className="text-blue-600 dark:text-blue-400 flex items-center gap-1 text-xs hover:underline mt-0.5"><Mail size={10} /> {request.managerEmail}</a>
                  </dd>
                </div>
              )}
              {request.rejectionReason && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <dt className="text-slate-500 dark:text-slate-400 mb-1">Rejection Reason</dt>
                  <dd className="text-rose-700 dark:text-rose-400 text-xs bg-rose-50 dark:bg-rose-950 p-2 rounded-lg border border-rose-200/60 dark:border-rose-700/60">{request.rejectionReason}</dd>
                </div>
              )}
              {request.attachments && request.attachments.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <dt className="text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1"><Paperclip size={12} /> Attachments</dt>
                  <dd className="space-y-1.5">
                    {request.attachments.map(att => (
                      <a key={att.id} href={att.url} download={att.name} aria-label={`Download attachment ${att.name}`} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-600/50 transition group">
                        <span className="text-xs font-medium truncate max-w-[150px] dark:text-slate-200">{att.name}</span>
                        <Download size={12} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
                      </a>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Stage Timestamps */}
          {stageTimestamps.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><Clock size={16} strokeWidth={1.75} /> Stage Durations</h3>
              <div className="space-y-2 text-xs">
                {stageTimestamps.map((st, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{st.status}</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{st.durationHours != null ? `${st.durationHours}h` : 'Active'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Log */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-premium border border-slate-200/60 dark:border-slate-700/60" aria-label="Request audit trail">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Audit Log</h3>
            <div className="space-y-4 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-slate-300 before:to-slate-100 dark:before:from-slate-600 dark:before:to-slate-800" role="list" aria-label="Audit trail entries">
              {request.history.map((log, idx) => (
                <div key={idx} className="relative pl-6" role="listitem" aria-label={`${log.action} by ${log.user} on ${new Date(log.timestamp).toLocaleString()}`}>
                  <div className={`timeline-dot absolute left-0 top-1.5 ${
                    log.action.includes('Completed') || log.action.includes('approved') ? 'bg-emerald-500' :
                    log.action.includes('Reject') || log.action.includes('rejected') ? 'bg-rose-500' :
                    log.action.includes('Return') || log.action.includes('returned') ? 'bg-amber-500' :
                    log.action.includes('Created') ? 'bg-blue-500' :
                    'bg-slate-300 dark:bg-slate-600'
                  }`}></div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(log.timestamp).toLocaleString()}</div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{log.action}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">by {log.user}</div>
                  {log.details && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">&ldquo;{log.details}&rdquo;</div>}
                  {log.changedFields && log.changedFields.length > 0 && (
                    <div className="mt-1 text-xs space-y-0.5">
                      {log.changedFields.map((cf, ci) => (
                        <div key={ci} className="text-slate-500 dark:text-slate-400"><span className="font-medium">{cf.field}</span>: <span className="line-through text-rose-400">{cf.oldValue || '(empty)'}</span> → <span className="text-emerald-600 dark:text-emerald-400">{cf.newValue || '(empty)'}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
