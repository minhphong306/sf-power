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
    }, sflog: (str) => {
        console.log(`[SF Power] ${str}`)
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
    }
}

const storage = {
    get: e => (
        e = 'bktool-' + e,
            new Promise((t, o) => {
                try {
                    chrome.storage.local.get(e, function (o) {
                        t(o[e])
                    })
                } catch (e) {
                    o(e)
                }
            })),
    set: (e, t) => {
        let o = {}
        o[e = 'bktool-' + e] = t, chrome.storage.local.set(o)
    }
}
