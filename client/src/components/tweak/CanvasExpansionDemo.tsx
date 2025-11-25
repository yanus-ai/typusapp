import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OutpaintDirectionSelector } from './OutpaintDirectionSelector';
import { useCanvasExpansion } from '@/hooks/useCanvasExpansion';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setOriginalImageBounds } from '@/features/tweak/tweakSlice';

/**
 * Demo component to showcase the canvas expansion predictor functionality
 * This can be integrated into the TweakPage or used as a standalone demo
 */
export function CanvasExpansionDemo() {
  const dispatch = useAppDispatch();
  const {
    canvasBounds,
    originalImageBounds,
    isExpanded,
    currentExpansionPercentages,
    currentOutpaintBounds,
    currentOperationType
  } = useCanvasExpansion();

  // Initialize with demo bounds
  useEffect(() => {
    const demoBounds = {
      x: 0,
      y: 0,
      width: 1440,
      height: 959
    };
    dispatch(setOriginalImageBounds(demoBounds));
  }, [dispatch]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">🔮 Canvas Expansion Predictor Demo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select an outpaint direction to see automatic canvas boundary expansion based on user data analysis.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Direction Selector */}
            <div>
              <OutpaintDirectionSelector />
            </div>

            {/* Canvas Information */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Canvas Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Original Bounds */}
                  <div>
                    <h4 className="font-medium text-sm mb-1">Original Image</h4>
                    {originalImageBounds ? (
                      <Badge variant="outline" className="text-xs">
                        {originalImageBounds.width} × {originalImageBounds.height}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not set</span>
                    )}
                  </div>

                  {/* Current Bounds */}
                  <div>
                    <h4 className="font-medium text-sm mb-1">Current Canvas</h4>
                    {canvasBounds ? (
                      <Badge variant={isExpanded ? "default" : "outline"} className="text-xs">
                        {canvasBounds.width} × {canvasBounds.height}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not set</span>
                    )}
                  </div>

                  {/* Expansion Info */}
                  {isExpanded && currentExpansionPercentages && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Expansion</h4>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Width: +{currentExpansionPercentages.width}%
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Height: +{currentExpansionPercentages.height}%
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Outpaint Bounds */}
                  {currentOutpaintBounds && isExpanded && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Outpaint Bounds</h4>
                      <div className="grid grid-cols-2 gap-1">
                        <Badge variant="outline" className="text-xs">
                          Top: {currentOutpaintBounds.top}px
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Bottom: {currentOutpaintBounds.bottom}px
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Left: {currentOutpaintBounds.left}px
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Right: {currentOutpaintBounds.right}px
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Operation Type */}
                  {currentOperationType && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Detected Operation</h4>
                      <Badge variant="default" className="text-xs">
                        {currentOperationType}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Visual Canvas Representation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Visual Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative bg-gray-100 rounded p-4" style={{ aspectRatio: '3/2', minHeight: '200px' }}>
                    {/* Original Image Bounds */}
                    {originalImageBounds && (
                      <div
                        className="absolute bg-blue-200 border-2 border-blue-400 rounded flex items-center justify-center"
                        style={{
                          left: '20%',
                          top: '20%',
                          width: '60%',
                          height: '60%',
                        }}
                      >
                        <span className="text-xs font-medium text-blue-700">
                          Original Image
                        </span>
                      </div>
                    )}

                    {/* Extended Canvas Bounds */}
                    {isExpanded && canvasBounds && originalImageBounds && (
                      <>
                        {/* Top Extension */}
                        {currentOutpaintBounds?.top > 0 && (
                          <div
                            className="absolute bg-red-100 border border-red-300 rounded-none flex items-center justify-center"
                            style={{
                              left: '20%',
                              top: '10%',
                              width: '60%',
                              height: '10%',
                            }}
                          >
                            <span className="text-xs text-red-600">Top: +{currentOutpaintBounds.top}px</span>
                          </div>
                        )}

                        {/* Bottom Extension */}
                        {currentOutpaintBounds?.bottom > 0 && (
                          <div
                            className="absolute bg-red-100 border border-red-300 rounded-none flex items-center justify-center"
                            style={{
                              left: '20%',
                              bottom: '10%',
                              width: '60%',
                              height: '10%',
                            }}
                          >
                            <span className="text-xs text-red-600">Bottom: +{currentOutpaintBounds.bottom}px</span>
                          </div>
                        )}

                        {/* Left Extension */}
                        {currentOutpaintBounds?.left > 0 && (
                          <div
                            className="absolute bg-red-100 border border-red-300 rounded-none flex items-center justify-center"
                            style={{
                              left: '10%',
                              top: '20%',
                              width: '10%',
                              height: '60%',
                            }}
                          >
                            <span className="text-xs text-red-600 writing-mode-vertical">
                              Left: +{currentOutpaintBounds.left}px
                            </span>
                          </div>
                        )}

                        {/* Right Extension */}
                        {currentOutpaintBounds?.right > 0 && (
                          <div
                            className="absolute bg-red-100 border border-red-300 rounded-none flex items-center justify-center"
                            style={{
                              right: '10%',
                              top: '20%',
                              width: '10%',
                              height: '60%',
                            }}
                          >
                            <span className="text-xs text-red-600 writing-mode-vertical">
                              Right: +{currentOutpaintBounds.right}px
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Blue area represents the original image. Red areas show the predicted expansion.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>1.</strong> Click any direction button to automatically expand the canvas with standardized ratios</p>
          <p><strong>2.</strong> The expansion ratios are based on analysis of real user outpainting data</p>
          <p><strong>3.</strong> Different directions use different expansion intensities (e.g., top expansions are typically larger)</p>
          <p><strong>4.</strong> The system prevents manual canvas manipulation by standardizing to predicted bounds</p>
          <p><strong>5.</strong> Use "Reset to Original" to clear any expansions</p>
        </CardContent>
      </Card>
    </div>
  );
}