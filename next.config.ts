import type { NextConfig } from 'next';

const BASE_PATH = process.env.BASE_PATH ?? '';
// 隔离构建用:设 NEXT_DIST_DIR=.next-buildcheck 可 build 到临时目录,
// 不覆盖正在被 `next start`(prod 3050)serve 的默认 .next。未设时行为不变。
const DIST_DIR = process.env.NEXT_DIST_DIR ?? '';

// 安全头(#4)：CSP 先 Report-Only(不阻断,框架注入内联 script;先收集违规再 enforce)，
// 但 frame-ancestors 'none' + X-Frame-Options:DENY 即时硬阻断 iframe 套壳点击劫持。
// 浏览器只连接同源 JSON REST；外部服务与后端地址不得暴露给前端运行时。
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  ...(DIST_DIR ? { distDir: DIST_DIR } : {}),
  // 注：output: 'standalone' 跟 `next start` 不兼容（必须 node .next/standalone/server.js）。
  //     systemd unit 用 next start，故默认禁用 standalone；
  //     Docker 镜像分发时设 NEXT_STANDALONE=1 开启（用 node server.js 启动）。
  ...(process.env.NEXT_STANDALONE === '1' ? { output: 'standalone' as const } : {}),
  ...(BASE_PATH ? { basePath: BASE_PATH, assetPrefix: BASE_PATH } : {}),
  allowedDevOrigins: ['127.0.0.1'],
  // `/throne` 与 `/overview` 都渲染大殿：前者兼容御座语义和既有深链，
  // 后者是当前顶导入口。不可再把 `/throne` 重定向到上书房，否则仓内现存
  // 大殿 page 以及指向它的帮助/回奏链接会永久不可达。
  // 减法 B：六部只保留 /departments/[code] 作为唯一主页；
  // 旧 /manor-dept/*、旧 /bingbu、别名 /departments/libu|works 一律 307 收口到 canonical。
  redirects() {
    return Promise.resolve([
      { source: '/dadian', destination: '/overview', permanent: false },
      // ── 减法 B：部门入口路由合并 ──
      { source: '/bingbu', destination: '/departments/ops', permanent: false },
      { source: '/manor-dept/finance', destination: '/departments/finance', permanent: false },
      { source: '/manor-dept/gongbu', destination: '/departments/gongbu', permanent: false },
      { source: '/manor-dept/ops', destination: '/departments/ops', permanent: false },
      { source: '/manor-dept/physician', destination: '/departments/physician', permanent: false },
      { source: '/manor-dept/guard', destination: '/departments/guard', permanent: false },
      { source: '/departments/libu', destination: '/departments/market', permanent: false },
      { source: '/departments/works', destination: '/departments/gongbu', permanent: false },
      { source: '/manor-dept/:code', destination: '/departments/:code', permanent: false },
    ]);
  },
  // #4 全站安全响应头(公网就绪)：点击劫持/嗅探/中间人/越权引用的第一道门。
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
  // autoresearch/build-speed-jul4 experiment: parallelize output file tracing
  // across the ~96 routes instead of tracing them serially.
  experimental: {
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
    workerThreads: true,
  },
};

export default nextConfig;
