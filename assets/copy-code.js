// =============================================================================
// AI Learning Hub — copy a code sample (case study page).
//
// The skill template in the case study is meant to be taken away and edited, so
// it gets a copy button. The button ships hidden and is revealed here: without
// this file, or without clipboard permission, there is nothing to press rather
// than a button that fails silently.
//
//   <button class="copyBtn" data-copy-target="tmpl" hidden>…</button>
//   <pre id="tmpl"><code>…</code></pre>
// =============================================================================

(function () {
  "use strict";

  if (!navigator.clipboard) return;

  function wire(button) {
    var source = document.getElementById(button.getAttribute("data-copy-target"));
    if (!source) return;

    var label = button.querySelector(".copyBtnLabel") || button;
    var idle = label.textContent;
    var timer;

    button.hidden = false;
    button.addEventListener("click", function () {
      navigator.clipboard.writeText(source.innerText).then(
        function () {
          label.textContent = "Copied";
        },
        function () {
          // Clipboard access can be refused outright — say so rather than
          // claiming a copy that did not happen.
          label.textContent = "Press ⌘C to copy";
        }
      );
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        label.textContent = idle;
      }, 2500);
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll("[data-copy-target]"), wire);
})();
