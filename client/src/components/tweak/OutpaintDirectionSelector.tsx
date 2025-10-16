import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { useCanvasExpansion } from '@/hooks/useCanvasExpansion';
import { OutpaintOperationType, IntensityLevel } from '@/utils/canvasExpansionPredictor';

interface OutpaintDirectionSelectorProps {
  onSelectionChange?: (operationType: OutpaintOperationType | null) => void;
  disabled?: boolean;
  className?: string;
}

// Icon mapping for each operation type
const OPERATION_ICONS: Record<OutpaintOperationType, React.ReactNode> = {
  'top': <ArrowUp className="w-4 h-4" />,
  'bottom': <ArrowDown className="w-4 h-4" />,
  'left': <ArrowLeft className="w-4 h-4" />,
  'right': <ArrowRight className="w-4 h-4" />,
  'top-left': <ArrowUpLeft className="w-4 h-4" />,
  'top-right': <ArrowUpRight className="w-4 h-4" />,
  'bottom-left': <ArrowDownLeft className="w-4 h-4" />,
  'bottom-right': <ArrowDownRight className="w-4 h-4" />,
  'horizontal': <ArrowLeft className="w-4 h-4" />,
  'vertical': <ArrowUp className="w-4 h-4" />,
  'all': <Maximize2 className="w-4 h-4" />
};

export function OutpaintDirectionSelector({
  onSelectionChange,
  disabled = false,
  className = ''
}: OutpaintDirectionSelectorProps) {
  const {
    expandCanvasForOperation,
    previewExpansion,
    resetCanvasToOriginal,
    getOperationTypes,
    currentOperationType,
    isExpanded,
    currentExpansionPercentages
  } = useCanvasExpansion();

  const operationTypes = getOperationTypes();

  const handleOperationSelect = (operationType: OutpaintOperationType, intensity: IntensityLevel = 'MEDIUM') => {
    // Auto-expand the canvas
    expandCanvasForOperation(operationType, intensity);

    // Notify parent component
    onSelectionChange?.(operationType);
  };

  const handleReset = () => {
    resetCanvasToOriginal();
    onSelectionChange?.(null);
  };

  const getPreviewInfo = (operationType: OutpaintOperationType) => {
    const preview = previewExpansion(operationType);
    if (!preview) return null;

    const widthIncrease = preview.canvasBounds.width - preview.metadata.predictedAt ? 0 : preview.expansions.left + preview.expansions.right;
    const heightIncrease = preview.canvasBounds.height - preview.metadata.predictedAt ? 0 : preview.expansions.top + preview.expansions.bottom;

    return {
      widthIncrease,
      heightIncrease,
      expansions: preview.expansions
    };
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>🔮 Outpaint Direction</span>
          {isExpanded && (
            <div className="flex items-center gap-2">
              {currentOperationType && (
                <Badge variant="secondary" className="text-xs">
                  {currentOperationType}
                </Badge>
              )}
              {currentExpansionPercentages && (
                <Badge variant="outline" className="text-xs">
                  +{currentExpansionPercentages.width.toFixed(1)}% × +{currentExpansionPercentages.height.toFixed(1)}%
                </Badge>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Direction Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Top Row */}
          <Button
            variant={currentOperationType === 'top-left' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleOperationSelect('top-left')}
            disabled={disabled}
            className="aspect-square p-2"
            title="Top-Left Corner"
          >
            {OPERATION_ICONS['top-left']}
          </Button>
          <Button
            variant={currentOperationType === 'top' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleOperationSelect('top')}
            disabled={disabled}
            className="aspect-square p-2"
            title="Top Edge"
          >
            {OPERATION_ICONS['top']}
          </Button>
          <Button
            variant={currentOperationType === 'top-right' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleOperationSelect('top-right')}
            disabled={disabled}
            className="aspect-square p-2"
            title="Top-Right Corner"
          >
            {OPERATION_ICONS['top-right']}
          </Button>

          {/* Middle Row */}
          <Button
            variant={currentOperationType === 'left' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleOperationSelect('left')}
            disabled={disabled}
            className="aspect-square p-2"
            title="Left Edge"
          >
            {OPERATION_ICONS['left']}
          </Button>
          <Button
            variant={currentOperationType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleOperationSelect('all')}
            disabled={disabled}
            className="aspect-square p-2"
            title="All Directions"
          >
            {OPERATION_ICONS['all']}
          </Button>
          <Button
            variant={currentOperationType === 'right' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleOperationSelect('right')}
            disabled={disabled}
            className="aspect-square p-2"
            title="Right Edge"
          >
            {OPERATION_ICONS['right']}
          </Button>

          {/* Bottom Row */}
          <Button
            variant={currentOperationType === 'bottom-left' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleOperationSelect('bottom-left')}
            disabled={disabled}
            className="aspect-square p-2"
            title="Bottom-Left Corner"
          >
            {OPERATION_ICONS['bottom-left']}
          </Button>
          <Button
            variant={currentOperationType === 'bottom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleOperationSelect('bottom')}
            disabled={disabled}
            className="aspect-square p-2"
            title="Bottom Edge"
          >
            {OPERATION_ICONS['bottom']}
          </Button>
          <Button
            variant={currentOperationType === 'bottom-right' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleOperationSelect('bottom-right')}
            disabled={disabled}
            className="aspect-square p-2"
            title="Bottom-Right Corner"
          >
            {OPERATION_ICONS['bottom-right']}
          </Button>
        </div>

        {/* Special Operations */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={currentOperationType === 'horizontal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleOperationSelect('horizontal')}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            {OPERATION_ICONS['horizontal']}
            <span className="text-xs">Horizontal</span>
          </Button>
          <Button
            variant={currentOperationType === 'vertical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleOperationSelect('vertical')}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            {OPERATION_ICONS['vertical']}
            <span className="text-xs">Vertical</span>
          </Button>
        </div>

        {/* Reset Button */}
        {isExpanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={disabled}
            className="w-full flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Original
          </Button>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground">
          <p>Select a direction to automatically expand the canvas with standardized ratios.</p>
          {currentOperationType && (
            <p className="mt-1">
              <strong>Current:</strong> {operationTypes[currentOperationType]?.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}