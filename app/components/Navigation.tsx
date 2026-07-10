import { Link } from "react-router";

export function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-gray-900">
            React Router SPA
          </Link>
          <div className="flex gap-6">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/sample"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sample
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
