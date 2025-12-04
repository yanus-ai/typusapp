import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useEffect, useState } from "react";
import loader from "@/assets/animations/loader.lottie";

export default function MaskRegion({ maskUrl }: { maskUrl: string }) {
  const [isLoading, setIsLoading] = useState(true);

  const loadImage = (url: string) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
    });
  };

  useEffect(() => {
    const retry = () => {
      loadImage(maskUrl).then(() => {
        setIsLoading(false);
      }).catch(() => {
        setTimeout(() => retry(), 1000);
      });
    };
    retry();
  }, [maskUrl]);

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

  return (
    <img
      src={maskUrl}
      loading="lazy"
      alt="Mask region"
      className="w-full h-full object-cover rounded"
      crossOrigin="anonymous"
    />
  );
}
