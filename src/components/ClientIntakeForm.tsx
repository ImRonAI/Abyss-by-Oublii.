import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, ChevronLeft, Send, CheckCircle2, Sparkles, 
  Wand2, Mic, FileText, ArrowRight, User, Mail, Building, 
  MapPin, RefreshCw, Layers, Sliders, Check, Eye
} from 'lucide-react';
import { toast } from 'sonner';

import { db, auth } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import { VoiceTextarea } from './ui/VoiceTextarea';
import { MultiSelect } from './ui/MultiSelect';
import { ColorPicker } from './ui/ColorPicker';
import { TypographyPicker } from './ui/TypographyPicker';
import { LocationInput } from './ui/LocationInput';
import { ImageUpload } from './ui/ImageUpload';
import { AIStrategyView } from './AIStrategyView';
import { VoiceInterview } from './VoiceInterview';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const PROJECT_TYPES = [
  'Website', 'AI Agent', 'E-Commerce', 'Customer Support', 
  'Mobile App', 'Web App', 'Dashboard', 'API/Backend', 'Social Media Management', 'Logo'
];

const DESIRED_FEELS = [
  'Modern & Clean', 'Bold & Striking', 'Minimal & Simple', 
  'Playful & Fun', 'Professional & Corporate', 'Luxurious & Premium', 
  'Friendly & Approachable', 'Innovative & Tech-Forward'
];

const formSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  company: z.string().min(2, 'Company name is required'),
  industry: z.string().min(2, 'Industry is required'),
  yearsInBusiness: z.string().min(1, 'Years in business is required'),
  areaOfOperations: z.string().min(2, 'Area of operations is required'),
  projectTypes: z.array(z.string()).min(1, 'Select at least one project type'),
  
  brandName: z.string().min(2, 'Brand name is required'),
  brandDescription: z.string().optional(),
  targetAudience: z.string().optional(),
  brandPersonality: z.string().optional(),
  images: z.array(z.any()).optional(),
  generatedLogos: z.array(z.string()).optional(),
  generatedLogo: z.string().optional(),
  colorPreferences: z.array(z.string()).optional(),
  typography: z.string().optional(),
  
  vision: z.string().min(6, 'Please provide a brief vision'),
  desiredFeel: z.array(z.string()).min(1, 'Select at least one desired feel'),
  projectStory: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const STEPS = [
  { id: 'basics', title: 'Basics & Jurisdictions', desc: 'Review corporate entity details, industry sectors, and operating coordinates.' },
  { id: 'brand', title: 'Brand Identity', desc: 'Define brand designation, strategic mission briefings, and consumer targets.' },
  { id: 'style', title: 'Style & Refinement', desc: 'Calibrate typographic families, color palettes, and emotional feeling cues.' },
];

export function ClientIntakeForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [initiationMode, setInitiationMode] = useState<'assets-upload' | 'selection' | 'voice' | 'standard'>('assets-upload');
  const [showCombinedReviewBoard, setShowCombinedReviewBoard] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPersonality, setIsGeneratingPersonality] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      industry: 'Technology',
      yearsInBusiness: '1-3 Years',
      projectTypes: [],
      colorPreferences: [],
      desiredFeel: [],
      typography: 'sans',
      areaOfOperations: '',
      images: [],
      brandName: '',
      brandDescription: '',
      brandPersonality: '',
      targetAudience: '',
      vision: '',
      projectStory: ''
    },
  });

  const uploadedImages = watch('images') || [];
  const projectTypes = watch('projectTypes') || [];
  const showBrandPersonality = uploadedImages.length > 0;
  const showLogoGenerator = projectTypes.includes('Logo');

  const generateLogo = async () => {
    setIsGeneratingLogo(true);
    try {
      const formValues = getValues();
      const styles = [
        "Minimalist modern geometry, crisp lines, perfect balance.",
        "Bold luxury emblem, crest motif, gold and charcoal accent.",
        "Sleek innovative technology monogram logo.",
        "Elegant editorial wordmark with custom typeface."
      ];

      toast.info("Generating 4 unique logo variations...");

      const generatedB64Images: string[] = [];
      for (const style of styles) {
        try {
          const resp = await fetch("/api/generate-logo", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              brandName: formValues.brandName,
              vision: formValues.vision,
              brandPersonality: formValues.brandPersonality,
              desiredFeel: formValues.desiredFeel,
              style: style
            })
          });

          if (!resp.ok) {
            throw new Error(`Logo generation failed table status ${resp.status}`);
          }

          const result = await resp.json();
          if (result.success && result.imageUrl) {
            generatedB64Images.push(result.imageUrl);
          }
        } catch (e) {
          console.error("Single logo block generation skipped:", e);
        }
      }

      if (generatedB64Images.length > 0) {
        setValue('generatedLogos', generatedB64Images, { shouldValidate: true });
        if (!getValues('generatedLogo')) {
          setValue('generatedLogo', generatedB64Images[0], { shouldValidate: true });
        }
        toast.success(`Successfully designed and generated ${generatedB64Images.length} custom logos!`);
      } else {
        toast.error("Logo creation limits reached. Please check API plan status.");
      }
    } catch (error: any) {
      console.error("Failed model logo design:", error);
      toast.error("Failed to make logo. Verify API key privileges.");
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const generateBrandPersonality = async () => {
    if (uploadedImages.length === 0) return;
    
    setIsGeneratingPersonality(true);
    try {
      const imageDescriptions = uploadedImages
        .filter((img: any) => img.analysis)
        .map((img: any) => `[${img.label}]: ${img.analysis}`)
        .join('\n');

      if (!imageDescriptions) {
        toast.error("Analyzing uploads. Give us a few more seconds...");
        return;
      }

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          contents: `Generate 3-4 professional, highly sophisticated brand personality keywords (e.g. Elegant, Brutalist, Disruptive, Safe) based on these gathered assets:\n\n${imageDescriptions}`
        })
      });

      if (!response.ok) {
        throw new Error("Proxy call failed");
      }

      const data = await response.json();
      if (data.text) {
        setValue('brandPersonality', data.text.trim(), { shouldValidate: true });
        toast.success("Sophisticated brand personality attributes synthesized!");
      }
    } catch (error) {
      console.error("Brand personality fail:", error);
      toast.error("Standard model timeout. Please type attributes.");
    } finally {
      setIsGeneratingPersonality(false);
    }
  };

  const handleVoiceDataApplied = (voiceData: any) => {
    setValue('brandName', voiceData.brandName || getValues('brandName') || "Intelligent Hub", { shouldValidate: true });
    setValue('brandDescription', voiceData.brandDescription || getValues('brandDescription') || "An automated, elegant organization.", { shouldValidate: true });
    setValue('targetAudience', voiceData.targetAudience || getValues('targetAudience') || "High-growth enterprises and early adopters.", { shouldValidate: true });
    setValue('brandPersonality', voiceData.brandPersonality || getValues('brandPersonality') || "Sophisticated, Modern, Trustworthy", { shouldValidate: true });
    setValue('vision', voiceData.vision || getValues('vision') || "To spearhead beautiful, search-optimized web architectures globally.", { shouldValidate: true });
    setValue('desiredFeel', voiceData.desiredFeel || getValues('desiredFeel') || ["Modern & Clean"], { shouldValidate: true });
    setValue('colorPreferences', voiceData.colorPreferences || getValues('colorPreferences') || ["#09090b", "#6366f1"], { shouldValidate: true });
    setValue('typography', 'sans', { shouldValidate: true });

    setValue('name', getValues('name') || "Valued Consult", { shouldValidate: true });
    setValue('email', getValues('email') || "partner@catolabs.io", { shouldValidate: true });
    setValue('company', getValues('company') || voiceData.brandName || "Intelligent Hub", { shouldValidate: true });
    setValue('areaOfOperations', getValues('areaOfOperations') || "San Francisco, CA", { shouldValidate: true });
    setValue('projectTypes', getValues('projectTypes')?.length ? getValues('projectTypes') : ["Website"], { shouldValidate: true });

    setShowCombinedReviewBoard(true);
    setCurrentStep(2);
    setInitiationMode('standard');
    toast.success("Voice consultation synthesized! Review and finalize your custom values.");
  };

  // Perform AI synthesize of all 15 collected assets (Images, Docs, URL context) in Step 2
  const handleAutoFillRemaining = async () => {
    if (uploadedImages.length === 0) {
      toast.error("Please insert/upload at least 1 file or link reference first.");
      return;
    }

    toast.info("Synthesizing reference assets via Cato Brand AI...");
    
    // Concatenate details
    const referenceSummary = uploadedImages
      .map((asset: any) => `Asset [${asset.label} - ${asset.type}]: ${asset.name || ''}. AI Analysis: ${asset.analysis || ''}`)
      .join('\n\n');

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: 'gemini-3.5-flash',
          contents: `You are an elite brand strategist parsing a portfolio of ${uploadedImages.length} assets to autofill our intake form.
          Here is their asset intelligence:
          ${referenceSummary}
          
          Generate a strict JSON representing our intake form options:
          {
            "brandName": "A brilliant descriptive brand/company name matching these assets",
            "brandDescription": "A concise corporate mission overview matching the visual core (1-2 sentences)",
            "brandPersonality": "Sophisticated, Avant-Garde, Dynamic",
            "targetAudience": "Description of high-intent target audience",
            "vision": "A magnificent digital engineering project vision (2 sentences)",
            "desiredFeel": ["Must be 2 or 3 exact items chosen from: Modern & Clean, Bold & Striking, Minimal & Simple, Playful & Fun, Professional & Corporate, Luxurious & Premium, Friendly & Approachable, Innovative & Tech-Forward"],
            "colorPreferences": ["Up to 3 hex color codes matching the aesthetics, e.g. #0f172a"]
          }
          Wrap the output strictly in a JSON block.`,
          config: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error("Proxy synthesize call failed");
      }

      const data = await response.json();
      if (data.text) {
        let cleanText = data.text.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        }
        const result = JSON.parse(cleanText);
        
        if (result.brandName) setValue('brandName', result.brandName, { shouldValidate: true });
        if (result.brandDescription) setValue('brandDescription', result.brandDescription, { shouldValidate: true });
        if (result.brandPersonality) setValue('brandPersonality', result.brandPersonality, { shouldValidate: true });
        if (result.targetAudience) setValue('targetAudience', result.targetAudience, { shouldValidate: true });
        if (result.vision) setValue('vision', result.vision, { shouldValidate: true });
        if (result.desiredFeel) setValue('desiredFeel', result.desiredFeel, { shouldValidate: true });
        if (result.colorPreferences) {
          const combined = [...new Set([...(getValues('colorPreferences') || []), ...result.colorPreferences])].slice(0, 5);
          setValue('colorPreferences', combined, { shouldValidate: true });
        }

        // Redirect directly to review panel
        setShowCombinedReviewBoard(true);
        toast.success("Portfolio integrated! Review autofilled draft details below.");
      }
    } catch (err) {
      console.error("AIdraft failed:", err);
      toast.error("Model busy. Try standard step progression.");
    }
  };

  useEffect(() => {
    if (formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentStep, initiationMode]);

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isStepValid = await trigger(fieldsToValidate);
    
    if (isStepValid) {
      if (currentStep === STEPS.length - 1) {
        setShowCombinedReviewBoard(true);
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      }
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const getFieldsForStep = (step: number): (keyof FormData)[] => {
    switch (step) {
      case 0: return ['name', 'email', 'company', 'industry', 'yearsInBusiness', 'areaOfOperations', 'projectTypes'];
      case 1: return ['brandName'];
      case 2: return ['desiredFeel'];
      default: return [];
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      const firestoreData: any = { ...cleanData };

      try {
        await addDoc(collection(db, 'inquiries'), {
          ...firestoreData,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'inquiries');
      }

      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(firestoreData),
        });
      } catch (e) {
        console.warn("Express backend alert offline.", e);
      }

      setSubmittedData(data);
      setIsSuccess(true);
      toast.success("Intake portfolio saved & submitted!");
    } catch (error) {
      console.error("Intake submission failure:", error);
      toast.error("Failed to submit inquiry. Check values.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess && submittedData) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full flex-1 flex flex-col"
      >
        <AIStrategyView 
          formData={submittedData} 
          onEndSession={() => window.location.reload()} 
        />
      </motion.div>
    );
  }

  // OPENING FILE/ASSETS UPLOAD PAGE
  if (initiationMode === 'assets-upload') {
    return (
      <div className="max-w-4xl mx-auto w-full space-y-10 text-center px-4 py-8 md:py-16">
        <div className="space-y-4 text-center">
          <div className="text-[10px] tracking-[0.3em] font-mono font-bold uppercase text-muted-foreground/80">
            Cato Studios • Creative Intake Platform
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-light tracking-tight text-foreground">
            The Brand <span className="font-serif italic text-primary/80">Archive</span>
          </h1>
          <p className="text-sm md:text-base font-serif italic text-muted-foreground/90 max-w-2xl mx-auto leading-relaxed">
            Submit design drafts, mood boards, style briefs, or client bookmarks. Our design engine evaluates typographical choices, geometry configurations, and color swatches to pre-populate your strategic blueprint.
          </p>
        </div>

        <div className="border border-border/80 bg-background rounded-none p-6 md:p-10 text-left max-w-3xl mx-auto relative">
          <div className="space-y-6">
            <div className="space-y-1.5 border-b border-border/50 pb-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">Strategic Assets Ingestion Chute</h3>
              <p className="text-xs text-muted-foreground font-serif italic">Support images (JPEG, PNG) or strategic briefs (PDF, TXT, MD, DOCX) up to 20 reference vectors.</p>
            </div>

            <ImageUpload 
              value={watch('images') || []}
              onImagesChange={(images) => setValue('images', images)} 
              onColorsExtracted={(colors) => {
                const currentColors = getValues('colorPreferences') || [];
                const combinedColors = [...new Set([...currentColors, ...colors])].slice(0, 5);
                setValue('colorPreferences', combinedColors, { shouldValidate: true });
              }}
              onAssetAnalyzed={(data) => {
                // Pre-fill fields on complete analysis!
                if (data.brandName && !getValues('brandName')) {
                  setValue('brandName', data.brandName);
                }
                if (data.brandDescription && !getValues('brandDescription')) {
                  setValue('brandDescription', data.brandDescription);
                }
                if (data.brandPersonality && !getValues('brandPersonality')) {
                  setValue('brandPersonality', data.brandPersonality);
                }
                if (data.targetAudience && !getValues('targetAudience')) {
                  setValue('targetAudience', data.targetAudience);
                }
                if (data.vision && !getValues('vision')) {
                  setValue('vision', data.vision);
                }
                if (data.desiredFeel && (!getValues('desiredFeel') || getValues('desiredFeel').length === 0)) {
                  setValue('desiredFeel', data.desiredFeel);
                }
              }}
            />
          </div>

          <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-[11px] text-muted-foreground font-serif italic max-w-[320px] text-center sm:text-left leading-relaxed">
              * Design intelligence scans these assets to automatically synthesize corporate details on subsequent steps.
            </p>
            <button
              type="button"
              onClick={() => {
                setInitiationMode('selection');
                toast.success("Assets registered! Now choose your interaction style.");
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3.5 rounded-none text-xs font-bold uppercase tracking-widest transition-all group shrink-0"
            >
              <span>Submit & Proceed</span>
              <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CHOICE MATRIX: First interaction screen
  if (initiationMode === 'selection') {
    return (
      <div className="max-w-4xl mx-auto w-full space-y-10 text-center px-4 py-8 md:py-16">
        <div className="space-y-4 text-center">
          <div className="text-[10px] tracking-[0.3em] font-mono font-bold uppercase text-muted-foreground/80">
            Aesthetic Initiation • Interface Calibration
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-light tracking-tight text-foreground">
            The Creative <span className="font-serif italic text-primary/80">Inquiry</span>
          </h1>
          <p className="text-sm md:text-base font-serif italic text-muted-foreground/90 max-w-xl mx-auto leading-relaxed">
            Select your preferred consultation medium. Connect instantly via real-time synthesized voice dialogue, or calibrate your project manually via our modular portfolio matrix.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 max-w-3xl mx-auto">
          {/* Card 1: Live Voice Interview */}
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setInitiationMode('voice')}
            className="group cursor-pointer border border-border/85 p-8 md:p-10 rounded-none bg-background hover:bg-muted/10 text-left transition-all relative flex flex-col justify-between min-h-[280px]"
          >
            <div className="space-y-5">
              <div className="w-10 h-10 rounded-none border border-border flex items-center justify-center text-foreground/80 group-hover:bg-foreground group-hover:text-background transition-all duration-300">
                <Mic className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-mono font-bold uppercase tracking-wider text-foreground">
                Voice Consult
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed font-serif italic">
                Engage in a live audio interview with our strategy agent. State your vision, goals, and aesthetic benchmarks naturally. The system compiles and structure-fills your answers automatically.
              </p>
            </div>
            
            <div className="mt-8 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-foreground/80 group-hover:text-foreground transition-colors border-t border-border/40 pt-4">
              <span>Initialize Dialogue</span>
              <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>

          {/* Card 2: Guided Portfolio Matrix */}
          <motion.div
            whileHover={{ y: -2 }}
            onClick={() => setInitiationMode('standard')}
            className="group cursor-pointer border border-border/85 p-8 md:p-10 rounded-none bg-background hover:bg-muted/10 text-left transition-all relative flex flex-col justify-between min-h-[280px]"
          >
            <div className="space-y-5">
              <div className="w-10 h-10 rounded-none border border-border flex items-center justify-center text-foreground/80 group-hover:bg-foreground group-hover:text-background transition-all duration-300">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-mono font-bold uppercase tracking-wider text-foreground">
                Guided Matrix
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed font-serif italic">
                Proceed through our structured modular portal. Fine-tune your color coordinates, nominate custom typeface styles, inspect up to 20 uploaded assets, and craft your strategic parameters step-by-step.
              </p>
            </div>

            <div className="mt-8 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-foreground/80 group-hover:text-foreground transition-colors border-t border-border/40 pt-4">
              <span>Proceed Manually</span>
              <ArrowRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Live voice active view
  if (initiationMode === 'voice') {
    return (
      <div className="max-w-4xl mx-auto w-full px-4 py-8">
        <VoiceInterview 
          brandName={watch('brandName') || ''}
          brandPersonality={watch('brandPersonality') || ''}
          assetsContext={(watch('images') || [])
            .map((img: any) => `[${img.label || 'Asset'} - ${img.type || 'File'}]: ${img.name || ''}. Automated AI Analysis: ${img.analysis || 'Pending'}`)
            .join('\n\n')}
          onInterviewCompleted={handleVoiceDataApplied}
          onCancel={() => setInitiationMode('selection')}
        />
      </div>
    );
  }

  // STANDARD INTAKE STEPS
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto w-full px-4 py-6 md:py-10"
    >
      {/* Upper Navigation Header bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 border-b border-border/40 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono tracking-[0.25em] font-bold uppercase text-muted-foreground">
            Inquiry Workspace
          </span>
        </div>

      </div>

      <AnimatePresence mode="wait">
        {showCombinedReviewBoard ? (
          // CONSOLIDATED WORKSPACE: Review and tweak all 12 questions side-by-side!
          <motion.div
            key="review-board"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-8 text-left"
          >
            <div className="space-y-3 text-center pb-6">
              <div className="text-[10px] tracking-[0.3em] font-mono font-bold uppercase text-muted-foreground">
                Consolidated Synthesis Review
              </div>
              <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tight text-foreground">
                Review & <span className="font-serif italic text-primary/80">Refine</span>
              </h2>
              <p className="text-sm font-serif italic text-muted-foreground/90 max-w-2xl mx-auto leading-relaxed">
                All design and architectural parameters have been compiled. Review, optimize, and finalize any specifications before initiating the generation sequence.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Block: Client Basics & Selected Projects */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="border border-border/80 bg-background rounded-none p-6 space-y-6 shadow-none">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-foreground flex items-center gap-2 border-b border-border pb-3">
                      <User className="w-3.5 h-3.5 text-muted-foreground" /> <span>Basics Portfolio</span>
                    </h3>
                    
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Contact Partner Name</label>
                        <input {...register('name')} className="w-full text-sm bg-transparent border-b border-border hover:border-foreground/35 focus:border-foreground rounded-none py-2 focus:outline-none transition-colors text-foreground" />
                        {errors.name && <p className="text-destructive text-[11px] mt-1">{errors.name.message}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Email Address</label>
                        <input {...register('email')} type="email" className="w-full text-sm bg-transparent border-b border-border hover:border-foreground/35 focus:border-foreground rounded-none py-2 focus:outline-none transition-colors text-foreground" />
                        {errors.email && <p className="text-destructive text-[11px] mt-1">{errors.email.message}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Company Entity</label>
                        <input {...register('company')} className="w-full text-sm bg-transparent border-b border-border hover:border-foreground/35 focus:border-foreground rounded-none py-2 focus:outline-none transition-colors text-foreground" />
                        {errors.company && <p className="text-destructive text-[11px] mt-1">{errors.company.message}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Area of Operations</label>
                        <Controller
                          name="areaOfOperations"
                          control={control}
                          render={({ field }) => (
                            <LocationInput value={field.value || ''} onChange={field.onChange} />
                          )}
                        />
                        {errors.areaOfOperations && <p className="text-destructive text-[11px] mt-1">{errors.areaOfOperations.message}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="border border-border/80 bg-background rounded-none p-6 space-y-4 shadow-none">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-foreground flex items-center gap-2 border-b border-border pb-3">
                      <Layers className="w-3.5 h-3.5 text-muted-foreground" /> <span>Scope Requirements</span>
                    </h3>
                    <Controller
                      name="projectTypes"
                      control={control}
                      render={({ field }) => (
                        <MultiSelect options={PROJECT_TYPES} selected={field.value} onChange={field.onChange} />
                      )}
                    />
                    {errors.projectTypes && <p className="text-destructive text-[11px] mt-1">{errors.projectTypes.message}</p>}
                  </div>
                </div>

                {/* Right/Mid Block: Brand Identity Context, Colors, Vibe */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Brand Grid parameters */}
                  <div className="border border-border/80 bg-background rounded-none p-6 md:p-8 space-y-6 shadow-none">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-foreground border-b border-border pb-3">
                      Brand Personality & Style Coordinates
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Official Brand / Project Name</label>
                        <input {...register('brandName')} className="w-full text-sm bg-transparent border-b border-border hover:border-foreground/35 focus:border-foreground rounded-none py-2 focus:outline-none transition-colors text-foreground font-semibold" />
                        {errors.brandName && <p className="text-destructive text-[11px] mt-1">{errors.brandName.message}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Synthesized Personality Attributes</label>
                        <input {...register('brandPersonality')} placeholder="Modern, Elite, Minimal" className="w-full text-sm bg-transparent border-b border-border hover:border-foreground/35 focus:border-foreground rounded-none py-2 focus:outline-none transition-colors text-foreground font-mono" />
                      </div>
                    </div>

                    <div className="space-y-5 pt-4 border-t border-border/40">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Brand Mission Description</label>
                        <Controller
                          name="brandDescription"
                          control={control}
                          render={({ field }) => (
                            <VoiceTextarea value={field.value || ''} onValueChange={field.onChange} placeholder="Our brand solves..." />
                          )}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Target Audience</label>
                        <Controller
                          name="targetAudience"
                          control={control}
                          render={({ field }) => (
                            <VoiceTextarea value={field.value || ''} onValueChange={field.onChange} placeholder="Audience mapping..." />
                          )}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Aesthetic Vision Statement</label>
                        <Controller
                          name="vision"
                          control={control}
                          render={({ field }) => (
                            <VoiceTextarea value={field.value || ''} onValueChange={field.onChange} placeholder="Our product vision..." />
                          )}
                        />
                        {errors.vision && <p className="text-destructive text-[11px] mt-1">{errors.vision.message}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Project Story & Inception Notes</label>
                        <Controller
                          name="projectStory"
                          control={control}
                          render={({ field }) => (
                            <VoiceTextarea value={field.value || ''} onValueChange={field.onChange} placeholder="Share the story behind this project, its inception, or any extra background context..." />
                          )}
                        />
                      </div>
                    </div>

                    {/* Preferences options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border/40">
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Identified Color Coordinates</label>
                        <Controller
                          name="colorPreferences"
                          control={control}
                          render={({ field }) => (
                            <ColorPicker colors={field.value || []} onChange={field.onChange} />
                          )}
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Typography Preference</label>
                        <Controller
                          name="typography"
                          control={control}
                          render={({ field }) => (
                            <TypographyPicker selected={field.value || 'sans'} onChange={field.onChange} />
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-border/40">
                      <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Desired Brand Feelings</label>
                      <Controller
                        name="desiredFeel"
                        control={control}
                        render={({ field }) => (
                          <MultiSelect options={DESIRED_FEELS} selected={field.value} onChange={field.onChange} />
                        )}
                      />
                      {errors.desiredFeel && <p className="text-destructive text-[11px] mt-1">{errors.desiredFeel.message}</p>}
                    </div>
                  </div>

                  {/* Submit block */}
                  <div className="border border-border/80 bg-background rounded-none p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-left space-y-1">
                      <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">Initiate Corporate Roadmap?</h4>
                      <p className="text-xs text-muted-foreground font-serif italic">Proceeding triggers elite SEO & architectural layout synthesizers.</p>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowCombinedReviewBoard(false)}
                        className="px-6 py-3 border border-border hover:bg-muted/20 text-xs font-bold uppercase tracking-widest rounded-none transition-colors cursor-pointer"
                      >
                        Add References
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>Build Strategy Plan</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </form>
          </motion.div>
        ) : (
          // MODULAR STEPPED MATRIX WIZARD
          <div className="w-full flex flex-col lg:flex-row gap-8 md:gap-12 pt-4">
            
            {/* Steps indicator Left Sidebar */}
            <div className="w-full lg:w-1/3 lg:sticky lg:top-12 h-fit space-y-6 md:space-y-8 text-left">
              <div className="hidden lg:block space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-muted-foreground block border-b border-border/60 pb-2">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
                <h2 className="text-3.5xl font-serif font-light tracking-tight text-foreground">
                  {STEPS[currentStep].title}
                </h2>
                <p className="text-muted-foreground text-sm font-serif italic leading-relaxed">
                  {STEPS[currentStep].desc}
                </p>
              </div>
            </div>

            {/* Stepped content Form container */}
            <div className="w-full lg:w-2/3 border border-border/80 bg-background rounded-none p-6 md:p-10 text-left relative">

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative z-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-8"
                  >
                    
                     {/* STEP 1: BASICS & ASSETS */}
                     {currentStep === 0 && (
                       <div className="space-y-8">
                         {/* Sub-heading 1 */}
                         <div className="space-y-2 pb-4 border-b border-border/40 text-left">
                           <h3 className="text-base font-bold text-foreground font-display">
                             01. Registered Profile & Jurisdictions
                           </h3>
                           <p className="text-xs text-muted-foreground">
                             Please review, pre-fill, or change the designated point of contact and corporate entity structure coordinates.
                           </p>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1.5 flex flex-col items-start text-left">
                             <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Designated Point of Contact (Full Name) *</label>
                             <div className="relative w-full">
                               <span className="absolute left-0 top-3 text-muted-foreground">
                                 <User className="w-3.5 h-3.5" />
                               </span>
                               <input 
                                 {...register('name')} 
                                 className="w-full rounded-none border-b border-border bg-transparent pl-6 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
                                 placeholder="Sarah Jenkins"
                               />
                             </div>
                             {errors.name && <p className="text-destructive text-[11px]">{errors.name.message}</p>}
                           </div>

                           <div className="space-y-1.5 flex flex-col items-start text-left">
                             <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Strategic Correspondence Email *</label>
                             <div className="relative w-full">
                               <span className="absolute left-0 top-3 text-muted-foreground">
                                 <Mail className="w-3.5 h-3.5" />
                               </span>
                               <input 
                                 {...register('email')} 
                                 type="email"
                                 className="w-full rounded-none border-b border-border bg-transparent pl-6 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
                                 placeholder="sarah@company.com"
                               />
                             </div>
                             {errors.email && <p className="text-destructive text-[11px]">{errors.email.message}</p>}
                           </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1.5 flex flex-col items-start text-left">
                             <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Registered Company/Entity Name *</label>
                             <div className="relative w-full">
                               <span className="absolute left-0 top-3 text-muted-foreground">
                                 <Building className="w-3.5 h-3.5" />
                               </span>
                               <input 
                                 {...register('company')} 
                                 className="w-full rounded-none border-b border-border bg-transparent pl-6 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors text-foreground"
                                 placeholder="Lumina Health"
                               />
                             </div>
                             {errors.company && <p className="text-destructive text-[11px]">{errors.company.message}</p>}
                           </div>

                           <div className="space-y-1.5 text-left">
                             <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground block">Primary Regional Jurisdiction (Area of Operations) *</label>
                             <Controller
                               name="areaOfOperations"
                               control={control}
                               render={({ field }) => (
                                 <LocationInput 
                                   value={field.value || ''} 
                                   onChange={field.onChange} 
                                 />
                               )}
                             />
                             {errors.areaOfOperations && <p className="text-destructive text-[11px]">{errors.areaOfOperations.message}</p>}
                           </div>
                         </div>

                         {/* NEW: Industry Dropdown & Years in Business Select Boxes */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                           <div className="space-y-1.5 flex flex-col items-start text-left">
                             <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Core Industry Sector *</label>
                             <select 
                               {...register('industry')}
                               className="w-full rounded bg-muted/30 border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-foreground font-medium"
                             >
                               <option value="Technology">Technology</option>
                               <option value="E-Commerce">E-Commerce</option>
                               <option value="Finance & Banking">Finance & Banking</option>
                               <option value="Healthcare & Biotech">Healthcare & Biotech</option>
                               <option value="Retail & Consumer Goods">Retail & Consumer Goods</option>
                               <option value="Real Estate & Construction">Real Estate & Construction</option>
                               <option value="Media & Entertainment">Media & Entertainment</option>
                               <option value="Hospitality & Tourism">Hospitality & Tourism</option>
                               <option value="Education">Education</option>
                               <option value="Professional Services">Professional Services</option>
                               <option value="Other">Other</option>
                             </select>
                             {errors.industry && <p className="text-destructive text-[11px]">{errors.industry.message}</p>}
                           </div>

                           <div className="space-y-1.5 flex flex-col items-start text-left">
                             <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Commercial Years in Operation *</label>
                             <select 
                               {...register('yearsInBusiness')}
                               className="w-full rounded bg-muted/30 border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-foreground font-medium"
                             >
                               <option value="< 1 Year">&lt; 1 Year</option>
                               <option value="1-3 Years">1-3 Years</option>
                               <option value="3-5 Years">3-5 Years</option>
                               <option value="5-10 Years">5-10 Years</option>
                               <option value="10+ Years">10+ Years</option>
                             </select>
                             {errors.yearsInBusiness && <p className="text-destructive text-[11px]">{errors.yearsInBusiness.message}</p>}
                           </div>
                         </div>

                         <div className="space-y-3 pt-6 border-t border-border/45 flex flex-col items-start text-left">
                           <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-muted-foreground">Target Solution Enclosures (Primary Deliverables) *</label>
                           <Controller
                             name="projectTypes"
                             control={control}
                             render={({ field }) => (
                               <MultiSelect 
                                 options={PROJECT_TYPES} 
                                 selected={field.value} 
                                 onChange={field.onChange} 
                               />
                             )}
                           />
                           {errors.projectTypes && <p className="text-destructive text-[11px]">{errors.projectTypes.message}</p>}
                         </div>

                        </div>
                      )}

                      {/* STEP 2: BRAND IDENTITY & STRATEGY */}
                      {currentStep === 1 && (
                        <div className="space-y-8 animate-fadeIn">
                         {/* Sub-heading 2: Asset uploads & reference files */}
                         <div className="space-y-2 pt-8 border-t border-border/40 text-left">
                           <h3 className="text-base font-bold text-foreground font-display">
                             02. Brand Identity & Strategy Parameters
                           </h3>
                           <p className="text-xs text-muted-foreground">
                             Refine strategic branding parameters pre-filled from your initially analyzed files.
                           </p>
                         </div>

                         <div className="space-y-1.5 text-left">
                           <label className="text-xs font-bold text-foreground">Registered Brand System Designation (Official Brand Name) *</label>
                           <input 
                             {...register('brandName')} 
                             className="w-full rounded-none border-b border-border bg-transparent py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-foreground font-semibold"
                             placeholder="Introduce your official brand designation..."
                           />
                           {errors.brandName && <p className="text-destructive text-[11px]">{errors.brandName.message}</p>}
                         </div>

                         {/* Ref Assets already processed in Setup Chute page */}
                          
                          <div className="space-y-5 pt-4 border-t border-border/40 flex flex-col gap-4 w-full">
                            <div className="space-y-1.5 text-left flex flex-col items-start w-full">
                              <div className="flex items-center justify-between w-full">
                                <label className="text-xs font-bold text-foreground">Primary Brand Persona Vector (Personality Attributes)</label>
                                {uploadedImages.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={generateBrandPersonality}
                                    disabled={isGeneratingPersonality}
                                    className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-primary"
                                  >
                                    {isGeneratingPersonality ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3.5 h-3.5" />
                                    )}
                                    <span>Synthesize Attributes</span>
                                  </button>
                                )}
                              </div>
                              <input 
                                {...register('brandPersonality')} 
                                className="w-full rounded bg-muted/30 border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-foreground font-mono"
                                placeholder="E.g. Sophisticated, Premium, High-fidelity"
                              />
                            </div>

                            <div className="space-y-1.5 text-left flex flex-col items-start w-full font-sans">
                              <label className="text-xs font-bold text-foreground">Core Strategic Mission & Visual Objective Brief (Synthesized or Custom)</label>
                              <Controller
                                name="brandDescription"
                                control={control}
                                render={({ field }) => (
                                  <VoiceTextarea 
                                    value={field.value || ''} 
                                    onValueChange={field.onChange} 
                                    placeholder="Explain the brand's core mission..."
                                  />
                                )}
                              />
                            </div>

                            <div className="space-y-1.5 text-left flex flex-col items-start w-full font-sans">
                              <label className="text-xs font-bold text-foreground">Primary Consumer Persona & Target Audience Map</label>
                              <Controller
                                name="targetAudience"
                                control={control}
                                render={({ field }) => (
                                  <VoiceTextarea 
                                    value={field.value || ''} 
                                    onValueChange={field.onChange} 
                                    placeholder="Identify demographic targets or ideal businesses..."
                                  />
                                )}
                              />
                            </div>

                            <div className="space-y-1.5 text-left flex flex-col items-start w-full font-sans">
                              <label className="text-xs font-bold text-foreground">Aesthetic Vision Statement *</label>
                              <Controller
                                name="vision"
                                control={control}
                                render={({ field }) => (
                                  <VoiceTextarea 
                                    value={field.value || ''} 
                                    onValueChange={field.onChange} 
                                    placeholder="State your aesthetic and visual goals for this product..."
                                  />
                                )}
                              />
                              {errors.vision && <p className="text-destructive text-[11px]">{errors.vision.message}</p>}
                            </div>

                            <div className="space-y-1.5 text-left flex flex-col items-start w-full font-sans">
                              <label className="text-xs font-bold text-foreground">Project Story & Inception Notes</label>
                              <Controller
                                name="projectStory"
                                control={control}
                                render={({ field }) => (
                                  <VoiceTextarea 
                                    value={field.value || ''} 
                                    onValueChange={field.onChange} 
                                    placeholder="Share the story behind this project, its inception, or any extra background context..."
                                  />
                                )}
                              />
                            </div>
                          </div>

                        </div>
                      )}

                      {/* STEP 3: AESTHETIC ALIGNMENT & STYLE PAIRINGS */}
                      {currentStep === 2 && (
                        <div className="space-y-8 animate-fadeIn">
                          <div className="space-y-2 pb-4 border-b border-border/40 text-left">
                            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-foreground">
                              03. Aesthetic Alignment & Style Pairing
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Select typographic face structures, coordinate brand colors, and pick desired visual feelings.
                            </p>
                          </div>

                          <div className="space-y-3 pt-2 text-left flex flex-col items-start">
                            <label className="text-[11px] uppercase font-bold text-zinc-500 tracking-wider font-mono">Typographic Face Structure (Typography Selection)</label>
                            <Controller
                              name="typography"
                              control={control}
                              render={({ field }) => (
                                <TypographyPicker selected={field.value || 'sans'} onChange={field.onChange} />
                              )}
                            />
                          </div>

                        <div className="space-y-3 pt-6 border-t border-border/40">
                          <div className="flex h-fit items-center justify-between pb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Review Board</span>
                            <button
                              type="button"
                              onClick={() => setShowCombinedReviewBoard(true)}
                              className="text-xs font-bold tracking-tight text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/5 px-2.5 py-1 rounded border border-indigo-500/10"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Go to Combined Editor</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                  </motion.div>
                </AnimatePresence>

                {/* Wizard controller footer bar */}
                <div className="flex items-center justify-between pt-6 border-t border-border/45">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className={cn(
                      "flex items-center gap-2 px-5 py-3 rounded-none border border-border/70 text-xs uppercase font-bold tracking-widest transition-all hover:bg-muted/30 text-muted-foreground hover:text-foreground cursor-pointer",
                      currentStep === 0 && "opacity-0 pointer-events-none"
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <div className="flex gap-2">
                    {currentStep < STEPS.length - 1 ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="flex items-center justify-center gap-2 py-3.5 px-6 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all rounded-none text-center cursor-pointer"
                      >
                        <span>Next Step</span>
                        <ChevronRight className="w-4 h-4 text-primary-foreground stroke-[3px]" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="flex items-center justify-center gap-2 py-3.5 px-7 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold uppercase tracking-widest transition-all rounded-none text-center cursor-pointer"
                      >
                        <span>Review & Finalize Portfolio</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
                      </button>
                    )}
                  </div>
                </div>

              </form>
            </div>

          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
