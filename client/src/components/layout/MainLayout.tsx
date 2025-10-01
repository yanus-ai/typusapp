import { FC, ReactNode } from 'react';
import Header from './Header';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { DialogClose } from '@radix-ui/react-dialog';

interface MainLayoutProps {
  children: ReactNode;
}


const MainLayout: FC<MainLayoutProps> = ({ children }) => {
  const [showWelcome, setShowWelcome] = useLocalStorage('showWelcome', true);

  return (
    <div className="flex h-screen bg-site-white font-space-grotesk">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="flex flex-1 h-[calc(100vh-56px)]">
            {children}
          </div>
        </main>
      </div>
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className='w-full max-w-3xl  bg-white'>
          <DialogHeader>
            <DialogTitle className='text-center mt-10 mb-6'>WATCH THE TUTORIAL TO GET STARTED</DialogTitle>
          </DialogHeader>
          <iframe
            className="aspect-video max-w-md mx-auto"
            src="https://www.youtube.com/embed/9pf3QIjkMdQ?si=4_Byaz8TjiKwHDPy"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
          <h3 className="text-center text-lg font-semibold mt-4">
            THEN, DOWNLOAD THE PLUGIN AND TRY THE APP FOR FREE
          </h3>
          <DialogClose asChild>
            <Button asChild className="mt-4 text-white w-fit mx-auto">
              <Link to="/plugins">OPEN PLUGINS PAGE</Link>
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainLayout;