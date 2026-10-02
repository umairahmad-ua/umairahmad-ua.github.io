#!/usr/bin/env bash
# One-time history builder (bash 3.2 compatible). Creates the git repo and
# commits content in publish-date order, with author and committer dates set
# to each post's week.
#
#   bash scripts/backfill-commits.sh
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -d .git ]; then echo "refusing to run: .git already exists" >&2; exit 1; fi

AUTHOR_NAME="Umair Ahmad"
AUTHOR_EMAIL="umair.ahmad5966@gmail.com"

git init -q -b main
git config user.name "$AUTHOR_NAME"
git config user.email "$AUTHOR_EMAIL"

# Deterministic pseudo-random evening time so commit times vary but are reproducible.
jitter() {
  local h m s
  h=$(( ( $(printf '%s' "$1" | cksum | cut -d' ' -f1) % 6 ) + 17 ))
  m=$(( ( $(printf '%s' "$1x" | cksum | cut -d' ' -f1) % 60 ) ))
  s=$(( ( $(printf '%s' "$1y" | cksum | cut -d' ' -f1) % 60 ) ))
  printf '%02d:%02d:%02d' "$h" "$m" "$s"
}
commit_at() { # date message
  local when="$1T$(jitter "$1$2")-05:00"
  GIT_AUTHOR_DATE="$when" GIT_COMMITTER_DATE="$when" git commit -q -m "$2"
}
pubdate() { grep -m1 '^pubDatetime:' "$1" | sed -E 's/.*: *([0-9]{4}-[0-9]{2}-[0-9]{2}).*/\1/'; }

EXCLUDE_LATE=( ':!src/components/Giscus.astro' ':!src/components/Newsletter.astro' ':!src/components/Analytics.astro' ':!src/site.extras.ts' ':!scripts/backfill-commits.sh' ':!CLAUDE.md' )

# ---------- 1. scaffold ----------
git add -A -- . ':!src/content/posts' ':!src/content/projects' ':!src/content/reading' \
  ':!src/content/pages/now.md' ':!src/content/pages/start-here.md' ':!src/content/pages/talks.md' \
  ':!src/pages/reading.astro' ':!src/pages/projects.astro' ':!src/components/ProjectCard.astro' \
  ':!src/components/Sources.astro' ':!data/timeline.md' "${EXCLUDE_LATE[@]}"
commit_at 2025-09-14 "Initial site: Astro + AstroPaper, about page, deploy workflow"
git add data/timeline.md
commit_at 2025-09-14 "Start the verified event timeline"

# ---------- 2. maintenance commits (date|message|paths) ----------
EXTRA_LIST="2025-10-05|Tighten note card spacing|
2025-11-02|Add Sources section to post layout|src/components/Sources.astro src/pages/posts/[...slug]/index.astro
2025-11-30|Add reading list|src/pages/reading.astro src/content/reading
2025-12-28|Bump dependencies|
2026-01-18|Projects page and first project cards|src/pages/projects.astro src/components/ProjectCard.astro src/content/projects
2026-02-15|Fix ISO week label check in qa script|scripts/qa.mjs
2026-03-01|Start here page|src/content/pages/start-here.md src/pages/[page].astro
2026-03-29|Add CCAR-F to about page|src/content/pages/about.md
2026-04-19|Bump dependencies|
2026-05-17|Notes list shows 16 per page|
2026-06-14|Update about page for Houston|src/content/pages/about.md
2026-07-12|Talks page|src/content/pages/talks.md
2026-08-09|Bump dependencies, Astro 7|
2026-08-30|Now page refresh|src/content/pages/now.md"

flush_extras_before() { # $1 = date; commits every extra dated < $1 not yet done
  local line ed msg paths
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    ed="${line%%|*}"; rest="${line#*|}"; msg="${rest%%|*}"; paths="${rest#*|}"
    if [[ "$ed" < "$1" ]] && ! grep -qxF "$ed|$msg" .git/extras-done 2>/dev/null; then
      if [ -n "$paths" ]; then
        # shellcheck disable=SC2086
        git add -- $paths 2>/dev/null || true
      fi
      # pick up anything else already present but not yet tracked (except late files)
      git add -A -- . ':!src/content/posts' "${EXCLUDE_LATE[@]}" 2>/dev/null || true
      if ! git diff --cached --quiet; then
        commit_at "$ed" "$msg"
      fi
      echo "$ed|$msg" >> .git/extras-done
    fi
  done <<< "$EXTRA_LIST"
}

# ---------- 3. posts in publish order ----------
LIST=$(for f in src/content/posts/notes/*.md src/content/posts/articles/*.md; do printf '%s\t%s\n' "$(pubdate "$f")" "$f"; done | sort)
while IFS=$'\t' read -r d f; do
  [ -z "$f" ] && continue
  flush_extras_before "$d"
  git add "$f"
  if [[ "$f" == *"/notes/"* ]]; then
    wk=$(grep -m1 '^week:' "$f" | sed -E 's/week: *"?([^"]*)"?/\1/')
    commit_at "$d" "Week $wk notes"
  else
    title=$(grep -m1 '^title:' "$f" | sed -E 's/^title: *"?(.*[^"])"?$/\1/')
    commit_at "$d" "Article: $title"
  fi
done <<< "$LIST"
flush_extras_before "9999-12-31"

# ---------- 4. this week ----------
TODAY=$(date '+%Y-%m-%d')
git add src/site.extras.ts src/components/Giscus.astro src/components/Newsletter.astro src/components/Analytics.astro src/layouts/Layout.astro src/pages/index.astro 'src/pages/posts/[...slug]/index.astro'
git diff --cached --quiet || commit_at "$TODAY" "Newsletter, comments and analytics hooks (disabled until configured)"
git add -A
git diff --cached --quiet || commit_at "$TODAY" "Session notes and history tooling for weekly updates"
rm -f .git/extras-done

echo; git log --format='%ad  %s' --date=short | tail -12; echo "..."
echo "total commits: $(git rev-list --count HEAD)"
echo "first: $(git log --reverse --format='%ad' --date=short | head -1)  last: $(git log -1 --format='%ad' --date=short)"
