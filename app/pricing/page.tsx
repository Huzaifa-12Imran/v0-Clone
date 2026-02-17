import { AppHeader } from "@/components/shared/app-header";
import { PricingSection } from "@/components/landing/pricing-section";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      
      <main className="flex-1 py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
              Empower your workflow with the right plan
            </h1>
            <p className="text-xl text-muted-foreground">
              All plans include access to our state-of-the-art AI generation tools. 
              Upgrade to Pro for unlimited credits and priority support.
            </p>
          </div>

          <PricingSection />

          <div className="max-w-4xl mx-auto mt-20 border-t border-border pt-16">
            <h2 className="text-3xl font-bold text-center mb-12">Plan Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 px-6 font-semibold">Features</th>
                    <th className="py-4 px-6 font-semibold text-center">Free</th>
                    <th className="py-4 px-6 font-semibold text-center text-primary">Pro</th>
                    <th className="py-4 px-6 font-semibold text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  <tr className="border-b border-border">
                    <td className="py-4 px-6 font-medium">Daily Credits</td>
                    <td className="py-4 px-6 text-center">10</td>
                    <td className="py-4 px-6 text-center font-bold">Unlimited</td>
                    <td className="py-4 px-6 text-center font-bold">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-4 px-6 font-medium">Generation Speed</td>
                    <td className="py-4 px-6 text-center text-muted-foreground">Standard</td>
                    <td className="py-4 px-6 text-center font-bold text-primary">Ultra-Fast</td>
                    <td className="py-4 px-6 text-center font-bold text-primary">Priority</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-4 px-6 font-medium">Private Projects</td>
                    <td className="py-4 px-6 text-center">No</td>
                    <td className="py-4 px-6 text-center">Yes</td>
                    <td className="py-4 px-6 text-center">Yes</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-4 px-6 font-medium">Custom Styling</td>
                    <td className="py-4 px-6 text-center">Limited</td>
                    <td className="py-4 px-6 text-center">Full</td>
                    <td className="py-4 px-6 text-center">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium">Support</td>
                    <td className="py-4 px-6 text-center text-muted-foreground">Community</td>
                    <td className="py-4 px-6 text-center font-medium">Priority Email</td>
                    <td className="py-4 px-6 text-center font-medium">24/7 Dedicated</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-border mt-auto">
        <div className="container px-4 mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-bold text-xl tracking-tight">v0-Clone</div>
          <div className="text-muted-foreground text-sm">
            © 2026 v0-Clone. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
