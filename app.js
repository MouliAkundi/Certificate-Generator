/*
 * GitHub Pages front end.
 *
 * The page does NOT store logo files.
 * It asks the Apps Script Web App for:
 *   - college title
 *   - affiliation
 *   - commissionerate title
 *   - certificate types from Templates
 *   - logo images read by Apps Script from the Drive IDs in Config
 *
 * Put your deployed Apps Script /exec URL below.
 */
const APPS_SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';

const $ = id => document.getElementById(id);
const form = $('certificateForm');
const typeSelect = $('certificateType');
const generateBtn = $('generateBtn');
const clearBtn = $('clearBtn');
const transport = $('submitTransport');
const payload = $('payload');
const statusBox = document.querySelector('.header-status');

function status(text, state='') {
  $('status').textContent = text;
  statusBox.dataset.state = state;
}

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}

function applyBootstrap(data) {
  $('collegeTitle').textContent = data.collegeTitle || 'Government Degree College, Vizianagaram';
  $('affiliation').textContent = data.affiliation || '';
  $('commissionerate').textContent = data.commissionerateTitle || '';
  $('footerCollege').textContent = data.collegeTitle || 'Government Degree College, Vizianagaram';

  if (data.logoLeft) {
    $('logoLeft').src = `data:${data.logoLeft.mime};base64,${data.logoLeft.base64}`;
  }
  if (data.logoRight) {
    $('logoRight').src = `data:${data.logoRight.mime};base64,${data.logoRight.base64}`;
  }

  typeSelect.innerHTML = '<option value="">Select certificate type</option>';
  (data.certificateTypes || []).forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });

  status('Ready', 'ready');
}

function loadBootstrap() {
  if (APPS_SCRIPT_URL.includes('PASTE_YOUR')) {
    status('Setup required', 'error');
    typeSelect.innerHTML = '<option value="">Apps Script URL required</option>';
    return;
  }

  const callback = 'gdcBootstrap_' + Date.now() + '_' + Math.floor(Math.random()*100000);

  window[callback] = result => {
    try {
      if (!result || !result.ok) throw new Error(result?.message || 'Unable to load configuration.');
      applyBootstrap(result);
    } catch (err) {
      status('Connection error', 'error');
      alert('Unable to load the certificate configuration.\n\n' + err.message);
    } finally {
      delete window[callback];
      script.remove();
    }
  };

  const script = document.createElement('script');
  script.src = APPS_SCRIPT_URL +
    '?action=bootstrap&callback=' + encodeURIComponent(callback) +
    '&t=' + Date.now();

  script.onerror = () => {
    delete window[callback];
    script.remove();
    status('Connection error', 'error');
    alert('Unable to connect to the certificate service. Please check the Apps Script Web App deployment.');
  };

  document.head.appendChild(script);
}

form.addEventListener('submit', e => {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (APPS_SCRIPT_URL.includes('PASTE_YOUR')) {
    alert('Please enter the deployed Apps Script Web App /exec URL in app.js.');
    return;
  }

  const data = {
    certificateType: $('certificateType').value.trim(),
    name: $('name').value.trim(),
    email: $('email').value.trim(),
    designation: $('designation').value.trim(),
    event: $('event').value.trim(),
    date: $('date').value,
    achievement: $('achievement').value.trim()
  };

  generateBtn.disabled = true;
  clearBtn.disabled = true;
  status('Generating…', 'busy');

  payload.value = JSON.stringify(data);
  transport.action = APPS_SCRIPT_URL;
  transport.submit();
});

window.addEventListener('message', e => {
  if (!e.data || e.data.source !== 'gdc-certificate-generator') return;

  generateBtn.disabled = false;
  clearBtn.disabled = false;

  if (e.data.ok) {
    status('Certificate sent', 'ready');
    alert(
      'Certificate generated and sent successfully.\n\n' +
      'Certificate No.: ' + e.data.certificateNo + '\n' +
      'Email: ' + e.data.email
    );
    form.reset();
    $('date').value = today();
  } else {
    status('Generation failed', 'error');
    alert('Certificate generation failed.\n\n' + (e.data.message || 'Unknown error.'));
  }
});

clearBtn.addEventListener('click', () => {
  form.reset();
  $('date').value = today();
  status('Ready', 'ready');
});

$('date').value = today();
loadBootstrap();
