import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, X, Sparkles, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface UploadedImage {
  id: string;
  url: string; 
  name?: string; 
  type: 'image' | 'video' | 'document' | 'url';
  label: string;
  analysis?: any;
  colors?: string[];
}

interface ImageUploadProps {
  value?: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  onColorsExtracted?: (colors: string[]) => void;
  onAssetAnalyzed?: (data: any) => void;
  className?: string;
}

function resizeAndCompressImage(dataUrl: string, maxDim: number = 800, quality: number = 0.6): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

export function ImageUpload({ value = [], onImagesChange, onColorsExtracted, onAssetAnalyzed, className }: ImageUploadProps) {
  const [assets, setAssets] = useState<UploadedImage[]>(value);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(assets)) {
      setAssets(value);
    }
  }, [value]);

  useEffect(() => {
    onImagesChange(assets);
  }, [assets]);

  const processFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    // We compact everything to their least memory utilization form without truncating
    const reader = new FileReader();
    return new Promise<UploadedImage>((resolve) => {
      reader.onloadend = async () => {
        let resultData = reader.result?.toString() || '';
        
        if (isImage) {
          try {
            resultData = await resizeAndCompressImage(resultData, 1024, 0.6);
          } catch (e) {}
        }
        
        resolve({
          id: Math.random().toString(36).substring(7),
          url: resultData,
          name: file.name,
          type: isImage ? 'image' : isVideo ? 'video' : 'document',
          label: 'Asset'
        });
      };
      
      if (isImage || isVideo || file.type === 'application/pdf') {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const processUrl = async (url: string) => {
    return {
      id: Math.random().toString(36).substring(7),
      url: url,
      name: url,
      type: 'url' as const,
      label: 'Link'
    };
  };

  const handleUrlAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;
    
    let targetUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }
    
    const asset = await processUrl(targetUrl);
    setAssets(prev => [...prev, asset]);
    setUrlInput('');
    
    toast.info(`Analyzing URL...`);
    analyzeSingleAsset(asset);
  };

  const analyzeSingleAsset = async (asset: UploadedImage) => {
    try {
      const payload = {
        type: asset.type,
        content: asset.url,
        name: asset.name
      };
      const res = await fetch('/api/analyze-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const analysis = await res.json();
        setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, analysis, colors: analysis.colorStory } : a));
        toast.success(`Analyzed ${asset.name}`);
      }
    } catch (err) {
      console.error(`Failed to analyze ${asset.name}`, err);
      toast.error(`Failed to analyze ${asset.name}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    toast.info(`Processing ${files.length} assets...`);
    
    // Compact files
    const newAssets = await Promise.all(files.map(f => processFile(f)));
    setAssets(prev => [...prev, ...newAssets]);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Analyze all newly added files in parallel
    toast.info(`Running parallel analysis on ${newAssets.length} assets...`);
    
    await Promise.all(newAssets.map(asset => analyzeSingleAsset(asset)));
  };

  const handleSynthesize = async () => {
    if (assets.length === 0) {
      toast.error("Upload assets first");
      return;
    }
    
    setIsAnalyzingAll(true);
    toast.info("Synthesizing overall brand aesthetic (GPT-5.6-sol)...");
    
    try {
      const res = await fetch('/api/synthesize-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets })
      });
      
      if (res.ok) {
        const result = await res.json();
        toast.success("Synthesis complete! Updating design parameters.");
        
        if (onColorsExtracted && result.brandColors) {
          onColorsExtracted(result.brandColors);
        }
        
        if (onAssetAnalyzed) {
          onAssetAnalyzed({
            brandDescription: result.robustDescription,
            brandPersonality: "Synthesized Aesthetic",
            vision: result.typography + " typography. " + result.robustDescription
          });
        }
      } else {
        toast.error("Failed to synthesize assets");
      }
    } catch (err) {
      toast.error("Failed to synthesize assets");
      console.error(err);
    } finally {
      setIsAnalyzingAll(false);
    }
  };

  const removeAsset = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className={cn("w-full space-y-6 text-left", className)}>
      <input 
        type="file" 
        multiple
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-dashed border-border p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all rounded-xl text-center bg-muted/10 min-h-[160px]" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-8 h-8 text-muted-foreground mb-4" />
          <p className="text-sm font-semibold">Upload Brand Assets</p>
          <p className="text-xs text-muted-foreground mt-2">
            Images, videos, or documents (TXT, PDF, HTML, MD, TSX, JS, CSS, PY, JSON, YAML).
          </p>
        </div>

        <div className="border border-border p-6 flex flex-col justify-center rounded-xl bg-card/10 min-h-[160px]">
          <p className="text-sm font-semibold mb-3">Add Link Reference</p>
          <form onSubmit={handleUrlAdd} className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://competitor.com"
              className="w-full text-xs rounded-lg border border-border bg-transparent px-3 py-2 focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      {assets.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Portfolio ({assets.length})</h4>
            <button
              type="button"
              onClick={handleSynthesize}
              disabled={isAnalyzingAll}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded-lg flex items-center gap-2"
            >
              {isAnalyzingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Synthesize Brand Aesthetic
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {assets.map(asset => (
              <div key={asset.id} className="p-4 border border-border/60 bg-card rounded-xl relative group flex gap-4">
                <button onClick={() => removeAsset(asset.id)} className="absolute top-2 right-2 p-1 bg-muted rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
                <div className="w-16 h-16 bg-muted rounded flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                  {asset.type === 'image' ? (
                    <img src={asset.url} className="w-full h-full object-cover" alt="" />
                  ) : asset.type === 'url' ? (
                    <LinkIcon className="w-6 h-6 text-indigo-400" />
                  ) : (
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">{asset.type}</span>
                  )}
                </div>
                <div className="text-left flex-1 min-w-0 pr-4">
                  <p className="text-xs font-bold truncate text-foreground">{asset.name}</p>
                  {asset.analysis ? (
                    <div className="mt-2 text-[10px] space-y-1.5 text-muted-foreground">
                      <p><strong className="text-foreground">Type:</strong> {asset.analysis.assetType}</p>
                      <p className="truncate"><strong className="text-foreground">Colors:</strong> {asset.analysis.colorStory?.join(', ')}</p>
                      <p className="line-clamp-2"><strong className="text-foreground">Identity:</strong> {asset.analysis.brandIdentity}</p>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> Analyzing...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
