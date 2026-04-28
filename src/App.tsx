import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCartSync } from "@/hooks/useCartSync";
import LayoutShell from "./components/LayoutShell";
import Index from "./pages/Index";
import OrderHistory from "./pages/OrderHistory";
import OrderHistoryV2 from "./pages/OrderHistoryV2";
import DeliveryToday from "./pages/DeliveryToday";
import NotificationPreferences from "./pages/NotificationPreferences";
import StyleGuide from "./pages/StyleGuide";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  useCartSync();
  return (
    <Routes>
      <Route element={<LayoutShell />}>
        <Route path="/" element={<Index />} />
        <Route path="/v2" element={<OrderHistoryV2 />} />
        <Route path="/delivery-today" element={<DeliveryToday />} />
        <Route path="/settings/notifications" element={<NotificationPreferences />} />
        <Route path="/style-guide" element={<StyleGuide />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
