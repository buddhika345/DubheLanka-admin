import "./globals.css";

export const metadata = {
  title: "Ceylon Dubhe Tracking Admin",
  description: "Admin panel for tracking system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}