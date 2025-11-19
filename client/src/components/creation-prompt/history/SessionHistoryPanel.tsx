import React, { useEffect, useCallback } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { getUserSessions, setCurrentSession, Session } from "@/features/sessions/sessionSlice";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import squareSpinner from '@/assets/animations/square-spinner.lottie';
import LightTooltip from "@/components/ui/light-tooltip";

interface SessionHistoryPanelProps {
  currentStep?: number;
}

const SessionHistoryPanel: React.FC<SessionHistoryPanelProps> = ({ currentStep }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Redux state
  const sessions = useAppSelector(state => state.sessions.sessions);
  const currentSession = useAppSelector(state => state.sessions.currentSession);
  const loading = useAppSelector(state => state.sessions.loading);

  // Load sessions on mount
  useEffect(() => {
    dispatch(getUserSessions(50));
  }, [dispatch]);

  // Handle session selection
  const handleSelectSession = useCallback((session: Session) => {
    dispatch(setCurrentSession(session));
    // Update URL with sessionId
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('sessionId', session.id.toString());
    setSearchParams(newSearchParams, { replace: true });
  }, [dispatch, searchParams, setSearchParams]);

  // Convert sessions to HistoryImage-like format for HistoryPanel
  const sessionImages = React.useMemo(() => {
    return sessions.map(session => {
      // Get thumbnail from first batch's first variation (sorted by createdAt asc)
      const batches = session.batches || [];
      const sortedBatches = [...batches].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const firstBatch = sortedBatches[0];
      const firstVariation = firstBatch?.variations?.[0];
      const thumbnailUrl = firstVariation?.thumbnailUrl || firstVariation?.imageUrl;
      
      return {
        id: session.id,
        imageUrl: thumbnailUrl || '',
        thumbnailUrl: thumbnailUrl,
        createdAt: new Date(session.createdAt),
        status: 'COMPLETED' as const,
        batchId: firstBatch?.id,
        // Custom metadata
        sessionName: session.name || 'Untitled Session',
        batchCount: session._count?.batches || batches.length || 0,
      };
    });
  }, [sessions]);

  // Handle image/session click
  const handleSelectImage = useCallback((imageId: number) => {
    const session = sessions.find(s => s.id === imageId);
    if (session) {
      handleSelectSession(session);
    }
  }, [sessions, handleSelectSession]);

  // Handle new session button - navigate to /create without sessionId
  const handleNewSession = useCallback(() => {
    navigate('/create');
  }, [navigate]);

  return (
    <div className={`${currentStep === 3 ? 'z-[1000]' : 'z-50'} absolute top-1/2 right-3 -translate-y-1/2 h-auto shadow-lg bg-white rounded-md w-[88px]`}>
      <div className='flex flex-col justify-center bg-white shadow-lg rounded-md max-h-[min(500px,calc(100vh-150px))] h-auto m-auto'>
        {/* Header with New Session Button */}
        <div className="px-1 text-center py-4">
          <LightTooltip text="New Session" direction="left">
            <button
              onClick={handleNewSession}
              className="w-full h-[57px] flex items-center justify-center bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 rounded-md transition-all cursor-pointer group shadow-sm hover:shadow"
              aria-label="Create new session"
            >
              <Plus className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
            </button>
          </LightTooltip>
          <div className="border-b border-[#E3E3E3] border-2 mt-4 w-1/2 mx-auto" />
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-53px)] pb-2 hide-scrollbar mb-2">
          {loading && sessions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4 px-1">
              <div className="flex items-center justify-center">
                <DotLottieReact
                  src={squareSpinner}
                  autoplay
                  loop
                  style={{ width: 32, height: 32 }}
                />
              </div>
            </div>
          ) : sessionImages.length > 0 ? (
            <div className="grid gap-2 px-1">
              {sessionImages.map((sessionImage) => {
                const isSelected = currentSession?.id === sessionImage.id;
                const session = sessions.find(s => s.id === sessionImage.id);
                const tooltipText = session?.name || sessionImage.sessionName || 'Untitled Session';
                
                return (
                  <LightTooltip key={sessionImage.id} text={tooltipText} direction="left">
                    <div
                      className={`w-full cursor-pointer rounded-md overflow-hidden border-2 relative group transition-all ${
                        isSelected ? 'border-black shadow-md' : 'border-transparent hover:border-gray-300'
                      }`}
                      onClick={() => handleSelectImage(sessionImage.id)}
                    >
                      {sessionImage.thumbnailUrl ? (
                        <img
                          src={sessionImage.thumbnailUrl}
                          alt={tooltipText}
                          className="h-[57px] w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full bg-gradient-to-br from-gray-100 to-gray-50 h-[57px] flex flex-col items-center justify-center relative rounded-md overflow-hidden border border-gray-200">
                          <div className="text-gray-400 text-xs text-center px-1 font-medium">
                            {sessionImage.batchCount || 0} {sessionImage.batchCount === 1 ? 'batch' : 'batches'}
                          </div>
                        </div>
                      )}
                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute inset-0 border-2 border-black rounded-md pointer-events-none" />
                      )}
                    </div>
                  </LightTooltip>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4 px-1">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <div className="text-gray-500 text-xs font-medium">No sessions yet</div>
                <div className="text-gray-400 text-[10px] leading-tight px-2">
                  Click the button above to start a new session
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionHistoryPanel;

