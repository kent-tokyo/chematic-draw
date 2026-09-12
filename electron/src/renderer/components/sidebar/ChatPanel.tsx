import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { runAnalysisInWorker } from '../../lib/analysisWorkerClient';
import type { MoleculeDto, PropertiesDto } from '../../store/types';

type Message = { role: 'user' | 'assistant'; text: string };

async function answerQuestion(question: string, molecule: MoleculeDto, isJapanese: boolean): Promise<string> {
  const normalized = question.toLowerCase();
  const properties = async () => await runAnalysisInWorker('properties', molecule) as PropertiesDto;

  if (normalized.includes('smiles')) {
    const smiles = await runAnalysisInWorker('canonical-smiles', molecule) as string;
    return isJapanese ? `正規化SMILES: ${smiles}` : `Canonical SMILES: ${smiles}`;
  }

  const result = await properties();
  if (normalized.includes('分子式') || normalized.includes('formula')) {
    return isJapanese ? `分子式: ${result.formula}` : `Molecular formula: ${result.formula}`;
  }
  if (normalized.includes('分子量') || normalized.includes('molecular weight') || normalized.includes('mw')) {
    return isJapanese ? `分子量: ${result.molecular_weight.toFixed(2)}` : `Molecular weight: ${result.molecular_weight.toFixed(2)}`;
  }
  if (normalized.includes('logp')) {
    return `LogP: ${result.logp.toFixed(2)}`;
  }
  if (normalized.includes('環') || normalized.includes('ring')) {
    return isJapanese ? `環の数: ${result.ring_count}` : `Rings: ${result.ring_count}`;
  }
  if (normalized.includes('原子') || normalized.includes('atom')) {
    return isJapanese ? `原子数: ${molecule.atoms.length}` : `Atoms: ${molecule.atoms.length}`;
  }
  if (normalized.includes('結合') || normalized.includes('bond')) {
    return isJapanese ? `結合数: ${molecule.bonds.length}` : `Bonds: ${molecule.bonds.length}`;
  }
  return isJapanese
    ? '質問例: 分子式、分子量、LogP、環の数、SMILES、原子数、結合数'
    : 'Try: molecular formula, molecular weight, LogP, rings, SMILES, atoms, or bonds.';
}

export function ChatPanel() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const molecule = useMoleculeStore((s) => s.molecule);
  const isJapanese = language === 'ja';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [answering, setAnswering] = useState(false);

  const handleSendMessage = async () => {
    const question = input.trim();
    if (!question || answering) return;
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    setAnswering(true);
    try {
      const answer = await answerQuestion(question, molecule, isJapanese);
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: isJapanese ? `解析できませんでした: ${(error as Error).message}` : `Could not analyze the molecule: ${(error as Error).message}` }]);
    } finally {
      setAnswering(false);
    }
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
        {isJapanese ? 'ローカル分子アシスタント' : 'Offline molecule assistant'}
        <div style={{ marginTop: '3px', fontSize: '9px' }}>
          {isJapanese ? '外部送信なし。現在の構造をWASMで解析します。' : 'No external upload. Answers use the current structure and local WASM.'}
        </div>
      </div>

      {/* Message List */}
      <div
        role="log"
        aria-label={isJapanese ? '分子相談のメッセージ' : 'Molecule conversation messages'}
        aria-live="polite"
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
            {isJapanese ? '現在の分子について質問できます' : 'Ask about the current molecule'}
            <div style={{ marginTop: '6px', fontSize: '9px' }}>{isJapanese ? '例: 分子量、LogP、SMILES' : 'Try: molecular weight, LogP, or SMILES'}</div>
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
          aria-label={isJapanese ? '分子について質問' : 'Ask about the molecule'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSendMessage()}
          disabled={answering}
          placeholder={isJapanese ? '構造について質問…' : 'Ask about structure...'}
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
          type="button"
          aria-label={isJapanese ? 'メッセージを送信' : 'Send message'}
          onClick={() => void handleSendMessage()}
          disabled={answering || !input.trim()}
          style={{
            padding: '6px 10px',
            backgroundColor: '#4d8dff',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            fontSize: '11px',
            cursor: answering || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: answering || !input.trim() ? 0.6 : 1,
          }}
        >
          {isJapanese ? '送信' : 'Send'}
        </button>
      </div>
    </div>
  );
}
