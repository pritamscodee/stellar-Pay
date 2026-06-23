import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { ThemeProvider } from "./ThemeProvider";
import App from "./App";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_dXAtbXV0dC0yOC5jbGVyay5hY2NvdW50cy5kZXYk";

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>
);
