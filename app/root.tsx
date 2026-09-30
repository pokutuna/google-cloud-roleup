import { LoaderCircle } from "lucide-react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { LangProvider } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import "./app.css";

/** Runs before hydration so the correct theme applies with no flash. */
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("roleup.theme");
    var dark = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export const links: Route.LinksFunction = () => [
  {
    rel: "icon",
    href: `${import.meta.env.BASE_URL}favicon.ico`,
    type: "image/x-icon",
    sizes: "any",
  },
  {
    rel: "apple-touch-icon",
    href: `${import.meta.env.BASE_URL}apple-touch-icon.png`,
  },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Sans+Mono:wght@400;500;700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    // The theme init script sets `class="dark"` before hydration.
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#ffffff" />
        <Meta />
        <Links />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, no user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <Outlet />
      </LangProvider>
    </ThemeProvider>
  );
}

/**
 * Prerendered at build time, when the viewer's language is unknown; keep it
 * free of translated text so hydration never mismatches.
 */
export function HydrateFallback() {
  return (
    <div className="flex h-dvh items-center justify-center text-gray-400">
      <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
