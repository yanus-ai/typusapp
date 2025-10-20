import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { router } from "./routes";
import { AuthProvider } from "./providers/AuthProvider";
import { CustomizationOptionsProvider } from "./components/providers/CustomizationOptionsProvider";
import { CreditDataProvider } from "./providers/CreditDataProvider";
import "./styles/globals.css";
import { Toaster } from 'react-hot-toast';
import "./styles/onboarding.css";

function App() {
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
        <CreditDataProvider>
          <CustomizationOptionsProvider>
            <RouterProvider router={router} />
          </CustomizationOptionsProvider>
        </CreditDataProvider>
      </AuthProvider>
    </Provider>
  );
}

export default App;