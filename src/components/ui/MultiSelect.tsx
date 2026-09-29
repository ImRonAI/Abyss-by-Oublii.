import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function MultiSelect({ options, selected, onChange, className }: MultiSelectProps) {
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <motion.button
            key={option}
            type="button"
            whileHover={{ y: -1 }}
            onClick={() => toggleOption(option)}
            className={cn(
              "px-4 py-2 rounded-none text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer",
              isSelected
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground/45 hover:text-foreground"
            )}
          >
            {option}
          </motion.button>
        );
      })}
    </div>
  );
}
