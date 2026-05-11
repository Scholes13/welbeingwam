from playwright.sync_api import sync_playwright
import os

OUT = os.path.dirname(os.path.abspath(__file__))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})

    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    # 1. Dashboard
    print(">> Loading dashboard...")
    page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(4000)
    page.screenshot(path=os.path.join(OUT, "01-dashboard-full.png"), full_page=True)
    page.screenshot(path=os.path.join(OUT, "01-dashboard-viewport.png"))
    print(f"   Dashboard title visible: {page.locator('text=Good').count() > 0 or page.locator('text=LOADING').count() > 0}")

    # Check if content is actually rendered
    body_text = page.inner_text("body")
    has_content = len(body_text.strip()) > 50
    print(f"   Dashboard has content: {has_content}")
    if not has_content:
        print(f"   Body text: {body_text[:200]}")

    # 2. Quests page
    print(">> Loading quests...")
    page.goto("http://localhost:3000/quests", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(4000)
    page.screenshot(path=os.path.join(OUT, "02-quests-full.png"), full_page=True)
    page.screenshot(path=os.path.join(OUT, "02-quests-viewport.png"))
    quests_text = page.inner_text("body")
    has_quests = "quest" in quests_text.lower() or "loading" in quests_text.lower()
    print(f"   Quests has content: {has_quests}")
    if not has_quests:
        print(f"   Body text: {quests_text[:200]}")

    # 3. Dashboard + button position check
    print(">> Checking + button position...")
    page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    plus_btn = page.locator('button[aria-label="Add activity"]')
    if plus_btn.count() > 0:
        box = plus_btn.bounding_box()
        print(f"   + button position: x={box['x']:.0f}, y={box['y']:.0f}, w={box['width']:.0f}, h={box['height']:.0f}")
        print(f"   Viewport height: 844, button bottom: {box['y'] + box['height']:.0f}")
        if box["y"] + box["height"] > 844:
            print("   ISSUE: + button is below viewport!")
        
        # Check if bottom nav exists and overlaps
        bottom_nav = page.locator("nav").last
        if bottom_nav.count() > 0:
            nav_box = bottom_nav.bounding_box()
            if nav_box:
                print(f"   Bottom nav position: y={nav_box['y']:.0f}, h={nav_box['height']:.0f}")
                if box["y"] + box["height"] > nav_box["y"]:
                    print("   ISSUE: + button overlaps with bottom nav!")

        # Click + and screenshot modal
        plus_btn.click()
        page.wait_for_timeout(1000)
        page.screenshot(path=os.path.join(OUT, "03-add-activity-modal.png"))
        
        # Check dimension dropdown exists
        dim_select = page.locator("select")
        print(f"   Dimension dropdown found: {dim_select.count() > 0}")
    else:
        print("   ISSUE: + button NOT FOUND")

    # 4. Leaderboard
    print(">> Loading leaderboard...")
    page.goto("http://localhost:3000/leaderboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "04-leaderboard.png"), full_page=True)

    # 5. Profile
    print(">> Loading profile...")
    page.goto("http://localhost:3000/profile", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "05-profile.png"), full_page=True)

    # Summary
    print("\n== Console Errors ==")
    for err in console_errors[:10]:
        print(f"   {err[:150]}")
    if not console_errors:
        print("   None")

    print("\nDone! Screenshots in:", OUT)
    browser.close()
