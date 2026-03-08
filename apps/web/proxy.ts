/**
 * Next.js 16 Proxy (인증 미들웨어)
 * - config는 이 파일에 직접 정의해야 함 (재export 불가)
 */
export { proxy as default } from './src/proxy';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
