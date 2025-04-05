# ✨ Grammar Checker v2 (Powered by ML) in PROGRESS

**Grammar Checker** is a Chrome extension designed to review and improve grammar and spelling in multiple languages using **machine learning**.

---

## 🚀 Features

- ✅ **Grammar and Spelling Correction**  
  Reviews text in multiple languages and provides correction suggestions using ML.

- 🌐 **Multi-Language Support**  
  Supports the following languages:
  - Spanish
  - English
  - French
  - German
  - Italian
  - Portuguese
  - Indonesian
  - Polish
  - Vietnamese
  - Javanese
  - Turkish

- 🖍️ **Error Highlighting Without Modifying the Original Text**  
  Errors are underlined with a dashed line. Hovering over them shows the suggested correction.

- 🧠 **Automatic Language Detection**  
  Detects the language of the text automatically.

- 🧩 **User-Friendly Interface**  
  Simple and intuitive UI for reviewing, copying, and editing text.

- 🔐 **API Customization**  
  Easily add and save your own OpenAI API key via the settings page.

- 📜 **Support for Long Texts**  
  Can handle and review texts up to **2500 words**.

---

## 🛠 Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer Mode** (top right).
4. Click **Load unpacked** and select the folder containing this extension.

---

## ⚙️ Configuration

- Click the extension icon in your Chrome toolbar.
- Navigate to **Settings** to input your OpenAI API key.

---

## 💡 Usage

1. Open the extension by clicking the **Grammar Checker** icon.
2. Paste or enter the text you want to review (max 2500 words).
3. Click **Check Grammar**.
4. Errors will be **highlighted with a dashed underline**.
5. Hover over errors to see correction suggestions.
6. Click **Copy corrected text** to copy the original version.

---

## 📁 Main Files

| File            | Description |
|-----------------|-------------|
| `background.js` | Handles installation events and extension permissions |
| `manifest.json` | Defines configuration and permissions for the extension |
| `popup.html`    | Contains the UI for user interaction |
| `popup.js`      | Core logic for grammar checking and OpenAI integration |
| `styles.css`    | Styling and error highlighting rules |
| `content.js`    | Handles webpage interaction and text selection |
| `options.html` & `options.js` | UI and logic for API key configuration |

---

## 📌 Requirements

- **OpenAI API Key**  
  Sign up at [openai.com](https://www.openai.com) to obtain an API key.

- **Google Chrome**  
  The extension is developed and tested for the Chrome browser.

---

## 🖼️ Screenshots

*Coming soon – feel free to add screenshots of your UI!*

---

## ⚠️ Important Notes

- **Word Limit:** Maximum of 2500 words per review session.
- **Privacy:** Your text is sent to the OpenAI API. Avoid submitting sensitive or personal data.
- **Non-Intrusive Editing:** This extension highlights errors but **does not modify** the original text automatically.

---

## 🤝 Contribution

Contributions are welcome! To contribute:

1. Fork this repository.
2. Create a new branch (`feature/your-feature-name`).
3. Make your changes and push the branch.
4. Submit a pull request 🚀

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---


