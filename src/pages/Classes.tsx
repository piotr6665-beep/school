import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Users, TrendingUp } from "lucide-react";

const Classes = () => {
  const classTypes = [
    {
      title: "Aerial Hoop (Koło powietrzne)",
      description: "Zajęcia na stalowym kole zawieszonym w powietrzu. Idealne do nauki figur, rotacji i eleganckich układów choreograficznych.",
      levels: ["Początkujący", "Średniozaawansowany", "Zaawansowany"],
      age: "Od 7 lat",
      icon: Sparkles,
    },
    {
      title: "Aerial Silk (Tkaniny powietrzne)",
      description: "Akrobatyka na długich tkaninach zawieszonych pod sufitem. Rozwijaj siłę, elastyczność i kreatywność.",
      levels: ["Początkujący", "Średniozaawansowany", "Zaawansowany"],
      age: "Od 8 lat",
      icon: TrendingUp,
    },
    {
      title: "Kids Aerial",
      description: "Specjalne zajęcia dla dzieci łączące zabawę z nauką akrobatyki powietrznej. Rozwijamy koordynację i pewność siebie.",
      levels: ["Dzieci 6-8 lat", "Dzieci 9-12 lat"],
      age: "6-12 lat",
      icon: Users,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
            Nasze zajęcia
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Odkryj różnorodność akrobatyki powietrznej. Każdy rodzaj zajęć jest dostosowany do poziomu zaawansowania i wieku uczestników.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {classTypes.map((classType, index) => {
            const Icon = classType.icon;
            return (
              <Card key={index} className="hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle>{classType.title}</CardTitle>
                  <CardDescription>{classType.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold mb-2">Poziomy:</p>
                    <div className="flex flex-wrap gap-2">
                      {classType.levels.map((level, idx) => (
                        <Badge key={idx} variant="secondary">
                          {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Wiek: <span className="font-normal text-muted-foreground">{classType.age}</span></p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-gradient-hero border-none">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Co wyróżnia nasze zajęcia?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-primary">Małe grupy</h3>
                <p className="text-muted-foreground">
                  Maksymalnie 8 osób w grupie zapewnia indywidualną uwagę instruktora i bezpieczne warunki treningowe.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-primary">Profesjonalny sprzęt</h3>
                <p className="text-muted-foreground">
                  Wykorzystujemy najwyższej jakości sprzęt akrobatyczny, regularnie kontrolowany i certyfikowany.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-primary">Systematyczny rozwój</h3>
                <p className="text-muted-foreground">
                  Program zajęć jest starannie zaplanowany, aby zapewnić stopniowy i bezpieczny rozwój umiejętności.
                </p>
              </div>

              <div className="bg-card p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-3 text-primary">Zajęcia otwarte</h3>
                <p className="text-muted-foreground">
                  Możliwość dołączenia w trakcie roku i zajęcia próbne dla wszystkich zainteresowanych.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Classes;
