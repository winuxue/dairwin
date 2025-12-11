from playwright.sync_api import sync_playwright

def verify_darwin_modal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(permissions=['microphone'])
        page = context.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:5173", timeout=30000)
            page.wait_for_selector("#root")

            print("App loaded. Triggering modal via window.openDarwinModal()...")

            # Wait a bit for the useEffect to attach the window function
            page.wait_for_timeout(1000)

            # Trigger the modal
            page.evaluate("window.openDarwinModal()")

            # Wait for the modal to appear
            page.wait_for_selector(".modal-overlay")
            print("Modal opened!")

            # Wait a bit for animations
            page.wait_for_timeout(1000)

            # Take screenshot
            screenshot_path = "/app/verification/darwin_modal_updated.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_darwin_modal()
