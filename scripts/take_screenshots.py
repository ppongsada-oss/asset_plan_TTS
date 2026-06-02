"""
Screenshot capture script using Playwright.
Run: python3 scripts/take_screenshots.py
Requires: pip3 install playwright && python3 -m playwright install chromium
"""
import asyncio
import os
from playwright.async_api import async_playwright

BASE = "http://127.0.0.1:3000"
EMAIL = "admin@tts-construction.com"
PASSWORD = "password123"
OUT = "/Volumes/BriteBrain/Projects/Asset Plan/public/docs/manual/assets"

os.makedirs(OUT, exist_ok=True)


async def shot(page, name: str, full_page=False):
    path = os.path.join(OUT, f"{name}.png")
    await page.screenshot(path=path, full_page=full_page)
    size = os.path.getsize(path)
    print(f"  [OK] {name}.png ({size:,} bytes)")


async def try_modal(page, name: str, trigger_selector: str, close_key="Escape"):
    """Click a button, screenshot the modal, then close it."""
    try:
        btn = page.locator(trigger_selector).first
        if await btn.count() == 0:
            print(f"  [SKIP] {name}: button not found")
            return False
        await btn.scroll_into_view_if_needed()
        await btn.click()
        await page.wait_for_timeout(600)
        await shot(page, name)
        await page.keyboard.press(close_key)
        await page.wait_for_timeout(300)
        return True
    except Exception as e:
        print(f"  [SKIP] {name}: {e}")
        try:
            await page.keyboard.press("Escape")
        except Exception:
            pass
        return False


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            locale="th-TH",
        )
        page = await ctx.new_page()

        # ─── Login ───────────────────────────────────────────────
        print("Logging in...")
        await page.goto(f"{BASE}/login")
        # Wait for React hydration before interacting
        await page.wait_for_load_state("networkidle", timeout=15000)
        await page.fill('input[type="email"]', EMAIL)
        await page.fill('input[type="password"]', PASSWORD)
        await page.click('button[type="submit"]')
        # Wait for the API call + router.push (SPA navigation)
        await page.wait_for_timeout(4000)
        await page.wait_for_load_state("networkidle", timeout=10000)
        if "/login" in page.url:
            raise RuntimeError(f"Login failed — still on {page.url}. Check credentials or dev server.")
        print(f"Logged in OK → {page.url}\n")

        # ─── Site Plan Dashboard ──────────────────────────────────
        print("--- Site Plan ---")
        await page.goto(f"{BASE}/site-plan")
        await page.wait_for_load_state("networkidle", timeout=10000)
        await shot(page, "site_dashboard")

        # Click first job row → worksheet
        try:
            first_row = page.locator("table tbody tr").first
            if await first_row.count() > 0:
                await first_row.click()
                await page.wait_for_load_state("networkidle", timeout=8000)
                await shot(page, "site_worksheet")
                # Submit modal
                await try_modal(page, "site_submit_modal", 'button:has-text("Submit")')
        except Exception as e:
            print(f"  [SKIP] site worksheet: {e}")

        # ─── PM Approval Hub ─────────────────────────────────────
        print("\n--- PM Approval ---")
        await page.goto(f"{BASE}/site-plan/pm-approval")
        await page.wait_for_load_state("networkidle", timeout=10000)
        await shot(page, "pm_review")

        # Click first SUBMITTED job → detail page
        try:
            submitted_row = page.locator("table tbody tr").first
            if await submitted_row.count() > 0:
                await submitted_row.click()
                await page.wait_for_load_state("networkidle", timeout=8000)
                await shot(page, "pm_review")
                await try_modal(page, "pm_approve_modal", 'button:has-text("Approve")')
                await try_modal(page, "pm_reject_modal", 'button:has-text("Reject")')
        except Exception as e:
            print(f"  [SKIP] PM detail: {e}")

        # ─── Store Center — Jobs Tab ──────────────────────────────
        print("\n--- Store Center (Jobs) ---")
        await page.goto(f"{BASE}/store-center")
        await page.wait_for_load_state("networkidle", timeout=10000)

        # Ensure "จัดการใบงาน" tab is active (default)
        jobs_tab = page.locator('button:has-text("จัดการใบงาน")')
        if await jobs_tab.count() > 0:
            await jobs_tab.click()
            await page.wait_for_timeout(400)

        # Create cycle modal
        await try_modal(page, "admin_cycle_modal", 'button:has-text("สร้างงวดงานใหม่")')

        # ─── Store Center — Net Demand Tab ────────────────────────
        print("\n--- Store Center (Net Demand) ---")
        demand_tab = page.locator('button:has-text("ความต้องการสุทธิ")')
        if await demand_tab.count() > 0:
            await demand_tab.click()
            await page.wait_for_load_state("networkidle", timeout=10000)
        await shot(page, "center_net_demand")

        # Export dropdown
        await try_modal(page, "center_export", 'button:has-text("Export ข้อมูล")', close_key="Escape")

        # Decision modal — click the first DISPATCH button (title="เบิกจ่าย")
        try:
            dispatch_btn = page.locator('button[title="เบิกจ่าย"]').first
            if await dispatch_btn.count() > 0:
                await dispatch_btn.click()
                await page.wait_for_timeout(600)
                await shot(page, "center_decision_modal")
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(300)
            else:
                print("  [SKIP] center_decision_modal: no dispatch button found")
        except Exception as e:
            print(f"  [SKIP] center_decision_modal: {e}")

        # ─── Matrix Report ────────────────────────────────────────
        print("\n--- Matrix Report ---")
        await page.goto(f"{BASE}/matrix-report")
        await page.wait_for_load_state("networkidle", timeout=10000)
        await shot(page, "matrix_report")

        # Scroll to Export buttons area
        try:
            export_area = page.locator('button:has-text("Export All"), button:has-text("Export Procurement")')
            if await export_area.count() > 0:
                await export_area.first.scroll_into_view_if_needed()
                await page.wait_for_timeout(300)
                await shot(page, "report_export")
            else:
                print("  [SKIP] report_export: export buttons not found")
        except Exception as e:
            print(f"  [SKIP] report_export: {e}")

        await browser.close()
        print(f"\nDone! Screenshots saved to:\n  {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
