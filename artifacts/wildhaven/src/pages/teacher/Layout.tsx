import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Users, Package, LogOut, LayoutGrid, Gift, BookOpen, Settings2, ShoppingCart, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoImg from "@assets/Logo_ONLY_(1)_1774133205744.png";

interface TeacherLayoutProps {
  children: ReactNode;
  bgStyle?: React.CSSProperties;
  bgClassName?: string;
}

export function TeacherLayout({ children, bgStyle, bgClassName }: TeacherLayoutProps) {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    sessionStorage.removeItem("wildhaven_teacher_auth");
    setLocation("/teacher");
  };

  return (
    <div className={bgClassName ?? "min-h-screen bg-slate-50 flex flex-col"} style={bgStyle}>
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/teacher/dashboard" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity shrink-0">
              <img src={logoImg} className="w-8 h-8" alt="Logo" />
              <span className="font-display font-bold text-xl hidden sm:inline">Teacher Portal</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 flex-wrap">
              <Link href="/teacher/award">
                <Button variant={location === "/teacher/award" ? "secondary" : "ghost"} className="font-bold" size="sm">
                  <Gift className="w-4 h-4 mr-1.5" /> Open Packs
                </Button>
              </Link>
              <Link href="/teacher/dashboard">
                <Button variant={location === "/teacher/dashboard" || location.startsWith("/teacher/student") || location === "/teacher/classes" ? "secondary" : "ghost"} className="font-bold" size="sm">
                  <Users className="w-4 h-4 mr-1.5" /> Students & Classes
                </Button>
              </Link>
              <Link href="/teacher/packs">
                <Button variant={location.startsWith("/teacher/packs") || location.startsWith("/teacher/boxes") ? "secondary" : "ghost"} className="font-bold" size="sm">
                  <Package className="w-4 h-4 mr-1.5" /> Packs & Boxes
                </Button>
              </Link>
              <Link href="/teacher/shop">
                <Button variant={location === "/teacher/shop" ? "secondary" : "ghost"} className="font-bold" size="sm">
                  <ShoppingCart className="w-4 h-4 mr-1.5" /> Shop
                </Button>
              </Link>
              <Link href="/teacher/achievements">
                <Button variant={location === "/teacher/achievements" ? "secondary" : "ghost"} className="font-bold" size="sm">
                  <Trophy className="w-4 h-4 mr-1.5" /> Achievements
                </Button>
              </Link>
              <Link href="/teacher/matrix">
                <Button variant={location === "/teacher/matrix" ? "secondary" : "ghost"} className="font-bold" size="sm">
                  <LayoutGrid className="w-4 h-4 mr-1.5" /> Matrix
                </Button>
              </Link>
              <Link href="/teacher/settings">
                <Button variant={location === "/teacher/settings" ? "secondary" : "ghost"} className="font-bold" size="sm">
                  <Settings2 className="w-4 h-4 mr-1.5" /> Settings
                </Button>
              </Link>
            </nav>
          </div>

          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
