import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { SessionProvider } from "@/hooks/useSession";
import { Layout, RequireAuth } from "@/components/Layout";
import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import Panel from "@/pages/Panel";
import ChildPage from "@/pages/ChildPage";
import Centro from "@/pages/Centro";
import Legal from "@/pages/Legal";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/privacidad" element={<Legal />} />
          <Route element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="/panel" element={<Panel />} />
            <Route path="/nino/:id" element={<ChildPage />} />
            <Route path="/centro" element={<Centro />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </SessionProvider>
  </StrictMode>,
);
