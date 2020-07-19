'use strict'
var isDebugBarOpen = false
var isSF = false
let sfBootstrap;
let sfShopId = 0;
let sfPageType = '';
let sfPageHandle = '';
let sfPageId = 0;
let sfPageObject = {};

utils.sflog('Starting')

startApplication();


async function startApplication() {
    let {isStoreFront, shopId} = getFromCache()

    if (!isStoreFront) {
        shopId = await getShopId();
    }

    if (shopId <= 0) {
        utils.sflog('This is not storefront');
        isSF = false
        return
    }

    if (!storage.get('show_notify')) {
        utils.show_notify('Storefront detected.', `Press Ctrl + Alt + X to turn on debug mode`, 'success');
        storage.set('show_notify', true)
    }

    // Detect page type
    await detectPageType()

    storage.set('shop_id', shopId)
    isSF = true
    sfShopId = shopId
    await addDebugBar();
}

async function detectPageType() {
    const pathName = location.pathname;
    if (/\/products\/[a-zA-Z0-9-]*/.test(pathName)) {
        sfPageType = 'Product';
        sfPageHandle = pathName.split('products/')[1];
        const url = utils.getProductSingleUrl(sfPageHandle)
        sfPageObject = await doAjax(url)
        sfPageId = sfPageObject ? sfPageObject.id : 0
        console.log('Product page: ', sfPageId)
        return
    }

    if (pathName !== 'collections/all' && /\/collections\/[a-zA-Z0-9-]*/.test(pathName)) {
        sfPageType = 'Collection';
        sfPageHandle = pathName.split('collections/')[1];

        const url = utils.getCollectionSingleUrl(sfPageHandle)
        sfPageObject = await doAjax(url)
        sfPageObject = (sfPageObject && sfPageObject.collections && sfPageObject.collections.length > 0) ? sfPageObject.collections[0]: {id: 0}
        sfPageId = sfPageObject.id
        console.log('Collection page: ', sfPageId)
    }
}

async function addDebugBar() {
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

    // Information bar
    const informationText = document.createElement('p');
    informationText.setAttribute('class', 'text-heading')
    informationText.innerText = 'Information';
    debugBar.appendChild(informationText);

    const reloadButton = document.createElement('button')
    reloadButton.innerHTML = `Reload`;
    reloadButton.id = 'btn_reload';
    reloadButton.setAttribute('class', 'bkbtn bkthird')
    reloadButton.onclick = async function () {
        // reload information
        await detectPageType();

        if (sfPageType && sfPageType.length > 0) {
            const pageTypeButton = document.getElementById('btn_page_type')
            if (pageTypeButton) {
                pageTypeButton.innerHTML = `${sfPageType}: ${sfPageId}`;
                pageTypeButton.onclick = function () {
                    utils.copyToClipboard(`${sfPageId}`)
                };
            }
        }
    };
    debugBar.appendChild(reloadButton)

    const shopIdButton = document.createElement('button')
    shopIdButton.innerHTML = `Shop id: ${sfShopId}`;
    shopIdButton.id = 'btn_shop_id';
    shopIdButton.setAttribute('class', 'bkbtn bkthird')
    shopIdButton.onclick = function () {
        utils.copyToClipboard(`${sfShopId}`)
    };
    debugBar.appendChild(shopIdButton)

    if (sfPageType && sfPageType.length > 0) {
        const pageTypeButton = document.createElement('button')
        pageTypeButton.innerHTML = `${sfPageType}: ${sfPageId}`;
        pageTypeButton.id = 'btn_page_type';
        pageTypeButton.setAttribute('class', 'bkbtn bkthird')
        pageTypeButton.onclick = function () {
            utils.copyToClipboard(`${sfPageId}`)
        };
        debugBar.appendChild(pageTypeButton)
    }


    // Tool bar
    const toolText = document.createElement('p');
    toolText.setAttribute('class', 'text-heading')
    toolText.innerText = 'Quick url';
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

function getFromCache() {
    sfShopId = storage.get('shop_id')
    if (sfShopId && !sfShopId.length) {
        utils.sflog('Cache empty')
        return {
            shop_id: 0,
            ok: false
        }
    }

    const shopId = parseInt(sfShopId)
    if (shopId > 0) {
        utils.sflog('Cache OK')
        return {
            shop_id: shopId,
            ok: true,
        }
    }

    return {
        shop_id: 0,
        ok: false
    }
}

async function getShopId() {
    let url = utils.getBootstrapUrl();
    let bootstrap = await doAjax(url)
    sfBootstrap = utils.parseBootstrap(bootstrap);

    return sfBootstrap.shop_id
}

function toggleDebugBar() {
    if (isDebugBarOpen) {
        isDebugBarOpen = false
        document.getElementById('sbase-debug-sidebar').style.height = '0';
        document.getElementById('sbase-debug-sidebar').style.height = '0';
    } else {
        isDebugBarOpen = true
        document.getElementById('sbase-debug-sidebar').style.height = '100%';
        document.getElementById('sbase-debug-sidebar').style.width = '200px';
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

function openBootstrap() {
    window.open(utils.getBootstrapUrl());
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

    let url = `${window.location.origin}/api/catalog/product.json?handle=${defaultHandle}`;
    window.open(url);
}

function openCollectionSingle() {
    let currentPath = window.location.pathname;
    let paths = currentPath.split('/collections/');
    let defaultHandle = '';
    if (paths && paths.length == 2) {
        defaultHandle = paths[1];
    }

    let url = `${window.location.origin}/api/catalog/collections_v2.json?handles=${defaultHandle}`;
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
        utils.sflog('Force storefront :nhin_scare:')
        addDebugBar();
        isSF = true
    }

    if (!evt) evt = event;
    if (evt.ctrlKey && evt.altKey && evt.keyCode == 88) { //CTRL+ALT+X
        toggleDebugBar()
    }

}
