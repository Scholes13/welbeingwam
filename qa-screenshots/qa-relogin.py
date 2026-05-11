from playwright.sync_api import sync_playwright
import os

OUT = os.path.dirname(os.path.abspath(__file__))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})

    # Login
    print(">> Login...")
    page.goto("http://localhost:3000", wait_until="networkidle", timeout=20000)
    page.wait_for_timeout(2000)

    inputs = page.locator("input").all()
    if len(inputs) >= 2:
        inputs[0].fill("Pramuji")
        inputs[1].fill("werkudara88")
        page.locator('button:has-text("Login")').click()
        page.wait_for_timeout(5000)
        print(f"   URL: {page.url}")
        if "/dashboard" in page.url:
            print("   Login OK!")
            page.context.storage_state(path=os.path.join(OUT, "auth-state.json"))
        else:
            print("   Login may have failed")
            page.screenshot(path=os.path.join(OUT, "rc-login-fail.png"))
            browser.close()
            exit(1)
    else:
        print("   Already logged in or no form")

    # 1. Dashboard
    print("\n>> Dashboard")
    page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(5000)
    page.screenshot(path=os.path.join(OUT, "rc-01-dashboard.png"))
    body = page.inner_text("body")
    print(f"   Has greeting: {'good' in body.lower()}")
    print(f"   Content: {len(body.strip())} chars")

    # 2. + Button
    print("\n>> + Button")
    plus = page.locator('button[aria-label="Add activity"]')
    print(f"   Found: {plus.count() > 0}")
    if plus.count() > 0:
        box = plus.bounding_box()
        if box:
            bottom_edge = box["y"] + box["height"]
            print(f"   Button bottom: {bottom_edge:.0f}px")
            navs = page.locator("nav")
            if navs.count() > 0:
                nbox = navs.last.bounding_box()
                if nbox:
                    gap = nbox["y"] - bottom_edge
                    print(f"   Nav top: {nbox['y']:.0f}px, gap: {gap:.0f}px {'OK' if gap >= 8 else 'TOO CLOSE!'}")

        plus.click()
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(OUT, "rc-02-modal.png"))

        wellbeing = page.locator("text=Pilih Dimensi Wellbeing")
        daily_tab = page.locator("text=Daily Activity")
        sport_tab = page.locator("text=Sport Session")
        dim_select = page.locator("select")

        print(f"   WellbeingForm (downgrade): {wellbeing.count() > 0}")
        print(f"   Normal form tabs: {daily_tab.count() > 0 and sport_tab.count() > 0}")
        print(f"   Dimension dropdown: {dim_select.count() > 0}")
        if dim_select.count() > 0:
            options = dim_select.first.locator("option").all_text_contents()
            print(f"   Options: {options}")

    # 3. Quests
    print("\n>> Quests")
    page.goto("http://localhost:3000/quests", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "rc-03-quests.png"))

    # 4. Profile
    print("\n>> Profile")
    page.goto("http://localhost:3000/profile", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "rc-04-profile.png"))

    # 5. Leaderboard
    print("\n>> Leaderboard")
    page.goto("http://localhost:3000/leaderboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "rc-05-leaderboard.png"))

    print("\nDone!")
    browser.close()
