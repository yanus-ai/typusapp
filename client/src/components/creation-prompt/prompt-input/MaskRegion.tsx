import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useEffect, useState } from "react";
import loader from "@/assets/animations/loader.lottie";
import { proxyMaskUrl } from "@/lib/utils";

export default function MaskRegion({ maskUrl }: { maskUrl: string }) {
  const [isLoading, setIsLoading] = useState(true);

  // Proxy the mask URL to avoid CORS issues with GCS
  const proxiedUrl = proxyMaskUrl(maskUrl);

  const loadImage = (url: string) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      // Remove crossOrigin for proxied URLs (they're same-origin now)
      if (!url.includes('/api/masks/proxy')) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
    });
  };

  useEffect(() => {
    if (!proxiedUrl) {
      setIsLoading(false);
      return;
    }
    
    const retry = () => {
      loadImage(proxiedUrl).then(() => {
        setIsLoading(false);
      }).catch(() => {
        setTimeout(() => retry(), 1000);
      });
    };
    retry();
  }, [proxiedUrl]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
        <DotLottieReact
          src={loader}
          autoplay
          loop
          style={{ transform: "scale(3)", width: 20, height: 20 }}
        />
      </div>
    );
  }

  if (!proxiedUrl) return null;

  return (
    <img
      src={proxiedUrl}
      loading="lazy"
      alt="Mask region"
      className="w-full h-full object-cover rounded"
      crossOrigin={proxiedUrl.includes('/api/masks/proxy') ? undefined : "anonymous"}
    />
  );
}
