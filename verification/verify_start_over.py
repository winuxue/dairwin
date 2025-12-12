from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_start_over(page: Page):
    # 1. Arrange: Open the app
    page.goto("http://localhost:5173")

    # Wait for the app to load
    page.wait_for_load_state("networkidle")

    # 2. Act: Open the prompt manually
    page.click("button.manual-open-btn")

    # Wait for modal
    page.wait_for_selector(".modal-overlay")

    # Type in the prompt
    prompt_input = page.locator("textarea.prompt-input")
    prompt_input.fill("Hello Darwin")

    # 3. Screenshot: Before execution
    page.screenshot(path="verification/1_before_execution.png")

    # 4. Act: Execute (Hit Enter)
    prompt_input.press("Enter")

    # 5. Assert: Start Over button appears
    start_over_btn = page.locator("button.start-over-btn")
    expect(start_over_btn).to_be_visible()

    # Assert input is hidden
    expect(prompt_input).not_to_be_visible()

    # 6. Screenshot: After execution
    page.screenshot(path="verification/2_after_execution.png")

    # 7. Act: Click Start Over
    start_over_btn.click()

    # 8. Assert: Input appears again, Start Over hidden
    expect(prompt_input).to_be_visible()
    expect(start_over_btn).not_to_be_visible()

    # Check if input is empty
    expect(prompt_input).to_have_value("")

    # Check if messages are cleared (assuming we had a message from user "Hello Darwin")
    # The user message "Hello Darwin" should be gone.
    # Note: Bot response might take time, but "Hello Darwin" user message is added immediately on execution.
    # So if we are back to start, there should be no messages.
    messages = page.locator(".chat-message")
    expect(messages).to_have_count(0)

    # 9. Screenshot: After start over
    page.screenshot(path="verification/3_after_start_over.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_start_over(page)
            print("Verification script finished successfully.")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
