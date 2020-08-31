
function overwrites(host) {
    const __coookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');

    Object.defineProperty(document, 'cookie', {
        get() {
            const re = new RegExp(`${host}##`, 'g');
            const cookieList = __coookieDesc.get.call(document).split(';');
            const filteredCookies = cookieList.filter((cookie) => {
                return cookie.trim().startsWith(host);
            });
            return filteredCookies.join(';').replace(re, '').trim();
        },
        set(cookieString) {
            const cookieName = cookieString.split('=')[0].trim();
            const value = cookieString.replace(cookieName, `${host}##${cookieName}`)
            __coookieDesc.set.call(document, value);
        },
        enumerable: true,
        configurable: true
    });
}

function insertCode(host) {
    const s = document.createElement('script');
    s.appendChild(document.createTextNode(`(${overwrites.toString()})("${host}")`));
    // document.head may not be available at this moment, fallback on document.documentElement
    (document.head || document.documentElement).appendChild(s);
}

function getDomainName(hostname) {
    //TODO: replace this function with tldjs
    return hostname.substring(hostname.lastIndexOf(".", hostname.lastIndexOf(".") - 1) + 1);
}

let tabDomain = null;
try {
    tabDomain = getDomainName(window.top.location.host);
} catch (e) {
    const parsedURL = new URL(window.location.href);
    tabDomain = parsedURL.searchParams.get('cookie_isolation_poc_domain');
}

if (tabDomain) {
    const currentWindowDomain = getDomainName(window.location.hostname);
    if (tabDomain !== currentWindowDomain) {
        insertCode(tabDomain);
    }
}
