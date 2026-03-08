# WarehouseHub 상세 요구사항 정리

> PM 피드백 기반 지사 구조, 입고 예정(ASN) 흐름, 역할 체계, 담당부서/관리자, 스키마 영향도, 구현 로드맵을 정리한 문서입니다.

---

## 1. 지사(Branch) 구조

### 1.1 비즈니스 컨텍스트

- **큰 회사 안에 여러 지사**가 존재
- 창고 간 이동은 **DRY→COOL 같은 저장 타입 간 이동이 아님**
- **지사별 창고 간 이동** (예: 토론토 창고 → 몬트리올 창고)
- 토론토 출고 → 몬트리올 입고 형태로 실제 입고 완료

### 1.2 도메인 모델 제안

```
Company (회사/테넌트)
  └── Branch (지사)
        └── Warehouse (창고)
```

- **Branch**: 지사(브랜치) 단위. 지역·법인 등 회사 내 논리적 구분
- **Warehouse**: `Branch`에 소속. 같은 Branch 내 여러 창고 가능 (DRY, COOL, FRZ 등)
- **Transfer**: `fromWarehouse.branchId ≠ toWarehouse.branchId` 인 경우 “지사 간 이동”

### 1.3 입고 예정(ASN) 흐름과 연계

| 단계 | 설명 |
|------|------|
| 1. 입고 신청 | 대상 지사(Branch)에서 입고 예정 등록 |
| 2. 입고 예정(ASN) | 예정일, 품목·수량, 출발 지사 정보 저장 |
| 3. 출고(원본 지사) | 원본 지사 창고에서 출고 처리 |
| 4. 입고(대상 지사) | 대상 지사 창고에서 입고 확정 |

---

## 2. 입고 예정(ASN) 상세 요구사항

### 2.1 ASN 엔티티 필드 제안

| 필드 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| companyId | UUID | FK |
| fromBranchId | UUID | 출발 지사 (선택, 내부 이동 시) |
| fromWarehouseId | UUID | 출발 창고 (선택) |
| toBranchId | UUID | 도착 지사 |
| toWarehouseId | UUID | 도착 창고 |
| expectedDate | DateTime | 예정 입고일 |
| status | Enum | PENDING, SHIPPED, RECEIVED, CANCELLED |
| createdByUserId | UUID | 등록자 |
| receivedAt | DateTime? | 실제 입고 시점 |

### 2.2 ASN 라인

| 필드 | 타입 | 설명 |
|------|------|------|
| itemId | UUID | 품목 |
| quantity | Decimal | 예정 수량 |
| expiryDate | DateTime? | 유통기한 (선택) |

### 2.3 상태 전이

```
PENDING → (원본 지사 출고) → SHIPPED → (대상 지사 입고 확정) → RECEIVED
         → (취소) → CANCELLED
```

---

## 3. 역할(Role) 및 접근 체계

### 3.1 대시보드 접근

| 역할 | 접근 |
|------|------|
| ADMIN | ✓ |
| WH_MANAGER | ✓ |
| SALES | ✓ |
| ACCOUNTING | ✓ |
| DELIVERY | ✗ (제외) |

### 3.2 반품 조회

| 역할 | 접근 |
|------|------|
| 전체 | ✓ (ADMIN, WH_MANAGER, DELIVERY, ACCOUNTING, SALES 모두) |

### 3.3 재고 조회 vs 재고 관리

| 구분 | 페이지 | 접근 역할 |
|------|--------|-----------|
| 재고 조회 (view only) | `/stocks` | ADMIN, WH_MANAGER, DELIVERY, ACCOUNTING, SALES |
| 재고 관리 (수정) | `/stocks/manage` 또는 `/inventory` | ADMIN, WH_MANAGER |

---

## 4. 담당부서/관리자 체계

### 4.1 요구사항

- **부서별 관리자** + **하위 담당자** 구조
- 예: 영업팀 관리자 → 영업 담당자들

### 4.2 User 모델 확장 제안

```prisma
model User {
  // ... 기존 필드 ...

  /// 부서 코드 (예: SALES, ACCOUNTING, WAREHOUSE, DELIVERY)
  departmentCode String?

  /// 상위 관리자 (부서장 등)
  supervisorId    String?
  supervisor      User?   @relation("UserSupervisor", fields: [supervisorId], references: [id], onDelete: SetNull)
  supervisees     User[]  @relation("UserSupervisor")

  /// 담당 지사 (null = 전체)
  branchIds       String[] // 또는 BranchUser 매핑 테이블
}
```

### 4.3 대안: Department 모델 분리

```prisma
model Department {
  id          String   @id @default(uuid())
  companyId   String
  company     Company  @relation(...)
  code        String   // SALES, ACCOUNTING, ...
  name        String
  managerId   String?  // 부서장 User ID
  manager     User?    @relation("DepartmentManager", ...)
  @@unique([companyId, code])
}

model User {
  // ...
  departmentId String?
  department   Department? @relation(...)
  supervisorId String?
  supervisor   User?       @relation("UserSupervisor", ...)
}
```

### 4.4 접근 제어 연계

- 담당 지사(branchIds)가 있으면: 해당 지사 데이터만 조회 가능
- supervisorId가 있으면: 하위 담당자 이력 조회 등 기능 연동 가능

---

## 5. 스키마/도메인 변경 영향도

### 5.1 Branch 도메인 추가 시

#### 5.1.1 신규 모델

```prisma
model Branch {
  id        String   @id @default(uuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  name      String   // 토론토, 몬트리올 등
  code      String?  // TOR, MTL 등

  warehouses Warehouse[]
  // 필요한 경우 User, ASN 등 연관

  @@unique([companyId, code])
  @@index([companyId])
}
```

#### 5.1.2 Warehouse 변경

| 항목 | 변경 내용 |
|------|-----------|
| branchId | 추가 (NOT NULL, 기존 데이터 마이그레이션 시 default branch 생성) |
| unique 제약 | `@@unique([companyId, type, region])` → `@@unique([branchId, type, region])` 또는 `@@unique([companyId, branchId, type, region])` |

```prisma
model Warehouse {
  // ...
  branchId   String
  branch     Branch  @relation(fields: [branchId], references: [id], onDelete: Cascade)
  // type, name, region 등 유지
}
```

#### 5.1.3 Company 변경

- `branches Branch[]` relation 추가

#### 5.1.4 Transfer 영향

| 항목 | 내용 |
|------|------|
| fromWarehouse, toWarehouse | 이미 Warehouse FK 사용. Branch는 Warehouse를 통해 간접 참조 |
| 비즈니스 검증 | `fromWarehouse.branchId !== toWarehouse.branchId` 일 때 “지사 간 이동” 처리 가능 |
| 추가 로직 | 지사 간 이동 시 ASN과 연계 (선택) |

#### 5.1.5 기타 모델

| 모델 | 영향 |
|------|------|
| Stock, Lot, Item, Customer | companyId 기준 유지. Branch는 Warehouse 경유로만 사용 |
| InboundUpload | 입고 예정(ASN) 도입 시 ASN 모델과 연계. 기존 엑셀 업로드는 toWarehouse → branchId로 창고 소속 확인 가능 |
| OutboundOrder, ReturnReceipt | 현 구조 유지. 필요 시 나중에 branchId 등 추가 |
| TemperatureLog | Company 기준 유지 또는 Branch별 로그 분리 (선택) |

### 5.2 마이그레이션 전략

1. **Phase 1**: Branch 모델 생성, `companyId` 당 1개 default Branch 생성
2. **Phase 2**: Warehouse에 `branchId` 추가, 기존 Warehouse를 default Branch에 연결
3. **Phase 3**: unique 제약 조정, 애플리케이션 로직 반영

### 5.3 API/서비스 영향

| 모듈 | 영향 |
|------|------|
| WarehousesService | Branch 포함 조회, 필터 추가 |
| TransfersService | 지사 간 이동 여부 표시, ASN 연동 (Phase 2) |
| InboundService | ASN 플로우 도입 시 대폭 변경 |
| StocksService | branchId/warehouseId 필터 확장 |

---

## 6. 구현 로드맵

### Phase 1: 기반 정비 (4–6주)

| 작업 | 범위 |
|------|------|
| 역할/접근 정비 | 대시보드 DELIVERY 제외, 반품 조회 전체, `role-policy.ts`, `menu.ts` 수정 |
| Transfers UI | `/transfers` 페이지, 메뉴 노출 |
| 재고 조회/관리 분리 | `/stocks` (조회), `/stocks/manage` (수정). 역할별 라우팅 |
| 재고 실사 제거 | 메뉴·페이지 비활성화, API deprecated 처리 |

### Phase 2: 지사(Branch) 및 입고 예정(ASN) (6–8주)

| 작업 | 범위 |
|------|------|
| Branch 도메인 | Prisma 모델, 마이그레이션, default Branch 생성 |
| Warehouse → Branch | `branchId` 추가, 기존 데이터 마이그레이션 |
| ASN 모델·API | ASN, ASNLine 모델, CRUD API |
| ASN ↔ Transfer 연계 | 지사 간 이동 시 출고→입고 흐름 구현 |
| 입고 예정 UI | ASN 목록·상세·등록 페이지 |

### Phase 3: 확장 기능 (4–6주)

| 작업 | 범위 |
|------|------|
| 유통기한 임박 알림 | Lot 기반 알림 규칙, 대시보드·이메일 |
| 주문서/출고서 PDF | PDF 생성, 프린트 옵션 |
| 비용/원가 관리 | Item 원가 필드, 입고 시 원가 기록, 리포트 |
| 재고 예측/발주 제안 | 출고 이력 기반 예측, 발주 제안 UI |

### Phase 4: 담당부서/관리자 (2–4주)

| 작업 | 범위 |
|------|------|
| User 확장 | departmentCode, supervisorId (또는 Department 모델) |
| 담당 지사 | User ↔ Branch 매핑, 접근 제어 연동 |
| 회원 관리 UI | 부서·관리자 설정 UI |

### Phase 5: 선택 기능 (낮은 우선순위)

| 작업 | 범위 |
|------|------|
| Lot 상세 페이지 | `/traceability/lot/:lotId` |
| 감사 로그 확장 | 검색·export |
| 대시보드 커스터마이징 | 위젯 순서·표시 저장 |
| 멀티테넌시 고급 설정 | 로고·브랜드 색상 |

---

## 7. 의사결정 요약

| 항목 | 결정 |
|------|------|
| 지사 구조 | Company → Branch → Warehouse |
| 창고 간 이동 | 지사별 창고 간 (토론토→몬트리올 등) |
| 재고 실사 | 제거 |
| 재고 조회/관리 | 페이지 분리, 역할별 접근 |
| 입고 예정(ASN) | 도입, 출고→입고 흐름 |
| 대시보드 | DELIVERY 제외 |
| 반품 조회 | 전체 역할 |
| 배송사 연동 | 제외 |
| 바코드/QR | 보류 |

---

*문서 작성일: 2026-03-07*
