import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 폴더의 lockfile 때문에 workspace 루트가 잘못 잡히는 것을 방지한다.
  outputFileTracingRoot: import.meta.dirname,
  // Firebase Hosting에 정적 사이트로 배포한다.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: { dirs: ["src", "tests"] },
};

export default nextConfig;
