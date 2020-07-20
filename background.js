const TABS = new Map();

function getDomainName(hostname) {
    //TODO: replace this function with tldjs
    return hostname.substring(hostname.lastIndexOf(".", hostname.lastIndexOf(".") - 1) + 1);
}

browser.webRequest.onBeforeRequest.addListener((details) => {
    const {type, url, tabId} = details;
    if (type === 'main_frame') {
        TABS[tabId] = getDomainName(new URL(url).host);
    }
}, {urls: ['<all_urls>']});


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
    ["blocking", "requestHeaders", browser.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS]
);


browser.webRequest.onHeadersReceived.addListener(
    (details) => {
        const {tabId, responseHeaders} = details;
        const host = TABS[tabId];

        for (let i = 0; i < responseHeaders.length; i++) {
            if (responseHeaders[i].name.toLowerCase() === 'set-cookie') {
                const cookieName = responseHeaders[i].value.trim().split('=')[0];
                const re = new RegExp(cookieName, 'g');
                responseHeaders[i].value = responseHeaders[i].value.replace(re, `${host}_${cookieName}`)
            }
        }

        return {responseHeaders: responseHeaders};
    },
    {urls: ['<all_urls>']},
    ['blocking', 'responseHeaders', browser.webRequest.OnHeadersReceivedOptions.EXTRA_HEADERS]
);

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    sendResponse(TABS[sender.tab.id]);
});
