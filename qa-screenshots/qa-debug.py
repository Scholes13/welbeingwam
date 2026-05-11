from playwright.sync_api import sync_playwright
import os, json

OUT = os.path.dirname(os.path.abspath(__file__))
AUTH = os.path.join(OUT, "auth-state.json")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        storage_state=AUTH if os.path.exists(AUTH) else None,
    )
    page = context.new_page()

    # Capture all network requests/responses
    api_results = []
    def on_response(response):
        url = response.url
        if "/api/" in url:
            try:
                body = response.text()[:300]
            except:
                body = "(could not read)"
            api_results.append({
                "url": url,
                "status": response.status,
                "body": body,
            })

    page.on("response", on_response)

    console_msgs = []
    page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))

    # Go to dashboard
    print(">> Loading dashboard...")
    page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(6000)

    print("\n== API Responses ==")
    for r in api_results:
        status_mark = "OK" if r["status"] == 200 else f"FAIL({r['status']})"
        print(f"  [{status_mark}] {r['url']}")
        if r["status"] != 200:
            print(f"         Body: {r['body'][:200]}")

    print("\n== Console Messages ==")
    for msg in console_msgs[:15]:
        print(f"  {msg[:200]}")

    # Check what's rendered
    body = page.inner_text("body")
    print(f"\n== Page Body (first 500 chars) ==")
    print(body[:500] if body.strip() else "(EMPTY)")

    # Check if loader is stuck
    loader = page.locator("text=LOADING")
    print(f"\nLoader visible: {loader.count() > 0}")

    # Check error states
    error_el = page.locator("text=Failed")
    print(f"Error visible: {error_el.count() > 0}")

    # Take screenshot
    page.screenshot(path=os.path.join(OUT, "debug-dashboard.png"), full_page=True)

    # Now check profile page
    api_results.clear()
    console_msgs.clear()
    print("\n\n>> Loading profile...")
    page.goto("http://localhost:3000/profile", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(5000)

    print("\n== Profile API Responses ==")
    for r in api_results:
        status_mark = "OK" if r["status"] == 200 else f"FAIL({r['status']})"
        print(f"  [{status_mark}] {r['url']}")
        if r["status"] != 200:
            print(f"         Body: {r['body'][:200]}")

    body = page.inner_text("body")
    print(f"\n== Profile Body (first 500 chars) ==")
    print(body[:500] if body.strip() else "(EMPTY)")

    page.screenshot(path=os.path.join(OUT, "debug-profile.png"), full_page=True)

    browser.close()
