import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const AdminLogin = () => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    checkExistingAdmin();
  }, [user]);

  const checkExistingAdmin = async () => {
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roles) {
      navigate('/admin');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Musisz się zalogować",
        description: "Najpierw zaloguj się na swoje konto użytkownika",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-password', {
        body: { 
          password
        }
      });

      if (error) throw error;

      if (data.error === 'Too many attempts. Please try again in 15 minutes.') {
        toast({
          title: "Zbyt wiele prób",
          description: "Spróbuj ponownie za 15 minut",
          variant: "destructive",
        });
        return;
      }

      if (data.valid) {
        toast({
          title: "Zalogowano",
          description: "Witaj w panelu administracyjnym",
        });
        navigate('/admin');
      } else {
        toast({
          title: "Błąd",
          description: "Nieprawidłowe hasło administratora",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Błąd",
        description: "Wystąpił problem podczas logowania",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Panel Administracyjny</CardTitle>
          <CardDescription>
            {user 
              ? "Wprowadź hasło administratora aby uzyskać uprawnienia" 
              : "Najpierw musisz się zalogować na swoje konto"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!user ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  Musisz być zalogowany aby uzyskać dostęp do panelu administracyjnego.
                </div>
              </div>
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full"
              >
                Przejdź do logowania
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Hasło administratora"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Weryfikacja..." : "Uzyskaj uprawnienia administratora"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
