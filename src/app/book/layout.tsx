import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Your Tour",
  description: "Choose a tour, pick a date, and book online",
};

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ background: "#FAFBFC", color: "#1a1a2e", minHeight: "100vh" }}
      className="flex flex-col"
    >
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
        }}
        className="px-4 py-4 sm:px-6"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1
            style={{ color: "#1B6B8A" }}
            className="text-xl font-bold tracking-tight"
          >
            Book Your Tour
          </h1>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer
        style={{ borderTop: "1px solid #e5e7eb", color: "#6b7280" }}
        className="px-4 py-4 text-center text-sm"
      >
        Website designed &amp; developed by <a href="https://advancedmarketing.co" target="_blank" rel="noopener noreferrer" style={{ color: "#1B6B8A", textDecoration: "underline" }}>advancedmarketing.co</a>
      </footer>
    </div>
  );
}
