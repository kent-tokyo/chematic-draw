import React from 'react';
import { getTheme } from '../../lib/theme';

export interface FormInputProps {
  label?: string;
  value: string | number;
  onChange: (value: string | number) => void;
  isDark: boolean;
  type?: 'text' | 'number' | 'password';
  placeholder?: string;
  disabled?: boolean;
}

export function FormInput({ label, value, onChange, isDark, type = 'text', placeholder, disabled }: FormInputProps) {
  const theme = getTheme(isDark);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 500, color: theme.text }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          padding: '6px 8px',
          borderRadius: '4px',
          border: `1px solid ${theme.border}`,
          backgroundColor: theme.bgSection,
          color: theme.text,
          fontSize: '12px',
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = theme.bgActive)}
        onBlur={(e) => (e.currentTarget.style.borderColor = theme.border)}
      />
    </div>
  );
}

export interface FormSelectProps {
  label?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  isDark: boolean;
  disabled?: boolean;
}

export function FormSelect({ label, value, options, onChange, isDark, disabled }: FormSelectProps) {
  const theme = getTheme(isDark);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 500, color: theme.text }}>{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          padding: '6px 8px',
          borderRadius: '4px',
          border: `1px solid ${theme.border}`,
          backgroundColor: theme.bgSection,
          color: theme.text,
          fontSize: '12px',
          fontFamily: 'inherit',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface FormButtonProps {
  label: string;
  onClick: () => void;
  isDark: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function FormButton({ label, onClick, isDark, variant = 'secondary', disabled }: FormButtonProps) {
  const theme = getTheme(isDark);
  const bgColor = variant === 'primary' ? theme.bgActive : variant === 'danger' ? '#ef4444' : theme.bgHover;
  const textColor = variant === 'primary' || variant === 'danger' ? 'white' : theme.text;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 12px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: bgColor,
        color: textColor,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '12px',
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
      onMouseEnter={(e) => !disabled && ((e.currentTarget as HTMLButtonElement).style.opacity = '0.8')}
      onMouseLeave={(e) => !disabled && ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
    >
      {label}
    </button>
  );
}
