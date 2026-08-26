/*
 * GitHub Pages front end for the GDC Vizianagaram Certificate Generator.
 *
 * Apps Script provides:
 *   - institutional information
 *   - certificate types
 *   - logo images
 *
 * Certificate submission is performed through a hidden iframe.
 * The iframe load event is used as a reliable completion fallback.
 */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbytfAjgTMsimM5VdzlsYqxnVQ4ZybeadBk5vfoxO7ibkkkiWDwHqcQN99sGGm4dOeiuFA/exec';

const $ = id => document.getElementById(id);

const form = $('certificateForm');
const typeSelect = $('certificateType');
const generateBtn = $('generateBtn');
const clearBtn = $('clearBtn');

const transport = $('submitTransport');
const payload = $('payload');
const submitFrame = $('submitFrame');

const statusBox = document.querySelector('.header-status');

let submissionInProgress = false;
let submissionCompleted = false;

function status(text, state = '') {
  $('status').textContent = text;
  statusBox.dataset.state = state;
}

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/* ---------------------------------------------------------
   BOOTSTRAP
--------------------------------------------------------- */

function applyBootstrap(data) {

  $('collegeTitle').textContent =
    data.collegeTitle ||
    'Government Degree College, Vizianagaram';

  $('affiliation').textContent =
    data.affiliation || '';

  $('commissionerate').textContent =
    data.commissionerateTitle || '';

  $('footerCollege').textContent =
    data.collegeTitle ||
    'Government Degree College, Vizianagaram';

  if (data.logoLeft) {
    $('logoLeft').src =
      `data:${data.logoLeft.mime};base64,${data.logoLeft.base64}`;
  }

  if (data.logoRight) {
    $('logoRight').src =
      `data:${data.logoRight.mime};base64,${data.logoRight.base64}`;
  }

  typeSelect.innerHTML =
    '<option value="">Select certificate type</option>';

  (data.certificateTypes || []).forEach(type => {

    const option = document.createElement('option');

    option.value = type;
    option.textContent = type;

    typeSelect.appendChild(option);
  });

  status('Ready', 'ready');
}

function loadBootstrap() {

  /*
   * Do NOT put the actual Apps Script URL inside this test.
   * The test is only intended to detect an unconfigured placeholder.
   */
  if (APPS_SCRIPT_URL.includes('PASTE_YOUR')) {

    status('Setup required', 'error');

    typeSelect.innerHTML =
      '<option value="">Apps Script URL required</option>';

    return;
  }

  const callback =
    'gdcBootstrap_' +
    Date.now() +
    '_' +
    Math.floor(Math.random() * 100000);

  let script = null;

  window[callback] = result => {

    try {

      if (!result || !result.ok) {
        throw new Error(
          result?.message ||
          'Unable to load configuration.'
        );
      }

      applyBootstrap(result);

    } catch (err) {

      status('Connection error', 'error');

      alert(
        'Unable to load the certificate configuration.\n\n' +
        err.message
      );

    } finally {

      delete window[callback];

      if (script) {
        script.remove();
      }
    }
  };

  script = document.createElement('script');

  script.src =
    APPS_SCRIPT_URL +
    '?action=bootstrap' +
    '&callback=' +
    encodeURIComponent(callback) +
    '&t=' +
    Date.now();

  script.onerror = () => {

    delete window[callback];

    if (script) {
      script.remove();
    }

    status('Connection error', 'error');

    alert(
      'Unable to connect to the certificate service.\n\n' +
      'Please check the Apps Script Web App deployment.'
    );
  };

  document.head.appendChild(script);
}

/* ---------------------------------------------------------
   COMPLETION HANDLER
--------------------------------------------------------- */

function finishSubmissionSuccess() {

  if (!submissionInProgress || submissionCompleted) {
    return;
  }

  submissionCompleted = true;
  submissionInProgress = false;

  generateBtn.disabled = false;
  clearBtn.disabled = false;

  status('Certificate sent', 'ready');

  alert(
    'Certificate generated and sent successfully.'
  );

  form.reset();

  $('date').value = today();
}

/* ---------------------------------------------------------
   HIDDEN IFRAME FALLBACK
--------------------------------------------------------- */

/*
 * This fires when the Apps Script doPost() response has loaded
 * into the hidden iframe.
 *
 * Since doPost() only returns after certificate generation and
 * email sending are complete, this is a reliable completion
 * signal even if postMessage is not received.
 */
submitFrame.addEventListener('load', () => {

  if (!submissionInProgress || submissionCompleted) {
    return;
  }

  finishSubmissionSuccess();
});

/* ---------------------------------------------------------
   FORM SUBMISSION
--------------------------------------------------------- */

form.addEventListener('submit', e => {

  e.preventDefault();

  if (!form.checkValidity()) {

    form.reportValidity();

    return;
  }

  if (APPS_SCRIPT_URL.includes('PASTE_YOUR')) {

    alert(
      'Please enter the deployed Apps Script Web App /exec URL in app.js.'
    );

    return;
  }

  const data = {

    certificateType:
      $('certificateType').value.trim(),

    name:
      $('name').value.trim(),

    email:
      $('email').value.trim(),

    designation:
      $('designation').value.trim(),

    event:
      $('event').value.trim(),

    date:
      $('date').value,

    achievement:
      $('achievement').value.trim()
  };

  /*
   * Set these BEFORE submitting the iframe form.
   * Otherwise the iframe's load event could be ignored.
   */
  submissionInProgress = true;
  submissionCompleted = false;

  generateBtn.disabled = true;
  clearBtn.disabled = true;

  status('Generating…', 'busy');

  payload.value = JSON.stringify(data);

  transport.action = APPS_SCRIPT_URL;

  transport.submit();
});

/* ---------------------------------------------------------
   POSTMESSAGE HANDLER
--------------------------------------------------------- */

/*
 * Keep postMessage as the preferred completion mechanism.
 * The iframe load event above is the fallback.
 */
window.addEventListener('message', e => {

  if (
    !e.data ||
    e.data.source !== 'gdc-certificate-generator'
  ) {
    return;
  }

  if (submissionCompleted) {
    return;
  }

  generateBtn.disabled = false;
  clearBtn.disabled = false;

  submissionInProgress = false;
  submissionCompleted = true;

  if (e.data.ok) {

    status('Certificate sent', 'ready');

    alert(
      'Certificate generated and sent successfully.\n\n' +
      'Certificate No.: ' +
      (e.data.certificateNo || '') +
      '\nEmail: ' +
      (e.data.email || '')
    );

    form.reset();

    $('date').value = today();

  } else {

    status('Generation failed', 'error');

    alert(
      'Certificate generation failed.\n\n' +
      (e.data.message || 'Unknown error.')
    );
  }
});

/* ---------------------------------------------------------
   CLEAR
--------------------------------------------------------- */

clearBtn.addEventListener('click', () => {

  form.reset();

  $('date').value = today();

  status('Ready', 'ready');
});

/* ---------------------------------------------------------
   INITIALIZE
--------------------------------------------------------- */

$('date').value = today();

loadBootstrap();
