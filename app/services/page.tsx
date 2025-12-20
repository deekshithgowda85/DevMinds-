import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Code2, 
  Database, 
  Smartphone, 
  Cloud, 
  Brain, 
  Rocket,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import Navbar from "../components/Navbar";

const services = [
  {
    icon: Code2,
    title: "Web Development",
    description: "Full-stack web applications using modern frameworks like React, Next.js, and Node.js",
    features: [
      "Responsive UI/UX Design",
      "Performance Optimization",
      "SEO Best Practices",
      "Progressive Web Apps"
    ],
    color: "from-blue-500/20 to-blue-500/5"
  },
  {
    icon: Smartphone,
    title: "Mobile Development",
    description: "Cross-platform mobile applications with React Native and Flutter",
    features: [
      "iOS & Android Apps",
      "Native Performance",
      "Offline Functionality",
      "Push Notifications"
    ],
    color: "from-purple-500/20 to-purple-500/5"
  },
  {
    icon: Database,
    title: "Backend & APIs",
    description: "Scalable backend systems and RESTful/GraphQL API development",
    features: [
      "Database Design",
      "API Architecture",
      "Authentication & Security",
      "Microservices"
    ],
    color: "from-green-500/20 to-green-500/5"
  },
  {
    icon: Brain,
    title: "AI Integration",
    description: "AI-powered features using OpenAI, Claude, and custom ML models",
    features: [
      "Chatbot Development",
      "Natural Language Processing",
      "Multi-Agent Systems",
      "Custom AI Solutions"
    ],
    color: "from-orange-500/20 to-orange-500/5"
  },
  {
    icon: Cloud,
    title: "Cloud Solutions",
    description: "Cloud infrastructure setup and deployment on AWS, Azure, and GCP",
    features: [
      "CI/CD Pipelines",
      "Docker & Kubernetes",
      "Serverless Architecture",
      "Cloud Migration"
    ],
    color: "from-cyan-500/20 to-cyan-500/5"
  },
  {
    icon: Rocket,
    title: "Consulting",
    description: "Technical consulting and architecture planning for your projects",
    features: [
      "Technology Stack Selection",
      "System Architecture",
      "Code Review",
      "Performance Audit"
    ],
    color: "from-pink-500/20 to-pink-500/5"
  }
];

const stats = [
  { label: "Projects Completed", value: "50+" },
  { label: "Happy Clients", value: "30+" },
  { label: "Years Experience", value: "5+" },
  { label: "Technologies", value: "25+" }
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Services & Skills</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Comprehensive development services to bring your ideas to life
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat) => (
              <Card key={stat.label} className="p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.title} className="p-6 hover:shadow-lg transition-shadow">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {service.description}
                  </p>
                  <ul className="space-y-2">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>

          {/* CTA Section */}
          <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-primary/10 to-primary/5">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Project?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Let&apos;s discuss how I can help bring your ideas to life with cutting-edge technology and best practices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gap-2">
                Get in Touch
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline">
                View Portfolio
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
