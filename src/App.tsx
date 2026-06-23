import { SignedIn, SignedOut } from "@clerk/clerk-react";
import LandingPage from "./LandingPage";
import Dashboard from "./Dashboard";

function App() {
  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </>
  );
}

export default App;
