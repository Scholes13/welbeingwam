from playwright.sync_api import sync_playwright
import os

OUT = os.path.dirname(os.path.abspath(__file__))
AUTH = os.path.join(OUT, "auth-state.json")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        storage_state=AUTH if os.path.exists(AUTH) else None,
    )
    page = context.new_page()

    # 1. Dashboard
    print(">> Dashboard")
    page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(5000)
    page.screenshot(path=os.path.join(OUT, "rc-01-dashboard.png"))
    body = page.inner_text("body")
    print(f"   Has greeting: {'good' in body.lower()}")
    print(f"   Content length: {len(body.strip())}")

    # 2. + Button position & form type
    print("\n>> + Button")
    plus = page.locator('button[aria-label="Add activity"]')
    print(f"   Found: {plus.count() > 0}")
    if plus.count() > 0:
        box = plus.bounding_box()
        if box:
            bottom_edge = box["y"] + box["height"]
            print(f"   Bottom edge: {bottom_edge:.0f}px (viewport: 844)")

            navs = page.locator("nav")
            if navs.count() > 0:
                nbox = navs.last.bounding_box()
                if nbox:
                    gap = nbox["y"] - bottom_edge
                    print(f"   Nav top: {nbox['y']:.0f}px")
                    print(f"   Gap to nav: {gap:.0f}px {'OK' if gap >= 8 else 'TOO CLOSE!'}")

        # Click +
        plus.click()
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(OUT, "rc-02-modal.png"))

        # Check which form appeared
        wellbeing = page.locator("text=Pilih Dimensi Wellbeing")
        daily_tab = page.locator("text=Daily Activity")
        sport_tab = page.locator("text=Sport Session")
        dim_select = page.locator("select")

        is_wellbeing = wellbeing.count() > 0
        is_normal = daily_tab.count() > 0 and sport_tab.count() > 0
        has_dropdown = dim_select.count() > 0

        print(f"   WellbeingForm (downgrade): {is_wellbeing}")
        print(f"   Normal form (Daily/Sport tabs): {is_normal}")
        print(f"   Has dimension dropdown: {has_dropdown}")

        if has_dropdown:
            options = dim_select.first.locator("option").all_text_contents()
            print(f"   Dropdown options: {options}")

        # Close modal
        close = page.locator("button:has(svg)").first
        if close.count() > 0:
            page.keyboard.press("Escape")
            page.wait_for_timeout(500)

    # 3. Quests
    print("\n>> Quests")
    page.goto("http://localhost:3000/quests", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "rc-03-quests.png"))
    body = page.inner_text("body")
    print(f"   Shows error: {'failed' in body.lower()}")
    print(f"   Has content: {'quest' in body.lower()}")

    # 4. Profile
    print("\n>> Profile")
    page.goto("http://localhost:3000/profile", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "rc-04-profile.png"))
    body = page.inner_text("body")
    print(f"   Shows error: {'failed' in body.lower()}")
    print(f"   Has content: {len(body.strip()) > 100}")

    # 5. Leaderboard
    print("\n>> Leaderboard")
    page.goto("http://localhost:3000/leaderboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "rc-05-leaderboard.png"))

    print("\nDone!")
    browser.close()
