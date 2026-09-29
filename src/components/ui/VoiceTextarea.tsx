import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  onValueChange: (value: string) => void;
  value: string;
}

export function VoiceTextarea({ onValueChange, value, className, placeholder, ...props }: VoiceTextareaProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Keep refs of value and onValueChange to access them inside onresult 
  // without re-binding the SpeechRecognition listener on every keypress!
  const valueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
          setInterimTranscript('');
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimText = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptSegment = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcriptSegment;
            } else {
              interimText += transcriptSegment;
            }
          }

          setInterimTranscript(interimText);

          if (finalTranscript) {
            const baseValue = valueRef.current || '';
            const trimmedBase = baseValue.trim();
            const trimmedFinal = finalTranscript.trim();
            
            const newValue = trimmedBase 
              ? `${trimmedBase} ${trimmedFinal}` 
              : trimmedFinal;

            onValueChangeRef.current(newValue);
            // Clear interim since it's now part of the final transcript
            setInterimTranscript('');
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          // If permission is denied or no-microphone, stop recording
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setIsRecording(false);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          setInterimTranscript('');
        };

        recognitionRef.current = recognition;
      } else {
        setIsSupported(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Failed to stop speech recognition on cleanup:', e);
        }
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!isSupported) return;

    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error('Failed to stop recording:', e);
      }
      setIsRecording(false);
    } else {
      try {
        // Request microphone permission and start
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Failed to start recording:', e);
        // Force reset state
        setIsRecording(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="relative w-full group">
        <textarea
          className={cn(
            "flex min-h-[120px] w-full rounded-none border-b border-border bg-transparent px-0 py-3 pr-12 text-sm shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-300",
            isRecording && "border-foreground bg-muted/40 px-2",
            className
          )}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          {...props}
        />
        
        {isSupported && (
          <button
            type="button"
            onClick={toggleRecording}
            className={cn(
              "absolute bottom-3 right-3 w-10 h-10 rounded-none border border-border/80 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-none z-10 touch-manipulation",
              isRecording 
                ? "bg-foreground text-background border-foreground" 
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground hover:border-foreground/35"
            )}
            title={isRecording ? "Stop recording" : "Start voice transcribing"}
            style={{ minWidth: '44px', minHeight: '44px' }} // Guaranteed physical touch boundary
          >
            {isRecording ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                className="relative"
              >
                <Mic className="w-5 h-5" />
                <span className="absolute -inset-1 rounded-full border border-white/50 animate-ping" />
              </motion.div>
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-2.5 px-3 py-2 border border-foreground/20 bg-muted/40 rounded-none text-[10px] text-foreground font-mono"
          >
            <div className="flex gap-1 items-center shrink-0">
              <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-pulse" />
            </div>
            <span className="font-semibold tracking-wide uppercase text-[9px] shrink-0">Listening:</span>
            <span className="italic truncate text-foreground/80 font-sans">
              {interimTranscript ? `"${interimTranscript}"` : "Speak clearly now..."}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

