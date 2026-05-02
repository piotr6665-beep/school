import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Classes from "./pages/Classes";
import Schedule from "./pages/Schedule";
import Pricing from "./pages/Pricing";
import Auth from "./pages/Auth";
import Bookings from "./pages/Bookings";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import Gallery from "./pages/Gallery";
import Events from "./pages/Events";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import AdminRoute from "./components/AdminRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/admin" element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            } />
            <Route path="*" element={
              <div className="flex flex-col min-h-screen">
                <Navigation />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/o-nas" element={<About />} />
                    <Route path="/zajecia" element={<Classes />} />
                    <Route path="/harmonogram" element={<Schedule />} />
                    <Route path="/cennik" element={<Pricing />} />
                    <Route path="/galeria" element={<Gallery />} />
                    <Route path="/wydarzenia" element={<Events />} />
                    <Route path="/kontakt" element={<Contact />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/rezerwacje" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
                    <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            } />
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
