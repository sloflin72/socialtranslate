/**
 * @fileoverview Content script that is executed on Twitter pages.
 * @author nav@google.com (Nav Jagpal)
 */

if (window.location.hostname.lastIndexOf('twitter.com') == -1) {
  console.log('Not twitter, skipping twitter translation.');
  return;
}

/** List of class types we want to translate. */
var CLASSES_TO_TRANSLATE = [
    'entry-content', /* Tweet. */
];

/**
 * Find all elements that match our translation criteria and translate.
 * The background page will either return the original text if no translation
 * was needed, or the translated text in primary language.
 */
for (var i in CLASSES_TO_TRANSLATE) {
  var clss = CLASSES_TO_TRANSLATE[i];
  var elements = document.getElementsByClassName(clss);
  for (var j = 0; j < elements.length; j++) {
    var text = elements[j].innerHTML;
    console.log("Translating " + text);
    var element = elements[j];
    translate(element);
  }
}

/**
 * Translates the content of the given element.
 * @param {element} element dom element to translate.
 */
function translate(element) {
  var text = element.innerHTML;
  /* Send a request to the background page, which does the translation. */
  chrome.extension.sendRequest(
      {action: "translate", msg: text},
      function(response) {
        element.innerHTML = response.translation;
      });
}

/**
 * Callback for DOMNodeInserted events.
 * @param {event} e The insertion event.
 */
function nodeInsertedHandler(e) {
  if (!e.target) {
    return;
  }
  /* Some elements do not contain this method. */
  if (!e.target.getElementsByClassName) {
    return;
  }
  for (var i in CLASSES_TO_TRANSLATE) {
    var clss = CLASSES_TO_TRANSLATE[i];
    var elements = e.target.getElementsByClassName(clss);
    for (var i = 0; i < elements.length; i++) {
      translate(elements[i]);
    }
  }
}

document.addEventListener('DOMNodeInserted', nodeInsertedHandler, true);
