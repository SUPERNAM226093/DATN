import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "jean-skirt-term-des.trycloudflare.com",
                pathname: "/api/files/**",
            },
        ],
    },
};

export default nextConfig;
