import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                // Ảnh upload từ backend Spring Boot (avatar bác sĩ, ảnh phòng...)
                protocol: "https",
                hostname: "silent-vector-chi-steven.trycloudflare.com",
                pathname: "/api/files/**",
            },
        ],
    },
};

export default nextConfig;
