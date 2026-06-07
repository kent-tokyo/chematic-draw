import React, { useState } from 'react';

interface ElementPickerProps {
  currentElement: string;
  onSelect: (element: string) => void;
  theme: 'dark' | 'light';
}

const COMMON_ELEMENTS = [
  'H', 'C', 'N', 'O', 'F', 'P', 'S', 'Cl', 'Br', 'I',
  'B', 'Si', 'Se', 'Li', 'Na', 'K', 'Ca', 'Fe', 'Cu', 'Zn',
];

export function ElementPicker({ currentElement, onSelect, theme }: ElementPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredElements = COMMON_ELEMENTS.filter((el) =>
    el.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#d0d0d0';
  const hoverBg = theme === 'dark' ? '#3a4a57' : '#f0f0f0';
  const activeBg = '#4d8dff';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        style={{
          width: '100%',
          padding: '6px',
          border: `1px solid ${borderColor}`,
          borderRadius: '3px',
          backgroundColor: bgColor,
          color: textColor,
          fontSize: '11px',
          fontWeight: '600',
          cursor: 'pointer',
          textAlign: 'center',
        }}
      >
        {currentElement} ▼
      </button>

      {showPicker && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '3px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 100,
            marginTop: '4px',
            overflow: 'hidden',
          }}
        >
          <input
            type="text"
            placeholder="Search element..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '6px',
              border: `0 0 1px 0 solid ${borderColor}`,
              borderBottom: `1px solid ${borderColor}`,
              boxSizing: 'border-box',
              backgroundColor: bgColor,
              color: textColor,
              fontSize: '10px',
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', padding: '8px' }}>
            {filteredElements.map((el) => (
              <button
                key={el}
                onClick={() => {
                  onSelect(el);
                  setShowPicker(false);
                  setSearchTerm('');
                }}
                style={{
                  padding: '6px',
                  border: 'none',
                  borderRadius: '3px',
                  backgroundColor: el === currentElement ? activeBg : 'transparent',
                  color: el === currentElement ? 'white' : textColor,
                  fontSize: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (el !== currentElement) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = hoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (el !== currentElement) {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                  }
                }}
              >
                {el}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
