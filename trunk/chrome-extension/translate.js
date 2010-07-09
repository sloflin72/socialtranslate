/**
 * @fileoverview Content script that is executed on Facebook and Twitter pages.
 * Performs translations on various elements in the DOM. The content script is
 * executed on document complete, but some sites do some additional manipulation
 * after the initial load. This means we need to listen for events to continue
 * doing translation.
 * @author nav@google.com (Nav Jagpal)
 */

/* List of class types we want to translate. */
var CLASSES_TO_TRANSLATE = [];

/* Whether or not to show the original text. This is toggled by the pageAction
 * icon. */
var SHOW_ORIGINAL = false;

if (window.location.hostname.lastIndexOf('twitter.com') != -1) {
  console.log('Preparing for Twitter translations.');
  CLASSES_TO_TRANSLATE = [
    'entry-content', /* Tweet. */
  ];
} else if (window.location.hostname.lastIndexOf('facebook.com') != -1) {
  console.log('Preparing for Facebook translations.');
  CLASSES_TO_TRANSLATE = [
    'comment_actual_text', /* User comments on posts, pics, etc. */
    'UIStory_Message', /* Status updates. */
    'UIStoryAttachment_Copy', /* The partial text from sharing articles. */
    'description', /* Photo album descriptions. */
    'uiStreamMessage', /* Some other comments. */
    'mobile_status', /* Profile status, top of the profile page. */
  ];
}

chrome.extension.sendRequest({action: "hideIcon"}, function(r) {});

function onRequest(request) {
  if (request.action == "toggle") {
    console.log("Request to toggle original text display.");
    if (SHOW_ORIGINAL == true) {
      SHOW_ORIGINAL = false;
    } else {
      SHOW_ORIGINAL = true;
    }
    var elements = document.getElementsByName("originalText");
    for (var i = 0; i < elements.length; i++) {
      var e = elements[i];
      if (SHOW_ORIGINAL == true) {
        e.style.display = "block";
      } else {
        e.style.display = "none";
      }
    }
  }
}

chrome.extension.onRequest.addListener(onRequest);

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
        if (response.translated == true) {
          element.innerHTML = response.translation;
          chrome.extension.sendRequest({action: "showIcon"}, function(r) {});
          var imageElement = document.createElement("img");
          imageElement.src = chrome.extension.getURL("translate19.png");
          var originalText = document.createElement("div");
          if (SHOW_ORIGINAL == false) {
            originalText.style.display = "none";
          }
          originalText.innerHTML = "<i>" + text + "</i>";
          originalText.setAttribute("name", "originalText");

          /* Do not translate elements with className of actorName. These are
           * links to user profiles that include user names. We never want to
           * translate a username.
           * Facebook specific. */
          var originalNode = originalText.children[0];  // Skip over the <i>.
          for (i = 0; i < originalNode.children.length; i++) {
            if (originalNode.children[i].className == "actorName") {
              element.children[i].innerHTML = originalNode.children[i].innerHTML;
            }
          }

          if (originalNode.innerHTML == element.innerHTML) {
            console.log('Not translated.');
          }

          element.appendChild(imageElement);
          element.appendChild(originalText);
        }
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
