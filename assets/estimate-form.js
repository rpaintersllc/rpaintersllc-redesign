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
  const photoList = document.getElementById('photo-list');
  const endpoint = form.dataset.endpoint.trim();
  const stepNames = ['Contact information', 'Project address', 'Project details', 'Scheduling preferences'];
  let currentStep = 0;
  let formStarted = false;
  let submitting = false;

  const track = (name, params = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, { ...params, form_location: 'request_estimate_page', transport_type: 'beacon' });
  };
  const showError = message => {
    errorBox.textContent = message;
    errorBox.hidden = false;
    errorBox.setAttribute('tabindex', '-1');
    errorBox.focus();
  };
  const clearError = () => { errorBox.hidden = true; errorBox.textContent = ''; };
  const selectedServices = () => [...form.querySelectorAll('input[name="service_type"]:checked')].map(input => input.value);

  const render = () => {
    currentStep = Math.min(Math.max(currentStep, 0), steps.length - 1);
    steps.forEach((step, index) => step.classList.toggle('active', index === currentStep));
    stepLabel.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    stepName.textContent = stepNames[currentStep];
    progressFill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
    backButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    clearError();
    if (currentStep > 0) document.querySelector('.estimate-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateConditionals = () => {
    const active = new Set([...form.querySelectorAll('[data-service]:checked')].map(input => input.dataset.service));
    form.querySelectorAll('[data-conditional]').forEach(section => {
      const visible = section.dataset.conditional.split(/\s+/).some(key => active.has(key));
      section.hidden = !visible;
      section.querySelectorAll('input, textarea, select').forEach(field => {
        field.disabled = !visible;
        if (field.matches('textarea, input') && field.name !== 'cabinet_condition') field.required = visible;
      });
    });
  };

  const validateStep = () => {
    clearError();
    if (!steps[currentStep]) {
      currentStep = steps.length - 1;
      render();
      return false;
    }
    if (currentStep === 2 && selectedServices().length === 0) {
      showError('Please select at least one service requested.');
      form.querySelector('input[name="service_type"]')?.focus();
      return false;
    }
    for (const field of steps[currentStep].querySelectorAll('input,select,textarea')) {
      if (!field.disabled && !field.checkValidity()) { field.reportValidity(); return false; }
    }
    return true;
  };

  const setAttribution = () => {
    const params = new URLSearchParams(window.location.search);
    form.elements.landing_page.value = sessionStorage.getItem('rp_landing_page') || window.location.href;
    form.elements.referrer.value = sessionStorage.getItem('rp_referrer') || document.referrer;
    form.elements.submitted_at.value = new Date().toISOString();
    if (!sessionStorage.getItem('rp_landing_page')) sessionStorage.setItem('rp_landing_page', window.location.href);
    if (!sessionStorage.getItem('rp_referrer') && document.referrer) sessionStorage.setItem('rp_referrer', document.referrer);
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid'].forEach(key => {
      const value = params.get(key) || sessionStorage.getItem(`rp_${key}`) || '';
      form.elements[key].value = value;
      if (params.get(key)) sessionStorage.setItem(`rp_${key}`, params.get(key));
    });
  };

  const preparePhotos = async () => {
    const files = [...photoInput.files];
    const allowed = ['image/jpeg','image/png','image/heic','image/heif','image/webp'];
    if (files.length > 3) { showError('Please choose no more than three project photos.'); return false; }
    for (const file of files) {
      if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
        showError('Each photo must be a JPG, PNG, HEIC or WebP image no larger than 5 MB.');
        return false;
      }
    }
    const manifest = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name.slice(0, 120), type: file.type, data: String(reader.result).split(',')[1] || '' });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    form.elements.photo_manifest.value = JSON.stringify(manifest);
    return true;
  };

  photoInput.addEventListener('change', () => {
    const files = [...photoInput.files];
    photoList.textContent = files.length ? `${files.length} photo${files.length === 1 ? '' : 's'} selected: ${files.map(file => file.name).join(', ')}` : '';
  });
  form.addEventListener('change', event => { if (event.target.matches('[data-service]')) updateConditionals(); });
  form.addEventListener('input', () => { if (!formStarted) { formStarted = true; track('form_start'); } }, { once: true });
  nextButton.addEventListener('click', () => {
    if (currentStep >= steps.length - 1) return;
    if (!validateStep()) return;
    track('form_step', { step_number: currentStep + 1, step_name: stepNames[currentStep] });
    currentStep += 1;
    render();
  });
  backButton.addEventListener('click', () => { currentStep = Math.max(0, Math.min(currentStep, steps.length - 1) - 1); render(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !validateStep()) return;
    if (!endpoint) {
      setupNotice.hidden = false;
      showError('The new form is not connected yet. Please call us or use the secure backup form.');
      return;
    }
    if (!(await preparePhotos())) return;
    setAttribution();
    sessionStorage.setItem('rp_estimate_pending', '1');
    sessionStorage.setItem('rp_service_type', selectedServices().join(', '));
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
  form.querySelectorAll('input[type="date"]').forEach(input => input.min = today.toISOString().slice(0, 10));
  const returnedError = new URLSearchParams(window.location.search).get('form_error');
  if (returnedError) showError(returnedError);
  updateConditionals();
  setAttribution();
  render();
})();
