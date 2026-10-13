#!/usr/bin/env bash
# Applies the .github/labels/*.yaml labels to a git repository.
#
# Usage: apply-labels.sh [-R owner/repo] [labels-dir]
# Requires: git, gh

set -euo pipefail

usage() { sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

repo_args=()
while getopts ":R:h" opt; do
  case "$opt" in
    R) repo_args=(--repo "$OPTARG") ;;
    h) usage 0 ;;
    *) usage 1 ;;
  esac
done
shift $((OPTIND - 1))

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
labels_dir="${1:-"$script_dir/../.github/labels"}"

command -v gh >/dev/null || { echo "error: gh CLI not found" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "error: gh is not authenticated" >&2; exit 1; }

shopt -s nullglob
yaml_files=("$labels_dir"/*.yaml "$labels_dir"/*.yml)
shopt -u nullglob
[ ${#yaml_files[@]} -gt 0 ] || { echo "error: no .yaml files found in $labels_dir" >&2; exit 1; }

# Fetch existing label names once
existing="$(gh label list "${repo_args[@]+"${repo_args[@]}"}" --limit 1000 --json name --jq '.[].name' \
  | tr '[:upper:]' '[:lower:]')"

parse_yaml() {
  awk '
    function unquote(v) {
      sub(/^[ \t]+/, "", v); sub(/[ \t]+$/, "", v)
      if (v ~ /^".*"$/ || v ~ /^\047.*\047$/) v = substr(v, 2, length(v) - 2)
      return v
    }
    function flush() { if (name != "") print name "\t" color "\t" desc; name = color = desc = "" }
    /^[ \t]*-[ \t]*name:/       { flush(); sub(/^[ \t]*-[ \t]*name:/, "");  name  = unquote($0); next }
    /^[ \t]*color:/             { sub(/^[ \t]*color:/, "");        color = unquote($0); sub(/^#/, "", color); next }
    /^[ \t]*description:/       { sub(/^[ \t]*description:/, "");  desc  = unquote($0); next }
    END { flush() }
  ' "$1"
}

created=0
skipped=0
failed=0

for file in "${yaml_files[@]}"; do
  echo "==> $(basename "$file")"
  while IFS=$'\t' read -r name color desc; do
    lower="$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]')"
    if printf '%s\n' "$existing" | grep -Fxq -- "$lower"; then
      echo " warning: label already exists, skipping: $name" >&2
      skipped=$((skipped + 1))
      continue
    fi

    args=("$name")
    [ -n "$color" ] && args+=(--color "$color")
    [ -n "$desc" ] && args+=(--description "$desc")

    if gh label create "${args[@]}" "${repo_args[@]+"${repo_args[@]}"}" </dev/null >/dev/null; then
      echo " created: $name"
      created=$((created + 1))
      existing="$existing"$'\n'"$lower"
    else
      echo " error: failed to create: $name" >&2
      failed=$((failed + 1))
    fi
  done < <(parse_yaml "$file")
done

echo
echo "Done: $created created, $skipped already existed, $failed failed."
[ "$failed" -eq 0 ]
