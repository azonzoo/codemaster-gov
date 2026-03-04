import React, { useState, useEffect, useMemo } from 'react';
import { useStore, useToast } from '../store';
import { Role } from '../types';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface RegisterProps {
  onNavigate?: (page: string) => void;
}

export const Register: React.FC<RegisterProps> = ({ onNavigate }) => {
  const { setCurrentUser, addUser, validateInviteToken, markInviteTokenUsed } = useStore();
  const { addToast } = useToast();

  const urlToken = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || '';
  }, []);

  const [tokenInput, setTokenInput] = useState(urlToken);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'valid' | 'invalid' | 'expired' | 'used'>('idle');
  const [tokenEmail, setTokenEmail] = useState('');
  const [tokenRole, setTokenRole] = useState<Role | undefined>(undefined);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    department: '',
    projectNumber: '',
    projectName: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!tokenInput.trim()) {
      setTokenStatus('idle');
      setTokenEmail('');
      setTokenRole(undefined);
      return;
    }

    const result = validateInviteToken(tokenInput.trim());
    if (result) {
      setTokenStatus('valid');
      setTokenEmail(result.email);
      setTokenRole(result.role);
      setFormData(prev => ({ ...prev, email: result.email }));
    } else {
      setTokenStatus('invalid');
      setTokenEmail('');
      setTokenRole(undefined);
    }
  }, [tokenInput, validateInviteToken]);

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address';
        return '';
      case 'contactNumber':
        if (value.trim() && !/^[+]?[\d\s()-]{7,20}$/.test(value.trim())) return 'Enter a valid phone number';
        return '';
      case 'department':
        if (!value.trim()) return 'Department is required';
        return '';
      default:
        return '';
    }
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};
    for (const [field, value] of Object.entries(formData)) {
      const err = validateField(field, value);
      if (err) newErrors[field] = err;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const err = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: err || undefined } as Record<string, string>));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!validateAll()) {
      addToast('Please fix the errors below.', 'warning');
      return;
    }

    const role = tokenRole || Role.REQUESTER;

    const newUser = addUser({
      name: formData.name.trim(),
      email: formData.email.trim(),
      contactNumber: formData.contactNumber.trim(),
      department: formData.department.trim(),
      projectNumber: formData.projectNumber.trim(),
      projectName: formData.projectName.trim(),
      role,
    });

    if (tokenInput.trim() && tokenStatus === 'valid') {
      markInviteTokenUsed(tokenInput.trim());
    }

    setCurrentUser(newUser);
    addToast(`Welcome, ${newUser.name}! Registration successful.`, 'success');

    if (onNavigate) {
      onNavigate('dashboard');
    }
  };

  const inputClass = (field: string) =>
    `appearance-none rounded-lg relative block w-full px-3 py-2.5 border ${
      submitted && errors[field]
        ? 'border-rose-400 ring-1 ring-rose-400'
        : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
    } placeholder-slate-400 text-slate-900 focus:outline-none sm:text-sm transition-all`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-6 bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-premium-xl border border-slate-200/60">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mb-4 shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h2>
          <p className="mt-1 text-sm text-slate-500">
            Join the Item & Service Coding Request system
          </p>
        </div>

        {/* Invite Token Section */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Invitation Token</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste your invite token here (optional)"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
            />
          </div>
          {tokenStatus === 'valid' && (
            <div className="mt-2 flex items-center gap-1.5 text-emerald-700 text-sm">
              <CheckCircle size={14} />
              <span>Valid invite for <strong>{tokenEmail}</strong>{tokenRole ? ` (${tokenRole})` : ''}</span>
            </div>
          )}
          {tokenStatus === 'invalid' && tokenInput.trim() && (
            <div className="mt-2 flex items-center gap-1.5 text-rose-600 text-sm">
              <XCircle size={14} />
              <span>Invalid, expired, or already used token</span>
            </div>
          )}
          {tokenStatus === 'idle' && (
            <p className="mt-1.5 text-xs text-slate-500">
              If you received an invitation link, the token is auto-filled. You can also register without one.
            </p>
          )}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              className={inputClass('name')}
              placeholder="e.g. John Smith"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
            />
            {submitted && errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              className={inputClass('email')}
              placeholder="your.name@company.com"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              readOnly={tokenStatus === 'valid'}
            />
            {tokenStatus === 'valid' && (
              <p className="mt-1 text-xs text-slate-500">Email pre-filled from invitation</p>
            )}
            {submitted && errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
          </div>

          {/* Contact Number */}
          <div>
            <label htmlFor="contact" className="block text-sm font-medium text-slate-700 mb-1">
              Contact Number
            </label>
            <input
              id="contact"
              type="tel"
              className={inputClass('contactNumber')}
              placeholder="+966 5x xxx xxxx"
              value={formData.contactNumber}
              onChange={e => handleChange('contactNumber', e.target.value)}
            />
            {submitted && errors.contactNumber && <p className="mt-1 text-xs text-rose-600">{errors.contactNumber}</p>}
          </div>

          {/* Department */}
          <div>
            <label htmlFor="dept" className="block text-sm font-medium text-slate-700 mb-1">
              Division / Department <span className="text-red-500">*</span>
            </label>
            <input
              id="dept"
              type="text"
              className={inputClass('department')}
              placeholder="e.g. Engineering, Procurement"
              value={formData.department}
              onChange={e => handleChange('department', e.target.value)}
            />
            {submitted && errors.department && <p className="mt-1 text-xs text-rose-600">{errors.department}</p>}
          </div>

          {/* Project Site Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <h4 className="text-xs uppercase font-bold text-slate-500 mb-3 tracking-widest">Project Site Info (If Applicable)</h4>
            <div className="space-y-3">
              <div>
                <label htmlFor="projNum" className="block text-sm font-medium text-slate-700 mb-1">Project Number</label>
                <input
                  id="projNum"
                  type="text"
                  className="appearance-none rounded-lg block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all"
                  placeholder="e.g. PRJ-001"
                  value={formData.projectNumber}
                  onChange={e => handleChange('projectNumber', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="projName" className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input
                  id="projName"
                  type="text"
                  className="appearance-none rounded-lg block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all"
                  placeholder="e.g. Phase 2 Expansion"
                  value={formData.projectName}
                  onChange={e => handleChange('projectName', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Role Preview */}
          {tokenRole && (
            <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100/60">
              <AlertTriangle size={14} className="text-blue-600 shrink-0" />
              <span className="text-sm text-blue-800">
                You will be registered as: <strong>{tokenRole}</strong>
              </span>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white btn-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Account
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Already registered? Switch users from the sidebar after logging in.
        </p>
      </div>
    </div>
  );
};
