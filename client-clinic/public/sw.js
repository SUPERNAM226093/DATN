
// NƠI LƯU TRỮ BỘ NHỚ ĐỆM:
// Bộ nhớ đệm được lưu trữ trực tiếp trên trình duyệt của thiết bị người dùng
// cụ thể là trong "Cache Storage" (nằm trong tab Application -> Cache Storage của DevTools).
// Định nghĩa phiên bản và tên của Cache Storage
const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `medpro-clinic-${CACHE_VERSION}`;
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/globals.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/logo-medpro.png'
];

/**
 * 1. SỰ KIỆN: install (Cài đặt Service Worker)
 * Chạy khi Service Worker được tải và cài đặt lần đầu tiên trên trình duyệt.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    // Mở kho lưu trữ Cache với tên CACHE_NAME
    caches.open(CACHE_NAME).then((cache) => {
      // Tải và thêm tất cả tài nguyên trong danh sách PRECACHE_ASSETS vào cache
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Ép Service Worker mới hoạt động ngay lập tức mà không cần chờ đóng các tab cũ
  self.skipWaiting();
});

/**
 * 2. SỰ KIỆN: activate (Kích hoạt Service Worker)
 * Chạy khi Service Worker mới đã sẵn sàng hoạt động.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Quét toàn bộ danh sách các kho Cache hiện có trong trình duyệt
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Nếu phát hiện cache cũ (khác với CACHE_NAME hiện tại), thực hiện xóa đi để giải phóng bộ nhớ
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Cho phép Service Worker này kiểm soát ngay lập tức tất cả các tab đang mở của trang web
  self.clients.claim();
});

/**
 * 3. SỰ KIỆN: fetch (Chặn và xử lý các yêu cầu mạng)
 * Bất cứ khi nào ứng dụng gửi request lấy ảnh, CSS, JS, HTML hay gọi API, sự kiện này sẽ chặn lại.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // BỎ QUA KHÔNG CACHE:
  // - Các phương thức không phải GET (như POST, PUT, DELETE)
  // - Các đường dẫn nhạy cảm như Đăng nhập/Đăng ký (/api/auth), Cuộc gọi video (/video-call) và Kết nối Socket
  if (request.method !== 'GET' ||
    url.pathname.includes('/api/auth') ||
    url.pathname.includes('/video-call') ||
    url.pathname.includes('socket')) {
    return; // Cho đi thẳng ra Internet bình thường
  }

  // CHIẾN LƯỢC: Stale-While-Revalidate (Lấy trong cache trước, tải mới cập nhật sau)
  event.respondWith(
    // Kiểm tra xem yêu cầu này đã có sẵn trong Cache Storage hay chưa
    caches.match(request).then((cachedResponse) => {
      // Song song đó, gửi yêu cầu tải dữ liệu mới từ Internet
      const fetchedResponse = fetch(request).then((networkResponse) => {
        // Nếu tải thành công và có phản hồi hợp lệ (status 200)
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone(); // Nhân bản phản hồi
          // Mở cache và lưu bản cập nhật mới nhất vào bộ nhớ đệm cho lần sau
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse; // Trả về dữ liệu mới từ mạng
      }).catch(() => {
        // DỰ PHÒNG KHI MẤT MẠNG (OFFLINE):
        // Nếu không có mạng và tài nguyên yêu cầu là một trang web (HTML)
        if (request.headers.get('accept').includes('text/html')) {
          // Trả về trang offline.html đã được lưu trong bộ nhớ đệm lúc cài đặt
          return caches.match('/offline.html');
        }
      });

      // Trả về dữ liệu từ cache ngay lập tức nếu có, nếu chưa có thì đợi kết quả tải từ mạng
      return cachedResponse || fetchedResponse;
    })
  );
});
