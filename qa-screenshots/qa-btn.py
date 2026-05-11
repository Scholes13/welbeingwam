from playwright.sync_api import sync_playwright
import os

OUT = os.path.dirname(os.path.abspath(__file__))
AUTH = os.path.join(OUT, "auth-state.json")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, storage_state=AUTH)
    page = ctx.new_page()
    page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(5000)

    plus = page.locator('button[aria-label="Add activity"]')
    if plus.count() > 0:
        box = plus.bounding_box()
        bottom = box["y"] + box["height"]
        navs = page.locator("nav")
        nbox = navs.last.bounding_box() if navs.count() > 0 else None
        nav_top = nbox["y"] if nbox else 0
        gap = nav_top - bottom
        print(f"Button top: {box['y']:.0f}px, bottom: {bottom:.0f}px")
        print(f"Nav top: {nav_top:.0f}px")
        print(f"Gap: {gap:.0f}px")
        print(f"Status: {'OK - clear!' if gap >= 16 else 'Still too close'}")
    else:
        print("+ button not found")

    page.screenshot(path=os.path.join(OUT, "rc-btn-position.png"))
    browser.close()
