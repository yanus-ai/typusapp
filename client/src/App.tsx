import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { router } from "./routes";
import { AuthProvider } from "./providers/AuthProvider";
import { CustomizationOptionsProvider } from "./components/providers/CustomizationOptionsProvider";
import "./styles/globals.css";
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Provider store={store}>
      <Toaster 
        position="top-right" 
        reverseOrder={false}
        toastOptions={{
          duration: Infinity,
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