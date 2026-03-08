# WarehouseHub 설정 가이드

> API 프록시, CORS, 쿠키 등 **로그인 관련 설정**을 한 곳에 정리한 문서입니다.

---

## 1. 개요

WarehouseHub는 **JWT + HttpOnly 쿠키** 기반 인증을 사용합니다. Cross-origin 환경에서는 쿠키 전달이 되지 않아 로그인 시 **리다이렉트 루프**가 발생할 수 있으므로, **같은 origin 프록시**를 권장합니다.

---

## 2. 권장 구성: 같은 origin 프록시 (개발·프로덕션 공통)

| 항목 | 값 | 설명 |
|------|-----|------|
| `NEXT_PUBLIC_API_BASE_URL` | **비움** 또는 `/api/proxy` | 빈 값이면 자동으로 `/api/proxy` 사용. API 호출이 Web과 같은 origin으로 가도록 함 |
| `API_PROXY_TARGET` | API 서버 주소 | Next.js rewrites가 `/api/proxy/*`를 이 주소로 프록시 |

**동작 흐름**
1. Web(3000) → `/api/proxy/auth/login` 요청
2. Next.js rewrites → `API_PROXY_TARGET/auth/login` (예: 3001)
3. API가 Set-Cookie 응답 → **Web 도메인에 쿠키 설정** (같은 origin이므로 정상 동작)
4. 이후 요청에 쿠키 자동 포함 → 인증 유지

---

## 3. 환경별 설정 요약

### 3.1 개발 환경 (로컬)

| 변수 | 권장값 | 비고 |
|------|--------|------|
| `NEXT_PUBLIC_API_BASE_URL` | (비움) | 기본값 `/api/proxy` 사용 |
| `API_PROXY_TARGET` | `http://localhost:3001` | API 포트 |
| `CORS_ORIGIN` | `http://localhost:3000,http://localhost:3002` | turbo dev 사용 시 web이 3002로 뜰 수 있음 |
| `WEB_ORIGIN` | `http://localhost:3000` | 회원가입 등 검증용 |
| `COOKIE_SECURE` | `false` | HTTP 환경 |
| `COOKIE_SAMESITE` | `lax` | 기본값 |
| `COOKIE_DOMAIN` | (비움) | 로컬에서는 불필요 |

### 3.2 프로덕션 (API·Web 같은 도메인, 예: app.example.com)

| 변수 | 권장값 | 비고 |
|------|--------|------|
| `NEXT_PUBLIC_API_BASE_URL` | (비움) 또는 `/api/proxy` | 같은 origin 프록시 |
| `API_PROXY_TARGET` | `http://api:3001` (Docker) 또는 내부 URL | Nginx/reverse proxy 뒤 API 주소 |
| `CORS_ORIGIN` | `https://app.example.com` | 실제 웹 출처 |
| `WEB_ORIGIN` | `https://app.example.com` | |
| `COOKIE_SECURE` | `true` | HTTPS 필수 |
| `COOKIE_SAMESITE` | `lax` (같은 도메인) / `none` (다른 도메인) | API·Web 도메인 다르면 `none` |
| `COOKIE_DOMAIN` | (비움) | 서브도메인 공유 시 `.example.com` |

### 3.3 프로덕션 (API·Web 다른 도메인, 예: api.example.com / app.example.com)

| 변수 | 권장값 | 비고 |
|------|--------|------|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.example.com` | API 직접 호출 (Cross-origin) |
| `API_PROXY_TARGET` | 사용 안 함 | |
| `CORS_ORIGIN` | `https://app.example.com` | Web 출처 |
| `COOKIE_SECURE` | `true` | |
| `COOKIE_SAMESITE` | `none` | Cross-site cookie 허용 필요 |
| `COOKIE_DOMAIN` | `.example.com` | api/app 모두 포함하는 상위 도메인 |

> **주의**: Cross-origin + 쿠키는 `SameSite=none` + `Secure` 필수이며, 브라우저 정책에 따라 제한될 수 있습니다. **가능하면 같은 origin 프록시**를 사용하는 것이 안정적입니다.

---

## 4. 관련 파일 및 역할

| 파일 | 역할 |
|------|------|
| `apps/web/next.config.ts` | `rewrites`: `/api/proxy/:path*` → `API_PROXY_TARGET/:path*` |
| `apps/web/src/shared/config/env.ts` | `NEXT_PUBLIC_API_BASE_URL` 파싱 → `API_BASE_URL` 결정 |
| `apps/web/src/shared/api/http-client.ts` | axios `baseURL: API_BASE_URL`, `withCredentials: true` |
| `apps/api/src/main.ts` | CORS `origin: CORS_ORIGIN`, `credentials: true` |
| `apps/api/src/modules/auth/http/cookies.config.ts` | `COOKIE_*` 변수 → 쿠키 옵션 |

---

## 5. 트러블슈팅

### 5.1 로그인 후 무한 리다이렉트

- **원인**: `NEXT_PUBLIC_API_BASE_URL`에 `http://localhost:3001` 같은 **절대 URL**을 넣은 경우. Cross-origin 요청에서 Set-Cookie가 Web 도메인에 설정되지 않음.
- **해결**: `NEXT_PUBLIC_API_BASE_URL`을 **비우거나** `/api/proxy`로 설정.

### 5.2 turbo dev 사용 시 401 / CORS 에러

- **원인**: `pnpm dev`(turbo) 사용 시 Web 포트가 3002로 바뀔 수 있음. CORS에 3002가 없으면 차단.
- **해결**: `CORS_ORIGIN`에 `http://localhost:3002` 추가.

### 5.3 프로덕션에서 로그인 안 됨

- **원인**: `COOKIE_SECURE=false`인데 HTTPS 사용 중.
- **해결**: `COOKIE_SECURE=true`로 설정.

---

*문서 작성일: 2026-03-08*
