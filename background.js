const TABS = new Map();

function getDomainName(hostname) {
    //TODO: replace this function with tldjs
    return hostname.substring(hostname.lastIndexOf(".", hostname.lastIndexOf(".") - 1) + 1);
}

browser.webRequest.onBeforeRequest.addListener((details) => {
    const {type, url, tabId} = details;

    const parsedURL = new URL(url);
    if (type === 'main_frame') {
        TABS[tabId] = getDomainName(parsedURL.host);
        return {};
    }

    parsedURL.searchParams.append('cookie_isolation_poc_domain', TABS[tabId]);
    return {
        redirectUrl: parsedURL.toString(),
    };
}, {urls: ['<all_urls>'], types: ['main_frame', 'sub_frame']}, ["blocking"]);

const onBeforeSendHeadersOptions = ['blocking', 'requestHeaders'];
if (browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS) {
    onBeforeSendHeadersOptions.push(browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS);
}
browser.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        const {tabId, requestHeaders} = details;
        const re = new RegExp(`${TABS[tabId]}_`, 'g');

        for (let i = 0; i < requestHeaders.length; i++) {
            if (requestHeaders[i].name.toLowerCase() === 'cookie') {
                const cookies = requestHeaders[i].value.split(';').filter((cookie) => {
                    return cookie.trim().startsWith(TABS[tabId]);
                });
                requestHeaders[i].value = cookies.join('; ').replace(re, '');
                break;
            }
        }
        return {requestHeaders: requestHeaders};
    },
    {urls: ['<all_urls>']},
    onBeforeSendHeadersOptions
);


const onHeadersReceivedOptions = ['blocking', 'responseHeaders'];
if (browser.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS) {
    onHeadersReceivedOptions.push(browser.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS);
}
browser.webRequest.onHeadersReceived.addListener(
    (details) => {
        const {tabId, responseHeaders} = details;
        const host = TABS[tabId];

        for (let i = 0; i < responseHeaders.length; i++) {
            if (responseHeaders[i].name.toLowerCase() === 'set-cookie') {
                // Firefox BUG: If server sends 2 Set-Cookie headers their values are combined here with \n as delimiter
                responseHeaders[i].value = responseHeaders[i].value.split('\n').map((v) => {
                    const cookieName = v.split('=')[0].trim();
                    return v.replace(cookieName, `${host}_${cookieName}`);
                }).join('\n');
            }
        }

        return {responseHeaders: responseHeaders};
    },
    {urls: ['<all_urls>']},
    onHeadersReceivedOptions
);

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    sendResponse(TABS[sender.tab.id]);
});
