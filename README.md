# WarehouseHub

창고/물류 관리를 위한 풀스택 웹 애플리케이션. 회사(테넌트) 단위로 재고, 입고, 출고, 반품을 관리합니다.

## 기술 스택

- **API**: NestJS, Prisma, PostgreSQL, JWT(쿠키 기반)
- **Web**: Next.js, React, Tailwind CSS
- **모노레포**: Turborepo, pnpm

## 사전 요구사항

- Node.js 18+
- pnpm 9+
- PostgreSQL 14+ (또는 Docker)

## 빠른 시작

### 1. 의존성 설치

```sh
pnpm install
```

### 2. 환경 변수 설정

```sh
cp .env.example .env
# .env 파일을 열어 필요한 값으로 수정 (최소: DATABASE_URL, JWT_SECRET)
```

### 3. DB 설정 및 마이그레이션

```sh
# Docker로 PostgreSQL 실행 (선택)
docker-compose up -d db

# API 디렉터리에서 Prisma 마이그레이션
cd apps/api && pnpm exec prisma migrate deploy
cd ../..
```

### 4. 개발 서버 실행

```sh
pnpm dev
```

- **API**: http://localhost:3001
- **Web**: http://localhost:3000

## 환경 변수

| 변수 | 필수 | 설명 | 예시 |
|------|:----:|------|------|
| `DATABASE_URL` | ✓ | PostgreSQL 연결 문자열 | `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_SECRET` | ✓ | JWT 서명 시크릿 (32자 이상) | 32자 이상 랜덤 문자열 |
| `API_PORT` | | API 서버 포트 | `3001` |
| `NEXT_PUBLIC_API_BASE_URL` | | 웹에서 API 호출 URL. 비움 시 프록시 사용(권장) | 비움 또는 `/api/proxy` |
| `API_PROXY_TARGET` | | Next.js API 프록시 대상 | `http://localhost:3001` |
| `WEB_ORIGIN` | | 웹 프론트 출처 (회원가입 등 검증용) | `http://localhost:3000` |
| `CORS_ORIGIN` | | CORS 허용 출처 (쉼표 구분) | `http://localhost:3000,http://localhost:3002` |
| `COOKIE_DOMAIN` | | 쿠키 도메인 (서브도메인 공유 시) | 비움 또는 `.example.com` |
| `COOKIE_SECURE` | | HTTPS 전용 쿠키 | `false` (개발) / `true` (프로덕션) |
| `COOKIE_SAMESITE` | | SameSite 속성 | `lax` / `strict` / `none` |
| `AUTH_MAX_ACTIVE_DEVICES` | | 사용자당 최대 동시 로그인 디바이스 수 | `3` |
| `LOG_LEVEL` | | 로그 레벨 | `debug` / `info` / `warn` / `error` |

**상세 설명**: `.env.example` 주석 및 [docs/SETUP.md](./docs/SETUP.md) 참고.

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 로그인 후 무한 리다이렉트 | `NEXT_PUBLIC_API_BASE_URL`에 절대 URL 사용 (Cross-origin) | 비우거나 `/api/proxy`로 설정 |
| turbo dev 시 401/CORS 에러 | Web 포트 3002 미허용 | `CORS_ORIGIN`에 `http://localhost:3002` 추가 |
| 프로덕션 로그인 안 됨 | `COOKIE_SECURE=false`인데 HTTPS 사용 | `COOKIE_SECURE=true` 설정 |

→ **로그인 관련 설정 상세**: [docs/SETUP.md](./docs/SETUP.md)

## API 문서

개발 서버 실행 후 Swagger UI에서 확인할 수 있습니다.

- http://localhost:3001/api (Swagger)

## 빌드 및 프로덕션

```sh
# 전체 빌드
pnpm build

# API만 빌드
pnpm --filter api build

# Web만 빌드
pnpm --filter web build
```

프로덕션 실행:

```sh
# API (apps/api에서)
pnpm --filter api start

# Web (apps/web에서)
pnpm --filter web start
```

## 권한·RBAC

- **Warehouses**: 인증된 모든 사용자가 회사 창고 목록 조회 가능. 상세: [docs/WAREHOUSES_RBAC.md](./docs/WAREHOUSES_RBAC.md)
- 역할별 API 접근: [docs/ROLE_API_MATRIX.md](./docs/ROLE_API_MATRIX.md)

## 프로젝트 구조

```
warehousehub/
├── apps/
│   ├── api/          # NestJS 백엔드 API
│   └── web/          # Next.js 프론트엔드
├── packages/         # 공유 패키지
├── docs/             # 문서 (기능 개요, Git 워크플로우, 설정 가이드 등)
├── docker-compose.yml
├── turbo.json
└── .env.example
```

## Docker 배포

```sh
# DB만 실행 (로컬 개발 시)
docker-compose up -d db

# 전체 스택 (DB + API + Web). 최초 실행 전 apps/api에서 prisma migrate deploy 실행
docker-compose up -d --build
```

자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

## 관련 문서

- [docs/SETUP.md](./docs/SETUP.md) — 로그인·프록시·CORS·쿠키 설정 가이드
- [docs/FEATURES_OVERVIEW.md](./docs/FEATURES_OVERVIEW.md) — 기능 개요
- [docs/REQUIREMENTS_REFINED.md](./docs/REQUIREMENTS_REFINED.md) — 상세 요구사항
- [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md) — Git 워크플로우
