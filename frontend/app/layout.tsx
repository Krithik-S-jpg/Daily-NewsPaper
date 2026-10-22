import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./reader-editorial.css";
import "./experience.css";
import "./reading-desk.css";
import { ThemeProvider } from "@/components/Theme";
export const metadata: Metadata = {
  title: "DAYBREAK — A world worth reading",
  description: "Your interests. Your sources. Your daily newspaper.",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#f4f1e9" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
