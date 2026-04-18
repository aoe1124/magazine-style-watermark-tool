import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Download, Trash2, Settings, Image as ImageIcon, Loader2, X } from 'lucide-react';

import JSZip from 'jszip';
import { useLocalStorage } from './hooks/useLocalStorage';
import { applyWatermarkToBlob } from './lib/watermark';
import { motion, AnimatePresence } from 'motion/react';

interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string | null;
  blob: Blob | null;
}

export default function App() {
  const [storedText, setStoredText] = useLocalStorage('watermark_text', '公众号·子游小馆');
  const [storedQuality, setStoredQuality] = useLocalStorage('watermark_quality', 0.8);
  const [storedScale, setStoredScale] = useLocalStorage('watermark_scale', 1.0);
  const [storedOpacity, setStoredOpacity] = useLocalStorage('watermark_opacity', 1.0);
  
  const [textInput, setTextInput] = useState(storedText);
  const [qualityInput, setQualityInput] = useState(storedQuality);
  const [scaleInput, setScaleInput] = useState(storedScale);
  const [opacityInput, setOpacityInput] = useState(storedOpacity);
  
  const [debouncedText, setDebouncedText] = useState(storedText);
  const [debouncedQuality, setDebouncedQuality] = useState(storedQuality);
  const [debouncedScale, setDebouncedScale] = useState(storedScale);
  const [debouncedOpacity, setDebouncedOpacity] = useState(storedOpacity);

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDraggingOverRef = useRef(false);
  const [dragActive, setDragActive] = useState(false);

  // Debounce Text and Quality changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(textInput);
      setStoredText(textInput);
      
      setDebouncedQuality(qualityInput);
      setStoredQuality(qualityInput);

      setDebouncedScale(scaleInput);
      setStoredScale(scaleInput);

      setDebouncedOpacity(opacityInput);
      setStoredOpacity(opacityInput);
    }, 600);
    return () => clearTimeout(timer);
  }, [textInput, qualityInput, scaleInput, opacityInput, setStoredText, setStoredQuality, setStoredScale, setStoredOpacity]);

  // Process a single image
  const processImage = async (img: UploadedImage, text: string, quality: number, scale: number, opacityMultiplier: number) => {
    try {
      const blob = await applyWatermarkToBlob(img.file, { text, quality, scale, opacityMultiplier });
      const newPreviewUrl = URL.createObjectURL(blob);
      
      setImages(prev => prev.map(p => {
        if (p.id === img.id) {
          // Cleanup old preview
          if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
          return { ...p, blob, previewUrl: newPreviewUrl };
        }
        return p;
      }));
    } catch (err) {
      console.error(`Failed to process image ${img.file.name}:`, err);
    }
  };

  // Re-process all images when debounced settings change
  useEffect(() => {
    if (images.length === 0) return;
    
    // Mark them all as having no blob to show loading state if needed, or just process in background.
    // We will do it in background without blanking them out to avoid flickering.
    setIsProcessingAll(true);
    
    const run = async () => {
      // Process sequentially to not freeze the browser completely, or in small batches
      for (const img of images) {
        await processImage(img, debouncedText, debouncedQuality, debouncedScale, debouncedOpacity);
      }
      setIsProcessingAll(false);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedText, debouncedQuality, debouncedScale, debouncedOpacity]);

  // Handle Files Added
  const handleFiles = async (files: FileList | File[]) => {
    const newImages: UploadedImage[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(file => ({
        id: Math.random().toString(36).substring(7) + Date.now(),
        file,
        previewUrl: null,
        blob: null,
      }));

    if (newImages.length === 0) return;

    setImages(prev => [...prev, ...newImages]);
    
    setIsProcessingAll(true);
    for (const img of newImages) {
      await processImage(img, debouncedText, debouncedQuality, debouncedScale, debouncedOpacity);
    }
    setIsProcessingAll(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  }, [debouncedText, debouncedQuality]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  }, [dragActive]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const removed = prev.find(p => p.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;
    setIsZipping(true);
    
    try {
      const zip = new JSZip();
      
      images.forEach((img, i) => {
        if (img.blob) {
          // Keep original extension or assume jpeg based on our processor
          const ext = 'jpg';
          const originalName = img.file.name.replace(/\.[^/.]+$/, "");
          zip.file(`${originalName}_watermarked.${ext}`, img.blob);
        }
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `watermarked_images_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) {
      console.error('Failed to create zip', err);
      alert('Failed to create ZIP file.');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-editorial-bg flex flex-col md:flex-row text-editorial-ink font-editorial-sans">
      
      {/* Sidebar / Controls */}
      <div className="w-full md:w-[320px] bg-editorial-sidebar border-r border-editorial-border flex flex-col h-auto md:h-screen sticky top-0 shrink-0 z-10 p-[32px] gap-[24px]">
        <div className="flex flex-col mb-2">
          <h1 className="font-editorial-serif text-[24px] font-bold tracking-[-0.5px] leading-none mb-[8px]">水印工作台</h1>
          <p className="text-[11px] text-[#999] italic mt-[-8px]">极简 · 杂志风 · 保护</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[1px] font-bold text-[#888]">
              水印自定义文字
            </label>
            <input 
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full p-[12px] border border-editorial-border font-editorial-sans text-[14px] rounded-[4px] focus:outline-none focus:border-editorial-ink"
              placeholder="e.g. 公众号·子游小馆"
            />
            <p className="text-[11px] text-[#999] italic mt-[4px]">
              系统会自动将该文本融入顶底两端的装饰性版权说明中。
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[1px] font-bold text-[#888]">
              全局水印尺寸缩放
            </label>
            <div className="flex items-center gap-[12px]">
              <input 
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={scaleInput}
                onChange={(e) => setScaleInput(parseFloat(e.target.value))}
                className="flex-1 accent-editorial-ink h-[2px] bg-[#ddd] appearance-none cursor-pointer"
              />
              <span className="text-[12px] min-w-[30px] font-editorial-sans">
                {Math.round(scaleInput * 100)}%
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[1px] font-bold text-[#888]">
              不透明度调节
            </label>
            <div className="flex items-center gap-[12px]">
              <input 
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={opacityInput}
                onChange={(e) => setOpacityInput(parseFloat(e.target.value))}
                className="flex-1 accent-editorial-ink h-[2px] bg-[#ddd] appearance-none cursor-pointer"
              />
              <span className="text-[12px] min-w-[30px] font-editorial-sans">
                {Math.round(opacityInput * 100)}%
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase tracking-[1px] font-bold text-[#888]">
              导出图片质量
            </label>
            <div className="flex items-center gap-[12px]">
              <input 
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={qualityInput}
                onChange={(e) => setQualityInput(parseFloat(e.target.value))}
                className="flex-1 accent-editorial-ink h-[2px] bg-[#ddd] appearance-none cursor-pointer"
              />
              <span className="text-[12px] min-w-[30px] font-editorial-sans">
                {Math.round(qualityInput * 100)}%
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-[#999] italic mt-[4px]">
              <span>体积更小</span>
              <span>画质更佳</span>
            </div>
          </div>

        </div>

        <div className="mt-auto flex flex-col gap-2">
          <button
            disabled={images.length === 0 || isZipping || isProcessingAll}
            onClick={handleDownloadAll}
            className="bg-editorial-ink text-white border-none p-[16px] font-semibold uppercase tracking-[1px] cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-[12px] w-full"
          >
            {isZipping ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 打包压缩中...</>
            ) : isProcessingAll ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 处理中...</>
            ) : (
              <>批量打包下载 (.ZIP) ({images.length})</>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="flex-1 flex flex-col bg-[#EEE] h-full md:h-screen relative overflow-hidden">
        
        <div className="bg-white px-[32px] py-[12px] border-b border-editorial-border flex justify-between items-center shrink-0">
          <div className="text-[12px] text-[#666]">实时效果预览区</div>
          <div className="flex gap-[16px]">
            <span className="text-[12px] text-[#666] uppercase tracking-[1px] font-bold">已上传：{images.length} 张</span>
          </div>
        </div>

        {/* Upload Zone */}
        <div 
          className={`shrink-0 w-full border-b border-editorial-border transition-all duration-200 ease-out p-[32px] flex flex-col items-center justify-center cursor-pointer text-center group bg-[#F9F8F6]
            ${dragActive ? 'border-editorial-ink' : 'hover:border-[#BBB]'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            multiple 
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files);
              e.target.value = ''; // reset so same file can be selected again
            }}
          />
          <h3 className="text-[14px] font-bold text-editorial-ink tracking-[1px] uppercase mb-1 flex items-center justify-center">
            <Upload className="w-4 h-4 mr-2" /> 点击或拖拽图片到此处
          </h3>
          <p className="text-[11px] text-[#999] italic max-w-sm">
            支持 JPG, PNG, WebP。所有操作均在浏览器本地进行计算，绝不上传云端泄露隐私。
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto min-h-0 p-[32px]">
          {images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
              <AnimatePresence>
                {images.map(img => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={img.id} 
                    className="group relative bg-[#F9F8F6] border border-editorial-border overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-shadow"
                  >
                    <div 
                      className="aspect-[3/4] bg-[#CCC] flex items-center justify-center relative overflow-hidden cursor-zoom-in"
                      onClick={() => img.previewUrl && setEnlargedImage(img.previewUrl)}
                    >
                      {img.previewUrl ? (
                         <img 
                          src={img.previewUrl} 
                          alt="水印加载中" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Loader2 className="w-6 h-6 text-[#666] animate-spin" />
                      )}
                      
                      {/* Delete Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                         <button 
                          onClick={(e) => { e.stopPropagation(); handleRemoveImage(img.id); }}
                          className="p-4 bg-white text-editorial-ink rounded-full hover:bg-editorial-bg transform hover:scale-105 transition-all shadow-lg pointer-events-auto cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-[12px] bg-white flex justify-between items-center text-[10px] uppercase tracking-[1px] text-[#666] border-t border-editorial-border">
                      <div className="truncate pr-2 font-bold">
                        {img.file.name}
                      </div>
                      <div className="shrink-0 flex items-center space-x-2">
                         <span>
                           {formatBytes(img.file.size)}
                           {img.blob && ` → ${formatBytes(img.blob.size)}`}
                         </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-[#999]">
               <p className="text-center font-bold tracking-[2px] uppercase text-[12px] text-[#666]">暂无图片</p>
               <p className="text-[11px] text-center mt-2 italic">请放入您的图片资源开始处理。</p>
            </div>
          )}
        </div>

      </div>

      {/* Lightbox / Modal Overlay */}
      <AnimatePresence>
        {enlargedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEnlargedImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 md:p-10 cursor-zoom-out"
          >
            <img 
              src={enlargedImage} 
              className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
              alt="放大预览" 
            />
            <button
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setEnlargedImage(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

