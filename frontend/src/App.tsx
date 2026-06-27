import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import LandingPage from "./LandingPage";
import Dashboard from "./Dashboard";
import ErrorBoundary from "./ErrorBoundary";
import MistralChat from "./components/MistralChat";
import { capturePageView } from "./services/analytics";

function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    capturePageView();
  }, [location]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <PageTracker />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={
          <>
            <SignedIn>
              <ErrorBoundary>
                <Dashboard />
              </ErrorBoundary>
            </SignedIn>
            <SignedOut>
              <Navigate to="/" replace />
            </SignedOut>
          </>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <MistralChat />
    </BrowserRouter>
  );
}

export default App;
