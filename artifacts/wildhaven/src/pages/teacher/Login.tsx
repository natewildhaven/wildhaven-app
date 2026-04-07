import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import meadowBg from "@assets/Flowery_Meadow_1774133232233.jpg";
import titleImg from "@assets/Website_Title_Text_1774175233073.png";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") + "/api";

export default function TeacherLogin() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const settings = useSettings();
  const bgUrl = settings.backgroundImageUrl || meadowBg;
  const logoUrl = settings.titleImageUrl || titleImg;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/teacher/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem("wildhaven_teacher_auth", "true");
        setLocation("/teacher/award");
      } else {
        toast({ title: "Access Denied", description: "Incorrect teacher password.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not connect to server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative p-4">
      <img
        src={bgUrl}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring" }}
        className="relative z-10 flex justify-center w-full max-w-2xl px-4 mb-8"
      >
        <img
          src={logoUrl}
          alt="Wildhaven Collectible Cards"
          className="w-full drop-shadow-2xl"
        />
      </motion.div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="shadow-2xl border-primary/20 bg-white/90 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="flex flex-col items-center mb-8">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground">Teacher Access</h1>
              <p className="text-muted-foreground mt-2 text-center">Manage students, packs, and collections.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="py-6 text-lg"
              />
              <Button type="submit" disabled={isLoading} className="w-full py-6 text-lg font-bold">
                {isLoading ? "Checking…" : "Authenticate"}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/" className="text-sm text-primary hover:underline font-semibold">
                &larr; Back to Student Portal
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
