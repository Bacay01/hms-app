import "@fontsource-variable/plus-jakarta-sans"; // font files come from npm — no Google download
import "./globals.css";
import { SITE } from "@/lib/site";

export const metadata = {
  title: `${SITE.name} — Hospital Management System`,
  description: SITE.tagline,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
