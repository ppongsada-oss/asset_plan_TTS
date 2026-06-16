"""
Comprehensive screenshot capture script for Asset Plan manual.
Run: python3 scripts/take_screenshots.py
Requires: pip3 install playwright && python3 -m playwright install chromium

Root cause note: Use localhost:3000 (NOT 127.0.0.1:3000).
Turbopack dev server rejects WebSocket HMR from 127.0.0.1 origin,
which prevents React hydration — tab clicks and modals silently fail.
"""
import asyncio
import json
import os
from playwright.async_api import async_playwright, Dialog

BASE = "http://localhost:3000"
EMAIL = "admin@tts-construction.com"
PASSWORD = "password123"
OUT = "/Volumes/BriteBrain/Projects/Asset Plan/public/docs/manual/assets"
PROJECTS_ONLY = os.environ.get("PROJECTS_ONLY") == "1"

os.makedirs(OUT, exist_ok=True)
_ok = _skip = 0


def _auto_dismiss_dialogs(page):
    """Auto-dismiss ALL native browser dialogs (confirm/alert/prompt/beforeunload).
    Without this, confirm() calls from Delete/Cancel buttons block the page forever."""
    async def _handler(dialog: Dialog):
        print(f"  [dialog:{dialog.type}] auto-dismissed: {dialog.message[:60]}")
        await dialog.dismiss()
    page.on("dialog", _handler)


async def shot(page, name: str, full_page=False):
    global _ok
    path = os.path.join(OUT, f"{name}.png")
    await page.screenshot(path=path, full_page=full_page)
    size = os.path.getsize(path)
    print(f"  [OK] {name}.png ({size:,} bytes)")
    _ok += 1


async def try_modal(page, name: str, selector: str, close="Escape", wait_ms=800):
    """Click a button, screenshot result, close with Escape.
    Native confirm() dialogs are auto-dismissed by the page-level handler."""
    global _skip
    try:
        btn = page.locator(selector).first
        if await btn.count() == 0:
            print(f"  [SKIP] {name}: selector not found")
            _skip += 1
            return False
        await btn.scroll_into_view_if_needed()
        await btn.click()
        await page.wait_for_timeout(wait_ms)
        await shot(page, name)
        await page.keyboard.press(close)
        await page.wait_for_timeout(400)
        return True
    except Exception as e:
        print(f"  [SKIP] {name}: {e}")
        _skip += 1
        try:
            await page.keyboard.press("Escape")
        except Exception:
            pass
        return False


async def click_tab(page, tab_text: str, wait_ms=500):
    btn = page.locator(f'button:has-text("{tab_text}")').first
    if await btn.count() > 0:
        await btn.click()
        await page.wait_for_timeout(wait_ms)
        return True
    return False


async def main():
    async with async_playwright() as p:
        # headless=False required — Turbopack HMR WebSocket only connects from
        # headed browser with localhost origin; headless mode blocks React hydration.
        browser = await p.chromium.launch(headless=False, slow_mo=80)
        ctx = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            locale="th-TH",
        )
        page = await ctx.new_page()

        # Auto-dismiss all native confirm()/alert()/prompt() dialogs.
        # Delete and Cancel buttons use window.confirm() — without this handler
        # the page blocks permanently waiting for user input.
        _auto_dismiss_dialogs(page)

        # ─── 1. Login page (unauthenticated) ─────────────────────
        print("--- Login ---")
        await page.goto(f"{BASE}/login")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(800)
        await shot(page, "login")

        # ─── Authenticate via API ─────────────────────────────────
        res = await ctx.request.post(
            f"{BASE}/api/auth/login",
            data=json.dumps({"email": EMAIL, "password": PASSWORD}),
            headers={"Content-Type": "application/json"},
        )
        body = await res.json()
        if not body.get("success"):
            raise RuntimeError(f"Login API failed: {body}")
        await page.goto(f"{BASE}/admin/users")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(1000)
        print(f"Logged in OK\n")

        # ─── 2. Navbar user dropdown ──────────────────────────────
        print("--- Navbar ---")
        nav_avatar = page.locator("nav div.relative > button").first
        if await nav_avatar.count() > 0:
            await nav_avatar.click()
            await page.wait_for_timeout(500)
            await shot(page, "navbar_dropdown")
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(300)
        else:
            print("  [SKIP] navbar_dropdown: avatar button not found")
            global _skip
            _skip += 1

        # ─── 3. Profile / Change Password ────────────────────────
        print("\n--- Profile ---")
        await page.goto(f"{BASE}/profile")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(500)
        await shot(page, "profile")

        # ─── 4. Admin → Users ────────────────────────────────────
        print("\n--- Admin: Users ---")
        await page.goto(f"{BASE}/admin/users")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(600)
        await shot(page, "admin_users")

        # Add User modal
        await try_modal(page, "admin_add_user_modal", 'button:has-text("Add User")')

        # Edit User modal — first Edit2 icon in the user table
        try:
            # Look for edit icon buttons (SVG with edit class)
            edit_btn = page.locator('button:has(svg.lucide-edit-2)').first
            if await edit_btn.count() == 0:
                # Fallback: second button in first table row (after delete)
                edit_btn = page.locator("table tbody tr button").first
            if await edit_btn.count() > 0:
                await edit_btn.click()
                await page.wait_for_timeout(800)
                await shot(page, "admin_edit_user_modal")
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(400)
            else:
                print("  [SKIP] admin_edit_user_modal: no user rows")
                _skip += 1
        except Exception as e:
            print(f"  [SKIP] admin_edit_user_modal: {e}")
            _skip += 1

        # ─── 5. Admin → Projects ──────────────────────────────────
        print("\n--- Admin: Projects ---")
        await page.goto(f"{BASE}/admin/projects")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(600)
        add_project_btn = page.locator('button:has-text("เพิ่มโครงการ")').first
        if await add_project_btn.count() > 0:
            await add_project_btn.scroll_into_view_if_needed()
            await page.wait_for_timeout(300)
            await shot(page, "admin_projects_header")
        await shot(page, "admin_projects")

        # Add Project modal
        if await add_project_btn.count() > 0:
            await add_project_btn.click()
            await page.wait_for_timeout(800)
            await shot(page, "admin_add_project_modal")
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(400)
        else:
            print("  [SKIP] admin_add_project_modal: add project button not found")
            _skip += 1

        if await click_tab(page, "ไซต์งาน"):
            await shot(page, "admin_projects_site_filter")
        await click_tab(page, "ทั้งหมด", wait_ms=300)

        archived_btn = page.locator('button:has-text("Archived")').first
        if await archived_btn.count() > 0:
            await archived_btn.click()
            await page.wait_for_timeout(400)
            await shot(page, "admin_projects_archived")
            await archived_btn.click()
            await page.wait_for_timeout(300)

        # Edit Project modal
        try:
            edit_project_btn = page.locator('button[title="Edit Project"]').first
            if await edit_project_btn.count() > 0:
                await edit_project_btn.scroll_into_view_if_needed()
                await edit_project_btn.click()
                await page.wait_for_timeout(800)
                await shot(page, "admin_edit_project_modal")
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(400)
            else:
                print("  [SKIP] admin_edit_project_modal: no project cards")
                _skip += 1
        except Exception as e:
            print(f"  [SKIP] admin_edit_project_modal: {e}")
            _skip += 1

        if PROJECTS_ONLY:
            await browser.close()
            print(f"\n{'='*50}")
            print(f"Done! {_ok} screenshots saved, {_skip} skipped")
            print(f"Output: {OUT}")
            return

        # ─── 6. Admin → Project Roles ─────────────────────────────
        print("\n--- Admin: Project Roles ---")
        await page.goto(f"{BASE}/admin/project-roles")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(600)
        await shot(page, "admin_project_roles")

        # ─── 7. Master Data ───────────────────────────────────────
        print("\n--- Master Data ---")
        await page.goto(f"{BASE}/master-data")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(800)
        await shot(page, "master_data")

        # Categories tab
        if await click_tab(page, "ตั้งค่าหมวดหมู่"):
            await shot(page, "master_data_categories")
            # Category preview modal inside categories tab
            preview = page.locator('button:has-text("ดูตัวอย่าง")').first
            if await preview.count() > 0:
                await preview.click()
                await page.wait_for_timeout(800)
                await shot(page, "master_data_category_preview")
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(400)

        # Back to Equipment tab
        await click_tab(page, "รายการอุปกรณ์")
        await page.wait_for_timeout(500)

        # Catalog dropdown → screenshot menu open, then open preview modal
        catalog_btn = page.locator('button:has-text("จัดการรายการสินค้า")').first
        if await catalog_btn.count() > 0:
            await catalog_btn.click()
            await page.wait_for_timeout(500)
            await shot(page, "master_data_catalog_menu")
            # "เพิ่มรายการใหม่" opens a React modal (safe to click)
            add_item = page.locator('button:has-text("เพิ่มรายการใหม่")').first
            if await add_item.count() > 0:
                await add_item.click()
                await page.wait_for_timeout(800)
                await shot(page, "master_data_preview_modal")
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(400)
            else:
                # Close dropdown without opening file picker
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(300)
        else:
            print("  [SKIP] master_data_catalog_menu: button not found")
            _skip += 1

        # Stock dropdown → screenshot menu open, then click upload to open React modal.
        # "ดาวน์โหลด Template" triggers browser download — do NOT click it.
        # "อัปโหลดยอดคงเหลือ (Excel)" calls setShowUploadModal(true) — React modal, safe.
        stock_btn = page.locator('button:has-text("จัดการ Remaining Stock")').first
        if await stock_btn.count() > 0:
            await stock_btn.click()
            await page.wait_for_timeout(700)
            await shot(page, "master_data_stock_menu")
            # Dropdown must still be open — look for the upload item inside it
            upload_btn = page.locator('button:has-text("ยอดคงเหลือ")').first
            if await upload_btn.count() > 0:
                await upload_btn.click()
                await page.wait_for_timeout(900)
                await shot(page, "master_data_upload_modal")
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(400)
            else:
                print("  [SKIP] master_data_upload_modal: upload button not found in dropdown")
                _skip += 1
                # Close any open dropdown/overlay
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(300)

        # ─── 8. Site Plan Dashboard ───────────────────────────────
        print("\n--- Site Plan ---")
        await page.goto(f"{BASE}/site-plan")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(500)
        await shot(page, "site_dashboard")

        # Prefer OPEN job (has "เริ่มวางแผน" button); fall back to any job link
        open_job_link = page.locator('a:has(button:has-text("เริ่มวางแผน"))').first
        if await open_job_link.count() == 0:
            open_job_link = page.locator('a[href*="/site-plan/"]:not([href*="pm-approval"])').first

        if await open_job_link.count() > 0:
            await open_job_link.click()
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(800)
            await shot(page, "site_worksheet")

            # Fill in some data to show the worksheet in active use (auto-fill + คืน badge)
            cell_0_0 = page.locator("#input-0-0")
            cell_1_0 = page.locator("#input-1-0")
            cell_2_0 = page.locator("#input-2-0")
            if await cell_0_0.count() > 0:
                await cell_0_0.click()
                await cell_0_0.fill("5")
                await cell_0_0.blur()       # triggers auto-fill to remaining months
                await page.wait_for_timeout(400)
            if await cell_1_0.count() > 0:
                await cell_1_0.click()
                await cell_1_0.fill("3")
                await cell_1_0.blur()
                await page.wait_for_timeout(300)
            if await cell_2_0.count() > 0:
                await cell_2_0.click()
                await cell_2_0.fill("8")
                await cell_2_0.blur()
                await page.wait_for_timeout(300)
            if await cell_0_0.count() > 0:
                await page.wait_for_timeout(300)
                await shot(page, "site_worksheet_filling")  # worksheet with data entered

            await try_modal(page, "site_save_draft_modal", 'button:has-text("Save Draft")')
            await try_modal(page, "site_submit_modal", 'button:has-text("Submit")')
        else:
            print("  [SKIP] site_worksheet / site_save_draft_modal / site_submit_modal: no jobs")
            _skip += 3

        # ─── 9. PM Approval ───────────────────────────────────────
        print("\n--- PM Approval ---")
        await page.goto(f"{BASE}/site-plan/pm-approval")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(500)
        await shot(page, "pm_review")

        # History tab
        if await click_tab(page, "ประวัติการอนุมัติ"):
            await shot(page, "pm_history_tab")
        await click_tab(page, "รออนุมัติ", wait_ms=300)

        # PM detail (SUBMITTED jobs required)
        pm_link = page.locator('a[href*="/site-plan/pm-approval/"]').first
        if await pm_link.count() > 0:
            await pm_link.click()
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(500)
            await shot(page, "pm_detail")
            for tab_text, fname in [
                ("เฉพาะรายการที่สั่งเพิ่ม", "pm_filter_demand"),
                ("เฉพาะรายการที่มีการคืน", "pm_filter_return"),
                ("เฉพาะรายการที่ถูกแก้ไข", "pm_filter_changed"),
                ("แสดงทั้งหมด", "pm_filter_all"),
            ]:
                if await click_tab(page, tab_text, wait_ms=400):
                    await shot(page, fname)
            await try_modal(page, "pm_save_modal", 'button:has-text("Save Edits")')
            await try_modal(page, "pm_approve_modal", 'button:has-text("Approve")')
            await try_modal(page, "pm_reject_modal", 'button:has-text("Reject")')
        else:
            print("  [SKIP] pm_detail + modals: no SUBMITTED jobs in DB")
            _skip += 7

        # ─── 10. Store Center — Jobs Tab ─────────────────────────
        print("\n--- Store Center: Jobs Tab ---")
        await page.goto(f"{BASE}/store-center")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(800)
        await click_tab(page, "จัดการใบงาน", wait_ms=500)
        await shot(page, "store_center_jobs")

        # Create Cycle modal
        await try_modal(page, "admin_cycle_modal", 'button:has-text("สร้างงวดงานใหม่")')
        await page.wait_for_timeout(400)

        # Edit Cycle modal (only if a cycle exists)
        edit_cycle_btn = page.locator('button[title="แก้ไขโครงการในงวด"]').first
        if await edit_cycle_btn.count() > 0:
            await edit_cycle_btn.click()
            await page.wait_for_timeout(800)
            await shot(page, "admin_edit_cycle_modal")
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(400)
        else:
            print("  [SKIP] admin_edit_cycle_modal: no cycles exist yet")
            _skip += 1

        # ─── 11. Store Center — Net Demand Tab ───────────────────
        print("\n--- Store Center: Net Demand Tab ---")
        # Same page session — no reload needed
        demand_tab_btn = page.locator('button:has-text("ความต้องการสุทธิ")').first
        if await demand_tab_btn.count() > 0:
            await demand_tab_btn.click()
            try:
                await page.wait_for_selector(
                    'button:has-text("Export ข้อมูล")', state="visible", timeout=8000
                )
            except Exception:
                print("  [WARN] Export button not visible (Net Demand may be loading)")
            await page.wait_for_timeout(800)
            await shot(page, "center_net_demand")

            # View mode: Return tab
            if await click_tab(page, "รายการส่งคืน"):
                await shot(page, "center_net_demand_return")
            # Back to Demand
            await click_tab(page, "ใบขอเบิก/จัดหา")
            await page.wait_for_timeout(400)

            # Status filter pills
            status_pill = page.locator('button:has-text("พร้อมเบิกจ่าย")').first
            if await status_pill.count() > 0:
                await status_pill.click()
                await page.wait_for_timeout(400)
                await shot(page, "center_status_filter")
                await click_tab(page, "ทั้งหมด", wait_ms=300)

            # Export dropdown
            export_btn = page.locator('button:has-text("Export ข้อมูล")').first
            if await export_btn.count() > 0:
                await export_btn.scroll_into_view_if_needed()
                await export_btn.click()
                await page.wait_for_timeout(600)
                await shot(page, "center_export")
                await page.mouse.click(100, 100)
                await page.wait_for_timeout(300)
            else:
                print("  [SKIP] center_export: Export button not found")
                _skip += 1

            # Action modals (require demand data in DB)
            for action_title, fname in [
                ("เบิกจ่าย", "center_dispatch_modal"),
                ("หมุนเวียน", "center_circulate_modal"),
                ("สลับสเปก", "center_substitute_modal"),
                ("จัดหา", "center_procure_modal"),
            ]:
                action_btn = page.locator(f'button[title="{action_title}"]').first
                if await action_btn.count() > 0:
                    await action_btn.click()
                    await page.wait_for_timeout(600)
                    await shot(page, fname)
                    await page.keyboard.press("Escape")
                    await page.wait_for_timeout(400)
                else:
                    print(f"  [SKIP] {fname}: no {action_title} button (no demand data)")
                    _skip += 1

            # Receive / Reject Return buttons (in Return tab)
            if await click_tab(page, "รายการส่งคืน"):
                await page.wait_for_timeout(500)
                for action_title, fname in [
                    ("รับคืน", "center_receive_modal"),
                    ("ปฏิเสธ", "center_reject_return_modal"),
                ]:
                    action_btn = page.locator(f'button[title="{action_title}"]').first
                    if await action_btn.count() > 0:
                        await action_btn.click()
                        await page.wait_for_timeout(600)
                        await shot(page, fname)
                        await page.keyboard.press("Escape")
                        await page.wait_for_timeout(400)
                    else:
                        print(f"  [SKIP] {fname}: no {action_title} button (no return data)")
                        _skip += 1

            # History modal — first history icon in the table
            try:
                hist_btn = page.locator('button svg.lucide-history').first
                if await hist_btn.count() == 0:
                    # Fallback: look for any small button near row end
                    hist_btn = page.locator('button:has(svg[class*="history"])').first
                if await hist_btn.count() > 0:
                    await hist_btn.click()
                    await page.wait_for_timeout(600)
                    await shot(page, "center_history_modal")
                    await page.keyboard.press("Escape")
                    await page.wait_for_timeout(400)
                else:
                    print("  [SKIP] center_history_modal: no history buttons (no data)")
                    _skip += 1
            except Exception as e:
                print(f"  [SKIP] center_history_modal: {e}")
                _skip += 1

        # ─── 12. Matrix Report ────────────────────────────────────
        print("\n--- Matrix Report ---")
        await page.goto(f"{BASE}/matrix-report")
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(500)
        await shot(page, "matrix_report")

        # Export hover dropdown (CSS group-hover)
        export_btn = page.locator('button:has-text("Export ข้อมูล")').first
        if await export_btn.count() > 0:
            await export_btn.scroll_into_view_if_needed()
            await export_btn.hover()
            await page.wait_for_timeout(500)
            await shot(page, "report_export")
            await page.mouse.move(0, 0)
        else:
            print("  [SKIP] report_export: export button not found")
            _skip += 1

        await browser.close()

    print(f"\n{'='*50}")
    print(f"Done! {_ok} screenshots saved, {_skip} skipped")
    print(f"Output: {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
