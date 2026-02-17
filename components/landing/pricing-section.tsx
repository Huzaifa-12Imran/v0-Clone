import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for exploring and small projects.",
    features: ["10 messages per day", "Standard speed", "Public chats only", "Community support"],
  },
  {
    name: "Pro",
    price: "$20",
    period: "/mo",
    description: "For professionals and power users.",
    features: ["Unlimited messages", "Fastest speed", "Private chats", "Priority support", "Early access to features"],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Scale your business with dedicated tools.",
    features: ["Custom deployments", "SLA guarantees", "Dedicated account manager", "Advanced security", "Team collaboration"],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that's right for you. All plans include access to our core AI components.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto text-foreground">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col p-8 rounded-2xl border bg-card transition-all hover:shadow-lg ${
                plan.popular ? "border-primary shadow-md scale-105 z-10" : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>
                <p className="mt-4 text-muted-foreground">{plan.description}</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.popular ? "default" : "outline"}
                className="w-full h-12 text-base font-semibold"
                asChild
              >
                <Link 
                  href={
                    plan.name === "Free" 
                      ? "/console" 
                      : plan.name === "Enterprise" 
                        ? "mailto:sales@v0-clone.com" 
                        : `/checkout?plan=${plan.name.toLowerCase()}`
                  }
                >
                  {plan.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
