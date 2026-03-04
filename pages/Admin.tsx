import React, { useState, useMemo } from 'react';
import { useStore, useToast } from '../store';
import { AttributeDefinition, AttributeType, Priority, Role } from '../types';
import { Trash2, Plus, Edit, Link, Copy, Users, Mail, Shield, Clock, CheckCircle, XCircle, Send } from 'lucide-react';

export const Admin: React.FC = () => {
  const {
    attributes,
    priorities,
    users,
    inviteTokens,
    updateAttribute,
    addAttribute,
    deleteAttribute,
    updatePriority,
    addPriority,
    deletePriority,
    createInviteToken,
    updateUserRole,
  } = useStore();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'attributes' | 'priorities' | 'users' | 'invites'>('attributes');

  const [editingAttr, setEditingAttr] = useState<Partial<AttributeDefinition> | null>(null);
  const [editingPrio, setEditingPrio] = useState<Partial<Priority> | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>(Role.REQUESTER);

  // Confirm deletion state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // --- Attributes Handlers ---
  const saveAttribute = () => {
    if (!editingAttr?.name?.trim()) {
      addToast('Attribute name is required.', 'warning');
      return;
    }

    if (editingAttr.id && attributes.some(a => a.id === editingAttr.id)) {
      updateAttribute(editingAttr as AttributeDefinition);
    } else {
      const newAttr: AttributeDefinition = {
        id: `attr-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,
        name: editingAttr.name.trim(),
        active: true,
        type: editingAttr.type || AttributeType.TEXT,
        mandatory: editingAttr.mandatory || false,
        includeInAutoDescription: editingAttr.includeInAutoDescription || false,
        descriptionOrder: editingAttr.descriptionOrder || 99,
        options: editingAttr.options,
        units: editingAttr.units,
        dimensionFields: editingAttr.dimensionFields,
        visibleForClassification: editingAttr.visibleForClassification,
      };
      addAttribute(newAttr);
    }
    setEditingAttr(null);
  };

  const confirmDelete = (id: string, type: 'attribute' | 'priority') => {
    if (confirmDeleteId === id) {
      if (type === 'attribute') deleteAttribute(id);
      else deletePriority(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => {
        setConfirmDeleteId(prev => prev === id ? null : prev);
      }, 3000);
    }
  };

  // --- Priorities Handlers ---
  const savePriority = () => {
    if (!editingPrio?.name?.trim()) {
      addToast('Priority name is required.', 'warning');
      return;
    }

    if (editingPrio.id && priorities.some(p => p.id === editingPrio.id)) {
      updatePriority(editingPrio as Priority);
    } else {
      const newPrio: Priority = {
        id: `prio-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`,
        name: editingPrio.name.trim(),
        active: true,
        requiresApproval: editingPrio.requiresApproval || false,
        slaHours: editingPrio.slaHours || 24,
        displayOrder: editingPrio.displayOrder || 99,
        description: editingPrio.description || ''
      };
      addPriority(newPrio);
    }
    setEditingPrio(null);
  };

  // --- Invite Handlers ---
  const handleCreateInvite = () => {
    if (!inviteEmail.trim()) {
      addToast('Please enter an email address.', 'warning');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      addToast('Please enter a valid email address.', 'warning');
      return;
    }
    const token = createInviteToken(inviteEmail.trim(), inviteRole);
    setInviteEmail('');
    const link = `${window.location.origin}/register?token=${token.token}`;
    navigator.clipboard.writeText(link).then(() => {
      addToast('Invite link copied to clipboard!', 'success');
    }).catch(() => {});
  };

  const copyInviteLink = async (tokenStr: string) => {
    const link = `${window.location.origin}/register?token=${tokenStr}`;
    try {
      await navigator.clipboard.writeText(link);
      addToast('Invite link copied to clipboard.', 'success');
    } catch {
      addToast('Failed to copy link.', 'error');
    }
  };

  const sortedInvites = useMemo(() =>
    [...inviteTokens].sort((a, b) => {
      if (a.used !== b.used) return a.used ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }),
  [inviteTokens]);

  const inviteStats = useMemo(() => ({
    total: inviteTokens.length,
    pending: inviteTokens.filter(t => !t.used && new Date(t.expiresAt) > new Date()).length,
    used: inviteTokens.filter(t => t.used).length,
    expired: inviteTokens.filter(t => !t.used && new Date(t.expiresAt) <= new Date()).length,
  }), [inviteTokens]);

  const tabs = [
    { key: 'attributes' as const, label: 'Item Attributes' },
    { key: 'priorities' as const, label: 'Priorities' },
    { key: 'users' as const, label: 'User Management' },
    { key: 'invites' as const, label: 'Invitations' },
  ];

  const roleOptions = Object.values(Role);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Admin Configuration</h2>

      <div className="flex gap-1 border-b border-slate-200/60 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`py-2.5 px-4 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- ATTRIBUTES TAB --- */}
      {activeTab === 'attributes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setEditingAttr({})}
              className="btn-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Plus size={16} strokeWidth={1.75} /> Add Attribute
            </button>
          </div>

          {editingAttr && (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60 space-y-4 shadow-premium">
              <h4 className="font-bold text-slate-700">{editingAttr.id ? 'Edit' : 'New'} Attribute</h4>
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Name"
                  className="p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-blue-500/20 transition"
                  value={editingAttr.name || ''}
                  onChange={e => setEditingAttr({ ...editingAttr, name: e.target.value })}
                />
                <select
                  className="p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-blue-500/20 transition"
                  value={editingAttr.type || AttributeType.TEXT}
                  onChange={e => setEditingAttr({ ...editingAttr, type: e.target.value as AttributeType })}
                >
                  {Object.values(AttributeType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500/20" checked={editingAttr.mandatory || false} onChange={e => setEditingAttr({ ...editingAttr, mandatory: e.target.checked })} />
                  Mandatory
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500/20" checked={editingAttr.includeInAutoDescription || false} onChange={e => setEditingAttr({ ...editingAttr, includeInAutoDescription: e.target.checked })} />
                  Use in Auto Description
                </label>
                <input
                  type="number"
                  placeholder="Order"
                  className="p-2.5 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-blue-500/20 transition"
                  value={editingAttr.descriptionOrder || 0}
                  onChange={e => setEditingAttr({ ...editingAttr, descriptionOrder: parseInt(e.target.value) || 0 })}
                />
                {(editingAttr.type === AttributeType.DROPDOWN || editingAttr.type === AttributeType.NUMERIC_UNIT || editingAttr.type === AttributeType.MULTI_SELECT) && (
                  <input
                    placeholder="Options/Units (comma separated)"
                    className="p-2.5 border border-slate-300 rounded-lg col-span-2 focus:border-blue-500 focus:ring-blue-500/20 transition"
                    value={(editingAttr.type === AttributeType.NUMERIC_UNIT ? editingAttr.units : editingAttr.options)?.join(', ') || ''}
                    onChange={e => {
                      const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      if (editingAttr.type === AttributeType.NUMERIC_UNIT) setEditingAttr({ ...editingAttr, units: val });
                      else setEditingAttr({ ...editingAttr, options: val });
                    }}
                  />
                )}
                {editingAttr.type === AttributeType.DIMENSION_BLOCK && (
                  <input
                    placeholder="Fields (e.g. Length,Width,Depth)"
                    className="p-2.5 border border-slate-300 rounded-lg col-span-2 focus:border-blue-500 focus:ring-blue-500/20 transition"
                    value={editingAttr.dimensionFields?.join(', ') || ''}
                    onChange={e => {
                      const val = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      setEditingAttr({ ...editingAttr, dimensionFields: val });
                    }}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={saveAttribute} className="btn-success text-white px-4 py-1.5 rounded-lg transition">Save</button>
                <button onClick={() => setEditingAttr(null)} className="text-slate-600 hover:text-slate-800 transition">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-premium border border-slate-200/60 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="p-3 text-xs uppercase tracking-wider">Order</th>
                  <th className="p-3 text-xs uppercase tracking-wider">Name</th>
                  <th className="p-3 text-xs uppercase tracking-wider">Type</th>
                  <th className="p-3 text-xs uppercase tracking-wider">Mandatory</th>
                  <th className="p-3 text-xs uppercase tracking-wider">In Desc.</th>
                  <th className="p-3 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...attributes].sort((a, b) => a.descriptionOrder - b.descriptionOrder).map(attr => (
                  <tr key={attr.id} className="table-row-hover">
                    <td className="p-3 font-mono text-slate-600">{attr.descriptionOrder}</td>
                    <td className="p-3 font-medium text-slate-900">{attr.name}</td>
                    <td className="p-3 text-slate-600">{attr.type}</td>
                    <td className="p-3 text-center">{attr.mandatory ? <span className="text-emerald-600 font-medium">Yes</span> : <span className="text-slate-400">-</span>}</td>
                    <td className="p-3 text-center">{attr.includeInAutoDescription ? <span className="text-emerald-600 font-medium">Yes</span> : <span className="text-slate-400">-</span>}</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => setEditingAttr(attr)} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition"><Edit size={16} strokeWidth={1.75} /></button>
                      <button
                        onClick={() => confirmDelete(attr.id, 'attribute')}
                        className={`p-1 rounded transition ${confirmDeleteId === attr.id ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'}`}
                        title={confirmDeleteId === attr.id ? 'Click again to confirm' : 'Delete'}
                      >
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- PRIORITIES TAB --- */}
      {activeTab === 'priorities' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setEditingPrio({})}
              className="btn-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <Plus size={16} strokeWidth={1.75} /> Add Priority
            </button>
          </div>

          {editingPrio && (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60 space-y-4 shadow-premium">
              <h4 className="font-bold text-slate-700">{editingPrio.id ? 'Edit' : 'New'} Priority</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority Name</label>
                  <input
                    className="p-2.5 border border-slate-300 rounded-lg w-full mt-1 focus:border-blue-500 focus:ring-blue-500/20 transition"
                    value={editingPrio.name || ''}
                    onChange={e => setEditingPrio({ ...editingPrio, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">SLA (Hours)</label>
                  <input
                    type="number"
                    className="p-2.5 border border-slate-300 rounded-lg w-full mt-1 focus:border-blue-500 focus:ring-blue-500/20 transition"
                    value={editingPrio.slaHours || 24}
                    onChange={e => setEditingPrio({ ...editingPrio, slaHours: parseInt(e.target.value) || 24 })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Guidance Text (User Facing)</label>
                  <textarea
                    className="p-2.5 border border-slate-300 rounded-lg w-full mt-1 focus:border-blue-500 focus:ring-blue-500/20 transition"
                    rows={2}
                    value={editingPrio.description || ''}
                    onChange={e => setEditingPrio({ ...editingPrio, description: e.target.value })}
                    placeholder="Explain timing and rules for this priority..."
                  />
                </div>
                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500/20" checked={editingPrio.requiresApproval || false} onChange={e => setEditingPrio({ ...editingPrio, requiresApproval: e.target.checked })} />
                    Requires Manager Approval
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    Display Order:
                    <input
                      type="number"
                      className="p-1.5 border border-slate-300 rounded-lg w-16 focus:border-blue-500 focus:ring-blue-500/20 transition"
                      value={editingPrio.displayOrder || 0}
                      onChange={e => setEditingPrio({ ...editingPrio, displayOrder: parseInt(e.target.value) || 0 })}
                    />
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={savePriority} className="btn-success text-white px-4 py-1.5 rounded-lg transition">Save</button>
                <button onClick={() => setEditingPrio(null)} className="text-slate-600 hover:text-slate-800 transition">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-premium border border-slate-200/60 overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="p-3 w-16 text-xs uppercase tracking-wider">Order</th>
                  <th className="p-3 w-24 text-xs uppercase tracking-wider">Name</th>
                  <th className="p-3 text-xs uppercase tracking-wider">Guidance Text</th>
                  <th className="p-3 w-16 text-xs uppercase tracking-wider">SLA</th>
                  <th className="p-3 w-24 text-center text-xs uppercase tracking-wider">Approval</th>
                  <th className="p-3 w-24 text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...priorities].sort((a, b) => a.displayOrder - b.displayOrder).map(prio => (
                  <tr key={prio.id} className="table-row-hover">
                    <td className="p-3 font-mono text-slate-600">{prio.displayOrder}</td>
                    <td className="p-3 font-medium text-slate-900">{prio.name}</td>
                    <td className="p-3 text-slate-500 italic text-xs">{prio.description}</td>
                    <td className="p-3 font-semibold">{prio.slaHours}h</td>
                    <td className="p-3 text-center">{prio.requiresApproval ? <span className="text-rose-600 font-bold">Yes</span> : <span className="text-slate-400">No</span>}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button onClick={() => setEditingPrio(prio)} className="text-blue-600 hover:bg-blue-50 p-1 rounded transition" title="Edit"><Edit size={16} strokeWidth={1.75} /></button>
                        <button
                          onClick={() => confirmDelete(prio.id, 'priority')}
                          className={`p-1 rounded transition ${confirmDeleteId === prio.id ? 'bg-rose-600 text-white' : 'text-rose-600 hover:bg-rose-50'}`}
                          title={confirmDeleteId === prio.id ? 'Click again to confirm' : 'Delete'}
                        >
                          <Trash2 size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-premium">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">
                <Users size={14} strokeWidth={1.75} /> Total Users
              </div>
              <p className="text-2xl font-bold text-slate-800">{users.length}</p>
            </div>
            {roleOptions.slice(0, 3).map(role => (
              <div key={role} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-premium">
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">{role}s</div>
                <p className="text-2xl font-bold text-slate-800">{users.filter(u => u.role === role).length}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-premium border border-slate-200/60 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <h4 className="font-bold text-slate-700">Registered Users ({users.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60">
                  <tr>
                    <th className="p-3 text-xs uppercase tracking-wider">Name</th>
                    <th className="p-3 text-xs uppercase tracking-wider">Email</th>
                    <th className="p-3 text-xs uppercase tracking-wider">Department</th>
                    <th className="p-3 text-xs uppercase tracking-wider">Project</th>
                    <th className="p-3 text-xs uppercase tracking-wider">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="table-row-hover">
                      <td className="p-3 font-medium text-slate-900">{u.name}</td>
                      <td className="p-3 text-slate-500">{u.email}</td>
                      <td className="p-3 text-slate-500">{u.department}</td>
                      <td className="p-3 text-slate-500">{u.projectName || u.projectNumber || '-'}</td>
                      <td className="p-3">
                        <select
                          className="text-xs font-medium px-2 py-1 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          value={u.role}
                          onChange={e => updateUserRole(u.id, e.target.value as Role)}
                        >
                          {roleOptions.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">No users registered yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- INVITATIONS TAB --- */}
      {activeTab === 'invites' && (
        <div className="space-y-6">
          {/* Create Invite */}
          <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 rounded-xl border border-blue-100/60">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shrink-0 shadow-md">
                <Send size={18} className="text-white" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-900">Generate Invitation</h3>
                <p className="text-blue-700 text-sm mt-0.5">Create an invite link for a new user. Links expire in 7 days.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Email Address</label>
                <div className="flex items-center gap-1.5">
                  <Mail size={14} className="text-slate-400" />
                  <input
                    type="email"
                    placeholder="user@company.com"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateInvite()}
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Assigned Role</label>
                <div className="flex items-center gap-1.5">
                  <Shield size={14} className="text-slate-400" />
                  <select
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as Role)}
                  >
                    {roleOptions.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="sm:self-end">
                <button
                  onClick={handleCreateInvite}
                  className="w-full sm:w-auto btn-primary text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition"
                >
                  <Link size={16} strokeWidth={1.75} />
                  Generate & Copy
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-premium">
              <div className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-1">Total Invites</div>
              <p className="text-2xl font-bold text-slate-800">{inviteStats.total}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-premium">
              <div className="flex items-center gap-1 text-amber-600 text-xs font-semibold uppercase tracking-wide mb-1">
                <Clock size={12} /> Pending
              </div>
              <p className="text-2xl font-bold text-amber-600">{inviteStats.pending}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-premium">
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold uppercase tracking-wide mb-1">
                <CheckCircle size={12} /> Used
              </div>
              <p className="text-2xl font-bold text-emerald-600">{inviteStats.used}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-premium">
              <div className="flex items-center gap-1 text-rose-500 text-xs font-semibold uppercase tracking-wide mb-1">
                <XCircle size={12} /> Expired
              </div>
              <p className="text-2xl font-bold text-rose-500">{inviteStats.expired}</p>
            </div>
          </div>

          {/* Invites Table */}
          <div className="bg-white rounded-xl shadow-premium border border-slate-200/60 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/80">
              <h4 className="font-bold text-slate-700">Invitation History</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60">
                  <tr>
                    <th className="p-3 text-xs uppercase tracking-wider">Email</th>
                    <th className="p-3 text-xs uppercase tracking-wider">Role</th>
                    <th className="p-3 text-xs uppercase tracking-wider">Status</th>
                    <th className="p-3 text-xs uppercase tracking-wider">Created</th>
                    <th className="p-3 text-xs uppercase tracking-wider">Expires</th>
                    <th className="p-3 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedInvites.map(inv => {
                    const isExpired = !inv.used && new Date(inv.expiresAt) <= new Date();
                    const statusLabel = inv.used ? 'Used' : isExpired ? 'Expired' : 'Pending';
                    const statusColor = inv.used
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10'
                      : isExpired
                        ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-600/10'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10';

                    return (
                      <tr key={inv.id} className={`table-row-hover ${inv.used || isExpired ? 'opacity-60' : ''}`}>
                        <td className="p-3 font-medium text-slate-900">{inv.email}</td>
                        <td className="p-3">
                          <span className="badge-refined bg-blue-50 text-blue-700 ring-1 ring-blue-600/10">
                            {inv.role || Role.REQUESTER}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`badge-refined ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-slate-500">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {!inv.used && !isExpired && (
                            <button
                              onClick={() => copyInviteLink(inv.token)}
                              className="text-blue-600 hover:bg-blue-50 p-1 rounded flex items-center gap-1 text-xs transition"
                              title="Copy invite link"
                            >
                              <Copy size={14} /> Copy Link
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {sortedInvites.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No invitations yet. Generate one above to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
