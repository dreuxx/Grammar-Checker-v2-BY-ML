#!/usr/bin/env node

// Extension validation script
const fs = require('fs');
const path = require('path');

console.log('🔍 Grammar Checker Extension Validation\n');

// Check if we're in the right directory
const manifestPath = './manifest.json';
if (!fs.existsSync(manifestPath)) {
    console.error('❌ manifest.json not found. Please run this script from the extension root directory.');
    process.exit(1);
}

// Read and validate manifest
console.log('📋 Validating manifest.json...');
try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`✅ Manifest version: ${manifest.manifest_version}`);
    console.log(`✅ Extension name: ${manifest.name}`);
    console.log(`✅ Extension version: ${manifest.version}`);
    
    // Check content scripts
    if (manifest.content_scripts && manifest.content_scripts.length > 0) {
        console.log('\n📁 Checking content script files...');
        const contentScript = manifest.content_scripts[0];
        
        for (const jsFile of contentScript.js) {
            if (fs.existsSync(jsFile)) {
                console.log(`✅ ${jsFile}`);
            } else {
                console.log(`❌ ${jsFile} - FILE MISSING`);
            }
        }
        
        for (const cssFile of contentScript.css) {
            if (fs.existsSync(cssFile)) {
                console.log(`✅ ${cssFile}`);
            } else {
                console.log(`❌ ${cssFile} - FILE MISSING`);
            }
        }
    }
    
    // Check background script
    if (manifest.background && manifest.background.service_worker) {
        console.log('\n🔧 Checking background script...');
        const serviceWorker = manifest.background.service_worker;
        if (fs.existsSync(serviceWorker)) {
            console.log(`✅ ${serviceWorker}`);
        } else {
            console.log(`❌ ${serviceWorker} - FILE MISSING`);
        }
    }
    
    // Check popup
    if (manifest.action && manifest.action.default_popup) {
        console.log('\n🖼️  Checking popup files...');
        const popupHtml = manifest.action.default_popup;
        if (fs.existsSync(popupHtml)) {
            console.log(`✅ ${popupHtml}`);
            
            // Check for corresponding CSS and JS
            const popupDir = path.dirname(popupHtml);
            const cssFile = path.join(popupDir, 'popup.css');
            const jsFile = path.join(popupDir, 'popup.js');
            
            if (fs.existsSync(cssFile)) {
                console.log(`✅ ${cssFile}`);
            } else {
                console.log(`⚠️  ${cssFile} - CSS file not found`);
            }
            
            if (fs.existsSync(jsFile)) {
                console.log(`✅ ${jsFile}`);
            } else {
                console.log(`⚠️  ${jsFile} - JS file not found`);
            }
        } else {
            console.log(`❌ ${popupHtml} - FILE MISSING`);
        }
    }
    
    // Check icons
    console.log('\n🎨 Checking icon files...');
    if (manifest.icons) {
        for (const [size, iconPath] of Object.entries(manifest.icons)) {
            if (fs.existsSync(iconPath)) {
                console.log(`✅ ${iconPath} (${size}px)`);
            } else {
                console.log(`❌ ${iconPath} (${size}px) - FILE MISSING`);
            }
        }
    }
    
} catch (error) {
    console.error('❌ Error reading manifest.json:', error.message);
    process.exit(1);
}

console.log('\n🧪 Running syntax checks...');

// Check JavaScript syntax
const jsFiles = [
    'background/service-worker.js',
    'popup/popup.js',
    'content/content-main.js'
];

for (const jsFile of jsFiles) {
    if (fs.existsSync(jsFile)) {
        try {
            // Use node to check syntax
            require('child_process').execSync(`node -c "${jsFile}"`, {stdio: 'pipe'});
            console.log(`✅ ${jsFile} - Syntax OK`);
        } catch (error) {
            console.log(`❌ ${jsFile} - Syntax Error: ${error.message}`);
        }
    }
}

console.log('\n✨ Extension validation complete!');
console.log('\n💡 Next steps:');
console.log('1. Load the extension in Chrome by going to chrome://extensions/');
console.log('2. Enable Developer mode');
console.log('3. Click "Load unpacked" and select this directory');
console.log('4. Open test-extension.html to test functionality');