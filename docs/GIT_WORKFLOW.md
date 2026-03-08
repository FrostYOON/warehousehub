# WarehouseHub Git 워크플로우 가이드

> feature 완료 시 main에 merge하는 전략을 공식화한 문서입니다.

**관련 문서**

- [docs/REQUIREMENTS_REFINED.md](./REQUIREMENTS_REFINED.md) — 상세 요구사항, Phase별 로드맵
- [docs/FEATURES_OVERVIEW.md](./FEATURES_OVERVIEW.md) — 기능 개요, 우선순위

---

## 1. 기본 원칙

| 원칙 | 설명 |
|------|------|
| **Feature 완료 시 main merge** | 기능이 완료되면 feature 브랜치를 main에 merge. main을 항상 배포 가능한 상태로 유지 |
| **main 보호** | main은 항상 빌드·테스트 통과 상태 유지 |
| **작은 단위 PR** | 한 번에 너무 많은 변경 X → 리뷰·충돌 관리 용이 |

---

## 2. 권장 작업 순서

```
1. main 최신화
   git checkout main
   git pull origin main

2. feature 브랜치 생성
   git checkout -b feature/<기능명>

3. 작업 및 커밋
   (코드 작성 → add → commit)

4. main 최신화 후 merge
   git checkout main
   git pull origin main
   git merge feature/<기능명> --no-ff -m "Merge feature/<기능명>: <요약>"

5. 원격 반영
   git push origin main

6. merge 완료 후 feature 브랜치 정리 (권장)
   git branch -d feature/<기능명>
   git push origin --delete feature/<기능명>
```

**PR( Pull Request ) 사용 시**

- 로컬 merge 대신 GitHub/GitLab 등에서 PR 생성 → 리뷰 → merge
- `--no-ff`는 PR merge 시 "Squash merge" 대신 "Create a merge commit" 선택으로 적용 가능

---

## 3. Phase별 feature merge 순서 예시

`docs/REQUIREMENTS_REFINED.md` Phase 로드맵에 따른 권장 순서:

### Phase 1: 기반 정비

| 순서 | feature | 설명 |
|------|---------|------|
| 1 | `feature/role-access-cleanup` | 역할/접근 정비 (role-policy, menu, 대시보드 DELIVERY 제외 등) |
| 2 | `feature/transfers-ui` | Transfers UI (`/transfers` 페이지, 메뉴 노출) |
| 3 | `feature/stocks-view-manage-split` | 재고 조회/관리 분리 (`/stocks`, `/stocks/manage`) |
| 4 | `feature/remove-stocktaking` | 재고 실사 제거 (메뉴·페이지 비활성화) |

### Phase 2 이후

- `docs/REQUIREMENTS_REFINED.md` §6 구현 로드맵 참고
- Phase 2: Branch, ASN 관련 feature 우선
- Phase 3~5: 확장 기능 순차 merge

---

## 4. PR 크기 권장

| 권장 | 라인 수 | 이유 |
|------|---------|------|
| ✓ 적정 | **200~400줄** | 리뷰·충돌 해결 용이 |
| △ 주의 | 400~800줄 | 세부 기능 분리 검토 |
| ✗ 비권장 | 800줄 이상 | 여러 feature로 쪼개기 |

---

## 5. Merge 시 --no-ff 옵션

```bash
git merge feature/xxx --no-ff -m "Merge feature/xxx: 요약"
```

| 옵션 | 효과 |
|------|------|
| `--no-ff` | **항상 merge commit 생성**. feature 브랜치가 main에 흡수된 기록이 남음 |
| 장점 | 히스토리에서 "이 기능이 언제 main에 들어갔는지" 추적 용이 |
| 미사용 시 | fast-forward로 인해 feature 브랜치 흐름이 사라질 수 있음 |

---

## 6. Conflict 방지 팁

| 팁 | 설명 |
|----|------|
| **main 최신화** | merge 전 `git pull origin main` 필수 |
| **공통 파일 순차 작업** | `menu.ts`, `layout.tsx`, `role-policy.ts` 등 여러 feature가 건드리는 파일은 **한 feature씩 순차 merge** |
| **Phase 순서 준수** | 역할/접근 정비 → Transfers UI → 재고 분리 → 실사 제거 순서로 진행 시 충돌 감소 |
| **리베이스 주의** | 이미 push한 브랜치에 `rebase` 하지 않기 (팀 협업 시) |

---

## 7. Merge 완료 후 브랜치 정리

| 단계 | 명령 | 설명 |
|------|------|------|
| 1 | `git branch -d feature/<기능명>` | 로컬 feature 브랜치 삭제 |
| 2 | `git push origin --delete feature/<기능명>` | 원격 feature 브랜치 삭제 |

**일괄 정리 (merge 완료된 브랜치 확인)**

```bash
# main에 merge된 브랜치 목록 확인
git branch --merged main

# 위 목록에서 삭제할 브랜치를 선택 후
git branch -d feature/<기능명>
git push origin --delete feature/<기능명>
```

---

## 8. 체크리스트

**feature 시작 전**

- [ ] main 최신화 (`git pull origin main`)
- [ ] `feature/<기능명>` 브랜치 생성

**feature 완료 후**

- [ ] 로컬 테스트·빌드 통과
- [ ] main 최신화
- [ ] `git merge feature/<기능명> --no-ff` 실행
- [ ] 충돌 발생 시 해결 후 merge
- [ ] `git push origin main`
- [ ] merge 후 feature 브랜치 로컬·원격 삭제

**PR 사용 시**

- [ ] PR 라인 수 200~400줄 권장 범위 확인
- [ ] Merge 시 "Create a merge commit" 옵션 사용 (`--no-ff`에 해당)

---

*문서 작성일: 2026-03-07*
