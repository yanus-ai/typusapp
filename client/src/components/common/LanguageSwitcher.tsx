import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/button';

/**
 * Language switcher component
 * Allows users to switch between English and German
 */
export function LanguageSwitcher() {
  const { changeLanguage, currentLanguage } = useTranslation();

  return (
    <div className="flex gap-2">
      <Button
        variant={currentLanguage === 'en' ? 'default' : 'outline'}
        size="sm"
        onClick={() => changeLanguage('en')}
      >
        EN
      </Button>
      <Button
        variant={currentLanguage === 'de' ? 'default' : 'outline'}
        size="sm"
        onClick={() => changeLanguage('de')}
      >
        DE
      </Button>
    </div>
  );
}

