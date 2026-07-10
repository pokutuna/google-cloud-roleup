import { Code, ExternalLink, GitBranch, Rocket, Zap } from "lucide-react";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "React Router SPA Template" },
    {
      name: "description",
      content:
        "A modern SPA template with React Router and Tailwind CSS, ready for GitHub Pages deployment",
    },
  ];
}

export default function Home() {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            React Router SPA Template
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A modern, production-ready template for building single-page
            applications
          </p>
          <a
            href="https://github.com/pokutuna/react-router-spa-starter"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            <ExternalLink size={20} />
            View on GitHub
          </a>
        </header>

        <section className="grid md:grid-cols-2 gap-6 mb-16">
          <FeatureCard
            icon={<Zap className="text-yellow-500" size={32} />}
            title="Lightning Fast"
            description="Built with React Router v8 and Vite for optimal performance and developer experience"
          />
          <FeatureCard
            icon={<Code className="text-blue-500" size={32} />}
            title="Modern Stack"
            description="TypeScript, Tailwind CSS v4, and all the latest web development tools"
          />
          <FeatureCard
            icon={<Rocket className="text-purple-500" size={32} />}
            title="GitHub Pages Ready"
            description="Pre-configured for seamless deployment to GitHub Pages with proper routing"
          />
          <FeatureCard
            icon={<GitBranch className="text-gray-700" size={32} />}
            title="Template Repository"
            description="Use this as a template to quickly start your next project with best practices"
          />
        </section>

        <section className="bg-white rounded-lg shadow-md p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start</h2>
          <div className="space-y-4">
            <CodeBlock
              title="1. Clone or use as template"
              code="git clone https://github.com/pokutuna/react-router-spa-starter.git"
            />
            <CodeBlock title="2. Install dependencies" code="npm install" />
            <CodeBlock title="3. Start development server" code="npm run dev" />
            <CodeBlock title="4. Build for production" code="npm run build" />
          </div>
        </section>

        <footer className="text-center text-gray-600">
          <p className="mb-2">
            Built with React Router, TypeScript, and Tailwind CSS
          </p>
          <p className="text-sm">
            Customize this template to create your own amazing SPA
          </p>
        </footer>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

interface CodeBlockProps {
  title: string;
  code: string;
}

function CodeBlock({ title, code }: CodeBlockProps) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{title}</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}
