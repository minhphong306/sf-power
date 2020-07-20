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
    }
}

const storage = {
    get: (e) => {
        let key = `sfpower-${e}`;
        return localStorage.getItem(key);
    },
    set: (e, value) => {
        let key = `sfpower-${e}`;
        localStorage.setItem(key, value)
    }, getOrigin: (e) => {
        return localStorage.getItem(e);
    }, setOrigin: (k, v) => {
        localStorage.setItem(k, v)
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
        console.log(error);
    }
}
