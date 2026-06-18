"use client";

import { useState, useEffect } from 'react';

/**
 * Sự kiện này được kích hoạt khi trình duyệt xác định trang web đáp ứng đủ các tiêu chuẩn PWA
 * và có thể cài đặt được trên thiết bị của người dùng (chỉ áp dụng với các trình duyệt nhân Chromium).
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const [isInstallable, setIsInstallable] = useState(false);

  // Trạng thái xác định xem ứng dụng đang chạy ở chế độ App độc lập (Standalone) hay chạy trên trình duyệt thường
  const [isStandalone, setIsStandalone] = useState(false);

  // Trạng thái xác định xem thiết bị của người dùng có phải là hệ điều hành iOS (iPhone, iPad) hay không
  const [isIOS, setIsIOS] = useState(false);

  // Trạng thái xác định xem người dùng có đang mở trang web trong trình duyệt nội bộ (In-App Browser của Facebook, Zalo, Tiktok,...) hay không
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    /**
     * Hàm: checkStandalone
     * Mô tả: Kiểm tra xem ứng dụng đang chạy ở chế độ Standalone (đã cài đặt làm App) hay không.
     */
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    /**
     * Hàm: checkPlatform
     * Mô tả: Nhận diện hệ điều hành và kiểm tra xem có đang chạy trong trình duyệt tích hợp (In-App Browser) hay không.
     */
    const checkPlatform = () => {
      const ua = window.navigator.userAgent;

      // Kiểm tra hệ điều hành iOS
      const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      setIsIOS(ios);

      // Kiểm tra trình duyệt tích hợp của bên thứ ba (Facebook, Instagram, Zalo, v.v.)
      const inApp = /FBAN|FBAV|Instagram|Zalo/i.test(ua);
      setIsInAppBrowser(inApp);
    };

    checkStandalone();
    checkPlatform();

    /**
     * Hàm xử lý sự kiện: handleBeforeInstallPrompt
     * Mô tả: Chặn hộp thoại cài đặt mặc định của trình duyệt để lưu lại sự kiện và hiển thị nút cài đặt tùy chỉnh.
     */
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Ngăn chặn trình duyệt hiển thị popup cài đặt mặc định ngay lập tức
      setDeferredPrompt(e as BeforeInstallPromptEvent); // Lưu sự kiện lại để kích hoạt khi nhấn nút cài đặt
      setIsInstallable(true); // Hiển thị nút cài đặt trên giao diện người dùng
    };

    // Đăng ký lắng nghe sự kiện từ trình duyệt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Hủy đăng ký lắng nghe khi component bị gỡ bỏ (unmount)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  /**
   * Hàm: installApp
   * Mô tả: Thực hiện mở hộp thoại cài đặt PWA của trình duyệt khi người dùng click vào nút cài đặt.
   */
  const installApp = async () => {
    if (!deferredPrompt) return;

    // Hiển thị hộp thoại cài đặt của trình duyệt
    deferredPrompt.prompt();

    // Đợi người dùng đưa ra lựa chọn (Đồng ý cài đặt hoặc Từ chối)
    const { outcome } = await deferredPrompt.userChoice;

    // Nếu người dùng đồng ý cài đặt ứng dụng
    if (outcome === 'accepted') {
      setDeferredPrompt(null); // Giải phóng sự kiện đã lưu
      setIsInstallable(false); // Ẩn nút cài đặt trên giao diện
    }
  };

  return {
    isInstallable,
    isStandalone,
    isIOS,
    isInAppBrowser,
    installApp
  };
};
