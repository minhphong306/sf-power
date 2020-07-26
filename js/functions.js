function sfCopyToClipboard(str) {
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
}

function sfLog(str) {
    console.log(`[SF Power] ${str}`)
}

function sfBootstrapUrl() {
    return `${window.location.origin}/api/bootstrap/${window.location.hostname}.json`
}

function sfProductUrl(handle) {
    return `${window.location.origin}/api/catalog/product.json?handle=${handle}`;
}

function sfCollectionUrl(handle) {
    return `${window.location.origin}/api/catalog/collections_v2.json?handles=${handle}`;
}

function sfParseBootstrap(bootstrap) {
    if (bootstrap && bootstrap.result) {
        return bootstrap.result;
    }

    return {
        shop_id: 0,
        platform_domain: ''
    }
}

function sfNotify(title, text, type) {
    PNotify.removeAll();
    var item = new PNotify({
        title: title,
        text: text,
        type: type,
    })

    setTimeout(function () {
        PNotify.removeAll();
    }, 2000)
}

function dragElement(elmnt, isDragging) {
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
}

function sfGetStorage(key, usingPrefix = true) {
    if (usingPrefix) {
        key = `sfpower-${key}`
    }

    return localStorage.getItem(key);
}

function sfGetStorage(key, value, usingPrefix = true) {
    if (usingPrefix) {
        key = `sfpower-${key}`
    }

    localStorage.setItem(key, value)
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
