# WarehouseHub 배포 가이드

## Docker Compose로 로컬/개발 환경 실행

### 필수 서비스 (DB만)

```sh
docker-compose up -d db
```

그 후 API, Web을 로컬에서 실행:

```sh
pnpm install
cp .env.example .env
# .env 수정

cd apps/api && pnpm exec prisma migrate deploy && cd ../..
pnpm dev
```

### 전체 스택 (DB + API + Web)

`docker-compose.yml`에 api, web 서비스를 추가한 후:

```sh
# 환경 변수 설정 (또는 .env 파일)
export DATABASE_URL=postgresql://warehousehub:warehousehub@db:5432/warehousehub?schema=public
export JWT_SECRET=your_production_secret
export NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# 빌드 및 실행
docker-compose up -d --build
```

## Docker 이미지 빌드

### API

```sh
# 프로젝트 루트에서
docker build -f apps/api/Dockerfile -t warehousehub-api .
```

### Web

```sh
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
  -t warehousehub-web .
```

## 프로덕션 체크리스트

- [ ] `JWT_SECRET` 32자 이상 랜덤 문자열로 변경
- [ ] `DATABASE_URL` 프로덕션 DB 연결 문자열
- [ ] `COOKIE_SECURE=true` (HTTPS 환경)
- [ ] `COOKIE_SAMESITE=none` (API와 Web 도메인 다를 경우)
- [ ] `COOKIE_DOMAIN` 서브도메인 공유 시 설정
- [ ] `CORS_ORIGIN` 실제 웹 출처로 설정
- [ ] `NEXT_PUBLIC_API_BASE_URL` 프로덕션 API URL
