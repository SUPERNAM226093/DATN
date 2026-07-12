import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./theme.css"; // File theme màu chung của toàn bộ ứng dụng MedPro

import ChatWidget from "./components/ChatWidget";

import { ToastProvider } from "./context/ToastContext";
import ToastContainer from "./components/ToastContainer";
import SWRegistration from "./components/PWA/SWRegistration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MedPro - Đặt khám nhanh",
  description:
    "Kết nối Người Dân với Cơ sở & Dịch vụ Y tế hàng đầu. Đặt khám nhanh, lấy số thứ tự trực tuyến, tư vấn sức khỏe từ xa.",
  keywords:
    "đặt khám, bệnh viện, bác sĩ, y tế, sức khỏe, medpro, khám bệnh trực tuyến",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MedPro',
  },
};

export const viewport = {
  themeColor: '#0f766e',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        
          <ToastProvider>
            <SWRegistration />

            {children}
            <ChatWidget />
            <ToastContainer />
          </ToastProvider>
        
      </body>
    </html>
  );
}

