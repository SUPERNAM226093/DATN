import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        // Cho phép load ảnh từ các domain bên ngoài nếu cần sau này
        // Ảnh trong /public không cần khai báo ở đây
        remotePatterns: [
            {
                // Ảnh upload từ backend Spring Boot (avatar bác sĩ, ảnh phòng...)
                protocol: "https",
                hostname: "sandy-marker-trance-column.trycloudflare.com",
                pathname: "/api/files/**",
            },
        ],
    },
};

export default nextConfig;
