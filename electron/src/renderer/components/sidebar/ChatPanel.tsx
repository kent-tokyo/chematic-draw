import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';

export function ChatPanel() {
  const theme = useUIStore((s) => s.theme);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [input, setInput] = useState('');

  const handleSendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', text: input }]);
    setInput('');
    // Placeholder response
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'AI Chat integration coming soon...' }]);
    }, 300);
  };

  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const bgColor = theme === 'dark' ? '#2f3a47' : '#f3f5f8';
  const inputBg = theme === 'dark' ? '#1e2530' : '#ffffff';
  const userBubble = theme === 'dark' ? '#4d8dff' : '#2f6fe8';
  const assistantBubble = theme === 'dark' ? '#3a4a57' : '#e4e9f1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px' }}>
      <div style={{ fontSize: '10px', color: labelColor }}>
        💬 AI-powered molecular analysis (future feature)
      </div>

      {/* Message List */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '8px',
          backgroundColor: bgColor,
          borderRadius: '3px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: labelColor, fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>
            Start a conversation about the molecule
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  backgroundColor: msg.role === 'user' ? userBubble : assistantBubble,
                  color: textColor,
                  fontSize: '11px',
                  wordWrap: 'break-word',
                }}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask about structure..."
          style={{
            flex: 1,
            padding: '6px 8px',
            border: `1px solid ${labelColor}`,
            borderRadius: '3px',
            backgroundColor: inputBg,
            color: textColor,
            fontSize: '11px',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={handleSendMessage}
          style={{
            padding: '6px 10px',
            backgroundColor: '#4d8dff',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
