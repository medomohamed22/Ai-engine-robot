import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EVA Motion Lab",
  description: "Embodied Virtual Autonomous Learner — humanoid motion training and AI coaching.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
