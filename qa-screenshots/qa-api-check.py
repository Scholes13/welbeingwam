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

    # Intercept /api/strava/sync response
    sync_holder = [None]
    def on_response(response):
        if "/api/strava/sync" in response.url and response.status == 200:
            try:
                sync_holder[0] = response.json()
            except:
                pass

    page.on("response", on_response)

    page.goto("http://localhost:3000/dashboard", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(5000)

    sync_data = sync_holder[0]
    if sync_data:
        print("== /api/strava/sync response ==")
        print(f"Keys: {list(sync_data.keys())}")
        
        profile = sync_data.get("profile")
        if profile:
            print(f"\nProfile keys: {list(profile.keys())}")
            print(f"  id: {profile.get('id')}")
            print(f"  username: {profile.get('username')}")
            print(f"  full_name: {profile.get('full_name')}")
            print(f"  firstname: {profile.get('firstname')}")
            print(f"  profile (avatar): {str(profile.get('profile'))[:80]}")
        else:
            print("\nProfile is NULL/missing!")
        
        print(f"\nactivities count: {len(sync_data.get('activities', []))}")
        print(f"quests count: {len(sync_data.get('quests', []))}")
        print(f"userQuests count: {len(sync_data.get('userQuests', []))}")
        print(f"surveys count: {len(sync_data.get('surveys', []))}")
        print(f"totalPoints: {sync_data.get('totalPoints')}")
        print(f"stepPoints: {sync_data.get('stepPoints')}")
        print(f"sportPoints: {sync_data.get('sportPoints')}")
        print(f"message: {sync_data.get('message')}")
    else:
        print("No sync data captured!")

    # Check what the dashboard component actually renders
    print("\n== DOM inspection ==")
    # Check if profile conditional renders
    main_content = page.locator('[class*="max-w-lg"]')
    print(f"Main content container found: {main_content.count()}")
    
    # Check for the Loader
    loader = page.locator('text=LOADING DASHBOARD')
    print(f"Loading state: {loader.count() > 0}")
    
    # Check for error state
    error = page.locator('text=Failed to load dashboard')
    print(f"Error state: {error.count() > 0}")

    # Check if profile block renders
    profile_img = page.locator('img[class*="rounded-full"]')
    print(f"Profile images: {profile_img.count()}")

    # Dump full HTML for inspection
    html = page.content()
    # Look for key dashboard elements
    print(f"\nHTML contains 'Good Morning/Afternoon/Evening': {'Good' in html}")
    print(f"HTML contains 'Total Points': {'Total Points' in html}")
    print(f"HTML contains 'AddActivityBtn': {'Add activity' in html}")
    print(f"HTML length: {len(html)}")

    browser.close()
