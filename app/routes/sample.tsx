import { Code, Terminal, Zap } from "lucide-react";
import type { Route } from "./+types/sample";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sample Page - React Router SPA" },
    { name: "description", content: "Sample page demonstrating features" },
  ];
}

export default function Sample() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      <section>
        <h1 className="text-4xl font-bold mb-4">Sample Page</h1>
        <p className="text-lg text-gray-600">
          This is a sample page demonstrating various features and components.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
          <Code className="w-12 h-12 text-blue-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">TypeScript</h2>
          <p className="text-gray-600">
            Full type safety throughout the application with TypeScript.
          </p>
        </div>

        <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
          <Zap className="w-12 h-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Fast Build</h2>
          <p className="text-gray-600">
            Lightning-fast development experience powered by Vite.
          </p>
        </div>

        <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
          <Terminal className="w-12 h-12 text-green-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Modern Stack</h2>
          <p className="text-gray-600">
            Built with React Router v8, Tailwind CSS v4, and modern tooling.
          </p>
        </div>
      </section>

      <section className="p-6 bg-gray-50 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Features</h2>
        <ul className="space-y-2">
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">✓</span>
            <span>Client-side routing with React Router v8</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">✓</span>
            <span>Utility-first CSS with Tailwind CSS v4</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">✓</span>
            <span>TypeScript for type safety</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-500 mr-2">✓</span>
            <span>Automatic deployment to GitHub Pages</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
