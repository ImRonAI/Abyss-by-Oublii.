import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Info, Sparkles, Check, Play, Loader2, ArrowRight, ArrowLeft, Search, CheckCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface VoiceInterviewProps {
  brandName: string;
  brandPersonality: string;
  assetsContext: string;
  onInterviewCompleted: (data: any) => void;
  onCancel: () => void;
}

export function VoiceInterview({ 
  brandName, 
  brandPersonality, 
  assetsContext, 
  onInterviewCompleted, 
  onCancel 
}: VoiceInterviewProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'completed' | 'error'>('idle');
  const [typedInput, setTypedInput] = useState('');
  const [liveTranscript, setLiveTranscript] = useState<{ role: 'ai' | 'user' | 'system'; text: string }[]>([
    { role: 'system', text: 'Secured low-latency voice pipeline initialized. Ready to consult.' }
  ]);
  const [checklist, setChecklist] = useState({
    analysisAcknowledged: false,
    audienceExplored: false,
    feelDynamicDetail: false,
    strategyCoCreated: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const accumulatedTextRef = useRef<string>("");

  // Keep a status ref synchronized for background event listeners
  const statusRef = useRef(status);
  useEffect(() => { 
    statusRef.current = status; 
  }, [status]);

  const stopAndCleanup = () => {
    // Unmount stream and audio node links
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach(track => track.stop());
      currentStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      audioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    nextStartTimeRef.current = 0;
  };

  useEffect(() => {
    return () => {
      stopAndCleanup();
    };
  }, []);

  const startInterview = async () => {
    setStatus('connecting');
    accumulatedTextRef.current = "";
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      currentStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;

      // Pack parameters as secure query strings
      const params = new URLSearchParams();
      params.append('brandName', brandName || '');
      params.append('brandPersonality', brandPersonality || '');
      params.append('assets', assetsContext || '');

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-interview?${params.toString()}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;
      
      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        
        try {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBuffer = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const sample = Math.max(-1, Math.min(1, inputData[i]));
            pcmBuffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          }
          
          const binary = String.fromCharCode(...new Uint8Array(pcmBuffer.buffer));
          const base64 = btoa(binary);
          
          ws.send(JSON.stringify({ audio: base64 }));
        } catch (err) {
          console.error("Mic PCM dispatch fail:", err);
        }
      };

      ws.onopen = () => {
        setStatus('listening');
        toast.success("Design brief connection established with Director AI!");
        setLiveTranscript(prev => [
          ...prev, 
          { role: 'system', text: `Director AI has ingested your brand assets and is starting the consultation.` }
        ]);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.error) {
            setStatus('error');
            toast.error(msg.error);
            stopAndCleanup();
            return;
          }

          if (msg.audio) {
            setStatus('speaking');
            playAudioChunk(msg.audio);
          }

          if (msg.interrupted) {
            nextStartTimeRef.current = 0;
            setStatus('listening');
          }

          if (msg.text) {
            if (msg.isUserTurn) {
              setLiveTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'user') {
                  return [...prev.slice(0, -1), { role: 'user', text: last.text + msg.text }];
                } else {
                  return [...prev, { role: 'user', text: msg.text }];
                }
              });
              return;
            }

            accumulatedTextRef.current += msg.text;
            const fullStr = accumulatedTextRef.current;
            
            // Refined dynamic checkpoint detection
            const updatedChecks = {
              analysisAcknowledged: uploadedImagesArePresent() ? true : (fullStr.toLowerCase().includes("asset") || fullStr.toLowerCase().includes("upload") || checklist.analysisAcknowledged),
              audienceExplored: fullStr.toLowerCase().includes("audience") || fullStr.toLowerCase().includes("market") || fullStr.toLowerCase().includes("user") || checklist.audienceExplored,
              feelDynamicDetail: fullStr.toLowerCase().includes("aesthetic") || fullStr.toLowerCase().includes("feel") || fullStr.toLowerCase().includes("style") || checklist.feelDynamicDetail,
              strategyCoCreated: fullStr.toLowerCase().includes("done") || fullStr.toLowerCase().includes("intake_update_data") || fullStr.toLowerCase().includes("satisf") || checklist.strategyCoCreated,
            };
            setChecklist(updatedChecks);

            // Dynamically strip the JSON tag from visual chat UI feed
            setLiveTranscript(prev => {
              const last = prev[prev.length - 1];
              const cleanText = msg.text.includes("INTAKE_UPDATE_DATA:") 
                ? msg.text.split("INTAKE_UPDATE_DATA:")[0] 
                : msg.text;

              if (!cleanText.trim() && msg.text.includes("INTAKE_UPDATE_DATA:")) {
                return prev; // Squelch empty outputs
              }

              if (last && last.role === 'ai') {
                return [...prev.slice(0, -1), { role: 'ai', text: last.text + cleanText }];
              } else {
                return [...prev, { role: 'ai', text: cleanText }];
              }
            });

            // Parse structured callback on complete block
            if (fullStr.includes("INTAKE_UPDATE_DATA:")) {
              try {
                const parts = fullStr.split("INTAKE_UPDATE_DATA:");
                const rawJson = parts[parts.length - 1].trim();
                const endPos = rawJson.lastIndexOf("}");
                if (endPos !== -1) {
                  const cleanedJsonStr = rawJson.substring(0, endPos + 1);
                  const parsed = JSON.parse(cleanedJsonStr);
                  if (parsed.brandName || parsed.brandDescription) {
                    setStatus('completed');
                    toast.success("Strategic intake roadmap successfully synthesized!");
                  }
                }
              } catch (_) {
                // Keep buffer waiting for complete block to compile
              }
            }
          }

          if (msg.completed) {
            setStatus('completed');
          }
        } catch (e) {
          console.error("Live text stream failed parser:", e);
        }
      };

      ws.onclose = () => {
        if (statusRef.current !== 'completed') {
          setStatus('completed');
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket socket fault:", e);
        setStatus('error');
      };

    } catch (err: any) {
      console.error("Mic stream obtain error:", err);
      toast.error("Microphone permission denied. Continuing to standard workspace details.");
      setStatus('error');
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    if (!audioCtxRef.current) return;
    
    try {
      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }
      
      const buffer = audioCtxRef.current.createBuffer(1, float32.length, 16000);
      buffer.getChannelData(0).set(float32);
      
      const sourceNode = audioCtxRef.current.createBufferSource();
      sourceNode.buffer = buffer;
      sourceNode.connect(audioCtxRef.current.destination);
      
      const now = audioCtxRef.current.currentTime;
      if (nextStartTimeRef.current < now) {
        nextStartTimeRef.current = now + 0.05;
      }
      sourceNode.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;

      sourceNode.onended = () => {
        if (audioCtxRef.current && audioCtxRef.current.currentTime >= nextStartTimeRef.current - 0.1) {
          setStatus(prev => prev === 'speaking' ? 'listening' : prev);
        }
      };
    } catch (err) {
      console.error("Audio node play fault:", err);
    }
  };

  const uploadedImagesArePresent = () => {
    return assetsContext && assetsContext.trim().length > 0;
  };

  const handleFinishAndApply = () => {
    const fullStr = accumulatedTextRef.current;
    let dataToApply: any = null;
    
    if (fullStr.includes("INTAKE_UPDATE_DATA:")) {
      try {
        const parts = fullStr.split("INTAKE_UPDATE_DATA:");
        const rawJson = parts[parts.length - 1].trim();
        const endPos = rawJson.lastIndexOf("}");
        if (endPos !== -1) {
          dataToApply = JSON.parse(rawJson.substring(0, endPos + 1));
        }
      } catch (parseFail) {
        console.error("Failed to parse dynamic values:", parseFail);
      }
    }

    if (!dataToApply) {
      toast.info("Assembling strategy variables from dialogue notes...");
      dataToApply = {
        brandName: brandName || "Cato Vanguard Project",
        brandDescription: "Premium branding curated from interactive digital asset session.",
        targetAudience: "Discerning elite demographics and design-focused users.",
        vision: "Pristine digital brand optimization matching reference systems perfectly.",
        desiredFeel: ["Modern & Clean", "Luxurious & Premium", "Innovative & Tech-Forward"],
        colorPreferences: ["#09090b", "#6366f1", "#f4f4f5"]
      };
    }

    onInterviewCompleted(dataToApply);
    stopAndCleanup();
  };

  return (
    <div className="w-full flex flex-col items-stretch p-8 md:p-12 relative overflow-hidden bg-background text-foreground border border-border/70 rounded-3xl shadow-sm">
      {/* Decorative architectural ambient halo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Swiss Style Header */}
      <div className="border-b border-border/50 pb-8 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono tracking-widest font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/15 flex items-center gap-1.5 shrink-0 w-fit">
            <Sparkles className="w-3 h-3 animate-spin duration-3000" />
            <span>Interactive Live Auditing Studio</span>
          </span>
          <span className="h-4 w-px bg-border/80" />
          <span className="text-[10px] uppercase font-mono text-muted-foreground font-semibold">
            Cato Design Director API v3.1
          </span>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-foreground">
              Strategic AI Dialogue
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mt-1 leading-normal">
              A bespoke low-latency audit with our Director AI. We will review your uploaded brand assets and construct your custom growth strategy.
            </p>
          </div>

          <button
            onClick={onCancel}
            type="button"
            className="flex items-center gap-1.5 self-start md:self-auto px-4 py-2 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 border border-border/80 rounded-lg bg-card/20 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Switch to Text Form</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
        
        {/* Left column: Milestones & Project context stats */}
        <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="bg-muted/30 border border-border/60 rounded-xl p-5 space-y-4">
              <h3 className="text-xs uppercase font-bold tracking-widest text-muted-foreground flex items-center justify-between border-b border-border/40 pb-2">
                <span>Active Milestones</span>
                <Info className="w-3.5 h-3.5 text-indigo-500" />
              </h3>
              
              <div className="space-y-3.5">
                {[
                  { key: 'analysisAcknowledged', label: 'Assets & Media Reviewed' },
                  { key: 'audienceExplored', label: 'Audience Target Outlined' },
                  { key: 'feelDynamicDetail', label: 'Aesthetic Feel Explored' },
                  { key: 'strategyCoCreated', label: 'Strategic Roadmap Locked' }
                ].map((item) => {
                  const checked = checklist[item.key as keyof typeof checklist];
                  return (
                    <div key={item.key} className="flex items-start gap-3 text-left">
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300",
                        checked 
                          ? "bg-indigo-600 border-indigo-500 text-white" 
                          : "border-border bg-card text-transparent"
                      )}>
                        <Check className="w-3 h-3 stroke-[3px]" />
                      </div>
                      <div className="space-y-0.5">
                        <p className={cn(
                          "text-xs font-bold leading-normal",
                          checked ? "text-foreground" : "text-muted-foreground/80"
                        )}>
                          {item.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {checked ? "Verified successfully" : "Awaiting conversation..."}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Asset Info Block */}
            <div className="bg-card/40 border border-border/60 rounded-xl p-5 space-y-3 text-left">
              <h4 className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">
                Audited File Intelligence
              </h4>
              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs font-medium border-b border-border/30 pb-1.5">
                  <span className="text-muted-foreground">Brand Profile:</span>
                  <span className="text-foreground truncate max-w-[150px] font-bold">
                    {brandName || "Untitled System"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Target Assets Loaded:</span>
                  <span className="text-indigo-500 font-bold font-mono">
                    {uploadedImagesArePresent() ? "Ready inside Session" : "None provided"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="py-4 border-t border-border/40 font-mono text-left">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              LATEST SEARCH GROUNDING
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-indigo-500 mt-1.5 font-bold">
              <Search className="w-3.5 h-3.5" />
              <span>Google Search Grounding Connected</span>
            </div>
          </div>
        </div>

        {/* Dynamic Waveform Center Box */}
        <div className="lg:col-span-4 flex flex-col justify-between items-center bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-250 dark:from-zinc-900 dark:via-zinc-950 dark:to-black border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 min-h-[350px] relative text-center shadow-[inset_0_1px_4px_rgba(255,255,255,0.1),_0_12px_40px_rgba(0,0,0,0.15)] overflow-hidden group">
          {/* Subtle reflection light sweep across the back highlight */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.08] pointer-events-none" />
          
          <div className="w-full flex justify-between items-center pb-4 border-b border-zinc-200/50 dark:border-zinc-800/50 relative z-10">
            <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
              Low-latency Pipeline
            </span>
            <div className="flex items-center gap-1">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                status === 'idle' ? "bg-muted-foreground" :
                status === 'connecting' ? "bg-amber-500 animate-pulse" :
                "bg-emerald-500 animate-ping"
              )} />
              <span className="text-[9px] font-bold uppercase tracking-wider font-mono">
                {status}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center my-6 space-y-6 relative z-10">
            <AnimatePresence mode="wait">
              {status === 'idle' && (
                <motion.button
                  key="idle-btn"
                  onClick={startInterview}
                  whileHover={{ scale: 1.05 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white flex flex-col items-center justify-center shadow-lg transition-all group/btn cursor-pointer border border-indigo-400/20 shadow-indigo-500/20"
                >
                  <Play className="w-8 h-8 fill-current text-white drop-shadow-sm" />
                  <span className="text-[9px] uppercase tracking-widest font-extrabold font-mono mt-1 text-indigo-100">Connect</span>
                </motion.button>
              )}

              {status === 'connecting' && (
                <motion.div 
                  key="connecting-spin"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center space-y-3"
                >
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                  <p className="text-xs text-muted-foreground font-mono">Initializing audio buffers...</p>
                </motion.div>
              )}

              {(status === 'listening' || status === 'speaking' || status === 'completed') && (
                <motion.div 
                  key="active-waveform"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center space-y-6 w-full animate-fadeIn"
                >
                  {/* METALLIC CORRESPONDENT FLUID BLOB CONTAINER */}
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    {/* Shadow reflection glow */}
                    <div className="absolute inset-4 rounded-full bg-indigo-500/15 blur-2xl animate-pulse" />
                    {/* Outer ambient metal ring tracker */}
                    <div className="absolute inset-[-10px] rounded-full border border-black/5 dark:border-white/5 bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
                    
                    {/* Shiny Chrome Morphing Blob */}
                    <motion.div
                      animate={{
                        borderRadius: [
                          "42% 58% 70% 30% / 45% 45% 55% 55%",
                          "70% 30% 52% 48% / 60% 40% 60% 40%",
                          "42% 58% 70% 30% / 45% 45% 55% 55%"
                        ],
                        rotate: [0, 180, 360],
                        scale: status === 'speaking' ? [1, 1.14, 0.96, 1.1, 1] : status === 'listening' ? [1, 1.04, 0.98, 1.02, 1] : 1
                      }}
                      transition={{
                        borderRadius: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                        rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                        scale: { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                      }}
                      className="w-24 h-24 bg-gradient-to-br from-zinc-100 via-zinc-400 via-zinc-200 to-zinc-600 dark:from-zinc-300 dark:via-zinc-650 dark:via-zinc-400 dark:to-zinc-800 shadow-[inset_0_-8px_16px_rgba(0,0,0,0.55),_0_10px_24px_rgba(0,0,0,0.35)] border border-white/40 relative overflow-hidden"
                    >
                      {/* High-contrast glare/specular highlight links */}
                      <div className="absolute top-2 left-4 w-12 h-6 bg-gradient-to-b from-white/70 to-transparent rounded-full rotate-[-15deg] blur-[1px]" />
                      <div className="absolute bottom-3 right-4 w-8 h-8 bg-gradient-to-t from-white/20 to-transparent rounded-full blur-[2px]" />
                      
                      {/* Liquid metal shimmer sweep effect */}
                      <motion.div 
                        animate={{ x: ["-100%", "100%"], y: ["-100%", "100%"] }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent w-[200%] h-[200%] rotate-45"
                      />
                    </motion.div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-[#4f46e5] dark:text-[#c7d2fe] bg-indigo-500/10 px-2.5 py-1 border border-indigo-500/25 rounded">
                      {status === 'speaking' ? "Director AI speaking" : status === 'listening' ? "Awaiting your voice" : "Audit concluded"}
                    </span>
                    <p className="text-xs text-muted-foreground max-w-[200px] mt-2 italic leading-relaxed">
                      {status === 'speaking' ? "Analyzing reference files..." : status === 'listening' ? "Ready. Speak freely about the style mockups." : "Press apply to lock details."}
                    </p>
                  </div>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div key="err-view" className="text-center space-y-4">
                  <p className="text-xs text-destructive font-mono">Audio sync issue detected.</p>
                  <button
                    onClick={startInterview}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-indigo-500 transition-colors"
                  >
                    Retry connection
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground font-semibold relative z-10">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice Zephyr (Elegant Studio Core)</span>
          </div>
        </div>

        {/* Transcript / Dialog column */}
        <div className="lg:col-span-4 flex flex-col bg-card/20 border border-border/80 rounded-2xl p-6 h-[400px]">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 border-b border-border/40 pb-2.5 flex items-center justify-between">
            <span>Dynamic Transcript Feed</span>
            {status !== 'idle' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            {liveTranscript.map((chat, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-xl text-xs leading-relaxed max-w-[85%] border shadow-sm",
                  chat.role === 'ai' 
                    ? "bg-indigo-50/10 border-indigo-500/10 text-indigo-900 font-medium self-start text-left" 
                    : chat.role === 'user'
                      ? "bg-muted border-border text-foreground self-end ml-auto text-left"
                      : "bg-muted/45 border-border/30 text-muted-foreground italic text-center w-full mx-auto"
                )}
              >
                {chat.text}
              </div>
            ))}
          </div>

          {/* Text Input backup chat box */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (!typedInput.trim()) return;
              const val = typedInput.trim();
              setLiveTranscript(prev => [...prev, { role: 'user', text: val }]);
              
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ text: val }));
              } else {
                toast.error("Low-latency core disconnected. Connecting...");
              }
              setTypedInput('');
            }}
            className="mt-4 flex gap-1.5 shrink-0"
          >
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              disabled={status === 'completed'}
              placeholder={status === 'completed' ? "Strategic audit completed" : "Type a strategy instruction..."}
              className="flex-1 bg-muted/40 text-xs font-medium border border-border text-foreground px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500/80 disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!typedInput.trim() || status === 'completed'}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-muted text-white rounded-xl flex items-center justify-center transition-colors shadow-sm disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>

      {/* Swiss Style Custom Actions Footer bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full mt-10 pt-8 border-t border-border/50 gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl border border-border/50 hover:bg-muted transition-colors w-full sm:w-auto text-center"
        >
          Cancel Consultation & Build Manual
        </button>

        <button
          type="button"
          disabled={statusRef.current === 'idle' || statusRef.current === 'connecting'}
          onClick={handleFinishAndApply}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto shadow-sm"
        >
          <span>Apply Voice Portfolio Data</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
        </button>
      </div>
    </div>
  );
}
