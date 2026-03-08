# WarehouseHub 기능 개요

> PM 피드백 반영. 프로젝트의 현재 기능, 추가·변경·제거 요구사항, 우선순위, 구현 방향을 정리한 문서입니다.

---

## 1. 프로젝트 개요

**WarehouseHub**는 창고/물류 관리를 위한 풀스택 웹 애플리케이션입니다. 회사(테넌트) 단위로 재고, 입고, 출고, 반품을 관리하며, 냉장/냉동 온도 모니터링, Lot 추적, 창고 간 이동 등 확장 기능을 제공합니다.

### 기술 스택
- **API**: NestJS, Prisma, PostgreSQL, JWT(쿠키 기반)
- **Web**: Next.js, React, Tailwind CSS
- **모노레포**: Turborepo, pnpm

### 역할(Role) 체계 (PM 피드백 반영)

| 역할 | 설명 |
|------|------|
| ADMIN | 회사 전체 관리자 |
| WH_MANAGER | 창고 관리자 (입고/출고/조정 등) |
| DELIVERY | 배송 담당자 |
| ACCOUNTING | 회계 담당자 |
| SALES | 영업 담당자 |

> **역할별 접근 변경 요구사항** (상세: `docs/REQUIREMENTS_REFINED.md`)
> - **대시보드**: ADMIN, WH_MANAGER, SALES, ACCOUNTING (DELIVERY 제외)
> - **반품 조회**: 전체 역할
> - **재고 조회 vs 재고 관리**: 역할에 따라 별도 페이지로 분리

---

## 2. PM 피드백 요약 및 반영 방향

| # | 요구사항 | 반영 방향 | 우선순위 |
|---|----------|-----------|----------|
| 1 | **지사(브랜치) 구조** | Company → Branch → Warehouse 계층 도입. 창고 간 이동은 **지사별 창고 간** (예: 토론토→몬트리올) | 높음 |
| 2 | **재고 실사** | 제거 (기능 및 메뉴 비활성화 또는 삭제) | 높음 |
| 3 | **재고 조회 vs 재고 관리** | 조회 전용 페이지 `/stocks` + 수정 전용 페이지 분리. 역할별 접근 제어 | 높음 |
| 4 | **입고 예정(ASN)** | 입고 신청 → 입고 예정(ASN) 상태 → 출고(원본 지사) → 입고(대상 지사) 흐름 | 높음 |
| 5 | **유통기한 임박 알림** | 추가 필요 | 높음 |
| 6 | **주문서/출고서 출력** | PDF 및 프린트 옵션 | 중간 |
| 7 | **바코드/QR** | 당장 불필요 (자사 바코드 없음, 나중 검토) | 보류 |
| 8 | **재고 예측/발주 제안** | 필요 | 중간 |
| 9 | **배송사 연동** | 불필요 (자체 배송) | 제외 |
| 10 | **비용/원가 관리** | 필요 | 중간 |
| 11 | **기타** | 멀티테넌시 고급설정, 감사 로그 확장, Lot 상세 페이지, 대시보드 커스터마이징 — 있으면 좋음 | 낮음 |
| 12 | **역할/접근** | 대시보드 DELIVERY 제외, 반품 조회 전체, 담당부서별 관리자 체계 | 높음 |

---

## 3. 현재 구현된 기능 목록 (상세)

### 3.1 인증/회원 (Auth)

| 구분 | 상세 |
|------|------|
| **API 엔드포인트** | `GET /auth/companies`, `POST /auth/register`, `POST /auth/signup-request`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me`, `PATCH /auth/me`, `POST /auth/me/avatar`, `POST /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/devices`, `DELETE /auth/devices/:sessionId`, `POST /auth/devices/logout-others`, `POST /auth/withdraw` |
| **웹 페이지** | 로그인 (`/login`), 회원가입-Admin (`/register`), 회원가입-일반 (`/signup`), 비밀번호 찾기 (`/forgot-password`), 비밀번호 재설정 (`/reset-password`) |
| **역할별 접근** | 회원 승인/관리: ADMIN만 |

---

### 3.2 회원 관리 (Users / Members / Approvals)

| 구분 | 상세 |
|------|------|
| **API 엔드포인트** | `GET /users`, `POST /users`, `PATCH /users/bulk-deactivate`, `PATCH /users/bulk-role`, `PATCH /users/:id/role`, `GET /users/:id/audit-logs`, `PATCH /users/:id/deactivate`, `PATCH /users/:id/activate`, `DELETE /users/:id` |
| **웹 페이지** | 회원 승인 (`/approvals`), 회원 관리 (`/members`) |
| **역할별 접근** | 모든 엔드포인트: ADMIN만 |
| **PM 피드백** | 담당부서별 관리자 체계 도입 시 User 모델 확장 예정 (부서, 상위 관리자) |

---

### 3.3 대시보드 (Dashboard)

| 구분 | 상세 |
|------|------|
| **API 엔드포인트** | `GET /dashboard/summary` |
| **웹 페이지** | 대시보드 홈 (`/`) — **현재 ADMIN만** |
| **역할별 접근** | **변경 예정**: ADMIN, WH_MANAGER, SALES, ACCOUNTING (DELIVERY 제외) |
| **기능** | KPI, 알림·TODO 위젯, 출고 분석, 인벤토리 인사이트 |

---

### 3.4 재고 (Stocks)

| 구분 | 상세 |
|------|------|
| **API 엔드포인트** | `GET /stocks`, `GET /stocks/export`, `GET /stocks/items`, `GET /stocks/analytics/:itemId`, `PATCH /stocks/:stockId` |
| **웹 페이지** | 재고 현황 (`/stocks`) — 조회·수정 통합 |
| **역할별 접근** | 조회: ADMIN, WH_MANAGER, DELIVERY, ACCOUNTING, SALES / 수량 조정: ADMIN만 |
| **PM 피드백** | **재고 조회** (view only)와 **재고 관리** (수정) 페이지 분리 예정 |

---

### 3.5 입고 (Inbound)

| 구분 | 상세 |
|------|------|
| **API 엔드포인트** | `POST /inbound/uploads`, `GET /inbound/uploads`, `GET /inbound/uploads/:id`, `POST /inbound/uploads/:id/confirm`, `POST /inbound/uploads/:id/cancel` |
| **웹 페이지** | 입고 (`/inbound`) |
| **역할별 접근** | ADMIN, WH_MANAGER만 |
| **PM 피드백** | **입고 예정(ASN)** 흐름 도입 — 입고 신청 → ASN → 출고(원본 지사) → 입고(대상 지사) |

---

### 3.6 출고 (Outbound)

| 구분 | 상세 |
|------|------|
| **API 엔드포인트** | Orders, Picking, Shipping 관련 API |
| **웹 페이지** | 출고 (`/outbound`) |
| **역할별 접근** | 오더 생성: ADMIN, WH_MANAGER, SALES / 피킹: ADMIN, WH_MANAGER / 검수: ADMIN, WH_MANAGER, DELIVERY / 배송: ADMIN, DELIVERY |
| **PM 피드백** | 주문서/출고서 **PDF·프린트** 출력 추가 예정 |

---

### 3.7 반품 (Returns)

| 구분 | 상세 |
|------|------|
| **API 엔드포인트** | `POST /returns`, `GET /returns`, `GET /returns/:id`, `PATCH /returns/:id`, `POST /returns/:id/decide`, `POST /returns/:id/process` 등 |
| **웹 페이지** | 반품 (`/returns`) |
| **역할별 접근** | **변경 예정**: 반품 조회 — **전체 역할** 허용 |
| **PM 피드백** | ACCOUNTING 반품 조회 추가 반영 |

---

### 3.8 품목·고객사·온도 모니터

| 모듈 | 설명 | PM 피드백 |
|------|------|-----------|
| **품목 (Items)** | 품목 마스터 | — |
| **고객사 (Customers)** | 거래처 관리 | — |
| **온도 모니터** | COOL/FRZ 온도 기입, 날씨 API | — |

---

### 3.9 재고 실사 (Stocktaking) — 제거 예정

| 구분 | 상세 |
|------|------|
| **현재** | API·페이지 존재, 계획→라인→실제 수량→확정 흐름 |
| **PM 피드백** | **제거** (기능·메뉴 비활성화 또는 삭제) |

---

### 3.10 창고 간 이동 (Transfers)

| 구분 | 상세 |
|------|------|
| **API** | `POST /transfers`, `GET /transfers`, `GET /transfers/:id`, `PATCH /transfers/:id/confirm`, `PATCH /transfers/:id/cancel` |
| **웹 페이지** | **없음** (메뉴 미노출) |
| **PM 피드백** | 창고 간 이동은 **지사별 창고 간** 이동 (DRY→COOL 같은 저장타입 이동 아님). 예: 토론토 창고 → 몬트리올 창고. 토론토 출고 → 몬트리올 입고 형태 |

---

## 4. 추가·변경 기능 정리 (우선순위)

### 4.1 높은 우선순위

| 기능 | 내용 | 구현 방향 |
|------|------|-----------|
| **지사(Branch) 도메인** | 회사 내 지사(브랜치) 개념 도입. 지사별 창고, 지사 간 이동 | `Company → Branch → Warehouse` 계층. Warehouse에 `branchId` 추가 |
| **입고 예정(ASN)** | 입고 신청 → ASN 상태 → 출고(원본 지사) → 입고(대상 지사) | ASN 모델, 예정일·공급처·품목 관리, Transfer·Inbound 연계 |
| **재고 조회/관리 분리** | 조회 전용 vs 수정 전용 페이지 | `/stocks` (조회), `/stocks/manage` 또는 `/inventory` (수정, ADMIN·WH_MANAGER) |
| **유통기한 임박 알림** | 임박 기준 설정, 알림 규칙 | Lot 유통기한 기반 알림, 대시보드·이메일 |
| **역할/접근 정비** | 대시보드 DELIVERY 제외, 반품 조회 전체, Transfers 메뉴 노출 | role-policy, menu 정리 |
| **재고 실사 제거** | 기능·메뉴 제거 | Stocktaking 메뉴·페이지 비활성화, API deprecated 또는 제거 |

### 4.2 중간 우선순위

| 기능 | 내용 | 구현 방향 |
|------|------|-----------|
| **주문서/출고서 출력** | PDF·프린트 | PDF 생성 라이브러리, 프린트 옵션 UI |
| **재고 예측/발주 제안** | 과거 출고 기반 예측 | 출고 이력 기반 알고리즘, 발주 제안 UI |
| **비용/원가 관리** | 품목 원가, 입고 시 원가 기록 | Item 원가 필드, Inbound 시 원가 기록, 리포트 |

### 4.3 낮은 우선순위

| 기능 | 내용 |
|------|------|
| 멀티테넌시 고급 설정 | 커스텀 로고, 브랜드 색상 |
| 감사 로그 확장 | 주요 변경 이력 검색·export |
| Lot별 이력 상세 페이지 | `/traceability/lot/:lotId` 전용 페이지 |
| 대시보드 커스터마이징 | 위젯 순서·표시 항목 저장 |

### 4.4 보류/제외

| 항목 | 사유 |
|------|------|
| **바코드/QR** | 당장 불필요, 자사 바코드 없음 |
| **배송사 연동** | 자체 배송으로 불필요 |

---

## 5. 역할별 기능 매트릭스 (PM 피드백 반영안)

| 기능 | ADMIN | WH_MANAGER | DELIVERY | ACCOUNTING | SALES |
|------|:-----:|:----------:|:--------:|:----------:|:-----:|
| 대시보드(페이지) | ✓ | ✓ | ✗ | ✓ | ✓ |
| 재고 조회 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 재고 수량 조정(관리) | ✓ | ✓ | ✗ | ✗ | ✗ |
| 입고 | ✓ | ✓ | ✗ | ✗ | ✗ |
| 출고·반품 등 | (기존 유지) | (기존 유지) | (기존 유지) | (기존 유지) | (기존 유지) |
| 반품 조회 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 창고 간 이동 | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## 6. 관련 문서

- `docs/REQUIREMENTS_REFINED.md` — 지사 구조, 입고 예정 흐름, 역할 체계, 담당부서/관리자, 스키마 영향도, Phase별 구현 로드맵

---

*문서 작성일: 2026-03-07 (PM 피드백 반영)*
