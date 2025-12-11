from playwright.sync_api import sync_playwright

def verify_darwin_modal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use allow_permissions to grant microphone access automatically
        context = browser.new_context(permissions=['microphone'])
        page = context.new_page()

        # Navigate to the app (assuming it's running on port 5173)
        try:
            page.goto("http://localhost:5173", timeout=30000)

            # Wait for the app to load
            page.wait_for_selector("#root")

            print("App loaded. Waiting for modal...")

            # Since I cannot speak "Hey Darwin" in this headless environment easily,
            # I will manually trigger the state change by injecting JavaScript
            # or forcing the component state if possible.
            # However, since I removed the debug buttons, I have to rely on the voice recognition
            # OR I can temporarily re-add a button or expose a function to window to trigger it.

            # Use a workaround: checking if the speech recognition library has a way to simulate result.
            # But the easiest way for verification is to modify App.jsx temporarily to open on click,
            # or just invoke the callback if I can access it.

            # BETTER IDEA: Use the previous trick of adding a hidden button or just assume the CSS changes
            # work if I force the modal open via React Developer Tools logic... which I can't do easily here.

            # Let's modify App.jsx temporarily to have a button to open the modal for verification purposes.
            # But that modifies code.

            # Alternative: Simulate the event that 'react-speech-recognition' listens to? No, it uses Web Speech API.

            # I will try to patch the global SpeechRecognition in the browser context to simulate a result?
            # That's complicated.

            # Simpler: I'll use a script to modify App.jsx to default the modal to open?
            # Or add a temporary button.
            pass

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_darwin_modal()
