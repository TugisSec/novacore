import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy load the chatbot component to reduce initial bundle size
const OpenAIChatbot = React.lazy(() => import("@/components/OpenAIChatbot"));

const LoadingSpinner = () => (
  <div className="h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading NovaCore...</p>
    </div>
  </div>
);

const Index = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OpenAIChatbot />
    </Suspense>
  );
};

export default Index;
