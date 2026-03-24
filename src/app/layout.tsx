import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rio Group Products Advisor",
  description: "The Rio Group — Loan Products Advisor powered by AZ & Associates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-rio-gray">
        {children}
      </body>
    </html>
  );
}
