I don't know much English, so I used AI for the following text:

Grammar Checker is a Chrome extension designed to review and improve grammar and spelling in multiple languages using the OpenAI API.

Features
Grammar and Spelling Correction: Reviews text in multiple languages and provides correction suggestions.
Multi-Language Support: The extension supports the following languages:
Spanish
English
French
German
Italian
Portuguese
Indonesian
Polish
Vietnamese
Javanese
Turkish
Error Highlighting Without Changing Original Text: The extension identifies errors in the text and highlights them without modifying the original content. Errors are underlined with a dashed line, and hovering over them displays a correction suggestion.
Automatic Language Detection: The extension automatically detects the text’s language.
User-Friendly Interface: The extension provides a simple interface where you can input text, see highlighted errors, and copy the result.
API Customization: Allows you to enter and save your OpenAI API key in the settings.
Support for Long Texts: It can review texts up to 2500 words.
Installation
Clone or download this repository.
Open Chrome and go to chrome://extensions/.
Enable Developer Mode in the top right corner.
Click on Load unpacked extension and select the folder where you downloaded this repository.
Configuration
Click the extension icon in the Chrome toolbar.
Enter your OpenAI API key in the corresponding field and click "Save API".
You can obtain an API key at OpenAI API Keys.
The API key is securely stored in Chrome storage.
Usage
Open the extension by clicking on the Grammar Checker icon.
Enter the text you want to review in the input field (up to 2500 words).
Click on Check Grammar to receive correction suggestions.
Words with errors will be highlighted with a dashed underline. Hovering over them will show a correction suggestion.
You can copy the original text (without modifications) by clicking on Copy corrected text.
Main Files
background.js: Manages installation events, configuration, and extension permissions.
manifest.json: Defines the extension’s configuration and permissions.
popup.html: Contains the user interface for inputting and reviewing text.
popup.js: Controls grammar correction logic, language detection, error highlighting, and communication with the OpenAI API.
styles.css: Defines the design and style of the interface, including error highlighting.
content.js: Handles text selection and communication with the webpage.
options.html and options.js: Allow users to configure the OpenAI API key and model.
Requirements
OpenAI API: You’ll need an API key for the extension to work. You can sign up at OpenAI and obtain a key on their website.
Chrome Browser: The extension was developed and tested in Google Chrome.
Screenshots



Important Notes
Word Limit: The extension allows you to review texts up to 2500 words.
Privacy: All text processed is sent to the OpenAI API for corrections. Avoid including sensitive information in the submitted text.
Error Highlighting Without Changing Original Text: The extension highlights grammatical and spelling errors without modifying the original text, allowing users to view errors without affecting the content.
Contribution
If you would like to contribute to the project, please fork the repository, create a new branch for your changes, and submit a pull request.

License
This project is licensed under the MIT License. See the LICENSE file for more details.
