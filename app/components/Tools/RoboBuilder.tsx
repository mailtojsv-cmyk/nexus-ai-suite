'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/app/lib/store';
import { supabase } from '@/app/lib/supabase';
import {
  ROBOT_COMPONENTS,
  COMPONENT_CATEGORIES,
  getComponentsByCategory,
  calculateTotalPrice,
  validateDesign,
} from '@/app/lib/robotComponents';

export default function RoboBuilder() {
  const { user, currentModel, addNotification } = useStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [placedComponents, setPlacedComponents] = useState<any[]>([]);
  const [designName, setDesignName] = useState('My Robot');
  const [savedDesigns, setSavedDesigns] = useState<any[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [aiAssistant, setAiAssistant] = useState('');
  const [showAi, setShowAi] = useState(true);

  useEffect(() => {
    loadDesigns();
  }, []);

  useEffect(() => {
    // Auto-save every 5 seconds
    const timer = setTimeout(() => {
      autoSave();
    }, 5000);

    return () => clearTimeout(timer);
  }, [placedComponents, designName]);

  const loadDesigns = async () => {
    const { data } = await supabase
      .from('robot_designs')
      .select('*')
      .eq('user_id', user?.id)
      .order('updated_at', { ascending: false })
      .limit(10);

    setSavedDesigns(data || []);
  };

  const autoSave = async () => {
    if (!user || placedComponents.length === 0) return;

    const totalPrice = calculateTotalPrice(placedComponents.map((c) => c.id));

    // Check if design exists
    const existing = savedDesigns.find((d) => d.name === designName);

    if (existing) {
      await supabase
        .from('robot_designs')
        .update({
          components: placedComponents,
          total_price: totalPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      const { data } = await supabase
        .from('robot_designs')
        .insert({
          user_id: user.id,
          name: designName,
          components: placedComponents,
          total_price: totalPrice,
        })
        .select()
        .single();

      if (data) {
        setSavedDesigns([data, ...savedDesigns]);
      }
    }
  };

  const addComponent = (component: any) => {
    const newComponent = {
      ...component,
      instanceId: Date.now(),
      position: { x: 0, y: 0, z: 0 },
    };

    setPlacedComponents([...placedComponents, newComponent]);
    addNotification({ type: 'success', message: `Added ${component.name}` });

    // Get AI suggestion
    getAiHelp('add', component);
  };

  const removeComponent = (instanceId: number) => {
    setPlacedComponents(placedComponents.filter((c) => c.instanceId !== instanceId));
  };

  const getAiHelp = async (action: string, component: any) => {
    setShowAi(true);
    setAiAssistant('Analyzing...');

    try {
      const res = await fetch('/api/ai/robo-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          component,
          currentDesign: placedComponents,
          model: currentModel,
        }),
      });

      const data = await res.json();
      setAiAssistant(data.suggestion);
    } catch (error) {
      setAiAssistant('AI assist unavailable');
    }
  };

  const validateDesignNow = () => {
    const validation = validateDesign(placedComponents);

    if (validation.valid) {
      setAiAssistant('✅ Design is valid! Ready to build.');
    } else {
      setAiAssistant('❌ Issues found:\n' + validation.errors.join('\n'));
    }
  };

  const generateBOM = () => {
    const totalPrice = calculateTotalPrice(placedComponents.map((c) => c.id));
    
    let bom = '📋 Bill of Materials (BOM)\n\n';
    bom += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    
    const componentCounts: any = {};
    placedComponents.forEach((c) => {
      componentCounts[c.id] = (componentCounts[c.id] || 0) + 1;
    });

    Object.keys(componentCounts).forEach((id) => {
      const comp = ROBOT_COMPONENTS.find((c) => c.id === id);
      if (comp) {
        const qty = componentCounts[id];
        const subtotal = comp.price * qty;
        bom += `${comp.name}\n`;
        bom += `  Qty: ${qty} × ₹${comp.price} = ₹${subtotal}\n\n`;
      }
    });

    bom += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    bom += `TOTAL: ₹${totalPrice}\n`;
    bom += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    bom += '\nWhere to buy:\n';
    bom += '• Robu.in (India)\n';
    bom += '• Amazon India\n';
    bom += '• RobotShop India\n';

    setAiAssistant(bom);
  };

  const exportDesign = () => {
    const exportData = {
      name: designName,
      components: placedComponents,
      totalPrice: calculateTotalPrice(placedComponents.map((c) => c.id)),
      createdAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${designName}.json`;
    a.click();

    addNotification({ type: 'success', message: 'Design exported!' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold gradient-text">🤖 RoboBuilder</h2>
          <p className="text-gray-400 text-sm">3D Robot Designer with AI Assistant</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={designName}
            onChange={(e) => setDesignName(e.target.value)}
            placeholder="Design name"
            className="w-48 text-sm px-3 py-2"
          />
          <button onClick={() => setShowSaved(!showSaved)} className="btn btn-secondary text-sm">
            📂 Saved ({savedDesigns.length})
          </button>
          <button onClick={validateDesignNow} className="btn btn-primary text-sm">
            ✅ Validate
          </button>
          <button onClick={generateBOM} className="btn btn-success text-sm">
            📋 BOM
          </button>
          <button onClick={exportDesign} className="btn btn-secondary text-sm">
            💾 Export
          </button>
        </div>
      </div>

      {/* Saved Designs */}
      {showSaved && (
        <div className="glass p-4 rounded-lg">
          <h3 className="font-bold mb-3">Saved Designs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {savedDesigns.map((design) => (
              <div
                key={design.id}
                onClick={() => {
                  setPlacedComponents(design.components);
                  setDesignName(design.name);
                  setShowSaved(false);
                }}
                className="glass p-3 rounded cursor-pointer hover:glow transition"
              >
                <div className="font-semibold">{design.name}</div>
                <div className="text-xs text-gray-400">
                  {design.components.length} components • ₹{design.total_price}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(design.updated_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Component Library */}
        <div className="space-y-4">
          <div className="glass p-4 rounded-lg">
            <h3 className="font-bold mb-3">Components Library</h3>

            {/* Category Filter */}
            <div className="space-y-2 mb-4">
              {COMPONENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left p-2 rounded transition text-sm ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'glass hover:bg-white/5'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            {/* Components */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getComponentsByCategory(selectedCategory).map((comp) => (
                <div key={comp.id} className="glass p-3 rounded">
                  <div className="font-semibold text-sm">{comp.name}</div>
                  <div className="text-xs text-gray-400">{comp.specs}</div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm font-bold text-green-400">₹{comp.price}</div>
                    <button
                      onClick={() => addComponent(comp)}
                      className="btn btn-primary text-xs"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3D Canvas (Placeholder - will use Three.js in production) */}
        <div className="lg:col-span-2">
          <div className="robo-canvas h-[600px] flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center">
              <div className="text-6xl mb-4">🤖</div>
              <div className="text-2xl font-bold mb-2">3D Preview</div>
              <div className="text-gray-400 text-sm">
                Drag and drop components here
              </div>
              <div className="mt-6 text-gray-400 text-sm">
                {placedComponents.length} components placed
              </div>
            </div>
          </div>

          {/* Component List */}
          {placedComponents.length > 0 && (
            <div className="glass p-4 rounded-lg mt-4">
              <h3 className="font-bold mb-3">Placed Components</h3>
              <div className="space-y-2">
                {placedComponents.map((comp) => (
                  <div key={comp.instanceId} className="flex items-center justify-between p-2 glass rounded">
                    <span className="text-sm">{comp.name}</span>
                    <button
                      onClick={() => removeComponent(comp.instanceId)}
                      className="btn btn-danger text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-cyan-500/30">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total Cost:</span>
                  <span className="text-green-400">
                    ₹{calculateTotalPrice(placedComponents.map((c) => c.id))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant Panel */}
        <div className="space-y-4">
          <div className="glass p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">🤖 AI Assistant</div>
              <button onClick={() => setShowAi(!showAi)} className="text-xs">
                {showAi ? '▼' : '▲'}
              </button>
            </div>

            {showAi && (
              <div className="glass p-3 rounded max-h-96 overflow-y-auto text-sm whitespace-pre-wrap">
                {aiAssistant || 'Add components to get AI suggestions...'}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="glass p-4 rounded-lg">
            <h3 className="font-bold mb-3">📊 Design Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Components:</span>
                <span className="font-bold">{placedComponents.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cost:</span>
                <span className="font-bold text-green-400">
                  ₹{calculateTotalPrice(placedComponents.map((c) => c.id))}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Controllers:</span>
                <span className="font-bold">
                  {placedComponents.filter((c) => c.category === 'controller').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Motors:</span>
                <span className="font-bold">
                  {placedComponents.filter((c) => c.category === 'motor').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sensors:</span>
                <span className="font-bold">
                  {placedComponents.filter((c) => c.category === 'sensor').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-save indicator */}
      <div className="text-xs text-center text-gray-400">
        ✅ Auto-saves every 5 seconds
      </div>
    </div>
  );
}
