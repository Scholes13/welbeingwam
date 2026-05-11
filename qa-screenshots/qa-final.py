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

    # Capture API
    api_holder = [None]
    def on_resp(r):
        if "/api/strava/sync" in r.url and r.status == 200:
            try: api_holder[0] = r.json()
            except: pass
    page.on("response", on_resp)

    # 1. Dashboard
    print(">> Dashboard")
    page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(5000)
    page.screenshot(path=os.path.join(OUT, "final-01-dashboard.png"), full_page=True)
    page.screenshot(path=os.path.join(OUT, "final-01-dashboard-vp.png"))

    sync = api_holder[0]
    if sync:
        has_profile = sync.get("profile") is not None
        print(f"   profile present: {has_profile}")
        if has_profile:
            print(f"   username: {sync['profile'].get('username')}")
            print(f"   firstname: {sync['profile'].get('firstname')}")
    else:
        print("   No sync data")

    body = page.inner_text("body")
    print(f"   Has greeting: {'good' in body.lower()}")
    print(f"   Has Total Points: {'total points' in body.lower() or 'pts' in body.lower()}")
    print(f"   Body length: {len(body.strip())}")

    # 2. Quests
    print("\n>> Quests")
    page.goto("http://localhost:3000/quests", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "final-02-quests.png"))
    body = page.inner_text("body")
    print(f"   Shows error: {'failed' in body.lower()}")
    print(f"   Shows content: {'quest' in body.lower()}")

    # 3. + Button
    print("\n>> + Button")
    page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(4000)
    plus = page.locator('button[aria-label="Add activity"]')
    print(f"   Found: {plus.count() > 0}")
    if plus.count() > 0:
        box = plus.bounding_box()
        if box:
            print(f"   Position: bottom={box['y']+box['height']:.0f}px")
            # Check nav
            navs = page.locator("nav")
            if navs.count() > 0:
                nbox = navs.last.bounding_box()
                if nbox:
                    gap = nbox["y"] - (box["y"] + box["height"])
                    print(f"   Nav top: {nbox['y']:.0f}px, gap: {gap:.0f}px")
                    if gap < 8:
                        print("   ISSUE: Too close to nav!")

        plus.click()
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(OUT, "final-03-modal.png"))

        # Check if it's the WellbeingActivityForm (downgrade) or normal form
        wellbeing = page.locator("text=Pilih Dimensi Wellbeing")
        normal_daily = page.locator("text=Daily Activity")
        normal_dim = page.locator("select")
        print(f"   WellbeingForm (downgrade): {wellbeing.count() > 0}")
        print(f"   Normal form tabs: {normal_daily.count() > 0}")
        print(f"   Dimension dropdown: {normal_dim.count() > 0}")

    # 4. Profile
    print("\n>> Profile")
    page.goto("http://localhost:3000/profile", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(4000)
    page.screenshot(path=os.path.join(OUT, "final-04-profile.png"), full_page=True)
    body = page.inner_text("body")
    print(f"   Shows error: {'failed' in body.lower()}")
    print(f"   Has content: {len(body.strip()) > 100}")

    # 5. Leaderboard
    print("\n>> Leaderboard")
    page.goto("http://localhost:3000/leaderboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "final-05-leaderboard.png"))

    print("\nDone!")
    browser.close()
