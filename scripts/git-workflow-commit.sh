#!/bin/bash
# git-workflow 스킬에 따른 커밋·merge·브랜치 정리
# 실행: ./scripts/git-workflow-commit.sh
# 자동 실행: ./scripts/git-workflow-commit.sh -y
set -e

AUTO_YES=false
[[ "${1:-}" == "-y" || "${1:-}" == "--yes" ]] && AUTO_YES=true

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1. 변경사항 stash 후 main 체크아웃 및 pull ==="
HAS_CHANGES=$(git status --porcelain)
if [[ -n "$HAS_CHANGES" ]]; then
  echo "변경사항을 임시 저장합니다..."
  git stash push -u -m "temp: git-workflow 정리 전"
fi
git checkout main
git pull origin main

if [[ -n "$HAS_CHANGES" ]]; then
  echo "변경사항을 복원합니다..."
  git stash pop
fi

echo ""
echo "=== 2. Web 브랜치: feature/web-returns-stocks-inbound-outbound ==="
git checkout -b feature/web-returns-stocks-inbound-outbound

# Web 관련 파일만 스테이징
git add apps/web/
[[ -d docs ]] && git add docs/
[[ -d scripts ]] && git add scripts/
git add .gitignore README.md 2>/dev/null || true
[[ -f apps/mobile/README.md ]] && git add apps/mobile/README.md 2>/dev/null || true

git status
if $AUTO_YES; then
  git commit -m "feat(web): 반품·재고·입고·출고 UI 개선 및 정렬 통일"
else
  read -p "위 파일로 커밋할까요? (y/n) " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]] && git commit -m "feat(web): 반품·재고·입고·출고 UI 개선 및 정렬 통일"
fi

echo ""
echo "=== 3. Web main merge, push, 브랜치 삭제 ==="
git checkout main
git merge feature/web-returns-stocks-inbound-outbound --no-ff
git push origin main
git branch -d feature/web-returns-stocks-inbound-outbound

echo ""
echo "=== 4. API 브랜치: feature/api-returns-outbound ==="
git checkout -b feature/api-returns-outbound

# API 관련 파일만 스테이징
git add apps/api/

git status
if $AUTO_YES; then
  git commit -m "feat(api): 반품 출고 연동 및 출고 체크리스트 API"
else
  read -p "위 파일로 커밋할까요? (y/n) " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]] && git commit -m "feat(api): 반품 출고 연동 및 출고 체크리스트 API"
fi

echo ""
echo "=== 5. API main merge, push, 브랜치 삭제 ==="
git checkout main
git merge feature/api-returns-outbound --no-ff
git push origin main
git branch -d feature/api-returns-outbound

echo ""
echo "=== 완료 ==="
git status
