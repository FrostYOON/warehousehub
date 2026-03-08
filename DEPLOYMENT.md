# WarehouseHub 배포 가이드

## Docker Compose로 로컬/개발 환경 실행

### DB만 실행 (API·Web 로컬 실행)

```sh
docker-compose up -d db
```

이후 API, Web을 로컬에서 실행:

```sh
pnpm install
cp .env.example .env
# .env 수정 (DATABASE_URL, JWT_SECRET 등)

cd apps/api && pnpm exec prisma migrate deploy && cd ../..
pnpm dev
```

### 전체 스택 (DB + API + Web)

```sh
# 환경 변수 설정 (.env 또는 export)
export DATABASE_URL=postgresql://warehousehub:warehousehub@db:5432/warehousehub?schema=public
export JWT_SECRET=your_production_secret_at_least_32_chars

# 로그인 관련 (docs/SETUP.md 참고)
export WEB_ORIGIN=http://localhost:3000
export CORS_ORIGIN=http://localhost:3000
export COOKIE_SECURE=false

# Docker 내부 API 주소 (web → api 프록시용)
export API_PROXY_TARGET=http://api:3001
export NEXT_PUBLIC_API_BASE_URL=

# 빌드 및 실행
docker-compose up -d --build
```

> **주의**: 최초 실행 전 `apps/api`에서 `prisma migrate deploy`를 먼저 실행해야 합니다. (또는 CI/CD에서 선행)

## Docker 이미지 빌드

### API

```sh
docker build -f apps/api/Dockerfile -t warehousehub-api .
```

### Web

```sh
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_BASE_URL= \
  --build-arg API_PROXY_TARGET=http://api:3001 \
  -t warehousehub-web .
```

> `NEXT_PUBLIC_API_BASE_URL`을 비우면 빌드 시점에 `/api/proxy`가 기본값으로 사용됩니다. 같은 origin 프록시를 권장합니다.

## 프로덕션 체크리스트

- [ ] `JWT_SECRET` 32자 이상 랜덤 문자열로 변경
- [ ] `DATABASE_URL` 프로덕션 DB 연결 문자열
- [ ] `COOKIE_SECURE=true` (HTTPS 환경)
- [ ] `COOKIE_SAMESITE`: API·Web 같은 도메인이면 `lax`, 다르면 `none`
- [ ] `COOKIE_DOMAIN`: 서브도메인 공유 시 `.example.com` 형태로 설정
- [ ] `CORS_ORIGIN` 실제 웹 출처로 설정
- [ ] `NEXT_PUBLIC_API_BASE_URL`: 같은 origin 프록시 권장 (비움 또는 `/api/proxy`)
- [ ] `API_PROXY_TARGET`: 프록시 사용 시 실제 API 내부 URL

→ **로그인·프록시·쿠키 설정 상세**: [docs/SETUP.md](./docs/SETUP.md)
