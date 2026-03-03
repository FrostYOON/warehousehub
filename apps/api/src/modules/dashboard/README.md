# Dashboard Summary 기준

`GET /dashboard/summary`는 대시보드 첫 화면에서 필요한 집계를 한 번에 내려준다.
- Query: `range=WEEK|QUARTER|HALF|YEAR` (기본값 `QUARTER`)
- Query: `segmentBy=WAREHOUSE_TYPE|CUSTOMER` (기본값 `WAREHOUSE_TYPE`)
- Query: `targetReturnRate` (기본값 `2`)

## KPI 기준

- `totalItems`: 회사의 활성 상품(`item.isActive = true`) 수
- `inboundPending`: `InboundUploadStatus.UPLOADED` 건수
- `outboundInProgress`: 다음 상태의 출고 오더 건수
  - `PICKING`
  - `PICKED`
  - `READY_TO_SHIP`
  - `SHIPPING`
- `returnsToday`: 오늘 생성된 반품 중 다음 상태 건수
  - `RECEIVED`
  - `DECIDED`
  - `COMPLETED`
- `approvalPending`: `user.isActive = false` 건수

## Alert 기준

- `inbound-invalid-pending`: `UPLOADED` 상태이면서 유효성 오류 row가 있는 업로드
- `outbound-overdue`: `plannedDate < 오늘 00:00`이고 미완료 상태(`DRAFT ~ SHIPPING`)인 오더
- `returns-decided-pending`: `DECIDED` 상태 + 미처리 라인이 남은 반품
- 심각도:
  - `outbound-overdue` = `critical`
  - `inbound-invalid-pending` = `warning`
  - `returns-decided-pending` = `info`
- 노이즈 억제 임계치:
  - `inbound-invalid-pending` >= 1
  - `outbound-overdue` >= 1
  - `returns-decided-pending` >= 2
- 정렬 우선순위:
  1. `critical`
  2. `warning`
  3. `info`
  4. 동일 레벨에서는 `value` 내림차순
- 중복/과다 노출 방지:
  - 동일 alert `id`는 1회만 노출
  - 최종 노출은 상위 5개(`TOP N`)까지만 제공

## Todo 기준

역할(Role)별로 작업 큐를 다르게 노출한다.

- `ADMIN`, `WH_MANAGER`: 입고 확정 대기 / 반품 판정·처리 대기
- `ADMIN`, `DELIVERY`: 배송 작업 대기
- `ADMIN`: 회원 승인 대기

## 아이템 분석 기준

- 응답 `analysis`에 포함
  - `trendSeries`: 기간 버킷별 출고량/리턴량/리턴율
  - `targetLine`: 리턴율 목표선(%)
  - `segmentComparison`: 세그먼트별(창고타입/고객사) 비교
  - `anomalies`: 전기 대비 출고량 급증 항목(+30% 이상)
  - `pareto`: 리턴 기여 누적 80% 아이템 목록
  - `topOutboundItems`: 선택 기간 내 출고량 상위 5개
  - `topReturnRateItems`: 선택 기간 내 리턴율 상위 5개
- 기간별 시작 시점:
  - `WEEK`: 이번 주(월요일 00:00)
  - `QUARTER`: 이번 분기 시작일
  - `HALF`: 이번 반기 시작일
  - `YEAR`: 올해 1월 1일
- 리턴율 계산:
  - `returnRate = (returnQty / outboundQty) * 100`
  - `outboundQty >= 1`인 항목만 리턴율 Top 리스트에 포함
- 이상치 탐지 기준:
  - 현재 구간 `outboundQty`와 이전 동일 길이 구간을 비교
  - 증가율 `>= 30%` + 이전 구간 `outboundQty >= 1`
- Pareto 기준:
  - 리턴량 내림차순 누적 기여율 80%까지 아이템을 포함

## 운영 원칙

- 집계 상태 기준 변경 시 `dashboard.service.ts` 상수와 `dashboard.service.spec.ts`를 함께 수정한다.
- 대시보드 카드 의미가 바뀌면 웹 라벨/힌트도 같이 변경한다.
