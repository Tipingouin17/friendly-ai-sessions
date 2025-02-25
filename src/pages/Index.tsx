
import { HeroSection } from "@/components/HeroSection";
import { Features } from "@/components/Features";

const Index = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <Features />
      <footer className="bg-gray-50 py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-4">
            <span className="text-xl font-bold text-primary">AI Facilitator</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
