import React from 'react';
import { AttributeDefinition, AttributeType } from '../types';

interface DynamicFormProps {
  attributes: AttributeDefinition[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  readOnly?: boolean;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ attributes, values, onChange, readOnly = false }) => {

  const sortedAttributes = [...attributes].sort((a, b) => a.descriptionOrder - b.descriptionOrder);

  const handleChange = (id: string, val: any) => {
    if (readOnly) return;
    onChange(id, val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sortedAttributes.map(attr => (
        <div key={attr.id} className={`${attr.type === AttributeType.DIMENSION_BLOCK ? 'md:col-span-2' : ''}`}>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {attr.name} {attr.mandatory && <span className="text-red-500">*</span>}
          </label>

          {/* Text Input */}
          {attr.type === AttributeType.TEXT && (
            <input
              type="text"
              disabled={readOnly}
              value={values[attr.id] || ''}
              onChange={(e) => handleChange(attr.id, e.target.value)}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500/20 border p-2 disabled:bg-slate-100 transition"
              placeholder={`Enter ${attr.name}`}
            />
          )}

          {/* Long Text Input */}
          {attr.type === AttributeType.LONG_TEXT && (
            <textarea
              disabled={readOnly}
              value={values[attr.id] || ''}
              onChange={(e) => handleChange(attr.id, e.target.value)}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500/20 border p-2 disabled:bg-slate-100 transition"
              placeholder={`Enter ${attr.name}`}
              rows={4}
            />
          )}

          {/* Numeric Input */}
          {attr.type === AttributeType.NUMERIC && (
            <input
              type="number"
              disabled={readOnly}
              value={values[attr.id] || ''}
              onChange={(e) => handleChange(attr.id, e.target.value)}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500/20 border p-2 disabled:bg-slate-100 transition"
            />
          )}

          {/* Numeric + Unit */}
          {attr.type === AttributeType.NUMERIC_UNIT && (
            <div className="flex gap-2">
              <input
                type="number"
                disabled={readOnly}
                value={values[attr.id]?.value || ''}
                onChange={(e) => handleChange(attr.id, { ...values[attr.id], value: e.target.value })}
                className="flex-1 rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500/20 border p-2 disabled:bg-slate-100 transition"
              />
              <select
                disabled={readOnly}
                value={values[attr.id]?.unit || (attr.units?.[0] || '')}
                onChange={(e) => handleChange(attr.id, { ...values[attr.id], unit: e.target.value })}
                className="w-24 rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500/20 border p-2 disabled:bg-slate-100 transition"
              >
                {attr.units?.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          {/* Dropdown */}
          {attr.type === AttributeType.DROPDOWN && (
            <select
              disabled={readOnly}
              value={values[attr.id] || ''}
              onChange={(e) => handleChange(attr.id, e.target.value)}
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500/20 border p-2 disabled:bg-slate-100 transition"
            >
              <option value="">Select...</option>
              {attr.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}

          {/* Multi Select */}
          {attr.type === AttributeType.MULTI_SELECT && (
            <div className="space-y-2 border border-slate-200/60 p-3 rounded-xl max-h-40 overflow-y-auto bg-slate-50/50">
                {attr.options?.map(opt => {
                    const currentVals = values[attr.id] || [];
                    const isChecked = currentVals.includes(opt);
                    return (
                        <label key={opt} className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                disabled={readOnly}
                                checked={isChecked}
                                onChange={(e) => {
                                    const newVals = e.target.checked
                                        ? [...currentVals, opt]
                                        : currentVals.filter((v: string) => v !== opt);
                                    handleChange(attr.id, newVals);
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500/20"
                            />
                            <span className="text-sm text-slate-700">{opt}</span>
                        </label>
                    );
                })}
            </div>
          )}

          {/* Dimension Block */}
          {attr.type === AttributeType.DIMENSION_BLOCK && (
            <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl grid grid-cols-3 gap-4">
              {attr.dimensionFields?.map(field => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">{field}</label>
                  <div className="mt-1 flex items-center">
                    <span className="text-slate-400 mr-2 text-sm">{field.charAt(0)}:</span>
                    <input
                      type="number"
                      disabled={readOnly}
                      value={values[attr.id]?.[field] || ''}
                      onChange={(e) => handleChange(attr.id, { ...values[attr.id], [field]: e.target.value })}
                      className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500/20 border p-2 text-sm disabled:bg-slate-100 transition"
                    />
                  </div>
                </div>
              ))}
              <div className="col-span-3 text-xs text-slate-400 text-right">Unit: mm (Default)</div>
            </div>
          )}

        </div>
      ))}
    </div>
  );
};
