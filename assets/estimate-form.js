(() => {
  const form = document.getElementById('estimate-form');
  if (!form) return;
  const steps = [...form.querySelectorAll('.form-step')];
  const nextButton = document.getElementById('next-button');
  const backButton = document.getElementById('back-button');
  const submitButton = document.getElementById('submit-button');
  const stepLabel = document.getElementById('step-label');
  const stepName = document.getElementById('step-name');
  const progressFill = document.getElementById('progress-fill');
  const errorBox = document.getElementById('form-error');
  const setupNotice = document.getElementById('form-setup-notice');
  const photoInput = document.getElementById('project-photo');
  const endpoint = form.dataset.endpoint.trim();
  let currentStep = 0;
  let formStarted = false;
  let submitting = false;
  const stepNames = ['Contact information', 'Project address', 'Service details', 'Scheduling preferences'];
  const track = (name, params = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, { ...params, form_location: 'request_estimate_page', transport_type: 'beacon' });
  };
  const showError = message => { errorBox.textContent = message; errorBox.hidden = false; errorBox.focus(); };
  const clearError = () => { errorBox.hidden = true; errorBox.textContent = ''; };
  const render = () => {
    steps.forEach((step, index) => step.classList.toggle('active', index === currentStep));
    stepLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    stepName.textContent = stepNames[currentStep];
    progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    backButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    clearError();
  };
  const validateStep = () => {
    for (const field of steps[currentStep].querySelectorAll('input,select,textarea')) {
      if (!field.checkValidity()) { field.reportValidity(); return false; }
    }
    if (currentStep === 3 && !form.querySelector('input[name="preferred_time"]:checked')) {
      showError('Please select at least one preferred time of day.');
      form.querySelector('input[name="preferred_time"]')?.focus();
      return false;
    }
    return true;
  };
  const setAttribution = () => {
    const params = new URLSearchParams(window.location.search);
    form.elements.landing_page.value = window.location.href;
    form.elements.referrer.value = document.referrer;
    form.elements.submitted_at.value = new Date().toISOString();
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid'].forEach(key => {
      form.elements[key].value = params.get(key) || sessionStorage.getItem(`rp_${key}`) || '';
      if (params.get(key)) sessionStorage.setItem(`rp_${key}`, params.get(key));
    });
  };
  const preparePhoto = async () => {
    const file = photoInput.files[0];
    if (!file) return true;
    const allowed = ['image/jpeg','image/png','image/heic','image/heif','image/webp'];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      showError('Please choose one JPG, PNG, HEIC or WebP image no larger than 5 MB.');
      return false;
    }
    const encoded = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    form.elements.photo_data.value = encoded;
    form.elements.photo_name.value = file.name.slice(0, 120);
    form.elements.photo_type.value = file.type;
    return true;
  };
  form.addEventListener('input', () => {
    if (!formStarted) { formStarted = true; track('form_start'); }
  }, { once: true });
  nextButton.addEventListener('click', () => {
    clearError();
    if (!validateStep()) return;
    track('form_step', { step_number: currentStep + 1, step_name: stepNames[currentStep] });
    currentStep += 1;
    render();
  });
  backButton.addEventListener('click', () => { currentStep = Math.max(0, currentStep - 1); render(); });
  form.addEventListener('submit', async submitEvent => {
    submitEvent.preventDefault();
    clearError();
    if (submitting || !validateStep()) return;
    if (!endpoint) {
      setupNotice.hidden = false;
      showError('The new form is not connected yet. Please call us or use the secure backup form.');
      return;
    }
    if (!(await preparePhoto())) return;
    setAttribution();
    sessionStorage.setItem('rp_estimate_pending', '1');
    sessionStorage.setItem('rp_service_type', form.elements.service_type.value);
    sessionStorage.setItem('rp_project_type', form.elements.project_type.value);
    submitting = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending…';
    form.action = endpoint;
    form.target = '_self';
    form.submit();
  });
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  const minDate = today.toISOString().slice(0, 10);
  form.querySelectorAll('input[type="date"]').forEach(input => input.min = minDate);
  const returnedError = new URLSearchParams(window.location.search).get('form_error');
  if (returnedError) showError(returnedError);
  setAttribution();
  render();
})();