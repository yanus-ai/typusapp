import React, { useEffect, useCallback, useRef } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { getUserSessions, setCurrentSession, clearCurrentSession, Session } from "@/features/sessions/sessionSlice";
import { resetSettings } from "@/features/customization/customizationSlice";
import { resetMaskState, setSavedPrompt } from "@/features/masks/maskSlice";
import { setSelectedImage } from "@/features/create/createUISlice";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import loader from '@/assets/animations/loader.lottie';
import LightTooltip from "@/components/ui/light-tooltip";
import SessionHistoryPanelItem from "./SessionHistoryPanelItem";

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
  
  // Debounce refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSessionRef = useRef<Session | null>(null);

  // Load sessions on mount
  useEffect(() => {
    dispatch(getUserSessions(50));
  }, [dispatch]);

  // Handle session selection with debouncing
  const handleSelectSession = useCallback((session: Session) => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Don't switch if already selected or loading
    if (currentSession?.id === session.id || loading) {
      return;
    }
    
    // Store the pending session
    pendingSessionRef.current = session;
    
    // Debounce the actual selection to prevent rapid switches
    debounceTimerRef.current = setTimeout(() => {
      const sessionToSelect = pendingSessionRef.current;
      if (sessionToSelect) {
        dispatch(setCurrentSession(sessionToSelect));
        // Update URL with sessionId
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('sessionId', sessionToSelect.id.toString());
        setSearchParams(newSearchParams, { replace: true });
        pendingSessionRef.current = null;
      }
    }, 150); // 150ms debounce
  }, [dispatch, searchParams, setSearchParams, currentSession, loading]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

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

  // Handle new session button - reset settings and navigate to /create without sessionId
  const handleNewSession = useCallback(() => {
    // Reset all settings
    dispatch(resetSettings());
    dispatch(resetMaskState());
    dispatch(setSavedPrompt(''));
    dispatch(setSelectedImage({ id: undefined, type: undefined }));
    dispatch(clearCurrentSession());
    
    // Navigate to /create without sessionId - explicitly remove sessionId from URL
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('sessionId');
    newSearchParams.delete('imageId');
    newSearchParams.delete('type');
    navigate(`/create?${newSearchParams.toString()}`, { replace: true });
  }, [dispatch, navigate, searchParams]);

  return (
    <div className={`${currentStep === 3 ? 'z-[1000]' : 'z-50'} absolute top-1/2 right-3 -translate-y-1/2 h-auto shadow-lg bg-white rounded-md w-[88px]`}>
      <div className='flex flex-col justify-center bg-white shadow-lg rounded-md max-h-[min(500px,calc(100vh-150px))] h-auto m-auto'>
        {/* Header with New Session Button */}
        <div className="px-2 text-center py-4">
          <LightTooltip text="New Session" direction="left">
            <button
              onClick={handleNewSession}
              className="w-full h-[57px] flex items-center justify-center !px-2 flex-shrink-0 py-1 rounded-lg bg-white shadow-sm text-sm transition-colors cursor-pointer hover:shadow-md font-medium gap-2"
              aria-label="Create new session"
            >
              <Plus className="size-6 text-gray-600 group-hover:text-gray-900 transition-colors" />
            </button>
          </LightTooltip>
          <div className="border-b border-[#E3E3E3] border-2 mt-4 w-1/2 mx-auto" />
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-53px)] pb-2 hide-scrollbar mb-2">
          {loading && sessions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4 px-1">
              <div className="flex items-center justify-center">
                <DotLottieReact
                  src={loader}
                  autoplay
                  loop
                  style={{
                    width: 100,
                    height: 100,
                    filter: 'drop-shadow(0 0 10px rgba(0, 0, 0, 0.5))',
                    transform: 'scale(1.5)'
                  }}
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
                  <SessionHistoryPanelItem
                    key={sessionImage.id}
                    sessionImage={sessionImage}
                    isSelected={isSelected}
                    tooltipText={tooltipText}
                    onClick={() => handleSelectImage(sessionImage.id)}
                    disabled={loading}
                  />
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center pb-4 px-1">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <div className="text-gray-500 text-xs font-medium">No sessions</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionHistoryPanel;

