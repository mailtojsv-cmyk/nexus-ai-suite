'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/app/lib/store';
import { supabase } from '@/app/lib/supabase';

// ============================================
// TYPES
// ============================================

interface BoardElement {
  id: string;
  type: 'text' | 'shape' | 'image' | 'line' | 'freehand' | 'sticky';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: {
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    fontStyle: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    opacity: number;
    textAlign: string;
  };
  rotation: number;
  locked: boolean;
  points?: { x: number; y: number }[]; // For freehand/line
}

interface BoardPage {
  id: string;
  name: string;
  elements: BoardElement[];
  background: string;
  width: number;
  height: number;
}

interface Template {
  id: string;
  name: string;
  icon: string;
  width: number;
  height: number;
  background: string;
  desc: string;
}

// ============================================
// CONSTANTS
// ============================================

const FONTS = [
  'Inter', 'Arial', 'Georgia', 'Courier New', 'Times New Roman',
  'Verdana', 'Trebuchet MS', 'Comic Sans MS', 'Impact', 'Palatino',
  'Garamond', 'Bookman', 'Tahoma', 'Lucida Console',
];

const TEMPLATES: Template[] = [
  { id: 'blank', name: 'Blank Page', icon: '📄', width: 1920, height: 1080, background: '#ffffff', desc: 'Start fresh' },
  { id: 'portrait', name: 'Portrait Page', icon: '📃', width: 1080, height: 1920, background: '#ffffff', desc: 'Vertical layout' },
  { id: 'yt-thumbnail', name: 'YouTube Thumbnail', icon: '🎬', width: 1280, height: 720, background: '#1a1a2e', desc: '1280×720 HD' },
  { id: 'presentation', name: 'Presentation (16:9)', icon: '📊', width: 1920, height: 1080, background: '#0f172a', desc: 'Slide deck' },
  { id: 'a4-notes', name: 'A4 Notes', icon: '📝', width: 794, height: 1123, background: '#fffef0', desc: 'For handwritten notes' },
  { id: 'instagram', name: 'Instagram Post', icon: '📸', width: 1080, height: 1080, background: '#fafafa', desc: '1080×1080 square' },
  { id: 'whiteboard', name: 'Teaching Whiteboard', icon: '🏫', width: 1920, height: 1080, background: '#f0f4f8', desc: 'Infinite whiteboard' },
  { id: 'poster', name: 'Poster (A3)', icon: '🖼️', width: 1123, height: 1587, background: '#ffffff', desc: 'Large format' },
];

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
  '#64748b', '#1e293b', '#fbbf24', '#a3e635', '#2dd4bf',
];

const SHAPES = [
  { id: 'rect', name: 'Rectangle', icon: '⬜' },
  { id: 'circle', name: 'Circle', icon: '⭕' },
  { id: 'triangle', name: 'Triangle', icon: '🔺' },
  { id: 'star', name: 'Star', icon: '⭐' },
  { id: 'arrow', name: 'Arrow', icon: '➡️' },
  { id: 'line', name: 'Line', icon: '➖' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function SmartBoard() {
  const { user, currentModel, addNotification } = useStore();
  
  // State
  const [pages, setPages] = useState<BoardPage[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [tool, setTool] = useState<'select' | 'text' | 'shape' | 'draw' | 'eraser' | 'laser'>('select');
  const [drawColor, setDrawColor] = useState('#000000');
  const [drawSize, setDrawSize] = useState(3);
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [fontSize, setFontSize] = useState(24);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [savedBoards, setSavedBoards] = useState<any[]>([]);
  const [boardName, setBoardName] = useState('Untitled Board');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [history, setHistory] = useState<BoardPage[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(0.5);
  const [isPresentMode, setIsPresentMode] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [showAi, setShowAi] = useState(false);
  const [showShapes, setShowShapes] = useState(false);
  const [dragElement, setDragElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPos, setTextInputPos] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);

  // ============================================
  // LIFECYCLE
  // ============================================

  useEffect(() => {
    loadSaved();
  }, []);

  useEffect(() => {
    if (pages.length > 0) {
      renderPage();
    }
  }, [pages, currentPageIndex, zoom, selectedElement, laserPos]);

  // Auto-save
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => autoSave(), 3000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [pages, boardName]);

  // ============================================
  // DATABASE
  // ============================================

  const loadSaved = async () => {
    const { data } = await supabase
      .from('canvas_drawings')
      .select('*')
      .eq('user_id', user?.id)
      .order('updated_at', { ascending: false })
      .limit(20);
    setSavedBoards(data || []);
  };

  const autoSave = async () => {
    if (!user || pages.length === 0) return;
    const existing = savedBoards.find((b) => b.name === boardName);

    const saveData = { pages, boardName };

    if (existing) {
      await supabase
        .from('canvas_drawings')
        .update({ drawing_data: saveData, name: boardName, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      const { data } = await supabase
        .from('canvas_drawings')
        .insert({ user_id: user.id, name: boardName, drawing_data: saveData })
        .select()
        .single();
      if (data) setSavedBoards([data, ...savedBoards]);
    }
  };

  const loadBoard = (board: any) => {
    if (board.drawing_data?.pages) {
      setPages(board.drawing_data.pages);
      setBoardName(board.drawing_data.boardName || board.name);
    }
    setShowSaved(false);
    setShowTemplates(false);
    addNotification({ type: 'success', message: 'Board loaded!' });
  };

  // ============================================
  // HISTORY (UNDO/REDO)
  // ============================================

  const pushHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(pages)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, pages]);

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setPages(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setPages(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  // ============================================
  // TEMPLATE SELECTION
  // ============================================

  const selectTemplate = (template: Template) => {
    const newPage: BoardPage = {
      id: Date.now().toString(),
      name: 'Page 1',
      elements: [],
      background: template.background,
      width: template.width,
      height: template.height,
    };

    // Add default elements for specific templates
    if (template.id === 'yt-thumbnail') {
      newPage.elements.push({
        id: 'title-1',
        type: 'text',
        x: 100,
        y: 250,
        width: 600,
        height: 100,
        content: 'YOUR TITLE HERE',
        style: {
          fontSize: 72,
          fontFamily: 'Impact',
          fontWeight: 'bold',
          fontStyle: 'normal',
          color: '#ffffff',
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 0,
          opacity: 1,
          textAlign: 'left',
        },
        rotation: 0,
        locked: false,
      });
    }

    if (template.id === 'presentation') {
      newPage.elements.push(
        {
          id: 'slide-title',
          type: 'text',
          x: 100,
          y: 350,
          width: 800,
          height: 100,
          content: 'Presentation Title',
          style: {
            fontSize: 64,
            fontFamily: 'Inter',
            fontWeight: 'bold',
            fontStyle: 'normal',
            color: '#ffffff',
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 0,
            opacity: 1,
            textAlign: 'center',
          },
          rotation: 0,
          locked: false,
        },
        {
          id: 'slide-subtitle',
          type: 'text',
          x: 200,
          y: 500,
          width: 600,
          height: 50,
          content: 'Your Name • Date',
          style: {
            fontSize: 28,
            fontFamily: 'Inter',
            fontWeight: 'normal',
            fontStyle: 'normal',
            color: '#94a3b8',
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 0,
            opacity: 1,
            textAlign: 'center',
          },
          rotation: 0,
          locked: false,
        }
      );
    }

    if (template.id === 'a4-notes') {
      // Add ruled lines
      for (let i = 0; i < 30; i++) {
        newPage.elements.push({
          id: `line-${i}`,
          type: 'line',
          x: 50,
          y: 100 + i * 34,
          width: 694,
          height: 1,
          content: '',
          style: {
            fontSize: 12, fontFamily: 'Inter', fontWeight: 'normal', fontStyle: 'normal',
            color: '#d1d5db', backgroundColor: 'transparent', borderColor: '#d1d5db',
            borderWidth: 1, borderRadius: 0, opacity: 0.5, textAlign: 'left',
          },
          rotation: 0,
          locked: true,
        });
      }
    }

    if (template.id === 'whiteboard') {
      // Add grid dots
      newPage.background = '#f0f4f8';
    }

    setPages([newPage]);
    setCurrentPageIndex(0);
    setShowTemplates(false);
    setBoardName(template.name);
    pushHistory();
    addNotification({ type: 'success', message: `${template.name} created!` });
  };

  // ============================================
  // CANVAS RENDERING
  // ============================================

  const renderPage = () => {
    const canvas = canvasRef.current;
    if (!canvas || pages.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const page = pages[currentPageIndex];
    if (!page) return;

    const displayWidth = page.width * zoom;
    const displayHeight = page.height * zoom;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Background
    ctx.fillStyle = page.background;
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Grid dots for whiteboard
    if (page.background === '#f0f4f8') {
      ctx.fillStyle = '#cbd5e1';
      for (let x = 0; x < displayWidth; x += 20 * zoom) {
        for (let y = 0; y < displayHeight; y += 20 * zoom) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Render elements
    page.elements.forEach((el) => {
      ctx.save();
      ctx.globalAlpha = el.style.opacity;

      const x = el.x * zoom;
      const y = el.y * zoom;
      const w = el.width * zoom;
      const h = el.height * zoom;

      // Rotation
      if (el.rotation !== 0) {
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-(x + w / 2), -(y + h / 2));
      }

      switch (el.type) {
        case 'text':
          if (el.style.backgroundColor !== 'transparent') {
            ctx.fillStyle = el.style.backgroundColor;
            ctx.roundRect(x, y, w, h, el.style.borderRadius * zoom);
            ctx.fill();
          }
          ctx.fillStyle = el.style.color;
          ctx.font = `${el.style.fontStyle} ${el.style.fontWeight} ${el.style.fontSize * zoom}px ${el.style.fontFamily}`;
          ctx.textAlign = el.style.textAlign as CanvasTextAlign;
          ctx.textBaseline = 'top';

          const textX = el.style.textAlign === 'center' ? x + w / 2 : el.style.textAlign === 'right' ? x + w : x + 10 * zoom;
          
          // Word wrap
          const words = el.content.split(' ');
          let line = '';
          let lineY = y + 10 * zoom;
          const maxWidth = w - 20 * zoom;
          const lineHeight = el.style.fontSize * 1.3 * zoom;

          words.forEach((word) => {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
              ctx.fillText(line.trim(), textX, lineY);
              line = word + ' ';
              lineY += lineHeight;
            } else {
              line = testLine;
            }
          });
          ctx.fillText(line.trim(), textX, lineY);
          break;

        case 'shape':
          ctx.fillStyle = el.style.backgroundColor;
          ctx.strokeStyle = el.style.borderColor;
          ctx.lineWidth = el.style.borderWidth * zoom;

          if (el.content === 'circle') {
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            if (el.style.borderWidth > 0) ctx.stroke();
          } else if (el.content === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x, y + h);
            ctx.closePath();
            ctx.fill();
            if (el.style.borderWidth > 0) ctx.stroke();
          } else if (el.content === 'star') {
            drawStar(ctx, x + w / 2, y + h / 2, 5, w / 2, w / 4);
            ctx.fill();
            if (el.style.borderWidth > 0) ctx.stroke();
          } else {
            ctx.fillRect(x, y, w, h);
            if (el.style.borderWidth > 0) ctx.strokeRect(x, y, w, h);
          }
          break;

        case 'line':
          ctx.strokeStyle = el.style.borderColor;
          ctx.lineWidth = el.style.borderWidth * zoom;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y + h);
          ctx.stroke();
          break;

        case 'freehand':
          if (el.points && el.points.length > 1) {
            ctx.strokeStyle = el.style.color;
            ctx.lineWidth = el.style.borderWidth * zoom;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(el.points[0].x * zoom, el.points[0].y * zoom);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x * zoom, el.points[i].y * zoom);
            }
            ctx.stroke();
          }
          break;

        case 'sticky':
          const stickyColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff'];
          ctx.fillStyle = el.style.backgroundColor || stickyColors[0];
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 10 * zoom;
          ctx.shadowOffsetY = 4 * zoom;
          ctx.fillRect(x, y, w, h);
          ctx.shadowColor = 'transparent';

          ctx.fillStyle = '#1e293b';
          ctx.font = `${el.style.fontSize * zoom}px ${el.style.fontFamily}`;
          ctx.textBaseline = 'top';

          const stickyWords = el.content.split(' ');
          let stickyLine = '';
          let stickyY = y + 15 * zoom;
          stickyWords.forEach((word) => {
            const test = stickyLine + word + ' ';
            if (ctx.measureText(test).width > w - 20 * zoom && stickyLine) {
              ctx.fillText(stickyLine.trim(), x + 10 * zoom, stickyY);
              stickyLine = word + ' ';
              stickyY += el.style.fontSize * 1.3 * zoom;
            } else {
              stickyLine = test;
            }
          });
          ctx.fillText(stickyLine.trim(), x + 10 * zoom, stickyY);
          break;
      }

      // Selection box
      if (selectedElement === el.id) {
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
        ctx.setLineDash([]);

        // Resize handles
        ctx.fillStyle = '#0ea5e9';
        [[x - 6, y - 6], [x + w - 2, y - 6], [x - 6, y + h - 2], [x + w - 2, y + h - 2]].forEach(([hx, hy]) => {
          ctx.fillRect(hx, hy, 8, 8);
        });
      }

      ctx.restore();
    });

    // Laser pointer
    if (laserPos && tool === 'laser') {
      ctx.beginPath();
      ctx.arc(laserPos.x, laserPos.y, 8 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glow
      ctx.beginPath();
      ctx.arc(laserPos.x, laserPos.y, 20 * zoom, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fill();
    }

    // Drawing preview
    if (isDrawing && currentPath.length > 1) {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawSize * zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x * zoom, currentPath[0].y * zoom);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x * zoom, currentPath[i].y * zoom);
      }
      ctx.stroke();
    }
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) => {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
  };

  // ============================================
  // TOUCH + MOUSE HANDLERS
  // ============================================

  const getCoords = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  const handlePointerDown = (e: any) => {
    e.preventDefault();
    const coords = getCoords(e);
    const page = pages[currentPageIndex];
    if (!page) return;

    if (tool === 'select') {
      const clicked = [...page.elements].reverse().find((el) => {
        return coords.x >= el.x && coords.x <= el.x + el.width && coords.y >= el.y && coords.y <= el.y + el.height;
      });

      if (clicked && !clicked.locked) {
        setSelectedElement(clicked.id);
        setDragElement(clicked.id);
        setDragOffset({ x: coords.x - clicked.x, y: coords.y - clicked.y });
      } else {
        setSelectedElement(null);
      }
    } else if (tool === 'draw' || tool === 'eraser') {
      setIsDrawing(true);
      setCurrentPath([coords]);
    } else if (tool === 'text') {
      setTextInputPos(coords);
      setShowTextInput(true);
      setTextInput('');
    } else if (tool === 'laser') {
      setLaserPos({ x: coords.x * zoom, y: coords.y * zoom });
    }
  };

  const handlePointerMove = (e: any) => {
    e.preventDefault();
    const coords = getCoords(e);

    if (tool === 'select' && dragElement) {
      const updatedPages = [...pages];
      const page = updatedPages[currentPageIndex];
      const el = page.elements.find((el) => el.id === dragElement);
      if (el) {
        el.x = coords.x - dragOffset.x;
        el.y = coords.y - dragOffset.y;
        setPages(updatedPages);
      }
    } else if ((tool === 'draw' || tool === 'eraser') && isDrawing) {
      setCurrentPath((prev) => [...prev, coords]);
    } else if (tool === 'laser') {
      setLaserPos({ x: coords.x * zoom, y: coords.y * zoom });
    }
  };

  const handlePointerUp = () => {
    if (dragElement) {
      setDragElement(null);
      pushHistory();
    }

    if ((tool === 'draw') && isDrawing && currentPath.length > 1) {
      addFreehandElement(currentPath, drawColor, drawSize);
    }

    if (tool === 'eraser' && isDrawing && currentPath.length > 0) {
      eraseNearPoints(currentPath);
    }

    setIsDrawing(false);
    setCurrentPath([]);
    setLaserPos(null);
  };

  // ============================================
  // ELEMENT MANAGEMENT
  // ============================================

  const addFreehandElement = (points: { x: number; y: number }[], color: string, size: number) => {
    const el: BoardElement = {
      id: Date.now().toString(),
      type: 'freehand',
      x: 0, y: 0, width: 0, height: 0,
      content: '',
      style: {
        fontSize: 16, fontFamily: 'Inter', fontWeight: 'normal', fontStyle: 'normal',
        color, backgroundColor: 'transparent', borderColor: color,
        borderWidth: size, borderRadius: 0, opacity: 1, textAlign: 'left',
      },
      rotation: 0,
      locked: false,
      points,
    };

    const updatedPages = [...pages];
    updatedPages[currentPageIndex].elements.push(el);
    setPages(updatedPages);
    pushHistory();
  };

  const eraseNearPoints = (eraserPath: { x: number; y: number }[]) => {
    const updatedPages = [...pages];
    const page = updatedPages[currentPageIndex];
    page.elements = page.elements.filter((el) => {
      if (el.type !== 'freehand' || !el.points) return true;
      return !el.points.some((p) =>
        eraserPath.some((ep) => Math.abs(p.x - ep.x) < 20 && Math.abs(p.y - ep.y) < 20)
      );
    });
    setPages(updatedPages);
    pushHistory();
  };

  const addTextElement = () => {
    if (!textInput.trim()) { setShowTextInput(false); return; }

    const el: BoardElement = {
      id: Date.now().toString(),
      type: 'text',
      x: textInputPos.x,
      y: textInputPos.y,
      width: 400,
      height: fontSize * 2,
      content: textInput,
      style: {
        fontSize, fontFamily: selectedFont, fontWeight: 'normal', fontStyle: 'normal',
        color: drawColor, backgroundColor: 'transparent', borderColor: 'transparent',
        borderWidth: 0, borderRadius: 0, opacity: 1, textAlign: 'left',
      },
      rotation: 0,
      locked: false,
    };

    const updatedPages = [...pages];
    updatedPages[currentPageIndex].elements.push(el);
    setPages(updatedPages);
    setShowTextInput(false);
    setTextInput('');
    pushHistory();
  };

  const addShape = (shapeType: string) => {
    const page = pages[currentPageIndex];
    const el: BoardElement = {
      id: Date.now().toString(),
      type: 'shape',
      x: page.width / 2 - 75,
      y: page.height / 2 - 75,
      width: 150,
      height: 150,
      content: shapeType,
      style: {
        fontSize: 16, fontFamily: 'Inter', fontWeight: 'normal', fontStyle: 'normal',
        color: '#000', backgroundColor: drawColor, borderColor: '#000',
        borderWidth: 2, borderRadius: shapeType === 'rect' ? 8 : 0, opacity: 1, textAlign: 'left',
      },
      rotation: 0,
      locked: false,
    };

    const updatedPages = [...pages];
    updatedPages[currentPageIndex].elements.push(el);
    setPages(updatedPages);
    setShowShapes(false);
    pushHistory();
  };

  const addStickyNote = () => {
    const stickyColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff'];
    const page = pages[currentPageIndex];
    const el: BoardElement = {
      id: Date.now().toString(),
      type: 'sticky',
      x: page.width / 2 - 100 + Math.random() * 100,
      y: page.height / 2 - 100 + Math.random() * 100,
      width: 200,
      height: 200,
      content: 'New Note',
      style: {
        fontSize: 16, fontFamily: 'Inter', fontWeight: 'normal', fontStyle: 'normal',
        color: '#1e293b', backgroundColor: stickyColors[Math.floor(Math.random() * stickyColors.length)],
        borderColor: 'transparent', borderWidth: 0, borderRadius: 4, opacity: 1, textAlign: 'left',
      },
      rotation: 0,
      locked: false,
    };

    const updatedPages = [...pages];
    updatedPages[currentPageIndex].elements.push(el);
    setPages(updatedPages);
    pushHistory();
  };

  const deleteSelected = () => {
    if (!selectedElement) return;
    const updatedPages = [...pages];
    updatedPages[currentPageIndex].elements = updatedPages[currentPageIndex].elements.filter((el) => el.id !== selectedElement);
    setPages(updatedPages);
    setSelectedElement(null);
    pushHistory();
  };

  // ============================================
  // PAGE MANAGEMENT
  // ============================================

  const addPage = () => {
    const currentPage = pages[currentPageIndex];
    const newPage: BoardPage = {
      id: Date.now().toString(),
      name: `Page ${pages.length + 1}`,
      elements: [],
      background: currentPage.background,
      width: currentPage.width,
      height: currentPage.height,
    };
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
  };

  const deletePage = () => {
    if (pages.length <= 1) return;
    const updated = pages.filter((_, i) => i !== currentPageIndex);
    setPages(updated);
    setCurrentPageIndex(Math.min(currentPageIndex, updated.length - 1));
  };

  // ============================================
  // EXPORT
  // ============================================

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Render at full size for export
    const page = pages[currentPageIndex];
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = page.width;
    exportCanvas.height = page.height;

    // Re-render at zoom=1 on export canvas
    const oldZoom = zoom;
    setZoom(1);
    setTimeout(() => {
      const link = document.createElement('a');
      link.download = `${boardName}-page-${currentPageIndex + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setZoom(oldZoom);
      addNotification({ type: 'success', message: 'Image exported!' });
    }, 100);
  };

  // ============================================
  // AI ASSIST
  // ============================================

  const getAiSuggestion = async (action: string) => {
    setShowAi(true);
    setAiSuggestion('Thinking...');

    const page = pages[currentPageIndex];
    const elementSummary = page.elements.map((e) => `${e.type}: "${e.content}"`).join(', ');

    try {
      const res = await fetch('/api/ai/canvas-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strokes: [{ action, elements: elementSummary, template: boardName }],
          model: currentModel,
        }),
      });
      const data = await res.json();
      setAiSuggestion(data.prediction);
    } catch (error) {
      setAiSuggestion('AI unavailable right now');
    }
  };

  // ============================================
  // PRESENTATION MODE
  // ============================================

  if (isPresentMode) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex items-center justify-center"
           onClick={() => setIsPresentMode(false)}>
        <canvas ref={canvasRef} className="max-w-full max-h-full" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); if (currentPageIndex > 0) setCurrentPageIndex(currentPageIndex - 1); }}
                  className="btn btn-secondary">← Prev</button>
          <span className="btn btn-secondary">{currentPageIndex + 1} / {pages.length}</span>
          <button onClick={(e) => { e.stopPropagation(); if (currentPageIndex < pages.length - 1) setCurrentPageIndex(currentPageIndex + 1); }}
                  className="btn btn-secondary">Next →</button>
          <button onClick={(e) => { e.stopPropagation(); setIsPresentMode(false); }}
                  className="btn btn-danger">✕ Exit</button>
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE SELECTION SCREEN
  // ============================================

  if (showTemplates && pages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold gradient-text">📋 SmartBoard</h2>
            <p className="text-gray-400 text-sm">Create presentations, notes, thumbnails & more</p>
          </div>
          <button onClick={() => setShowSaved(!showSaved)} className="btn btn-secondary">
            📂 Saved ({savedBoards.length})
          </button>
        </div>

        {showSaved && (
          <div className="glass p-4 rounded-lg">
            <h3 className="font-bold mb-3">Saved Boards</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {savedBoards.map((board) => (
                <div key={board.id} onClick={() => loadBoard(board)} className="glass p-3 rounded cursor-pointer hover:glow transition">
                  <div className="font-semibold text-sm truncate">{board.name}</div>
                  <div className="text-xs text-gray-400">{new Date(board.updated_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h3 className="font-bold text-xl">Choose a Template</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((template) => (
            <button key={template.id} onClick={() => selectTemplate(template)} className="glass p-6 rounded-xl text-left hover:scale-105 transition hover:glow">
              <div className="text-4xl mb-3">{template.icon}</div>
              <div className="font-bold mb-1">{template.name}</div>
              <div className="text-xs text-gray-400 mb-2">{template.desc}</div>
              <div className="text-xs text-cyan-400">{template.width} × {template.height}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN EDITOR
  // ============================================

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 glass p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowTemplates(true); setPages([]); }} className="btn btn-secondary text-xs">← Templates</button>
          <input value={boardName} onChange={(e) => setBoardName(e.target.value)} className="w-40 text-sm px-2 py-1" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button onClick={undo} className="btn btn-secondary text-xs" title="Undo">↩️</button>
          <button onClick={redo} className="btn btn-secondary text-xs" title="Redo">↪️</button>
          <button onClick={() => setIsPresentMode(true)} className="btn btn-primary text-xs">🎬 Present</button>
          <button onClick={exportImage} className="btn btn-success text-xs">📥 Export</button>
          <button onClick={() => getAiSuggestion('help')} className="btn btn-secondary text-xs">🤖 AI</button>
          <button onClick={() => setShowSaved(!showSaved)} className="btn btn-secondary text-xs">📂</button>
        </div>
      </div>

      {/* Saved Panel */}
      {showSaved && (
        <div className="glass p-3 rounded-lg">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {savedBoards.map((board) => (
              <div key={board.id} onClick={() => loadBoard(board)} className="glass p-2 rounded cursor-pointer hover:glow text-xs">
                <div className="font-semibold truncate">{board.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* Left Toolbar */}
        <div className="lg:col-span-1 glass p-2 rounded-lg">
          <div className="flex lg:flex-col gap-1 flex-wrap">
            {[
              { id: 'select', icon: '👆', name: 'Select' },
              { id: 'draw', icon: '✏️', name: 'Draw' },
              { id: 'eraser', icon: '🧹', name: 'Eraser' },
              { id: 'text', icon: '🔤', name: 'Text' },
              { id: 'laser', icon: '🔴', name: 'Laser' },
            ].map((t) => (
              <button key={t.id} onClick={() => setTool(t.id as any)} title={t.name}
                className={`p-2 rounded text-xl transition ${tool === t.id ? 'bg-cyan-500/30 border border-cyan-500/50' : 'hover:bg-white/10'}`}>
                {t.icon}
              </button>
            ))}

            <div className="border-t border-cyan-500/20 my-1" />

            <button onClick={() => setShowShapes(!showShapes)} className="p-2 rounded text-xl hover:bg-white/10" title="Shapes">⬜</button>
            <button onClick={addStickyNote} className="p-2 rounded text-xl hover:bg-white/10" title="Sticky Note">📌</button>
            <button onClick={deleteSelected} className="p-2 rounded text-xl hover:bg-white/10 text-red-400" title="Delete">🗑️</button>
          </div>

          {/* Shapes Dropdown */}
          {showShapes && (
            <div className="mt-2 space-y-1">
              {SHAPES.map((shape) => (
                <button key={shape.id} onClick={() => addShape(shape.id)} className="w-full text-left p-1 rounded hover:bg-white/10 text-xs">
                  {shape.icon} {shape.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="lg:col-span-8" ref={containerRef}>
          <div className="overflow-auto glass rounded-lg p-4" style={{ maxHeight: '70vh' }}>
            <canvas
              ref={canvasRef}
              className="mx-auto cursor-crosshair rounded shadow-2xl"
              style={{ touchAction: 'none' }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
          </div>

          {/* Text Input Overlay */}
          {showTextInput && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50" onClick={() => setShowTextInput(false)}>
              <div className="glass p-6 rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-bold mb-3">Add Text</h3>
                <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Type your text..." className="h-24 mb-3" autoFocus />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <select value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)}>
                    {FONTS.map((f) => <option key={f} value={f} className="bg-gray-900">{f}</option>)}
                  </select>
                  <input type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} min={8} max={200} />
                </div>
                <div className="flex gap-2">
                  <button onClick={addTextElement} className="btn btn-primary flex-1">Add Text</button>
                  <button onClick={() => setShowTextInput(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Page Navigation */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {pages.map((page, i) => (
              <button key={page.id} onClick={() => setCurrentPageIndex(i)}
                className={`px-3 py-1 rounded text-xs ${currentPageIndex === i ? 'btn-primary' : 'btn-secondary'}`}>
                {i + 1}
              </button>
            ))}
            <button onClick={addPage} className="px-3 py-1 rounded text-xs btn-secondary">+ Page</button>
            {pages.length > 1 && (
              <button onClick={deletePage} className="px-3 py-1 rounded text-xs btn-danger">- Del</button>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-3 space-y-2">
          {/* Style Panel */}
          <div className="glass p-3 rounded-lg">
            
