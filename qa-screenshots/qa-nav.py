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

    # Find the bottom navigation bar
    # Try different selectors
    for selector in ["nav", "[role='navigation']", ".fixed.bottom-0", "div.fixed.bottom-0", "div[class*='fixed'][class*='bottom']"]:
        els = page.locator(selector)
        count = els.count()
        if count > 0:
            for i in range(count):
                box = els.nth(i).bounding_box()
                if box:
                    print(f"  [{selector}][{i}] y={box['y']:.0f} h={box['height']:.0f} bottom={box['y']+box['height']:.0f}")

    # Also check what's at the very bottom of the viewport
    print("\n-- Elements near bottom of viewport --")
    all_fixed = page.locator("[class*='fixed']")
    for i in range(all_fixed.count()):
        box = all_fixed.nth(i).bounding_box()
        if box and box["y"] > 700:
            tag = all_fixed.nth(i).evaluate("el => el.tagName + '.' + el.className.split(' ').slice(0,3).join('.')")
            print(f"  {tag}: y={box['y']:.0f} h={box['height']:.0f}")

    # + button
    plus = page.locator('button[aria-label="Add activity"]')
    if plus.count() > 0:
        box = plus.bounding_box()
        print(f"\n+ button: y={box['y']:.0f} bottom={box['y']+box['height']:.0f}")

    page.screenshot(path=os.path.join(OUT, "rc-btn-position.png"))
    browser.close()
