'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/app/lib/store';
import { supabase } from '@/app/lib/supabase';

export default function StudyHelper() {
  const { user, currentModel, addNotification } = useStore();
  const [subject, setSubject] = useState('Math');
  const [grade, setGrade] = useState('10');
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('English');
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const subjects = ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'Social Science', 'Computer Science'];
  const grades = ['6', '7', '8', '9', '10', '11', '12'];

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('study_questions')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setHistory(data || []);
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);

    try {
      const prompt =
        language === 'Hindi'
          ? `मैं कक्षा ${grade} का छात्र हूं। ${subject} विषय के ${topic} टॉपिक में मेरा सवाल है:

${question}

कृपया इस तरह जवाब दें:
1. आसान हिंदी में स्टेप-बाय-स्टेप समझाएं
2. उदाहरण के साथ
3. CBSE बोर्ड के अनुसार
4. परीक्षा में कैसे लिखें, यह भी बताएं`
          : `I am a Class ${grade} student. My question about ${subject} (Topic: ${topic || 'General'}) is:

${question}

Please provide:
1. Step-by-step solution
2. With examples
3. As per CBSE/State board syllabus
4. Exam tips`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          model: currentModel,
        }),
      });

      const data = await res.json();
      setAnswer(data.response);

      // Save to database
      await supabase.from('study_questions').insert({
        user_id: user?.id,
        grade,
        subject,
        topic: topic || 'General',
        question,
        answer: data.response,
        language,
      });

      loadHistory();
      addNotification({ type: 'success', message: 'Answer generated!' });
    } catch (error: any) {
      setAnswer('Error: ' + error.message);
      addNotification({ type: 'error', message: 'Failed to get answer' });
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold gradient-text">📖 Study Helper</h2>
          <p className="text-gray-400 text-sm">
            {language === 'Hindi'
              ? 'CBSE/राज्य बोर्ड के लिए संदेह समाधान'
              : 'CBSE/State Board doubt solving'}
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="btn btn-secondary text-sm"
        >
          📜 History ({history.length})
        </button>
      </div>

      {showHistory && (
        <div className="glass p-4 rounded-lg">
          <h3 className="font-bold mb-3">Recent Questions</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((item, i) => (
              <div
                key={i}
                onClick={() => {
                  setGrade(item.grade);
                  setSubject(item.subject);
                  setTopic(item.topic);
                  setQuestion(item.question);
                  setAnswer(item.answer);
                  setShowHistory(false);
                }}
                className="p-3 glass rounded cursor-pointer hover:glow transition"
              >
                <div className="font-semibold text-sm text-cyan-400">
                  Class {item.grade} - {item.subject}
                </div>
                <div className="text-sm truncate">{item.question}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select value={grade} onChange={(e) => setGrade(e.target.value)}>
          {grades.map((g) => (
            <option key={g} value={g} className="bg-gray-900">
              {language === 'Hindi' ? `कक्षा ${g}` : `Class ${g}`}
            </option>
          ))}
        </select>

        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          {subjects.map((s) => (
            <option key={s} value={s} className="bg-gray-900">
              {s}
            </option>
          ))}
        </select>

        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="English" className="bg-gray-900">
            🇬🇧 English
          </option>
          <option value="Hindi" className="bg-gray-900">
            🇮🇳 हिंदी
          </option>
        </select>
      </div>

      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder={
          language === 'Hindi' ? 'टॉपिक (जैसे: द्विघात समीकरण)' : 'Topic (e.g., Quadratic Equations)'
        }
      />

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={
          language === 'Hindi'
            ? 'अपना सवाल यहाँ लिखें...'
            : 'Write your question here...'
        }
        className="h-32"
      />

      <button onClick={askQuestion} disabled={loading || !question.trim()} className="btn btn-primary w-full">
        {loading ? 'Getting answer...' : language === 'Hindi' ? '📝 जवाब पाएं' : '📝 Get Answer'}
      </button>

      {answer && (
        <div className="glass p-5 rounded-lg border border-cyan-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-cyan-400">
              {language === 'Hindi' ? '✨ जवाब:' : '✨ Answer:'}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(answer);
                addNotification({ type: 'success', message: 'Answer copied!' });
              }}
              className="btn btn-secondary text-xs"
            >
              📋 Copy
            </button>
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">{answer}</div>
        </div>
      )}
    </div>
  );
}
