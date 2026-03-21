'use client';

import { useState } from 'react';
import Draggable from 'react-draggable';

const TOOLS = [
  { id: 'music', name: '🎵 Music Player', component: MusicPlayer },
  { id: 'calc', name: '🧮 Calculator', component: Calculator },
  { id: 'currency', name: '💱 Currency', component: CurrencyConverter },
  { id: 'whatsapp', name: '💬 WhatsApp', component: WhatsAppFormatter },
];

export default function FloatingTools() {
  const [activeTool, setActiveTool] = useState<string | null>('music');
  const [minimized, setMinimized] = useState(false);

  if (!activeTool) return null;

  const CurrentTool = TOOLS.find((t) => t.id === activeTool)?.component;

  return (
    <Draggable handle=".drag-handle" bounds="parent">
      <div className="draggable-widget" style={{ bottom: 20, right: 20 }}>
        {/* Header */}
        <div className="drag-handle bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-2 cursor-move flex items-center justify-between border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`text-xs px-2 py-1 rounded ${
                  activeTool === tool.id ? 'bg-cyan-500/30' : 'hover:bg-white/10'
                }`}
              >
                {tool.name.split(' ')[0]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMinimized(!minimized)}
              className="text-xs hover:bg-white/10 px-2 py-1 rounded"
            >
              {minimized ? '▲' : '▼'}
            </button>
            <button
              onClick={() => setActiveTool(null)}
              className="text-xs hover:bg-white/10 px-2 py-1 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        {!minimized && CurrentTool && (
          <div className="p-4">
            <CurrentTool />
          </div>
        )}
      </div>
    </Draggable>
  );
}

// Music Player Component
function MusicPlayer() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="w-80">
      <div className="text-center mb-3">
        <div className="text-2xl mb-2">🎵</div>
        <div className="text-sm font-semibold">YouTube Music Player</div>
      </div>
      
      <iframe
        width="100%"
        height="200"
        src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=0&controls=1"
        title="YouTube Music"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="rounded-lg"
      />

      <div className="text-xs text-gray-400 mt-2 text-center">
        Lofi beats to study/relax to
      </div>
    </div>
  );
}

// Calculator Component
function Calculator() {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState('');
  const [op, setOp] = useState('');

  const handleNum = (num: string) => {
    setDisplay(display === '0' ? num : display + num);
  };

  const handleOp = (operation: string) => {
    setPrev(display);
    setOp(operation);
    setDisplay('0');
  };

  const calculate = () => {
    const a = parseFloat(prev);
    const b = parseFloat(display);
    let result = 0;

    switch (op) {
      case '+': result = a + b; break;
      case '-': result = a - b; break;
      case '*': result = a * b; break;
      case '/': result = a / b; break;
    }

    setDisplay(result.toString());
    setPrev('');
    setOp('');
  };

  const clear = () => {
    setDisplay('0');
    setPrev('');
    setOp('');
  };

  return (
    <div className="w-64">
      <div className="glass p-3 rounded-lg mb-2 text-right text-2xl font-mono">
        {display}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {['7', '8', '9', '/'].map((btn) => (
          <button
            key={btn}
            onClick={() => (/[0-9]/.test(btn) ? handleNum(btn) : handleOp(btn))}
            className="btn btn-secondary text-lg"
          >
            {btn}
          </button>
        ))}
        {['4', '5', '6', '*'].map((btn) => (
          <button
            key={btn}
            onClick={() => (/[0-9]/.test(btn) ? handleNum(btn) : handleOp(btn))}
            className="btn btn-secondary text-lg"
          >
            {btn}
          </button>
        ))}
        {['1', '2', '3', '-'].map((btn) => (
          <button
            key={btn}
            onClick={() => (/[0-9]/.test(btn) ? handleNum(btn) : handleOp(btn))}
            className="btn btn-secondary text-lg"
          >
            {btn}
          </button>
        ))}
        <button onClick={() => handleNum('0')} className="btn btn-secondary text-lg">
          0
        </button>
        <button onClick={clear} className="btn btn-danger text-lg">
          C
        </button>
        <button onClick={calculate} className="btn btn-primary text-lg col-span-2">
          =
        </button>
      </div>
    </div>
  );
}

// Currency Converter
function CurrencyConverter() {
  const [amount, setAmount] = useState('100');
  const [result, setResult] = useState('');

  const convert = () => {
    const inr = parseFloat(amount);
    const usd = (inr / 83).toFixed(2);
    setResult(`₹${inr} = $${usd} USD`);
  };

  return (
    <div className="w-64">
      <div className="text-center mb-3">
        <div className="text-2xl mb-1">💱</div>
        <div className="text-sm font-semibold">INR to USD</div>
      </div>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in INR"
        className="mb-2"
      />

      <button onClick={convert} className="btn btn-primary w-full mb-2">
        Convert
      </button>

      {result && (
        <div className="glass p-3 rounded-lg text-center text-sm font-semibold text-green-400">
          {result}
        </div>
      )}
    </div>
  );
}

// WhatsApp Formatter
function WhatsAppFormatter() {
  const [text, setText] = useState('');
  const [formatted, setFormatted] = useState('');

  const format = () => {
    let result = text;
    result = result.replace(/\*([^*]+)\*/g, '*$1*'); // Bold
    result = result.replace(/_([^_]+)_/g, '_$1_'); // Italic
    result = result.replace(/~([^~]+)~/g, '~$1~'); // Strikethrough
    setFormatted(result);
  };

  const copy = () => {
    navigator.clipboard.writeText(formatted);
    alert('Copied to clipboard!');
  };

  return (
    <div className="w-80">
      <div className="text-center mb-3">
        <div className="text-2xl mb-1">💬</div>
        <div className="text-sm font-semibold">WhatsApp Formatter</div>
        <div className="text-xs text-gray-400">*bold* _italic_ ~strike~</div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type message here..."
        className="mb-2 h-24"
      />

      <button onClick={format} className="btn btn-primary w-full mb-2">
        Format
      </button>

      {formatted && (
        <div className="glass p-3 rounded-lg mb-2">
          <div className="text-xs text-gray-400 mb-1">Preview:</div>
          <div className="text-sm">{formatted}</div>
        </div>
      )}

      {formatted && (
        <button onClick={copy} className="btn btn-success w-full">
          📋 Copy to Clipboard
        </button>
      )}
    </div>
  );
      }
