import React, { useState } from 'react';
import { MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function LocationInput({ value, onChange, className }: LocationInputProps) {
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const verifyLocation = async () => {
    if (!value.trim()) return;
    setLoading(true);
    setVerified(false);
    try {
      const resp = await fetch("/api/verify-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value })
      });
      if (!resp.ok) {
        throw new Error("Location verification request failed");
      }
      const data = await resp.json();
      const details = data.text;
      if (details) {
        onChange(`${value} - ${details}`);
        setVerified(true);
      }
    } catch (e) {
      console.error("Failed to verify location:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-0 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setVerified(false);
          }}
          placeholder="e.g., Nationwide, New York City, or SoHo"
          className="w-full rounded-none border-b border-border bg-transparent pl-8 pr-24 py-3 text-base shadow-none focus:outline-none focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={verifyLocation}
          disabled={loading || !value.trim() || verified}
          className="absolute right-0 px-3 py-1.5 bg-transparent text-muted-foreground text-xs font-medium uppercase tracking-wider hover:text-foreground transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : verified ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : "Verify"}
        </button>
      </div>
      {verified && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-green-500 font-medium pl-2"
        >
          Location verified and expanded via Google Maps.
        </motion.p>
      )}
    </div>
  );
}
