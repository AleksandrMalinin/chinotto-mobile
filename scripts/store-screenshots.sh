#!/usr/bin/env bash
# App Store screenshots (iOS Simulator)
#
# App-side automation is OFF unless `SCREENSHOT_AUTOMATION_ENABLED` is true in
# `src/features/screenshotMode.ts` and you set EXPO_PUBLIC_SCREENSHOT_MODE=1 (see .env.example).
#
# IMPORTANT: use the SAME simulator where you ran `npx expo run:ios` (the app must be installed there).
# This script does NOT install the app. Error LSApplicationWorkspaceErrorDomain 115 = wrong simulator
# or app not installed — use the booted UDID where Chinotto is running (see below).
#
# Prereqs:
# 1. `.env`: EXPO_PUBLIC_SCREENSHOT_MODE=1
# 2. pnpm start -c   then   npx expo run:ios   (wait until the app is on screen)
# 3. Run this script while that simulator stays open and booted.
#
# Usage:
#   STORE_SCREENSHOT_OUT=~/Desktop/chinotto-shots pnpm screenshot:ios
#
# If several simulators are booted, pick UDID from:
#   xcrun simctl list devices booted
# then:
#   SCREENSHOT_SIM_UDID=<paste-uuid> pnpm screenshot:ios
#
# Optional: boot a named device when none is booted (install the app there with expo run:ios first):
#   SCREENSHOT_BOOT_DEVICE="iPhone 16 Pro Max" pnpm screenshot:ios
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${STORE_SCREENSHOT_OUT:-$ROOT/store-screenshots-out}"
PAUSE_SEC="${SCREENSHOT_PAUSE_SEC:-2.5}"
BOOT_NAME="${SCREENSHOT_BOOT_DEVICE:-}"

mkdir -p "$OUT"

booted_udid_lines() {
  xcrun simctl list devices booted 2>/dev/null | sed -n 's/.*(\([0-9A-Fa-f-]\{36\}\)) (Booted).*/\1/p' || true
}

booted_count() {
  booted_udid_lines | sed '/^$/d' | wc -l | tr -d ' '
}

first_booted_udid() {
  booted_udid_lines | sed '/^$/d' | head -1
}

resolve_udid() {
  if [[ -n "${SCREENSHOT_SIM_UDID:-}" ]]; then
    echo "$SCREENSHOT_SIM_UDID"
    return 0
  fi
  local n
  n="$(booted_count)"
  if [[ "$n" -eq 1 ]]; then
    first_booted_udid
    return 0
  fi
  if [[ "$n" -eq 0 ]]; then
    if [[ -n "$BOOT_NAME" ]]; then
      echo "No booted simulator — booting: ${BOOT_NAME}" >&2
      xcrun simctl boot "$BOOT_NAME" 2>/dev/null || true
      open -a Simulator
      sleep 4
      n="$(booted_count)"
      if [[ "$n" -ge 1 ]]; then
        first_booted_udid
        return 0
      fi
    fi
    echo "No booted iOS Simulator found." >&2
    echo "Run: npx expo run:ios   (wait for the app), then run this script again." >&2
    echo "Or set SCREENSHOT_BOOT_DEVICE=\"iPhone 16 Pro Max\" and install the app on that sim first." >&2
    return 1
  fi
  echo "Multiple simulators are booted (${n}). Quit extras or set SCREENSHOT_SIM_UDID." >&2
  echo "Booted UDIDs:" >&2
  booted_udid_lines | sed '/^$/d' | sed 's/^/  /' >&2
  return 1
}

UDID="$(resolve_udid)" || exit 1
echo "Using simulator UDID: ${UDID}" >&2

scenes=(capture settings sync sync_apple)
i=1
for scene in "${scenes[@]}"; do
  xcrun simctl openurl "$UDID" "chinotto://screenshot?scene=${scene}"
  sleep "$PAUSE_SEC"
  dest="${OUT}/$(printf '%02d' "$i")-${scene}.png"
  xcrun simctl io "$UDID" screenshot "$dest"
  echo "Wrote ${dest}"
  i=$((i + 1))
done

echo "Done. Trim/status bar in Preview or Figma if needed; App Store Connect has safe-area templates."
