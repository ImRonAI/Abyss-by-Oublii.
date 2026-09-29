import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const TYPOGRAPHY_OPTIONS = [
  { id: 'sans', name: 'Modern Sans', fontClass: 'font-sans', description: 'Clean, legible, and contemporary.' },
  { id: 'serif', name: 'Classic Serif', fontClass: 'font-serif', description: 'Elegant, traditional, and editorial.' },
  { id: 'mono', name: 'Technical Mono', fontClass: 'font-mono', description: 'Structured, brutalist, and precise.' },
  { id: 'display', name: 'Bold Display', fontClass: 'font-display', description: 'Striking, expressive, and unique.' },
];

interface TypographyPickerProps {
  selected: string;
  onChange: (id: string) => void;
}

export function TypographyPicker({ selected, onChange }: TypographyPickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {TYPOGRAPHY_OPTIONS.map((option) => {
        const isSelected = selected === option.id;
        return (
          <motion.button
            key={option.id}
            type="button"
            whileHover={{ y: -2 }}
            onClick={() => onChange(option.id)}
            className={cn(
              "flex flex-col items-start p-5 rounded-none border text-left transition-all duration-300 cursor-pointer",
              isSelected
                ? "border-foreground bg-muted/20"
                : "border-border bg-background hover:border-foreground/30"
            )}
          >
            <span className={cn("text-3xl mb-2 text-foreground", option.fontClass)}>
              Ag
            </span>
            <span className={cn("text-lg font-medium text-foreground mb-1", option.fontClass)}>
              {option.name}
            </span>
            <span className="text-sm text-muted-foreground">
              {option.description}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
