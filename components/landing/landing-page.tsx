import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PricingSection } from "./pricing-section";
import { ArrowRight, Zap, Shield, Sparkles } from "lucide-react";
import { Snowfall } from "@/components/shared/snowfall";

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen relative">
      <Snowfall />
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden bg-background">
        <div className="container relative z-10 px-4 mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            <span>Introducing v0-Clone v2.0</span>
          </div>
          <h1 className="max-w-4xl mx-auto mb-8 text-5xl font-extrabold tracking-tight lg:text-7xl">
            Build production UI with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
              Natural Language
            </span>
          </h1>
          <p className="max-w-2xl mx-auto mb-12 text-xl text-muted-foreground lg:text-2xl">
            Turn your ideas into deployable, production-ready interfaces in seconds. Experience the future of web development.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-14 px-8 text-lg font-semibold" asChild>
              <Link href="/console">
                Try the Console <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold" asChild>
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
        
        {/* Background glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10 opacity-50" />
      </section>

      {/* Features Section */}
      <section className="py-24 border-y border-border bg-muted/30">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-foreground">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Lightning Fast</h3>
              <p className="text-muted-foreground text-lg">
                Generate components and layouts in real-time. No more manual coding for repetitive tasks.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">AI-Powered Design</h3>
              <p className="text-muted-foreground text-lg">
                Our AI understands design principles to create aesthetically pleasing and functional UIs.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Production Ready</h3>
              <p className="text-muted-foreground text-lg">
                The generated code is clean, optimized, and ready to be dropped into your existing projects.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-background">
        <div className="container px-4 mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-bold text-xl tracking-tight">v0-Clone</div>
          <div className="flex gap-8 text-muted-foreground font-medium">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/console" className="hover:text-foreground">Console</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          </div>
          <div className="text-muted-foreground text-sm">
            © 2026 v0-Clone. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
