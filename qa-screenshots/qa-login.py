from playwright.sync_api import sync_playwright
import os, json

OUT = os.path.dirname(os.path.abspath(__file__))

CREDENTIALS = [
    {"username": "Pramuji", "password": "werkudara88"},
    {"username": "Pramuji", "password": "Werkudara88"},
    {"username": "pramuji", "password": "werkudara88"},
    {"username": "pramuji", "password": "Werkudara88"},
    {"username": "pramuji@werkudara.com", "password": "werkudara88"},
    {"username": "pramuji@werkudara.com", "password": "Werkudara88"},
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})

    logged_in = False

    for i, cred in enumerate(CREDENTIALS):
        print(f">> Trying {cred['username']} / {cred['password'][:3]}***")
        page.goto("http://localhost:3000", wait_until="networkidle", timeout=20000)
        page.wait_for_timeout(2000)

        # Check if already on login page
        username_input = page.locator('input[placeholder="Username"]')
        email_input = page.locator('input[type="email"]')
        
        if username_input.count() > 0:
            username_input.fill(cred["username"])
            page.locator('input[placeholder="Password"]').fill(cred["password"])
        elif email_input.count() > 0:
            email_input.fill(cred["username"])
            page.locator('input[type="password"]').fill(cred["password"])
        else:
            # Try any visible input
            inputs = page.locator("input").all()
            if len(inputs) >= 2:
                inputs[0].fill(cred["username"])
                inputs[1].fill(cred["password"])
            else:
                print("   No login form found")
                page.screenshot(path=os.path.join(OUT, f"login-attempt-{i}-noform.png"))
                continue

        # Click login button
        login_btn = page.locator('button:has-text("Login")')
        if login_btn.count() > 0:
            login_btn.click()
        else:
            page.locator("button[type='submit']").click()

        page.wait_for_timeout(4000)
        page.screenshot(path=os.path.join(OUT, f"login-attempt-{i}.png"))

        # Check if we landed on dashboard
        url = page.url
        print(f"   After login URL: {url}")
        if "/dashboard" in url or "/leaderboard" in url:
            print(f"   SUCCESS with {cred['username']}")
            logged_in = True
            # Save storage state for reuse
            page.context.storage_state(path=os.path.join(OUT, "auth-state.json"))
            break
        else:
            body = page.inner_text("body")[:200]
            if "invalid" in body.lower() or "error" in body.lower() or "failed" in body.lower():
                print(f"   Login failed: {body[:100]}")
            else:
                print(f"   Page content: {body[:100]}")

    if not logged_in:
        print("\nAll credentials failed!")
        browser.close()
        exit(1)

    print("\n>> Logged in! Running QA...")

    # ============ QA TESTS ============

    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    # 1. Dashboard
    print("\n>> Dashboard")
    page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(5000)
    page.screenshot(path=os.path.join(OUT, "qa-01-dashboard.png"), full_page=True)
    page.screenshot(path=os.path.join(OUT, "qa-01-dashboard-viewport.png"))
    body = page.inner_text("body")
    print(f"   Has content: {len(body.strip()) > 100}")
    print(f"   Shows greeting: {'good' in body.lower() or 'morning' in body.lower() or 'afternoon' in body.lower() or 'evening' in body.lower()}")

    # 2. Quests
    print("\n>> Quests")
    page.goto("http://localhost:3000/quests", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(4000)
    page.screenshot(path=os.path.join(OUT, "qa-02-quests.png"), full_page=True)
    body = page.inner_text("body")
    print(f"   Has quest content: {'quest' in body.lower()}")
    print(f"   Shows error: {'failed' in body.lower() or 'error' in body.lower()}")

    # 3. + Button check
    print("\n>> + Button & Add Activity Modal")
    page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(4000)

    plus_btn = page.locator('button[aria-label="Add activity"]')
    print(f"   + button found: {plus_btn.count() > 0}")
    if plus_btn.count() > 0:
        box = plus_btn.bounding_box()
        if box:
            print(f"   Position: x={box['x']:.0f}, y={box['y']:.0f}")
            print(f"   Bottom edge: {box['y'] + box['height']:.0f} (viewport: 844)")
            
            # Check overlap with bottom nav
            nav = page.locator("nav").last
            if nav.count() > 0:
                nav_box = nav.bounding_box()
                if nav_box:
                    print(f"   Bottom nav top: {nav_box['y']:.0f}")
                    overlap = (box['y'] + box['height']) - nav_box['y']
                    if overlap > 0:
                        print(f"   OVERLAP: + button overlaps nav by {overlap:.0f}px!")
                    else:
                        print(f"   Gap between + and nav: {-overlap:.0f}px")

            # Click and check modal
            plus_btn.click()
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(OUT, "qa-03-add-modal.png"))

            # Check dimension dropdown
            selects = page.locator("select").all()
            print(f"   Selects in modal: {len(selects)}")
            if selects:
                options = selects[0].locator("option").all_text_contents()
                print(f"   Dimension options: {options}")

    # 4. Leaderboard
    print("\n>> Leaderboard")
    page.goto("http://localhost:3000/leaderboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "qa-04-leaderboard.png"), full_page=True)

    # 5. Profile
    print("\n>> Profile")
    page.goto("http://localhost:3000/profile", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(OUT, "qa-05-profile.png"), full_page=True)

    # Summary
    print("\n== Console Errors ==")
    for err in console_errors[:10]:
        print(f"   {err[:150]}")
    if not console_errors:
        print("   None")

    print("\nQA Done! Screenshots in:", OUT)
    browser.close()
