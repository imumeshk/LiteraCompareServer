(function () {
  "use strict";

  var compareEndpoint = "/WorkshareCompareApi/api/uicompare";
  var form = document.getElementById("compare-form");
  var originalInput = document.getElementById("file-original");
  var modifiedInput = document.getElementById("file-modified");
  var originalName = document.getElementById("file-original-name");
  var modifiedName = document.getElementById("file-modified-name");
  var submitButton = document.getElementById("submit-button");
  var resetButton = document.getElementById("reset-button");
  var swapButton = document.getElementById("swap-button");
  var statusArea = document.getElementById("status-area");

  function setStatus(message, type) {
    statusArea.textContent = message;
    statusArea.classList.remove("is-error", "is-success");

    if (type === "error") {
      statusArea.classList.add("is-error");
    } else if (type === "success") {
      statusArea.classList.add("is-success");
    }
  }

  function getFileLabel(file) {
    return file ? file.name : "No file selected";
  }

  function updateFormState() {
    originalName.textContent = getFileLabel(originalInput.files[0]);
    modifiedName.textContent = getFileLabel(modifiedInput.files[0]);
    submitButton.disabled = !(originalInput.files.length && modifiedInput.files.length);
  }

  function resetForm() {
    form.reset();
    updateFormState();
    setStatus("");
  }

  function assignFiles(input, files) {
    if (!window.DataTransfer) {
      return false;
    }

    var transfer = new DataTransfer();
    Array.prototype.forEach.call(files || [], function (file) {
      transfer.items.add(file);
    });
    input.files = transfer.files;
    return true;
  }

  function swapFiles() {
    if (!originalInput.files.length && !modifiedInput.files.length) {
      setStatus("Choose one or more documents before trying to swap them.", "error");
      return;
    }

    var originalFiles = Array.prototype.slice.call(originalInput.files || []);
    var modifiedFiles = Array.prototype.slice.call(modifiedInput.files || []);

    if (!assignFiles(originalInput, modifiedFiles) || !assignFiles(modifiedInput, originalFiles)) {
      setStatus("Your browser does not support swapping selected files automatically.", "error");
      return;
    }

    updateFormState();
    setStatus("Original and modified documents were swapped.", "success");
  }

  async function submitComparison(event) {
    event.preventDefault();

    var originalFile = originalInput.files[0];
    var modifiedFile = modifiedInput.files[0];

    if (!originalFile || !modifiedFile) {
      setStatus("Choose both an original and a modified document before continuing.", "error");
      updateFormState();
      return;
    }

    submitButton.disabled = true;
    resetButton.disabled = true;
    setStatus("Uploading documents and starting the comparison...");

    try {
      var formData = new FormData();
      formData.append("file1", originalFile);
      formData.append("file2", modifiedFile);

      // We use the UICompare endpoint because it returns the comparison resource URL in
      // the Location header. The raw /api/comparison endpoint is reserved for deltaview.js.
      var response = await fetch(compareEndpoint, {
        method: "POST",
        body: formData,
        credentials: "same-origin"
      });

      if (!response.ok) {
        throw new Error("The compare request was not accepted. HTTP " + response.status + ".");
      }

      var comparisonUrl = response.headers.get("Location") || response.headers.get("location");

      if (!comparisonUrl) {
        throw new Error("The comparison started, but the server did not return a Location header.");
      }

      setStatus("Comparison created. Opening viewer...", "success");

      var targetUrl =
        "/CustomerViewer/viewer.html?comparisonUrl=" +
        encodeURIComponent(comparisonUrl);

      window.location.assign(targetUrl);
    } catch (error) {
      setStatus(
        "We could not start the comparison. " +
          (error && error.message ? error.message : "Please try again."),
        "error"
      );
      submitButton.disabled = !(originalInput.files.length && modifiedInput.files.length);
      resetButton.disabled = false;
    }
  }

  originalInput.addEventListener("change", updateFormState);
  modifiedInput.addEventListener("change", updateFormState);
  resetButton.addEventListener("click", resetForm);
  swapButton.addEventListener("click", swapFiles);
  form.addEventListener("submit", submitComparison);

  updateFormState();
  setStatus("");
})();
