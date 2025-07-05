
# Grammar Checker v2

[](https://www.google.com/search?q=https://github.com/user/repo)
[](https://www.google.com/search?q=https://github.com/user/repo)
[](https://www.google.com/search?q=https://github.com/user/repo)

**Mejora** is a browser extension for real-time grammar correction powered by a fine-tuned mT5-LoRA model. It provides support for five languages directly within your browser's text fields.

-----

> 🚧 **Important Notice** 🚧
>
> This project is currently **in development**.
>
> The required ONNX models (`~273 MB` and `~143 MB`) are **not included** in this repository due to GitHub's file size limitations. For the extension to work, you must download them separately. Please follow the installation guide below.

## 🚀 Features

  - **Multilingual Correction**: Provides grammar checks for English, Spanish, French, German, and Russian.
  - **Powered by AI**: Utilizes a fine-tuned mT5 model with LoRA for efficient and accurate suggestions.
  - **Browser Integration**: Works seamlessly as a browser extension.
  - **Optimized for Performance**: Uses quantized ONNX models (`int8`) to ensure fast performance and low resource consumption.

## 📊 Performance

The performance is measured by the exact-match percentage, which indicates how often the model's output perfectly matches the gold-standard correction.

| Language | Exact Match (%) |
| :--- | :--- |
| English | 35–40% |
| Spanish | 32–35% |
| French | 32–35% |
| German | 32–35% |
| Russian | 32–35% |

## 🛠️ Setup and Installation

Follow these steps to set up the project locally.

#### 1\. Clone the Repository

```bash
git clone https://github.com/your-username/mejora-grammar-checker.git
cd mejora-grammar-checker
```

#### 2\. Download the ONNX Models

The necessary `encoder` and `decoder` models are hosted externally.

  - **Download `encoder_model_int8.onnx` (\~273 MB)**
  - **Download `decoder_model_int8.onnx` (\~143 MB)**

*(Suggestion: Host these on GitHub Releases, Hugging Face, or another file hosting service and link them here.)*

You can find the official download links in the **[project's Wiki](https://www.google.com/search?q=https://github.com/your-username/mejora-grammar-checker/wiki)** or pinned in the **[Issues tab](https://www.google.com/search?q=https://github.com/your-username/mejora-grammar-checker/issues)**.

#### 3\. Place the Models in the Correct Directory

Create a `models` folder in the project root and place the downloaded `.onnx` files inside it. The final structure should look like this:

```
/mejora-grammar-checker
|
├── models/
│   ├── encoder_model_int8.onnx
│   └── decoder_model_int8.onnx
│
├── src/
├── package.json
└── README.md
```

#### 4\. Install Dependencies

Install the required npm packages.

```bash
npm install
```

## 🚀 How to Use

Once the installation is complete:

1.  **Build the project** (if required by your `package.json` scripts):
    ```bash
    npm run build
    ```
2.  **Load the extension in your browser**:
      - **Chrome**: Go to `chrome://extensions/`, enable "Developer mode", and click "Load unpacked" to select the `dist` or `build` folder.
      - **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on...", and select the `manifest.json` file.

## 🤝 Contributing

Contributions are welcome\! If you'd like to help improve Mejora, please check the [Issues tab](https://www.google.com/search?q=https://github.com/your-username/mejora-grammar-checker/issues) to see what's needed or submit a pull request with your own enhancements.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is distributed under the MIT License. See `LICENSE` for more information.
