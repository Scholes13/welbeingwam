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
        # Bottom nav
        nav = page.locator("div.fixed.bottom-0").first
        nbox = nav.bounding_box() if nav.count() > 0 else None
        nav_top = nbox["y"] if nbox else 844
        gap = nav_top - bottom
        print(f"+ button: y={box['y']:.0f}, bottom={bottom:.0f}")
        print(f"Nav top: {nav_top:.0f}")
        print(f"Gap to nav: {gap:.0f}px")
        print(f"Clear: {'YES' if gap >= 16 else 'NO'}")

    page.screenshot(path=os.path.join(OUT, "rc-btn-final.png"))

    # Also scroll down to see full dashboard with button
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(1000)
    page.screenshot(path=os.path.join(OUT, "rc-btn-final-scrolled.png"))

    browser.close()
