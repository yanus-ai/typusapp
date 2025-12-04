import { useMemo } from "react";

export const useIsSDXLModel = (settings: any, images: any[]) => {
  return useMemo(() => {
    const model =
      settings?.model ||
      settings?.image?.settingsSnapshot?.model ||
      images[0]?.settingsSnapshot?.model;
    if (!model) return false;
    const modelLower = model.toLowerCase();
    return (
      modelLower.includes("sdxl") ||
      modelLower.includes("realvisxl") ||
      modelLower.includes("lightning")
    );
  }, [settings, images]);
};
