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

/***/ "./content.js":
/*!********************!*\
  !*** ./content.js ***!
  \********************/
/***/ (() => {

eval("(function () {\n  var EXTENSION_NAME = 'Grammar Checker';\n\n  // Función para registrar mensajes en la consola\n  var log = function log(message) {\n    console.log(\"[\".concat(EXTENSION_NAME, \"]: \").concat(message));\n  };\n\n  // Función para inicializar el script de contenido\n  var initialize = function initialize() {\n    log('Content script loaded and initialized.');\n\n    // Aquí puedes añadir la lógica principal de tu script de contenido\n    // Por ejemplo, podrías agregar un listener para mensajes del script de fondo:\n    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {\n      if (request.action === 'checkGrammar') {\n        var selectedText = window.getSelection().toString();\n        if (selectedText) {\n          log('Text selected for grammar check: ' + selectedText);\n          // Aquí podrías enviar el texto seleccionado de vuelta al script de fondo\n          // para procesarlo con la API de OpenAI\n          sendResponse({\n            text: selectedText\n          });\n        } else {\n          log('No text selected for grammar check');\n          sendResponse({\n            error: 'No text selected'\n          });\n        }\n      }\n      return true; // Keeps the message channel open for asynchronous responses\n    });\n  };\n\n  // Manejo de errores\n  var handleError = function handleError(error) {\n    console.error(\"[\".concat(EXTENSION_NAME, \" Error]:\"), error);\n  };\n\n  // Inicializar el script de contenido\n  try {\n    initialize();\n  } catch (error) {\n    handleError(error);\n  }\n})();\n\n//# sourceURL=webpack://grammar-checker-v1/./content.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./content.js"]();
/******/ 	
/******/ })()
;