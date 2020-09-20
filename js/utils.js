const utils = {
    listenAjaxComplete: () => {
        var s = document.createElement('script')
// TODO: add "script.js" to web_accessible_resources in manifest.json
        s.src = chrome.extension.getURL('js/tuto.js')
        s.onload = function () {
            this.remove()
        };
        (document.head || document.documentElement).appendChild(s)
    },
    copyToClipboard: (str) => {
        const el = document.createElement('textarea')
        el.value = str
        el.setAttribute('readonly', '')
        el.style.position = 'absolute'
        el.style.left = '-9999px'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        utils.show_notify('Copied', 'Copied to clipboard');
    }, sflog: (str) => {
        console.log(`[SF Power] ${str}`)
    }, getBootstrapUrl: () => {
        return `${window.location.origin}/api/bootstrap/${window.location.hostname}.json`
    }, getProductSingleUrl: (handle) => {
        return `${window.location.origin}/api/catalog/product.json?handle=${handle}`;
    }, getCollectionSingleUrl: (handle) => {
        return `${window.location.origin}/api/catalog/collections_v2.json?handles=${handle}`;
    }, getPageSingleUrl: (handle) => {
        return `${window.location.origin}/api/pages.json?handle=${handle}`;
    }, parseBootstrap: (bootstrap) => {
        if (bootstrap && bootstrap.result) {
            return bootstrap.result;
        }

        return {
            shop_id: 0,
            platform_domain: ''
        }
    }, show_notify(title, text, type) {
        PNotify.removeAll();
        var item = new PNotify({
            title: title,
            text: text,
            type: type,
        })

        setTimeout(function () {
            PNotify.removeAll();
        }, 2000)
    }, show_multiple_notify(title, text, type) {
        (new PNotify({
            title: title,
            text: text,
            type: type,
            animateSpeed: 'fast'
        }))
    }, getAjax: (url) => {
        let request = new XMLHttpRequest();
        let data;
        request.open('GET', url, true);

        request.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                utils.sflog('OK')
                data = this.response;
            } else {
                utils.sflog(`Error: ${this.response}`)
            }
        };

        request.onerror = function () {
            utils.sflog(`Error when fetch url: ${url}`)
        };

        request.send();
        return data
    }, dragElement(elmnt, isDragging) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (document.getElementById(elmnt.id + "header")) {
            // if present, the header is where you move the DIV from:
            document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
        } else {
            // otherwise, move the DIV from anywhere inside the DIV:
            elmnt.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            isDragging = true
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.onmouseup = null;
            document.onmousemove = null;
        }
    },
    parseJSON(raw, sourceCall) {
        if (!(typeof raw === 'string' || raw instanceof String)) {
            return raw;
        }

        try {
            const parsed = JSON.parse(raw);
            return parsed;
        } catch {
            return ""
        }
    }, getAppendedUrl(key, value) {
        if (document.location.search === "") {
            return `${window.location.origin}${window.location.pathname}?${key}=${value}`;
        }

        key = encodeURIComponent(key);
        value = encodeURIComponent(value);

        // kvp looks like ['key1=value1', 'key2=value2', ...]
        var kvp = document.location.search.substr(1).split('&');


        let i = 0;

        for (; i < kvp.length; i++) {
            if (kvp[i].startsWith(key + '=')) {
                let pair = kvp[i].split('=');
                pair[1] = value;
                kvp[i] = pair.join('=');
                break;
            }
        }

        if (i >= kvp.length) {
            kvp[kvp.length] = [key, value].join('=');
        }

        // can return this or...
        let params = kvp.join('&');

        // reload page with new params
        return `${window.location.origin}${window.location.pathname}${params}`;
    }, removeDoubleQuote(input) {
        const regex = /"/gi
        return input.replace(regex, '')
    }
}

const storage = {
    get: (key, prefix = true) => {
        if (prefix) {
            key = `sfpower-${key}`;
        }
        return localStorage.getItem(key);
    },
    set: (key, value, prefix = true) => {
        if (prefix) {
            key = `sfpower-${key}`;
        }
        localStorage.setItem(key, value)
    },
    remove: (key, prefix = true) => {
        if (prefix) {
            key = `sfpower-${key}`;
        }
        localStorage.removeItem(key);
    }
}

async function doAjax(url) {
    let result;

    try {
        result = await $.ajax({
            url: url,
        });
        return result;
    } catch (error) {
        console.log("error: ", error);
    }
}
