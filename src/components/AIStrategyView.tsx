import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Printer, XCircle, Send, Sparkles, Search, BrainCircuit, ChevronDown, ChevronUp, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface AIStrategyViewProps {
  formData: any;
  onEndSession: () => void;
}

export function AIStrategyView({ formData, onEndSession }: AIStrategyViewProps) {
  const [status, setStatus] = useState<'initializing' | 'thinking' | 'complete' | 'error'>('initializing');
  const [planHtml, setPlanHtml] = useState('');
  const [debouncedPlanHtml, setDebouncedPlanHtml] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [currentSearch, setCurrentSearch] = useState<string | null>(null);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [selectionData, setSelectionData] = useState<{ text: string, x: number, y: number } | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [apiContents, setApiContents] = useState<any[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateStrategy();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Debounce planHtml updates to prevent iframe flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPlanHtml(planHtml);
    }, 500); // Update every 500ms
    return () => clearTimeout(timer);
  }, [planHtml]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'print-report') {
        handlePrint();
      } else if (event.data?.type === 'selection-change') {
        if (event.data.text) {
          setSelectionData({
            text: event.data.text,
            x: event.data.x,
            y: event.data.y
          });
        } else {
          setSelectionData(null);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [debouncedPlanHtml]);

  const generateStrategy = async (retryCount = 0) => {
    setStatus('thinking');
    if (retryCount === 0) {
      setPlanHtml('');
      setIsPlanOpen(false); // Ensure plan is closed initially
    }
    try {
      const prompt = `You are an elite Brand Strategist, Master SEO Expert, and Principal Solutions Architect. Your mission is to generate a STUNNING, EXHAUSTIVE, and VERBOSE "Implementation Master Plan" in a single, flawless HTML document. 

This is NOT a marketing brochure, a boilerplate template, or a generic UI dashboard. It is a highly actionable, deep-dive project execution roadmap focusing strictly on *how* to deliver amazing work.

### 1. INPUT CONTEXT
- Name: ${formData.name}
- Company: ${formData.company}
- Area of Operations: ${formData.areaOfOperations}
- Project Types: ${formData.projectTypes?.join(', ')}
- Brand Name: ${formData.brandName}
- Brand Personality: ${formData.brandPersonality || 'Not specified'}
- Vision: ${formData.vision}
- Desired Feel: ${formData.desiredFeel?.join(', ')}
- Colors: ${formData.colorPreferences?.join(', ') || 'None specified'}
- Typography: ${formData.typography || 'None specified'}
- Uploaded Assets Analysis: ${formData.images?.map((img: any) => '[' + img.label + ']: ' + img.analysis).join('; ') || 'None provided'}

### 2. CONSTRAINT GRAPH (CRITICAL RULES)

**HARD CONSTRAINTS (Must Satisfy):**
- **C1 (Format):** The entire output MUST be wrapped in \`\`\`html ... \`\`\`. No preambles. No reasoning text. Start immediately with the HTML.
- **C2 (Verbosity):** Maximize your 65,536 token limit. Write massive, exhaustive paragraphs. NO jargon. NO fluff. NO lazy shortcuts.
- **C3 (Actionable):** The report must focus SOLELY on what is needed to deliver amazing work for website building, SEO, and the selected project areas.
- **C4 (Crucial Prompt Requirement):** EACH section MUST contain a detailed list of actionable prompts/commands designed to be fed back into an AI or engineering team to build out the corresponding pieces. 
- **C5 (Completeness):** You MUST explicitly address EVERY SINGLE project type the user selected. Do not group them.
- **C6 (Data):** Chart.js data visualizations must represent highly realistic, logically derived SEO/market data.

**UI/STYLING DEPENDENCIES (Must Satisfy):**
- **S1 (Frameworks):** Use Tailwind CSS (via CDN), Chart.js (via CDN), and FontAwesome 6.4.0 (via CDN).
- **S2 (Color Contrast):** ABSOLUTELY NO WHITE TEXT ON LIGHT BACKGROUNDS. DO NOT use \`text-white\`, \`text-gray-50\` through \`text-gray-400\` anywhere EXCEPT inside a dark colored button/badge.
- **S3 (Base Text):** All body text, headings, and card text MUST use \`text-gray-900\` or \`text-black\`. Card backgrounds must be \`bg-white\` or \`bg-gray-50\`. Use the client's brand colors ONLY for accents/borders.
- **S4 (Responsiveness):** Use Tailwind responsive prefixes (\`sm:\`, \`md:\`, \`lg:\`) to ensure flawless mobile-to-desktop rendering.

**JAVASCRIPT & INTERACTIVITY RULES:**
- **J1 (Navigation):** All table of contents links MUST be functional anchor links (e.g., \`<a href="#seo-strategy">\` matching \`<section id="seo-strategy">\`).
- **J2 (Print):** Include a functional "Print Strategy Report" button at the top that calls \`window.parent.postMessage('print-report', '*');\`.
- **J3 (Selection Tracking - NON-NEGOTIABLE):** Include a script that listens for text selection. When text is selected, call \`window.parent.postMessage({ type: 'selection-change', text: selectedText, x: rect.left + rect.width / 2, y: rect.top }, '*')\`. Clear on deselection.

### 3. REQUIRED DOCUMENT STRUCTURE

Build the HTML document with the following exhaustive sections:

**A. Executive Summary & Brand Positioning**
Deep dive into the value proposition. Translate the vision (${formData.vision}) into actionable market positioning. Provide 3 specific AI prompts to generate the foundational web copy.
${formData.generatedLogo ? `* **GENERATED LOGO REQUIREMENT:** A logo has been selected and provided in the context. You MUST embed it prominently in this section using EXACTLY this tag: \`<img src="GENERATED_LOGO_SRC" alt="Generated Logo" class="w-64 h-auto mx-auto rounded-xl shadow-lg mb-6" />\`. DO NOT modify the src attribute.` : ''}

**B. MASTER SEO & LOCAL DOMINANCE STRATEGY**
* **Keywords:** 25-30 exact, high-intent target keywords.
* **Local SEO:** Specific tactics to dominate "${formData.areaOfOperations}" (Google Business, citations).
* **Technical & Schema:** Site speed protocols and explicit schema markup requirements.
* **Prompts:** Supply 5 targeted prompts (e.g., "Write an SEO-optimized landing page incorporating [XYZ] keywords and local identifiers for San Francisco").

**C. WEBSITE BUILDING & ARCHITECTURE STRATEGY (DELIVERY PLAN)**
Render a flawless, beautiful HTML table outlining a full 15+ page site architecture. For EACH page, detail Target Keyword, SEO Title Tag, Content Focus, and Key UX mechanics. Provide specific prompt sequences used to generate the frontend code and backend schemas for this site.

**D. Specific Execution Plan (Per Selected Project Type)**
For EVERY item in \`${formData.projectTypes?.join(', ')}\`, generate a massive, dedicated technical and marketing breakdown.
* For each platform/project area, meticulously list out step-by-step required assets, technologies, and **provide an ordered list of 3-5 generative AI prompts to rapidly execute the heavy lifting** (e.g., "Prompt to build the Tailwind header component", "Prompt to initialize the Postgres MCP server").

Output nothing but the raw HTML document enclosed in \`\`\`html ... \`\`\`.`;

      const messageParts: any[] = [{ text: prompt }];
      
      if (formData.generatedLogo) {
        messageParts.push({
          inlineData: {
            data: formData.generatedLogo.split(',')[1],
            mimeType: 'image/jpeg'
          }
        });
      }

      if (formData.images && formData.images.length > 0) {
        formData.images.forEach((img: any) => {
          const imgSrc = img.data || img.url;
          if (imgSrc && imgSrc.startsWith('data:image/')) {
            const [header, base64Data] = imgSrc.split(',');
            const mimeType = header.split(':')[1].split(';')[0];
            messageParts.push({
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            });
          }
        });
      }

      const initialContents = [{
        role: 'user',
        parts: messageParts
      }];

      setApiContents(initialContents);

      const response = await fetch('/api/strategy/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: initialContents })
      });

      if (!response.ok) {
        throw new Error(`Strategy stream request failed with status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.text) {
              fullText += chunk.text;
            }

            // Extract search queries if present
            const queries = chunk.candidates?.[0]?.groundingMetadata?.webSearchQueries;
            if (queries && queries.length > 0) {
              const latestQuery = queries[queries.length - 1];
              setCurrentSearch(latestQuery);
              setSearchQueries(prev => {
                const newQueries = [...prev];
                queries.forEach((q: string) => {
                  if (!newQueries.includes(q)) newQueries.push(q);
                });
                return newQueries;
              });
            } else if (chunk.text) {
              setCurrentSearch(null);
            }

            // Extract HTML if it exists
            const htmlMatch = fullText.match(/```html\n([\s\S]*?)(?:```|$)/);
            if (htmlMatch) {
              let cleanHtml = htmlMatch[1];
              if (formData.generatedLogo) {
                cleanHtml = cleanHtml.replace('GENERATED_LOGO_SRC', formData.generatedLogo);
              }
              setPlanHtml(cleanHtml);
              // Stream the plan in real-time by opening it as soon as HTML is detected
              setIsPlanOpen(true);
            }
          } catch (err) {
            console.error("Failed to parse chunk line:", err, line);
          }
        }
      }

      // Store model's initial response so that history is correct for follow-ups
      setApiContents(prev => [
        ...prev,
        {
          role: 'model',
          parts: [{ text: fullText }]
        }
      ]);

      setStatus('complete');
      
      // Send the generated plan to the backend
      try {
        await fetch('/api/notify-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            company: formData.company,
            planHtml: fullText.match(/```html\n([\s\S]*?)(?:```|$)/)?.[1] || 'No HTML plan generated',
            reasoning: fullText.split('```html')[0].trim()
          }),
        });
      } catch (e) {
        console.warn("Failed to send plan to backend:", e);
      }

    } catch (e: any) {
      console.error("Strategy generation failed:", e);
      if ((e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED')) && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        setTimeout(() => generateStrategy(retryCount + 1), delay);
        return;
      }
      
      if (e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED')) {
        import('sonner').then(({ toast }) => {
          toast.error('API Quota Exceeded. Please check your billing details or try again later.', {
            action: {
              label: 'Set API Key',
              onClick: async () => {
                if ((window as any).aistudio?.openSelectKey) {
                  await (window as any).aistudio.openSelectKey();
                  window.location.reload();
                }
              }
            },
            duration: 10000
          });
        });
      } else {
        import('sonner').then(({ toast }) => {
          toast.error('Failed to generate strategy. Please try again.');
        });
      }
      setStatus('error');
    }
  };

  const sendMessage = async (e?: React.FormEvent, overrideMsg?: string) => {
    if (e) e.preventDefault();
    const msg = overrideMsg || chatInput;
    if (!msg.trim() || isChatting) return;
    
    setChatInput('');
    setFeedbackText('');
    setSelectionData(null);
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setIsChatting(true);
    setStatus('thinking');
    setPlanHtml(''); // Clear plan to show spinner
    setDebouncedPlanHtml(null);
    
    try {
      const updatedContents = [
        ...apiContents,
        {
          role: 'user',
          parts: [{ text: msg }]
        }
      ];
      setApiContents(updatedContents);

      const response = await fetch('/api/strategy/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: updatedContents })
      });

      if (!response.ok) {
        throw new Error(`Chat stream request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      setChatHistory(prev => [...prev, { role: 'model', text: '' }]); // Placeholder

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.text) {
              fullResponse += chunk.text;
            }

            // Extract search queries if present
            const queries = chunk.candidates?.[0]?.groundingMetadata?.webSearchQueries;
            if (queries && queries.length > 0) {
              const latestQuery = queries[queries.length - 1];
              setCurrentSearch(latestQuery);
              setSearchQueries(prev => {
                const newQueries = [...prev];
                queries.forEach((q: string) => {
                  if (!newQueries.includes(q)) newQueries.push(q);
                });
                return newQueries;
              });
            } else if (chunk.text) {
              setCurrentSearch(null);
            }

            // Update the last message in history
            setChatHistory(prev => {
              const newHistory = [...prev];
              const textWithoutHtml = fullResponse.split('```html')[0].trim();
              newHistory[newHistory.length - 1].text = textWithoutHtml || "I've updated the strategy plan based on your request.";
              return newHistory;
            });

            // Check if the model updated the HTML plan
            const htmlMatch = fullResponse.match(/```html\n([\s\S]*?)(?:```|$)/);
            if (htmlMatch) {
              let cleanHtml = htmlMatch[1];
              if (formData.generatedLogo) {
                cleanHtml = cleanHtml.replace('GENERATED_LOGO_SRC', formData.generatedLogo);
              }
              setPlanHtml(cleanHtml);
              setIsPlanOpen(true);
            }
          } catch (err) {
            console.error("Failed to parse chat chunk:", err, line);
          }
        }
      }

      setApiContents(prev => [
        ...prev,
        {
          role: 'model',
          parts: [{ text: fullResponse }]
        }
      ]);

      setStatus('complete');
    } catch (e) {
      console.error("Chat failed:", e);
      setStatus('error');
    } finally {
      setIsChatting(false);
    }
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim() || !selectionData) return;
    const fullMsg = `Regarding this section: "${selectionData.text}"\n\nFeedback: ${feedbackText}`;
    sendMessage(undefined, fullMsg);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Extract the content from debouncedPlanHtml
    // We need to make sure the printed version has all the styles
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${formData.brandName} - Strategy Plan</title>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap');
            body { 
              margin: 0; 
              padding: 0; 
              font-family: 'Inter', sans-serif;
              background: white;
              color: #111827;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
              a { text-decoration: none !important; color: inherit !important; }
            }
          </style>
        </head>
        <body>
          <div class="max-w-5xl mx-auto p-8">
            ${debouncedPlanHtml}
          </div>
          <script>
            // Wait for images and charts to load
            window.onload = () => {
              setTimeout(() => {
                window.print();
                // window.close(); // Optional: close after printing
              }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderMarkdown = (text: string) => {
    return (
      <ReactMarkdown
        components={{
          code({node, inline, className, children, ...props}: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <div className="rounded-md overflow-hidden my-4 border border-border shadow-md">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-400 text-xs font-mono border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4" />
                    {match[1]}
                  </div>
                </div>
                <pre className="p-4 bg-gray-900 text-gray-100 overflow-auto text-sm font-mono leading-relaxed">
                  {String(children).replace(/\n$/, '')}
                </pre>
              </div>
            ) : (
              <code {...props} className={cn("bg-muted px-1.5 py-0.5 rounded-md font-mono text-sm", className)}>
                {children}
              </code>
            )
          }
        }}
      >
        {text}
      </ReactMarkdown>
    );
  };

  if (status === 'initializing') {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center space-y-4 py-32 bg-[#0a0a0a]">
        <div className="text-center space-y-3 max-w-md">
          <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase animate-pulse">
            [ INITIALIZING ARCHITECTURAL ENGINE ]
          </span>
          <h3 className="text-3xl font-serif italic text-white tracking-wide">Analyzing Submitted Brief</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto font-sans leading-relaxed">
            Synthesizing corporate profile, brand personality traits, and regional jurisdictions. Please wait...
          </p>
        </div>
        <div className="w-32 h-[1px] bg-white/10 overflow-hidden relative mt-4">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-16 h-full bg-white/50 absolute top-0 left-0"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0a0a0a] overflow-hidden z-50">
      {/* Header */}
      <div className="p-3.5 md:p-4 border-b border-white/10 bg-black/40 flex items-center justify-between z-20 relative backdrop-blur-md shrink-0">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none animate-pulse" />
          <span>Strategic Engine</span>
        </h3>
        <div className="flex items-center gap-2 md:gap-3">
          {status === 'complete' && (
            <button
              onClick={() => setIsPlanOpen(!isPlanOpen)}
              className={cn(
                "flex items-center gap-2 px-3.5 md:px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-none transition-all shadow-none cursor-pointer",
                isPlanOpen 
                  ? "bg-white text-black hover:bg-white/90" 
                  : "bg-white/10 text-white hover:bg-white/25 border border-white/20"
              )}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              {isPlanOpen ? 'Chat Brief' : 'Review Plan'}
            </button>
          )}
          <button
            onClick={onEndSession}
            className="flex items-center gap-2 px-3.5 md:px-4 py-2 bg-transparent text-zinc-400 hover:text-white hover:border-white/50 border border-white/10 text-xs font-mono font-bold uppercase tracking-wider rounded-none transition-all cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>End Session</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden relative bg-[#0f0f12]">
        {/* Main Chat Area */}
        <div className={cn(
          "flex flex-col h-full overflow-hidden relative z-10 transition-all duration-500",
          isPlanOpen ? "hidden md:flex w-[400px] shrink-0 border-r border-white/10" : "flex-1 max-w-5xl mx-auto w-full"
        )}>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 custom-scrollbar">
            
            {/* Elegant Processing Indicator */}
            {status === 'thinking' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-16 px-6 bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl shadow-sm shrink-0 my-4"
              >
                <div className="relative w-16 h-16 mb-8">
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    className="absolute inset-0 border-[3px] border-primary/10 border-t-primary rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                </div>
                
                <div className="h-8 relative w-full max-w-md overflow-hidden flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {currentSearch ? (
                      <motion.div
                        key="search"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                        className="text-sm font-medium text-muted-foreground text-center absolute flex items-center gap-2"
                      >
                        <Search className="w-4 h-4" />
                        <span>Searching: <span className="text-foreground">"{currentSearch}"</span></span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="thinking"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        className="text-sm font-medium text-muted-foreground text-center absolute flex items-center gap-2"
                      >
                        <BrainCircuit className="w-4 h-4" />
                        <span>Formulating your strategic plan...</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Chat History */}
            {chatHistory.map((msg, i) => (
              <div key={i} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[90%] md:max-w-[85%] rounded-none p-4 md:p-5 text-sm leading-relaxed border",
                  msg.role === 'user' 
                    ? "bg-white text-black border-white" 
                    : "bg-zinc-900/30 border-zinc-800 text-zinc-100 prose prose-invert prose-sm max-w-none"
                )}>
                  {msg.role === 'user' ? msg.text : renderMarkdown(msg.text)}
                </div>
              </div>
            ))}
            {isChatting && (
              <div className="flex justify-start">
                <div className="bg-transparent border border-border text-foreground rounded-none p-5 flex gap-1.5">
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-primary rounded-none" />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-primary rounded-none" />
                  <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-primary rounded-none" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} className="h-4" />
          </div>

          {/* Chat Input */}
          <form onSubmit={sendMessage} className="p-3 md:p-4 border-t border-border bg-background/95 backdrop-blur-xl z-10 shrink-0">
            <div className="relative w-full">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={status === 'thinking' ? "Gemini is formulating..." : "Ask Gemini to refine..."}
                disabled={status === 'thinking'}
                className="w-full bg-transparent border-b border-border text-foreground rounded-none pl-4 pr-14 py-3 md:py-4 text-sm md:text-base focus:outline-none focus:border-primary transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatting || status === 'thinking'}
                className="absolute right-0 top-1 bottom-1 w-12 bg-transparent text-muted-foreground flex items-center justify-center hover:text-foreground disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4 md:w-5 h-5" />
              </button>
            </div>
          </form>
        </div>

        {/* Sliding Plan Panel */}
        <AnimatePresence>
          {isPlanOpen && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 w-full h-full bg-white z-30 flex flex-col overflow-hidden"
            >
              <div className="w-full h-full flex flex-col">
                <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-200 bg-gray-50 shrink-0">
                  <h3 className="font-display font-bold text-gray-900 flex items-center gap-2 text-sm md:text-base">
                    <LayoutTemplate className="w-4 h-4 text-primary" />
                    <span className="hidden xs:inline">Generated Strategy Plan</span>
                    <span className="xs:hidden">Strategy Plan</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrint}
                      className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors hidden sm:block"
                      title="Print / Save PDF"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsPlanOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs md:text-sm font-bold uppercase tracking-wider rounded-none transition-all"
                    >
                      <Send className="w-3.5 h-3.5 md:w-4 h-4 rotate-180" />
                      Back to Chat
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden bg-white p-0">
                  {debouncedPlanHtml ? (
                    <div className="w-full h-full relative">
                      {status === 'thinking' && !debouncedPlanHtml ? (
                        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-20">
                          <div className="p-6 flex flex-col items-center">
                            <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
                            <h4 className="text-gray-900 font-display font-bold text-2xl">Updating Your Strategy</h4>
                            <p className="text-gray-500 text-lg mt-4 text-center max-w-md">
                              We're incorporating your feedback and refining the report. This will be ready in just a few seconds.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <iframe 
                            srcDoc={debouncedPlanHtml} 
                            className="w-full h-full border-0" 
                            sandbox="allow-scripts allow-same-origin"
                            title="Generated Plan Preview"
                          />
                          
                          {/* Selection Feedback UI */}
                          <AnimatePresence>
                            {selectionData && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                style={{ 
                                  position: 'absolute',
                                  left: `${Math.min(Math.max(selectionData.x - 150, 20), window.innerWidth - 320)}px`,
                                  top: `${Math.max(selectionData.y - 140, 20)}px`,
                                  zIndex: 50
                                }}
                                className="w-80 bg-background rounded-none shadow-2xl border border-border p-4 flex flex-col gap-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Section Feedback</span>
                                  <button onClick={() => setSelectionData(null)} className="text-muted-foreground hover:text-foreground">
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="text-xs text-muted-foreground italic line-clamp-2 border-l-2 border-primary pl-2 py-1 bg-muted/30">
                                  "{selectionData.text}"
                                </div>
                                <textarea
                                  autoFocus
                                  value={feedbackText}
                                  onChange={(e) => setFeedbackText(e.target.value)}
                                  placeholder="What should we change about this section?"
                                  className="w-full text-sm p-2 bg-transparent text-foreground border border-border rounded-none focus:border-primary outline-none resize-none h-20"
                                />
                                <button
                                  onClick={handleFeedbackSubmit}
                                  disabled={!feedbackText.trim() || isChatting}
                                  className="w-full py-2 bg-primary text-primary-foreground rounded-none text-xs font-bold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                  {isChatting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                  Update Section
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                      <p>Preparing your strategic report...</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
