import React, { FC, ReactNode } from 'react';
import Header from './Header';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { DialogClose } from '@radix-ui/react-dialog';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import GalleryModal from '@/components/gallery/GalleryModal';
import { setIsModalOpen } from '@/features/gallery/gallerySlice';

interface MainLayoutProps {
  children: ReactNode;
  currentStep?: number;
  onStartTour?: () => void;
}


const MainLayout: FC<MainLayoutProps> = ({ children, currentStep, onStartTour }) => {
  const dispatch = useAppDispatch();
  const [showWelcome, setShowWelcome] = useLocalStorage('showWelcome', true);
  const [cookieConsent, setCookieConsent] = useLocalStorage('cookieConsent', false);
  const isGalleryModalOpen = useAppSelector(state => state.gallery.isModalOpen);

  // Check if this is a newly registered user who should see welcome
  React.useEffect(() => {
    const shouldShowWelcome = localStorage.getItem('showWelcome');
    const welcomeSeen = localStorage.getItem('welcomeSeen');
    const onboardingSeen = localStorage.getItem('onboardingSeen');

    // Force show welcome for new users (when showWelcome is explicitly set to "true" from registration)
    if (shouldShowWelcome === 'true' && !welcomeSeen && !onboardingSeen) {
      setShowWelcome(true);
    }
  }, [setShowWelcome]);

  const handleCloseGallery = () => {
    dispatch(setIsModalOpen(false));
  };

  const handleStartTour = () => {
    setShowWelcome(false);
    localStorage.setItem("welcomeSeen", "true");
    // Trigger custom event to notify OnboardingPopup
    window.dispatchEvent(new CustomEvent('welcomeDialogClosed'));
    if (onStartTour) {
      onStartTour();
    }
  };

  const handleWelcomeDialogChange = (open: boolean) => {
    setShowWelcome(open);
    // If dialog is being closed, start the tour
    if (!open) {
      localStorage.setItem("welcomeSeen", "true");
      // Trigger custom event to notify OnboardingPopup
      window.dispatchEvent(new CustomEvent('welcomeDialogClosed'));
      if (onStartTour) {
        onStartTour();
      }
    }
  };


  return (
    <div className="flex h-screen bg-site-white font-space-grotesk">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentStep={currentStep || 0} />
        <main className="flex-1 overflow-y-auto">
          <div className="flex flex-1 h-[calc(100vh-56px)]">
            {children}

            <GalleryModal 
              isOpen={isGalleryModalOpen}
              onClose={handleCloseGallery}
            />
          </div>
        </main>
      </div>
      
      <Dialog open={showWelcome} onOpenChange={handleWelcomeDialogChange}>
        <DialogContent className='w-full max-w-3xl bg-site-white rounded-2xl border-0 z-[1100]'>
          <DialogHeader>
            <DialogTitle className='text-center mt-10 mb-2'>Welcome to TYPUS!</DialogTitle>
            <p className='text-center mb-6 px-10 text-gray-700'>AI App for Architects.</p>

            <h3 className="text-center text-lg font-semibold my-4">
              First, watch this quick 3-minute tutorial to get an overview. It’s easy.
            </h3>
          </DialogHeader>
          <iframe
            className="aspect-video max-w-md mx-auto rounded-xl"
            src="https://www.youtube.com/embed/og90968sJ0c?si=2EraZJhcScWrdLuu"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
          <h3 className="text-center text-lg font-semibold mt-4">
            THEN, DOWNLOAD THE PLUGIN AND TRY THE APP FOR FREE
          </h3>
          <DialogClose asChild>
            <Button
              variant={"outline"}
              className="mx-auto border-0 shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] focus:ring-2 focus:ring-offset-2 focus:ring-black transition-shadow mt-4 w-fit"
              onClick={handleStartTour}
            >
              START TOUR
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
      
      {/* {!cookieConsent && (
        <div className="fixed right-3 bottom-3 max-w-md rounded-md bg-white border border-gray-300 p-4 ">
          <p>We use cookies to ensure you get the best experience on our website. By continuing to use our site, you agree to our use of cookies.</p>
          <Button className="mt-3 text-white" onClick={() => setCookieConsent(true)}>Accept</Button>
        </div>
      )} */}
    </div>
  );
};

export default MainLayout;