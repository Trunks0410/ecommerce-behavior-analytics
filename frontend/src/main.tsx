import { createRoot } from "react-dom/client";
import "@/app/styles/style.css";

import App from "./app/App";

import { BrowserRouter } from "react-router-dom";

import { Provider as ReduxProvider } from "react-redux";

import { PersistGate } from "redux-persist/integration/react";

import { store, persistor } from "@/app/stores/store";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const clientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GoogleOAuthProvider clientId={clientId}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </GoogleOAuthProvider>
      </PersistGate>
    </ReduxProvider>
  </BrowserRouter>,
);
