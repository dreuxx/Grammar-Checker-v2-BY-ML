/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./background.js":
/*!***********************!*\
  !*** ./background.js ***!
  \***********************/
/***/ (() => {

eval("var EXTENSION_NAME = 'Grammar Checker';\nvar log = function log(message) {\n  return console.log(\"[\".concat(EXTENSION_NAME, \"]: \").concat(message));\n};\nvar handleError = function handleError(error) {\n  return console.error(\"[\".concat(EXTENSION_NAME, \" Error]:\"), error);\n};\nvar initializeExtension = function initializeExtension() {\n  log('Extension installed or updated.');\n  chrome.storage.sync.get(['openaiApiKey', 'openaiModel'], function (result) {\n    if (!result.openaiApiKey) {\n      log('API key not set. Prompting user to set it.');\n      chrome.runtime.openOptionsPage();\n    } else {\n      log('Extension configured successfully.');\n    }\n  });\n};\nchrome.runtime.onInstalled.addListener(initializeExtension);\nchrome.runtime.onUninstalled.addListener(function () {\n  log('Extension uninstalled.');\n});\ntry {\n  // Cualquier código adicional de inicialización iría aquí\n  log('Background script loaded.');\n} catch (error) {\n  handleError(error);\n}\n\n//# sourceURL=webpack://grammar-checker-v1/./background.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./background.js"]();
/******/ 	
/******/ })()
;