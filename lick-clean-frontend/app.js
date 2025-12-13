// === CONFIG ===
const API_BASE_URL = 'https://kvt0yw8wg6.execute-api.ap-south-1.amazonaws.com/prod'; 

// === DOM ELEMENTS ===
const reportForm = document.getElementById('reportForm');
const statusEl = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');
const quoteEl = document.getElementById('quoteText');
document.getElementById('year').textContent = new Date().getFullYear();

// Waste-related quotes for the banner
const WASTE_QUOTES = [
  '"A clean city starts with a single report."',
  '"Waste on the street is a problem. Reporting it is a solution."',
  '"Don\'t walk past the mess. Report it and help clean your city."',
  '"Every report is a step towards a greener tomorrow."',
  '"City pride begins with clean streets."',
];

if (quoteEl) {
  let idx = Math.floor(Math.random() * WASTE_QUOTES.length);
  quoteEl.textContent = WASTE_QUOTES[idx];
  setInterval(() => {
    idx = (idx + 1) % WASTE_QUOTES.length;
    quoteEl.textContent = WASTE_QUOTES[idx];
  }, 7000);
}

function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status status-${type}`;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? 'Submitting...' : 'Submit Report';
}

// --- API helper functions ---

async function getUploadUrl(file) {
  const payload = {
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
  };

  const res = await fetch(`${API_BASE_URL}/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get upload URL: ${res.status} ${text}`);
  }

  return res.json(); // { uploadUrl, fileKey }
}

async function uploadFileToS3(uploadUrl, file) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload to S3 failed: ${res.status} ${text}`);
  }
}

async function createReport(reportData) {
  const res = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create report: ${res.status} ${text}`);
  }

  return res.json(); // { reportId, message }
}

// --- Form submit handler ---

reportForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('');
  setLoading(true);

  try {
    const formData = new FormData(reportForm);
    const file = formData.get('photo');

    if (!file || file.size === 0) {
      throw new Error('Please select a photo or video to upload.');
    }

    const city = formData.get('city')?.trim();
    const area = formData.get('area')?.trim();
    const description = formData.get('description')?.trim();
    const wasteType = formData.get('wasteType');
    const urgency = formData.get('urgency');

    if (!city || !area || !description || !wasteType || !urgency) {
      throw new Error('Please fill in all required fields.');
    }

    setStatus('Requesting upload URL...', 'info');

    // 1. Get S3 pre-signed URL
    const { uploadUrl, fileKey } = await getUploadUrl(file);

    setStatus('Uploading file to secure storage...', 'info');

    // 2. Upload file directly to S3
    await uploadFileToS3(uploadUrl, file);

    setStatus('Saving report...', 'info');

    // 3. Send report metadata to backend
    const lat = formData.get('lat');
    const lng = formData.get('lng');
    const contactEmail = formData.get('contactEmail')?.trim();
    const contactPhone = formData.get('contactPhone')?.trim();

    const reportPayload = {
      city,
      area,
      description,
      wasteType,
      urgency,
      photoKey: fileKey,
      ...(lat ? { lat: Number(lat) } : {}),
      ...(lng ? { lng: Number(lng) } : {}),
      ...(contactEmail ? { contactEmail } : {}),
      ...(contactPhone ? { contactPhone } : {}),
      source: 'web',
    };

    const result = await createReport(reportPayload);

    setStatus(
      `Report submitted successfully! Your report ID is ${result.reportId || 'N/A'}.`,
      'success'
    );
    reportForm.reset();
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Something went wrong while submitting the report.', 'error');
  } finally {
    setLoading(false);
  }
});
