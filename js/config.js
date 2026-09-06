(function() {
    'use strict';

    // Global Configuration for Ananyamlives Frontend API Calls
    // Automatically uses relative paths when proxied by Netlify or running locally,
    // or allows configuring an explicit production backend URL.
    var customBackendUrl = ''; // e.g. 'https://ananyamlives-backend.onrender.com' if not using Netlify proxies

    var hostname = window.location.hostname;
    var isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    window.API_BASE_URL = window.API_BASE_URL || (customBackendUrl ? customBackendUrl : '');

    console.log('[Ananyamlives Config] API Base URL configured as:', window.API_BASE_URL || '(Relative origin)');
})();
