export interface WatermarkOptions {
  text: string;
  quality: number; // 0.1 to 1.0
  scale: number; // For adjusting size multiplier
  opacityMultiplier: number; // For adjusting opacity multiplier
}

export interface WatermarkLayoutSpec {
  y: number;
  sizeScale: number;
  weight: string;
  text: string;
  opacity: number;
  letterSpacing: string;
}

const DEFAULT_WATERMARK_TEXT = '公众号·子游小馆';

const getWatermarkText = (text: string) => text.trim() || DEFAULT_WATERMARK_TEXT;

const formatPublicAccountText = (text: string) => {
  const normalizedText = getWatermarkText(text);
  return normalizedText.startsWith('公众号')
    ? normalizedText
    : `公众号·${normalizedText}`;
};

export const buildWatermarkLayout = ({
  height,
  userText,
}: {
  width: number;
  height: number;
  userText: string;
}): WatermarkLayoutSpec[] => {
  const centerText = getWatermarkText(userText);
  const publicAccountText = formatPublicAccountText(centerText);

  return [
    {
      y: Math.max(height * 0.04, 30),
      sizeScale: 0.016,
      weight: '500',
      text: `ORIGINAL WORK © · ${publicAccountText} · ALL RIGHTS RESERVED`,
      opacity: 0.4,
      letterSpacing: '3px',
    },
    {
      y: height * 0.5,
      sizeScale: 0.04,
      weight: '400',
      text: centerText,
      opacity: 0.22,
      letterSpacing: '8px',
    },
    {
      y: Math.min(height * 0.96, height - 30),
      sizeScale: 0.014,
      weight: '500',
      text: `ORIGINAL CREATION BY ${publicAccountText}  //  DIGITAL ARCHIVE`,
      opacity: 0.4,
      letterSpacing: '3px',
    },
  ];
};

export const applyWatermarkToBlob = async (
  imageFile: File,
  options: WatermarkOptions
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // We want the watermark text to be faint but visible, magazine style
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add a slight dark shadow so it shows up on light backgrounds too
      // opacity scaled slightly relative to user control to maintain softness
      ctx.shadowColor = `rgba(0, 0, 0, ${Math.min(1, 0.3 * options.opacityMultiplier)})`;
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Draw text at 3 positions: Top, Middle, Bottom
      const watermarks = buildWatermarkLayout({
        width: canvas.width,
        height: canvas.height,
        userText: options.text,
      });

      for (const pos of watermarks) {
        // Calculate font size relative to image height to keep it proportional, scaled by user setting
        let fontSize = canvas.height * pos.sizeScale * options.scale;
        // Put reasonable bound limits
        fontSize = Math.min(fontSize, 600);
        
        // Use a clean, modern sans-serif that renders Chinese beautifully
        ctx.font = `${pos.weight} ${fontSize}px "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
        
        // Emulate simple letter-spacing via canvas state if environment supports it
        (ctx as any).letterSpacing = pos.letterSpacing;

        // Auto-shrink font if it exceeds the image width (common on vertical/narrow photos)
        const maxTextWidth = canvas.width * 0.9;
        let metrics = ctx.measureText(pos.text);
        if (metrics.width > maxTextWidth) {
          const ratio = maxTextWidth / metrics.width;
          fontSize = fontSize * ratio;
          ctx.font = `${pos.weight} ${fontSize}px "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
        }

        const finalOpacity = Math.max(0, Math.min(1, pos.opacity * options.opacityMultiplier));
        ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
        
        ctx.save();
        ctx.translate(canvas.width / 2, pos.y);
        ctx.fillText(pos.text, 0, 0, maxTextWidth); // Native compress fallback
        ctx.restore();
      }

      // Convert the canvas to a compressed JPEG Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create Blob from canvas'));
          }
        },
        'image/jpeg',
        options.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for watermarking'));
    };

    img.src = objectUrl;
  });
};
