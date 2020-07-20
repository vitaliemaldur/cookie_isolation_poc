
function overwrites(host) {
    const __coookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')

    Object.defineProperty(document, 'cookie', {
        get() {
            const re = new RegExp(`${host}_`, 'g');
            const cookieList = __coookieDesc.get.call(document).split(';');
            const filteredCookies = cookieList.filter((cookie) => {
                return cookie.trim().startsWith(host);
            });
            return filteredCookies.join(';').replace(re, '');
        },
        set(cookieString) {
            const cookieName = cookieString.trim().split('=')[0];
            const re = new RegExp(cookieName, 'g');
            const value = cookieString.replace(re, `${host}_${cookieName}`)
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

try {
    insertCode(window.top.location.host);
} catch (e) {
    browser.runtime.sendMessage('host').then((host) => {
        insertCode(host);
    });
}
