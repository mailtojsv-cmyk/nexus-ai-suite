'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/app/lib/store';
import { supabase } from '@/app/lib/supabase';

export default function PythonIDE() {
  const { user, currentModel, addNotification } = useStore();
  const [code, setCode] = useState(`# Python IDE with AI Copilot
# Write your code here and click Run!

print("Hello from Nexus AI!")

# Try this:
for i in range(5):
    print(f"Count: {i}")
`);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [snippetName, setSnippetName] = useState('Untitled');
  const [savedSnippets, setSavedSnippets] = useState<any[]>([]);
  const [showSnippets, setShowSnippets] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [lineNumbers, setLineNumbers] = useState('1');

  const saveTimeoutRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadSnippets();
  }, []);

  useEffect(() => {
    // Update line numbers
    const lines = code.split('\n').length;
    setLineNumbers(Array.from({ length: lines }, (_, i) => i + 1).join('\n'));
  }, [code]);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => autoSave(), 3000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [code]);

  const loadSnippets = async () => {
    try {
      const { data } = await supabase
        .from('code_snippets')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(10);
      setSavedSnippets(data || []);
    } catch (err) {
      console.log('No snippets yet');
    }
  };

  const autoSave = async () => {
    if (!user || !code) return;
    try {
      const existing = savedSnippets.find((s) => s.name === snippetName);
      if (existing) {
        await supabase
          .from('code_snippets')
          .update({ code, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        const { data } = await supabase
          .from('code_snippets')
          .insert({ user_id: user.id, name: snippetName, code, language: 'python' })
          .select()
          .single();
        if (data) setSavedSnippets([data, ...savedSnippets]);
      }
    } catch (err) {
      console.log('Auto-save failed');
    }
  };

  const runCode = async () => {
    setLoading(true);
    setOutput('Running...');
    try {
      const res = await fetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'python' }),
      });
      const data = await res.json();
      setOutput(data.output || 'No output');
      addNotification({ type: 'success', message: 'Code executed!' });
    } catch (error: any) {
      setOutput('Error: ' + error.message);
      addNotification({ type: 'error', message: 'Execution failed' });
    }
    setLoading(false);
  };

  const getAiSuggestion = async (action: string) => {
    setShowAiPanel(true);
    setAiSuggestion('Thinking...');
    try {
      const res = await fetch('/api/ai/code-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, model: currentModel, action }),
      });
      const data = await res.json();
      setAiSuggestion(data.suggestion);
      if (action === 'fix' && data.fixedCode) {
        setCode(data.fixedCode);
      }
    } catch (error) {
      setAiSuggestion('AI assist failed');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold gradient-text">⚡ Python IDE</h2>
          <p className="text-gray-400 text-sm">AI-powered coding assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={snippetName} onChange={(e) => setSnippetName(e.target.value)} placeholder="Snippet name" className="w-40 text-sm px-3 py-2" />
          <button onClick={() => setShowSnippets(!showSnippets)} className="btn btn-secondary text-sm">
            📂 Saved ({savedSnippets.length})
          </button>
          <button onClick={runCode} disabled={loading} className="btn btn-primary">
            {loading ? '⏳ Running...' : '▶️ Run Code'}
          </button>
        </div>
      </div>

      {showSnippets && (
        <div className="glass p-4 rounded-lg">
          <h3 className="font-bold mb-3">Saved Snippets</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {savedSnippets.map((snippet) => (
              <div key={snippet.id} onClick={() => { setCode(snippet.code); setSnippetName(snippet.name); setShowSnippets(false); }}
                className="p-3 glass rounded cursor-pointer hover:glow transition">
                <div className="font-semibold text-sm">{snippet.name}</div>
                <div className="text-xs text-gray-400">{new Date(snippet.updated_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Code Editor */}
          <div className="glass rounded-lg overflow-hidden border border-cyan-500/30">
            <div className="bg-cyan-500/10 px-4 py-2 border-b border-cyan-500/30 flex items-center justify-between">
              <span className="text-sm font-semibold">📝 main.py</span>
              <span className="text-xs text-gray-400">{code.split('\n').length} lines</span>
            </div>
            <div className="flex">
              <pre className="p-4 text-right text-gray-500 text-sm font-mono select-none border-r border-cyan-500/20 bg-black/30" style={{ minWidth: '50px' }}>
                {lineNumbers}
              </pre>
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 p-4 bg-transparent text-green-400 font-mono text-sm resize-none outline-none"
                style={{ minHeight: '400px', tabSize: 4, border: 'none', background: 'transparent' }}
                spellCheck={false}
              />
            </div>
          </div>

          {/* Output */}
          <div className="glass p-4 rounded-lg border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-sm text-green-400">📤 Output</div>
              <button onClick={() => setOutput('')} className="text-xs btn btn-secondary">Clear</button>
            </div>
            <pre className="text-sm whitespace-pre-wrap text-green-400 font-mono min-h-[100px]">
              {output || 'Click "Run Code" to see output...'}
            </pre>
          </div>
        </div>

        {/* AI Copilot Panel */}
        <div className="space-y-4">
          <div className="glass p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">🤖 AI Copilot</div>
              <button onClick={() => setShowAiPanel(!showAiPanel)} className="text-xs">
                {showAiPanel ? '▼' : '▲'}
              </button>
            </div>

            {showAiPanel && (
              <>
                <div className="space-y-2 mb-3">
                  <button onClick={() => getAiSuggestion('suggest')} className="w-full btn btn-primary text-sm">
                    💡 Get Suggestion
                  </button>
                  <button onClick={() => getAiSuggestion('explain')} className="w-full btn btn-secondary text-sm">
                    📖 Explain Code
                  </button>
                  <button onClick={() => getAiSuggestion('fix')} className="w-full btn btn-danger text-sm">
                    🔧 Fix Bugs
                  </button>
                </div>
                <div className="glass p-3 rounded max-h-80 overflow-y-auto text-sm whitespace-pre-wrap">
                  {aiSuggestion || 'Click a button to get AI assistance'}
                </div>
              </>
            )}
          </div>

          {/* Quick Templates */}
          <div className="glass p-4 rounded-lg">
            <div className="font-bold mb-3 text-sm">📝 Templates</div>
            <div className="space-y-2">
              {[
                { name: 'Hello World', code: 'print("Hello, World!")' },
                { name: 'For Loop', code: 'for i in range(10):\n    print(f"Number: {i}")' },
                { name: 'Function', code: 'def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Student"))' },
                { name: 'Calculator', code: 'a = 10\nb = 5\nprint(f"Add: {a+b}")\nprint(f"Sub: {a-b}")\nprint(f"Mul: {a*b}")\nprint(f"Div: {a/b}")' },
                { name: 'List Operations', code: 'fruits = ["apple", "banana", "cherry"]\nfor fruit in fruits:\n    print(fruit.upper())' },
              ].map((template) => (
                <button key={template.name} onClick={() => setCode(template.code)}
                  className="w-full text-left p-2 glass rounded hover:glow transition text-sm">
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-center text-gray-400">✅ Auto-saves every 3 seconds • Tab key inserts spaces</div>
    </div>
  );
          }
