"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, CreditCard, Lock } from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "pro";
  const capitalPlan = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="container mx-auto max-w-2xl py-20 px-4">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-2xl">Complete your {capitalPlan} subscription</CardTitle>
          <CardDescription>
            Securely enter your billing details to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center">
            <div>
              <p className="font-semibold">{capitalPlan} Plan</p>
              <p className="text-sm text-muted-foreground">Billed monthly</p>
            </div>
            <p className="text-2xl font-bold">{plan === "pro" ? "$20" : "$0"}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Card Number</Label>
              <div className="relative">
                <Input id="card-number" placeholder="0000 0000 0000 0000" className="pl-10" />
                <CreditCard className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input id="expiry" placeholder="MM / YY" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <div className="relative">
                  <Input id="cvv" placeholder="123" />
                  <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Cardholder Name</Label>
              <Input id="name" placeholder="John Doe" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full h-12 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
            Subscribe Now
          </Button>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>Secure 256-bit SSL encrypted payment</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppHeader />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
        <CheckoutContent />
      </Suspense>
      
      <footer className="py-8 border-t border-border mt-auto">
        <div className="container px-4 mx-auto text-center text-muted-foreground text-sm">
          © 2026 v0-Clone Checkout. All transactions are encrypted.
        </div>
      </footer>
    </div>
  );
}
