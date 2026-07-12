import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "localhost",
                pathname: "/api/files/**",
            },
        ],
    },
};

export default nextConfig;
