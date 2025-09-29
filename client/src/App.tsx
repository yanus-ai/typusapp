import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { router } from "./routes";
import { AuthProvider } from "./providers/AuthProvider";
import { CustomizationOptionsProvider } from "./components/providers/CustomizationOptionsProvider";
import "./styles/globals.css";
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from "react";
import { isMobileDevice } from "./utils/deviceDetection";
import DesktopOnlyMessage from "./components/DesktopOnlyMessage";

function App() {
  const [isMobile, setIsMobile] = useState(isMobileDevice());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return <DesktopOnlyMessage />;
  }

  return (
    <Provider store={store}>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          success: {
            style: {
              background: '#16a34a',
              color: 'white',
            },
          },
          error: {
            style: {
              background: '#ef4444',
              color: 'white',
            },
          },
        }}
      />
      <AuthProvider>
        <CustomizationOptionsProvider>
          <RouterProvider router={router} />
        </CustomizationOptionsProvider>
      </AuthProvider>
    </Provider>
  );
}

export default App;