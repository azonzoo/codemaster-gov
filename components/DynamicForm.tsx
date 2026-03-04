import React from 'react';
import { AttributeDefinition, AttributeType } from '../types';

interface DynamicFormProps {
  attributes: AttributeDefinition[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  readOnly?: boolean;
}

const inputClasses = "w-full rounded-lg border-slate-300 dark:border-slate-600 shadow-sm focus:border-blue-500 focus:ring-blue-500/20 border p-2 disabled:bg-slate-100 dark:disabled:bg-slate-800 transition bg-white dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400";

export const DynamicForm: React.FC<DynamicFormProps> = ({ attributes, values, onChange, readOnly = false }) => {

  const sortedAttributes = [...attributes].sort((a, b) => a.descriptionOrder - b.descriptionOrder);

  const handleChange = (id: string, val: any) => {
    if (readOnly) return;
    onChange(id, val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" role="group" aria-label="Request attributes">
      {sortedAttributes.map(attr => (
        <div key={attr.id} className={`${attr.type === AttributeType.DIMENSION_BLOCK ? 'md:col-span-2' : ''}`}>
          <label htmlFor={`field-${attr.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {attr.name} {attr.mandatory && <span className="text-red-500" aria-hidden="true">*</span>}
            {attr.mandatory && <span className="sr-only"> (required)</span>}
          </label>

          {/* Text Input */}
          {attr.type === AttributeType.TEXT && (
            <input
              id={`field-${attr.id}`}
              type="text"
              disabled={readOnly}
              aria-required={attr.mandatory || undefined}
              value={values[attr.id] || ''}
              onChange={(e) => handleChange(attr.id, e.target.value)}
              className={inputClasses}
              placeholder={`Enter ${attr.name}`}
            />
          )}

          {/* Long Text Input */}
          {attr.type === AttributeType.LONG_TEXT && (
            <textarea
              id={`field-${attr.id}`}
              disabled={readOnly}
              aria-required={attr.mandatory || undefined}
              value={values[attr.id] || ''}
              onChange={(e) => handleChange(attr.id, e.target.value)}
              className={inputClasses}
              placeholder={`Enter ${attr.name}`}
              rows={4}
            />
          )}

          {/* Numeric Input */}
          {attr.type === AttributeType.NUMERIC && (
            <input
              id={`field-${attr.id}`}
              type="number"
              disabled={readOnly}
              aria-required={attr.mandatory || undefined}
              aria-label={`${attr.name} value`}
              value={values[attr.id] || ''}
              onChange={(e) => handleChange(attr.id, e.target.value)}
              className={inputClasses}
            />
          )}

          {/* Numeric + Unit */}
          {attr.type === AttributeType.NUMERIC_UNIT && (
            <div className="flex gap-2" role="group" aria-label={`${attr.name} with unit`}>
              <input
                id={`field-${attr.id}`}
                type="number"
                disabled={readOnly}
                aria-required={attr.mandatory || undefined}
                aria-label={`${attr.name} value`}
                value={values[attr.id]?.value || ''}
                onChange={(e) => handleChange(attr.id, { ...values[attr.id], value: e.target.value })}
                className={`flex-1 ${inputClasses}`}
              />
              <select
                disabled={readOnly}
                aria-label={`${attr.name} unit`}
                value={values[attr.id]?.unit || (attr.units?.[0] || '')}
                onChange={(e) => handleChange(attr.id, { ...values[attr.id], unit: e.target.value })}
                className={`w-24 ${inputClasses}`}
              >
                {attr.units?.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

          {/* Dropdown */}
          {attr.type === AttributeType.DROPDOWN && (
            <select
              id={`field-${attr.id}`}
              disabled={readOnly}
              aria-required={attr.mandatory || undefined}
              value={values[attr.id] || ''}
              onChange={(e) => handleChange(attr.id, e.target.value)}
              className={inputClasses}
            >
              <option value="">Select...</option>
              {attr.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}

          {/* Multi Select */}
          {attr.type === AttributeType.MULTI_SELECT && (
            <fieldset aria-label={`${attr.name} options`}>
              <div className="space-y-2 border border-slate-200/60 dark:border-slate-700/60 p-3 rounded-xl max-h-40 overflow-y-auto bg-slate-50/50 dark:bg-slate-700/30" role="group">
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
                            <span className="text-sm text-slate-700 dark:text-slate-300">{opt}</span>
                        </label>
                    );
                })}
              </div>
            </fieldset>
          )}

          {/* Dimension Block */}
          {attr.type === AttributeType.DIMENSION_BLOCK && (
            <fieldset>
              <legend className="sr-only">{attr.name} dimensions</legend>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl grid grid-cols-3 gap-4">
                {attr.dimensionFields?.map(field => (
                  <div key={field}>
                    <label htmlFor={`field-${attr.id}-${field}`} className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{field}</label>
                    <div className="mt-1 flex items-center">
                      <span className="text-slate-400 mr-2 text-sm" aria-hidden="true">{field.charAt(0)}:</span>
                      <input
                        id={`field-${attr.id}-${field}`}
                        type="number"
                        disabled={readOnly}
                        aria-label={`${attr.name} ${field} in mm`}
                        value={values[attr.id]?.[field] || ''}
                        onChange={(e) => handleChange(attr.id, { ...values[attr.id], [field]: e.target.value })}
                        className={`text-sm ${inputClasses}`}
                      />
                    </div>
                  </div>
                ))}
                <div className="col-span-3 text-xs text-slate-400 text-right" aria-live="polite">Unit: mm (Default)</div>
              </div>
            </fieldset>
          )}

        </div>
      ))}
    </div>
  );
};
