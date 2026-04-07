import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import titleImg from "@assets/Website_Title_Text_1774175233073.png";
import meadowBg from "@assets/Flowery_Meadow_1774133232233.jpg";
import { useVerifyStudentPin } from "@workspace/api-client-react";
import { useSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function StudentLogin() {
  const [pin, setPin] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const settings = useSettings();
  const bgUrl = settings.backgroundImageUrl || meadowBg;
  const logoUrl = settings.titleImageUrl || titleImg;
  const { mutateAsync: verifyPin, isPending } = useVerifyStudentPin();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast({ title: "Invalid PIN", description: "PIN must be exactly 4 digits.", variant: "destructive" });
      return;
    }
    try {
      const student = await verifyPin({ data: { pin } });
      sessionStorage.setItem("wildhaven_student_id", student.id.toString());
      setLocation(`/collection/${student.id}`);
    } catch (err: any) {
      toast({ 
        title: "Login Failed", 
        description: err.response?.data?.error || "Incorrect PIN.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative">
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

      <div className="relative z-10 w-full max-w-md px-4">
        <Card className="shadow-2xl border-primary/20 bg-white/90 backdrop-blur-sm p-2">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-display font-bold text-center text-primary mb-6">Student Access</h2>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <div className="relative">
                  <Input 
                    type="password" 
                    placeholder="Enter your 4-digit PIN" 
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="text-center text-3xl tracking-[1em] font-display py-8 bg-white/50 border-2 border-primary/30 focus-visible:ring-primary shadow-inner placeholder:tracking-normal placeholder:text-base placeholder:font-sans placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={isPending || pin.length !== 4} 
                className="w-full text-lg py-6 shadow-lg shadow-primary/30 font-display font-bold text-xl rounded-xl"
              >
                {isPending ? "Unlocking..." : "Enter Collection"}
                <LogIn className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center">
          <Link href="/teacher" className="text-primary-foreground font-semibold hover:underline bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm text-sm">
            Teacher Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
