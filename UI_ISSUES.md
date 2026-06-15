# Patient Portal — UI Issues Log

Audited: June 15, 2026  
Pages reviewed: `/dashboard`, `/order-detail`, `/notifications`

---

## 🔴 Critical (Broken functionality or layout)

### 1. Review Notes banner overlaps card title on dashboard
**Page:** `/dashboard`  
**What:** The "Review Notes" yellow banner renders ON TOP of the "Updates needed" card title text. Both occupy the same absolute-positioned space at the top of the card. The banner text ("Review Notes: Close bite front didn't arrive properly.") and the title ("Updates needed") are stacked on each other, making both unreadable.  
**Root cause:** The card uses absolute positioning for internal elements (title at `top: 20px`), but the review notes banner is rendered as a flow element with `margin: 0 1.25rem`. When notes exist, nothing pushes the absolutely-positioned title down.  
**Severity:** Critical — content is illegible for `changes_requested` and `rejected` statuses.

### 2. Status message text truncated / clipped
**Page:** `/dashboard`  
**What:** The orange status message "Our team needs some updates. Please review the notes belo…" is cut off. The text doesn't wrap and overflows the info banner.  
**Root cause:** `.infoTitle` has `white-space: nowrap` which prevents wrapping, and the container is fixed at `width: 358px`.  
**Severity:** Critical — the patient can't read the full status message.

### 3. Product value shows raw slug `flexible-Partial` instead of display name
**Page:** `/dashboard` card subtitle, `/order-detail` header and "Ordered Product" row  
**What:** Shows `flexible-Partial` (the database slug with inconsistent casing) instead of a human-readable "Flexible Partial Denture".  
**Root cause:** `data.products.join(", ")` displays the raw DB value. No mapping from product slugs to display names.  
**Severity:** Critical — looks broken/unfinished to users.

---

## 🟠 Major (Bad UX but not broken)

### 4. Bottom nav overlaps page content on order-detail
**Page:** `/order-detail`  
**What:** The floating BottomNav pill covers the "Close bite front" photo row text. The row is partially hidden behind the nav.  
**Root cause:** The content padding-bottom is `8em` but the BottomNav is positioned `1.25em` from the bottom. On pages with more content, the last items get covered.  
**Severity:** Major — content is hidden behind navigation.

### 5. Dashboard card has fixed `height: 341px` — content overflow
**Page:** `/dashboard`  
**What:** The status card is absolutely laid out at a fixed 341px height. When review notes are present, they overflow or layer on top of other positioned elements. The card doesn't grow to accommodate dynamic content.  
**Root cause:** All child elements use `position: absolute` with hardcoded pixel offsets (`top: 20px`, `top: 89px`, `top: 128px`, etc.). This is a rigid Figma-pixel-perfect layout that doesn't handle variable content.  
**Severity:** Major — any status with review notes looks broken.

### 6. "Messages" section shows `teamName` / `teamAvail` CSS classes for chat
**Page:** `/dashboard`  
**What:** The chat card reuses styles (`.teamName`, `.teamAvail`) from the now-removed Care Team section. These class names are misleading and the styles include absolute positioning properties that don't apply here.  
**Root cause:** The chat feature was added on top of old CSS without cleanup.  
**Severity:** Minor (visual looks OK for now, but messy code).

### 7. No "Need Help?" / support contact anywhere
**Page:** `/dashboard`  
**What:** The plan called for a "Need Help?" card with email support. The chat feature replaced it, but there's no fallback support contact if chat isn't available or the user needs email/phone support.  
**Severity:** Major — user has no escalation path outside chat.

### 8. Ordered Product value is underlined like a link but isn't clickable
**Page:** `/order-detail`  
**What:** "flexible-partial" has a text underline style applied (`.rowValueUnderline`) making it look like a clickable link, but it goes nowhere.  
**Severity:** Minor — confusing affordance.

---

## 🟡 Medium (Visual polish issues)

### 9. No Need Help section was replaced entirely by chat — no fallback
**Page:** `/dashboard`  
**What:** The original plan had a "Need Help?" card with `mailto:support@revivedsmiles.com`. The chat implementation replaced that section entirely. If chat isn't working or user needs email support, there's nowhere to go.

### 10. Empty Messages card shows no label text when no unread
**Page:** `/dashboard`  
**What:** The chat card shows "Tap to open" in green text — this uses `.teamAvail` which was styled for "Available now" in green. "Tap to open" isn't a status, it's an instruction — should be gray/muted.

### 11. Notification bell icon is tiny and hard to tap
**Page:** `/dashboard`  
**What:** The notification bell in the top-right is very small (~42×42px including padding) and the red badge dot is barely visible. On mobile, this would be hard to tap.  
**Severity:** Medium — accessibility / touch target issue.

### 12. Notifications empty state text color is dark on white — low hierarchy
**Page:** `/notifications`  
**What:** "You're all caught up!" heading is dark navy on white, same weight as page content. The empty state should feel more distinct/celebratory.  
**Severity:** Low — works but feels flat.

### 13. Timeline vertical connector line doesn't reach between dots cleanly
**Page:** `/order-detail`  
**What:** The timeline connector line (via `::after` pseudo-element) positioning depends on text height. With longer text like "Reviewed by Admin User — Jun 15, 2026", the line may not perfectly connect the dots.  
**Severity:** Low — cosmetic.

### 14. Order-detail header title shows raw slug
**Page:** `/order-detail`  
**What:** Header says "flexible-partial" instead of "Flexible Partial Denture". Same product name mapping issue as #3.

### 15. Status badge and timeline use inline styles instead of CSS modules
**Page:** `/order-detail`  
**What:** The status badge, review notes banner, and multiple elements use inline `style={{}}` objects instead of CSS module classes. This makes the page harder to maintain and creates inconsistent styling patterns.  
**Severity:** Low — code quality / maintainability.

### 16. Photo placeholder icon is small and low-contrast
**Page:** `/order-detail`  
**What:** When no photo exists (e.g., "Close bite front"), the placeholder shows a tiny camera-off SVG icon on a light gray background with a dashed border. It's functional but looks like a broken image rather than an intentional "not uploaded" state.  
**Severity:** Low — could be more informative with a "Not uploaded" text label.

---

## 📝 Notes for Future Polish

- The entire dashboard card layout should be refactored from absolute positioning to flexbox/flow layout — this would fix issues #1, #2, and #5 in one pass.
- Product slugs need a display name mapping (e.g., `flexible-partial` → "Flexible Partial Denture") — fixes #3 and #14.
- The status message `.infoTitle` needs `white-space: normal` or the container needs to grow — fixes #2.
- Consider increasing bottom padding on content areas to prevent BottomNav overlap — fixes #4.
- The chat/messages section needs its own dedicated CSS classes, not reused team card classes.

---

## Priority Fix Order

1. **#1 + #5** — Refactor card from absolute to flex layout (biggest visual break)
2. **#2** — Allow status message text to wrap
3. **#3 + #14** — Product display name mapping
4. **#4** — Increase content bottom padding for BottomNav clearance
5. **#7** — Add support contact fallback below chat
