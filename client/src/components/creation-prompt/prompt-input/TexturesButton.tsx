import { LayersIcon } from "lucide-react";
import LightTooltip from "@/components/ui/light-tooltip";
import { useTranslation } from "@/hooks/useTranslation";

interface TexturesButtonProps {
  onTexturesClick?: () => void;
}

export function TexturesButton({ onTexturesClick }: TexturesButtonProps) {
  const { t } = useTranslation();
  return (
    <LightTooltip text={t('create.textures.addTextures')} direction="bottom">
      <button
        className="px-2 py-2 border border-transparent hover:border-gray-200 shadow-none bg-transparent rounded-none transition-colors hover:bg-gray-50 cursor-pointer flex items-center justify-center space-x-2 text-xs"
        type="button"
        onClick={onTexturesClick}
        aria-label={t('create.textures.addTexturesAria')}
      >
        <LayersIcon size={16} />
        <span className="font-sans">{t('create.textures.addTextures')}</span>
      </button>
    </LightTooltip>
  );
}

