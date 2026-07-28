import { useState } from 'react';
import type { KeywordHighlight } from '../../types';
import { hexToRgba } from '../../lib/peColors';

interface Props {
  highlights: KeywordHighlight[];
  suggestions: string[];
  onAdd: (keyword: string) => void;
  onToggle: (id: number) => void;
  onRemove: (id: number) => void;
}

const MAX_SUGGESTIONS = 8;

export function KeywordHighlightBar({ highlights, suggestions, onAdd, onToggle, onRemove }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  function submit(value: string) {
    const keyword = value.trim();
    if (!keyword) return;
    onAdd(keyword);
    setInput('');
    setShowSuggestions(false);
  }

  const query = input.trim().toLowerCase();
  const filteredSuggestions = query
    ? suggestions.filter((s) => s.toLowerCase().includes(query) && s.toLowerCase() !== query).slice(0, MAX_SUGGESTIONS)
    : [];

  return (
    <div className="keyword-highlight-row">
      <span className="keyword-highlight-label">Highlight:</span>
      <div className="keyword-input-wrap">
        <input
          type="text"
          placeholder="Type a keyword, or pick a suggestion…"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(input);
          }}
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="keyword-suggestions">
            {filteredSuggestions.map((s) => (
              <div key={s} className="keyword-suggestion-item" onMouseDown={() => submit(s)}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
      {highlights.map((h) => (
        <div
          key={h.id}
          className={`keyword-chip${h.active ? ' active' : ''}`}
          style={{ color: 'var(--text-color)', background: hexToRgba(h.color.dot, 0.18), borderColor: h.color.dot }}
          onClick={() => onToggle(h.id)}
          title={h.active ? 'Click to pause' : 'Click to resume'}
        >
          <span className="keyword-dot" style={{ background: h.color.dot }} />
          {h.keyword}
          <span
            className="keyword-remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(h.id);
            }}
          >
            ×
          </span>
        </div>
      ))}
    </div>
  );
}
