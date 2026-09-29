import React, { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ColorPickerProps {
  colors: string[];
  onChange: (colors: string[]) => void;
  maxColors?: number;
}

export function ColorPicker({ colors, onChange, maxColors = 5 }: ColorPickerProps) {
  const [currentColor, setCurrentColor] = useState('#3b82f6');
  const [isOpen, setIsOpen] = useState(false);

  const addColor = () => {
    if (colors.length < maxColors && !colors.includes(currentColor)) {
      onChange([...colors, currentColor]);
      setIsOpen(false);
    }
  };

  const removeColor = (colorToRemove: string) => {
    onChange(colors.filter(c => c !== colorToRemove));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <AnimatePresence>
          {colors.map((color) => (
            <motion.div
              key={color}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="relative group w-12 h-12 rounded-full shadow-md border-2 border-background"
              style={{ backgroundColor: color }}
            >
              <button
                type="button"
                onClick={() => removeColor(color)}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {colors.length < maxColors && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-card border border-border rounded-xl shadow-xl inline-block"
        >
          <HexColorPicker color={currentColor} onChange={setCurrentColor} />
          <div className="mt-4 flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-md border border-border" 
              style={{ backgroundColor: currentColor }}
            />
            <input
              type="text"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="flex-1 bg-transparent border-b border-border px-2 py-1 text-sm focus:outline-none focus:border-primary uppercase"
            />
            <button
              type="button"
              onClick={addColor}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Add
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
