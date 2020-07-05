'use strict'
var isDebugBarOpen = false
var globalEnv = '';
var isSF = false

const envDev = 'dev', envStag = 'stag', envProd = 'prod';
const prodAPIEndPoint = 'https://api.shopbase.com';
const stagAPIEndPoint = 'https://gapi.stag.shopbase.net';
const devAPIEndPoint = 'https://gapi.dev.shopbase.net';
utils.sflog('Starting')

startApplication();


function startApplication() {
    const {isStoreFront, env} = detectSFStore();
    utils.sflog(`Is SF: ${isStoreFront}, env: ${env}`)

    // if (!isStoreFront) {
    //     utils.sflog('This is not storefront');
    //     isSF = false
    //     return
    // }

    utils.show_notify('Storefront detected.', `Press Ctrl + Alt + X to turn on debug mode`, 'success');
    isSF = true
    addDebugBar(env);
    globalEnv = env;
}

function addDebugBar(env) {
    // Add debug bar
    const debugBar = document.createElement('div')
    debugBar.setAttribute('id', 'sbase-debug-sidebar')
    debugBar.setAttribute('class', 'debug-sidebar')
    document.body.appendChild(debugBar)

    // Add hide bar button
    const hideButton = document.createElement('button')
    hideButton.innerHTML = 'Hide bar'
    hideButton.id = 'bk_hide_bar'
    hideButton.setAttribute('class', 'bkbtn bkthird')
    debugBar.appendChild(hideButton)
    hideButton.onclick = toggleDebugBar

    // Set location to old
    let oldLocation = localStorage.getItem('sbase-debugbar-location')
    if (oldLocation) {
        moveDebugBar(debugBar, oldLocation)
    }

    // Move left - right - up - down
    const moveLeftButton = document.createElement('button')
    moveLeftButton.innerHTML = '←'
    moveLeftButton.id = 'btnMoveLeft'
    moveLeftButton.setAttribute('class', 'bkbtn-mini bkthird')
    moveLeftButton.onclick = function () {
        moveDebugBar(debugBar, 'left');
    };
    debugBar.appendChild(moveLeftButton);

    const moveRightButton = document.createElement('button')
    moveRightButton.innerHTML = '→'
    moveRightButton.id = 'btnMoveRight'
    moveRightButton.setAttribute('class', 'bkbtn-mini bkthird')
    moveRightButton.onclick = function () {
        moveDebugBar(debugBar, 'right');
    };
    debugBar.appendChild(moveRightButton);

    const moveUpButton = document.createElement('button')
    moveUpButton.innerHTML = '↑'
    moveUpButton.id = 'btnMoveUp'
    moveUpButton.setAttribute('class', 'bkbtn-mini bkthird')
    moveUpButton.onclick = function () {
        moveDebugBar(debugBar, 'up');
    };
    debugBar.appendChild(moveUpButton);

    const moveDownButton = document.createElement('button')
    moveDownButton.innerHTML = '↓'
    moveDownButton.id = 'btnMoveDown'
    moveDownButton.setAttribute('class', 'bkbtn-mini bkthird')
    moveDownButton.onclick = function () {
        moveDebugBar(debugBar, 'down');
    };
    debugBar.appendChild(moveDownButton);


    // // Add environment area
    // const envDisplayer = document.createElement('p');
    // envDisplayer.id = 'env_displayer'
    // envDisplayer.setAttribute('class', 'text-heading')
    // envDisplayer.innerText = `Env detected: ${env}`;
    // debugBar.appendChild(envDisplayer);
    //
    // // Manual choose env
    // const devEnvButton = document.createElement('button')
    // devEnvButton.innerHTML = 'Dev'
    // devEnvButton.id = 'btn_dev_env'
    // devEnvButton.setAttribute('class', 'bkbtn-mini bkthird')
    // devEnvButton.onclick = function () {
    //     manualSetEnv(envDev)
    // };
    //
    // debugBar.appendChild(devEnvButton)
    //
    // const stagEnvButton = document.createElement('button')
    // stagEnvButton.innerHTML = 'Stag';
    // stagEnvButton.id = 'btn_stag_env';
    // stagEnvButton.setAttribute('class', 'bkbtn-mini bkthird')
    // stagEnvButton.onclick = function () {
    //     manualSetEnv(envStag)
    // };
    // debugBar.appendChild(stagEnvButton)
    //
    // const prodEnvButton = document.createElement('button')
    // prodEnvButton.innerHTML = 'Production'
    // prodEnvButton.id = 'btn_prod_env'
    // prodEnvButton.setAttribute('class', 'bkbtn-mini bkthird')
    // prodEnvButton.onclick = function () {
    //     manualSetEnv(envProd)
    // };
    // debugBar.appendChild(prodEnvButton)

    // Tool bar
    const toolText = document.createElement('p');
    toolText.setAttribute('class', 'text-heading')
    toolText.innerText = 'Tool';
    debugBar.appendChild(toolText);

    const bootstrapButton = document.createElement('button')
    bootstrapButton.innerHTML = 'Bootstrap';
    bootstrapButton.id = 'btn_bootstrap';
    bootstrapButton.setAttribute('class', 'bkbtn bkthird')
    bootstrapButton.onclick = function () {
        openBootstrap();
    };
    debugBar.appendChild(bootstrapButton)

    const productSingleButton = document.createElement('button')
    productSingleButton.innerHTML = 'Product single'
    productSingleButton.id = 'btn_product_single'
    productSingleButton.setAttribute('class', 'bkbtn bkthird')
    productSingleButton.onclick = function () {
        openProductSingle();
    };
    debugBar.appendChild(productSingleButton)

    const collectionSingleButton = document.createElement('button')
    collectionSingleButton.innerHTML = 'Collection single'
    collectionSingleButton.id = 'btn_collection_single'
    collectionSingleButton.setAttribute('class', 'bkbtn bkthird')
    collectionSingleButton.onclick = function () {
        openCollectionSingle();
    };
    debugBar.appendChild(collectionSingleButton)

    const collectionsButton = document.createElement('button')
    collectionsButton.innerHTML = 'Collections'
    collectionsButton.id = 'btn_open_collection'
    collectionsButton.setAttribute('class', 'bkbtn bkthird')
    collectionsButton.onclick = function () {
        openCollections();
    };
    debugBar.appendChild(collectionsButton)

    const collectionAll = document.createElement('button')
    collectionAll.innerHTML = 'Collection all'
    collectionAll.id = 'btn_collection_all'
    collectionAll.setAttribute('class', 'bkbtn bkthird')
    collectionAll.onclick = function () {
        openCollectionAll();
    };
    debugBar.appendChild(collectionAll)


    // Params bar
    const paramText = document.createElement('p');
    paramText.setAttribute('class', 'text-heading')
    paramText.innerText = 'Param';
    debugBar.appendChild(paramText);

    const skipCacheButton = document.createElement('button')
    skipCacheButton.innerHTML = 'Skip cache'
    skipCacheButton.id = 'btn_skip_cache'
    skipCacheButton.setAttribute('class', 'bkbtn bkthird')
    skipCacheButton.onclick = function () {
        addParamSkipCache();
    };
    debugBar.appendChild(skipCacheButton)

    const renderCsrButton = document.createElement('button')
    renderCsrButton.innerHTML = 'Render csr'
    renderCsrButton.id = 'btn_render_csr'
    renderCsrButton.setAttribute('class', 'bkbtn bkthird')
    renderCsrButton.onclick = function () {
        addParamRenderClientSide();
    };
    debugBar.appendChild(renderCsrButton)


    const sbaseDebugButton = document.createElement('button')
    sbaseDebugButton.innerHTML = 'SbaseDebug';
    sbaseDebugButton.id = 'btn_sbase_debug';
    sbaseDebugButton.setAttribute('class', 'bkbtn bkthird')
    sbaseDebugButton.onclick = function () {
        addParamSbaseDebug();
    };
    debugBar.appendChild(sbaseDebugButton)
}

function detectSFStore() {
    // detect by domain
    let hostname = window.location.hostname;
    if (hostname.includes(".onshopbase.com")) {
        return {
            isStoreFront: true,
            env: envProd
        }
    }

    if (hostname.includes(".stag.myshopbase.net")) {
        return {
            isStoreFront: true,
            env: envStag
        }
    }

    if (hostname.includes(".myshopbase.net")) {
        return {
            isStoreFront: true,
            env: envDev
        }
    }

    // detect prod env
    let scriptTags = $('script[src*="cdn.shopbasecdn.com"] script[src*="cdn.btdmp.com"]')
    if (scriptTags && scriptTags.length > 0) {
        return {
            isStoreFront: true,
            env: envProd
        }
    }
    // detect stag env
    scriptTags = $('script[src*="cdn-stag.shopbasecdn.com"] script[src*="cdn-stag.btdmp.com"]')
    console.log(scriptTags)
    if (scriptTags && scriptTags.length > 0) {
        return {
            isStoreFront: true,
            env: envStag
        }
    }

    // detect dev env
    scriptTags = $('script[src*="cdn-dev.shopbasecdn.com"] script[src*="cdn.btdmp.com"]')
    console.log(scriptTags)
    if (scriptTags && scriptTags.length > 0) {
        return {
            isStoreFront: true,
            env: envDev
        }
    }

    return {
        isStoreFront: false,
        env: envDev
    }
}

function toggleDebugBar() {
    if (isDebugBarOpen) {
        isDebugBarOpen = false
        document.getElementById('sbase-debug-sidebar').style.height = '0';
        document.getElementById('sbase-debug-sidebar').style.height = '0';
        utils.show_notify('Turn off debug mode', ``, 'warning');
    } else {
        isDebugBarOpen = true
        document.getElementById('sbase-debug-sidebar').style.height = '100%';
        document.getElementById('sbase-debug-sidebar').style.width = '200px';
        utils.show_notify('Turn on debug mode', ``, 'success');
    }
}

function moveDebugBar(debugBar, direction) {
    switch (direction) {
        case 'left':
            debugBar.style.right = null;
            debugBar.style.left = '0';

            break;
        case 'right':
            debugBar.style.right = '0';
            debugBar.style.left = null;
            break;
        case 'down':
            debugBar.style.bottom = '10px';
            debugBar.style.top = 'inherit';
            break;
        case 'up':
            debugBar.style.top = '10px';
            debugBar.style.bottom = 'inherit';
            break;
        default:
            utils.sflog(`Location is not valid`)
            return
    }

    localStorage.setItem('sbase-debugbar-location', direction);
}

function manualSetEnv(env) {
    $('#env_displayer').text(`Manual set env: ${env}`);
    utils.show_notify('Manual set env', `Manual set env to ${env}`, 'success');
    globalEnv = env
}

function openBootstrap() {
    var url = `${window.location.origin}/api/bootstrap/${window.location.hostname}.json`;
    window.open(url);
}

function addParamSkipCache() {
    const url = new URL(window.location.href);
    url.searchParams.append('is_skip_cache', true);
    url.searchParams.append('is_delete_cache', true);
    url.searchParams.append('skip_cache', true);
    window.location.href = url.href;
}

function addParamRenderClientSide() {
    const url = new URL(window.location.href);
    url.searchParams.append('sbase_debug', 1);
    url.searchParams.append('render_csr', 1);
    window.location.href = url.href;
}

function addParamSbaseDebug() {
    const url = new URL(window.location.href);
    url.searchParams.append('sbase_debug', 1);
    window.location.href = url.href;
}

function openProductSingle() {
    let currentPath = window.location.pathname;
    let paths = currentPath.split('/products/');
    let defaultHandle = '';
    if (paths && paths.length == 2) {
        defaultHandle = paths[1];
    }
    let handle = prompt('input handle', defaultHandle);
    if (!handle) {
        utils.show_notify('Empty handle', `Please provide handle`, 'error');
        return
    }

    let url = `${window.location.origin}/api/catalog/product.json?handle=${handle}`;
    window.open(url);
}

function openCollectionSingle() {
    let currentPath = window.location.pathname;
    let paths = currentPath.split('/collections/');
    let defaultHandle = '';
    if (paths && paths.length == 2) {
        defaultHandle = paths[1];
    }
    let handle = prompt('input handle', defaultHandle);
    if (!handle) {
        utils.show_notify('Empty handle', `Please provide handle`, 'error');
        return
    }

    let url = `${window.location.origin}/api/catalog/collections_v2.json?handles=${handle}`;
    window.open(url);
}

function openCollections() {
    let url = `${window.location.origin}/collections`;
    window.open(url);
}

function openCollectionAll() {
    let url = `${window.location.protocol}//${window.location.hostname}/collections/all`;
    window.open(url);
}

document.onkeydown = keydown;

function keydown(evt) {
    if (!isSF) {
        utils.show_notify('Force storefront :nhin_scare:. Press again to show bar')
        addDebugBar('dev');
        isSF = true
    }

    if (!evt) evt = event;
    if (evt.ctrlKey && evt.altKey && evt.keyCode == 88) { //CTRL+ALT+X
        toggleDebugBar()
    }

}
