(() => {
  const GA_MEASUREMENT_ID = '';
  const STORAGE_KEY = 'lupi-consent';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500,
  });

  const readConsent = () => {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  };

  const writeConsent = (value) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Consent still applies for this page even if storage is unavailable.
    }
  };

  const updateAnalyticsConsent = (value) => {
    window.gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: value === 'accepted' ? 'granted' : 'denied',
    });
    if (value === 'accepted') loadAnalytics();
  };

  const loadAnalytics = () => {
    if (!GA_MEASUREMENT_ID || document.querySelector('script[data-lupi-ga]')) return;
    const script = document.createElement('script');
    script.async = true;
    script.dataset.lupiGa = 'true';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    document.head.appendChild(script);
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  };

  const bannerMarkup = `
    <div id="consent-banner" class="fixed inset-x-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 w-auto max-w-3xl bg-white shadow-2xl border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center md:gap-5 text-sm text-slate-700 z-50" role="dialog" aria-live="polite" aria-label="Analytics preferences">
      <div class="flex-1">
        <p class="font-semibold text-slate-900">Cookies &amp; Privacy</p>
        <p class="mt-1 text-slate-600">We use optional analytics to understand which pages help authors. You can accept or reject analytics cookies.</p>
        <a href="/privacy.html" class="inline-block mt-2 text-xs font-semibold text-lupi underline underline-offset-2">Read the privacy policy</a>
      </div>
      <div class="flex gap-2 mt-4 md:mt-0">
        <button type="button" data-consent="rejected" class="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:border-slate-400">Reject</button>
        <button type="button" data-consent="accepted" class="px-4 py-2 rounded-lg bg-lupi text-white text-sm font-semibold shadow hover:opacity-90">Accept</button>
      </div>
    </div>`;

  const showConsentBanner = () => {
    if (document.getElementById('consent-banner')) return;
    document.body.insertAdjacentHTML('beforeend', bannerMarkup);
    document.getElementById('consent-banner')?.querySelectorAll('[data-consent]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.consent;
        writeConsent(value);
        updateAnalyticsConsent(value);
        document.getElementById('consent-banner')?.remove();
      });
    });
  };

  window.openLupiPrivacySettings = () => {
    document.getElementById('consent-banner')?.remove();
    showConsentBanner();
  };

  const storedConsent = navigator.globalPrivacyControl === true ? 'rejected' : readConsent();
  if (storedConsent) {
    updateAnalyticsConsent(storedConsent);
  } else {
    window.addEventListener('DOMContentLoaded', showConsentBanner, { once: true });
  }
  if (storedConsent === 'accepted') loadAnalytics();

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.href;
    let eventName = '';
    if (href.includes('17hats.com')) eventName = 'book_meeting_click';
    else if (href.includes('jotform.com')) eventName = 'boost_book_click';
    else if (href.startsWith('mailto:')) eventName = 'email_click';
    else if (href.startsWith('tel:')) eventName = 'phone_click';
    if (!eventName || navigator.globalPrivacyControl === true || readConsent() !== 'accepted') return;
    window.gtag('event', eventName, {
      link_url: href,
      link_text: link.textContent.trim(),
      page_location: window.location.href,
    });
  });
})();
