'use strict'
var isDebugBarOpen = false
var isSF = false
let sfBootstrap;
let sfShopId = 0;
let sfPlatformDomain = '';
let sfPageType = '';
let sfPageHandle = '';
let sfPageId = 0;
let sfPageObject = {};
let sfCartToken = '';
let sfCheckoutToken = '';
let isDragging = false;

let SF_VAR = {
    debug_open: false,
    sf: false,
    dragging: false,
    shop_id: 0,
    domain: '',
    page_id: 0,
    page_type: '',
    handle: '',
    cart_token: '',
    checkout_token: ''
}


utils.sflog('Starting')

startApplication();


async function startApplication() {
    // Get from cache

    // If not ok, request boostrap, set to cache: {sf_is_sf:false, shop_id: 0}

    // Get page info from cache: type, id, handle

    // Get basic information: cart_token, checkout token

    // Build debug panel
    addIcon();
    addDebugPanel();


}

function addDebugPanel(){
    const rawHTML = `<div id="sbase-debug-sidebar" class="sfrow">
        <div class="sfcol-md-5 debug-sidebar">
            <!--Start static panel-->
            <div class="sfpanel sfpanel-primary">
                <div class="sfpanel-heading">
                    <i class="fa fa-bug"> </i>
                    <a href="/"><span class="mp-menu-text">Debug theo cách của bạn và fix theo cách của chúng tôi</span></a>
                </div>
                <div class="mp-panel-menu sfpanel-body">
                    <div class="mp-padding-10">
                        <h3 class="sftext-danger">
                            <button class="sfbtn">
                                <i class="fa fa-refresh"></i>
                            </button>
                            Thông tin cơ bản (click để copy)

                        </h3>

                        <table class="sftable sftable-hover">
                            <thead>
                            <tr>
                                <th>Loại thông tin</th>
                                <th>Giá trị</th>
                            </tr>
                            </thead>

                            <tbody>
                            <tr onclick="copyToClipboard('${SF_VAR.shop_id}')">
                                <td>Shop id</td>
                                <td>${SF_VAR.shop_id}</td>
                            </tr>
                            <tr  onclick="copyToClipboard('${SF_VAR.domain}')">
                                <td>Platform domain</td>
                                <td>${SF_VAR.domain}</td>
                            </tr>
                            <tr  onclick="copyToClipboard('${SF_VAR.page_id}')">
                                <td>${SF_VAR.page_type}</td>
                                <td>${SF_VAR.page_id}</td>
                            </tr>
                            <tr>
                                <td>Cart token</td>
                                <td>d0821fa2b1f14a0b98cc62ccf76bc351</td>
                            </tr>
                            <tr>
                                <td>Checkout token</td>
                                <td>e6cf42e5875a4bc589151db946ae85c2</td>
                            </tr>
                            </tbody>
                        </table>

                        <h3 class="sftext-danger">
                            <button class="sfbtn">
                                <i class="fa fa-wrench"></i>
                            </button>
                            Tools
                        </h3>
                        <table class="sftable sftable-hover">
                            <tbody>
                            <tr>
                                <td>
                                    Clear things
                                </td>
                                <td>
                                    <button class="btn btn-danger">
                                        <i class="fa fa-cart-arrow-down" aria-hidden="true"></i>
                                        Clear cart
                                    </button>
                                    <button class="btn btn-danger">
                                        <i class="fa fa-file-text-o" aria-hidden="true"></i>
                                        Clear FS
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>Page speed</td>
                                <td>
                                    <button class="btn btn-primary">
                                        <i class="fa fa-motorcycle" aria-hidden="true"></i>
                                        Gtmetrix
                                    </button>
                                    <button class="btn btn-primary">
                                        <i class="fa fa-google" aria-hidden="true"></i>
                                        Google
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>Params</td>
                                <td>
                                    <button class="btn btn-primary">
                                        <i class="fa fa-bug" aria-hidden="true"></i>
                                        Sbase debug
                                    </button>
                                    <button class="btn btn-primary">
                                        <i class="fa fa-spinner" aria-hidden="true"></i>
                                        Render csr
                                    </button>
                                </td>
                            </tr>

                            </tbody>
                        </table>

                        <h3 class="text-danger">
                            <button class="btn">
                                <i class="fa fa-link"></i>
                            </button>
                            Quick URLs
                        </h3>
                        <table class="table table-hover">
                            <tbody>
                            <tr>
                                <td>
                                    Bootstrap
                                </td>
                                <td>
                                    <button class="btn btn-primary">
                                        <i class="fa fa-info-circle" aria-hidden="true"></i>
                                        Bootstrap
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>Product</td>
                                <td>
                                    <button class="btn btn-primary">
                                        <i class="fa fa-cube" aria-hidden="true"></i>
                                        Product single
                                    </button>
                                    <button class="btn btn-primary">
                                        <i class="fa fa-cubes" aria-hidden="true"></i>
                                        Product list
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td>Collection</td>
                                <td>
                                    <button class="btn btn-primary">
                                        <i class="fa fa-object-group" aria-hidden="true"></i>
                                        Collection single
                                    </button>
                                    <button class="btn btn-primary">
                                        <i class="fa fa-object-group" aria-hidden="true"></i>
                                        Collection list
                                    </button>
                                </td>
                            </tr>

                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <!--End static panel-->
        </div>
    </div>`
    const html = $.parseHTML(rawHTML);

    $('body').append(html);
}

async function detectPageType() {
    const pathName = location.pathname;

    // Get cache
    const cacheKey = `${pathName}`
    const rawData = storage.get(cacheKey)
    if (rawData && rawData.length && rawData.split(';').length === 2) {
        const data = rawData.split(';')
        sfPageType = data[0];
        sfPageId = data[1];
        utils.sflog('Cache page OK')
        return
    }

    if (/\/products\/[a-zA-Z0-9-]*/.test(pathName)) {
        sfPageType = 'Product';
        sfPageHandle = pathName.split('products/')[1];
        const url = utils.getProductSingleUrl(sfPageHandle)
        sfPageObject = await doAjax(url)
        sfPageId = sfPageObject ? sfPageObject.id : 0
        console.log('Product page: ', sfPageId)

        // Set cache
        storage.set(cacheKey, `${sfPageType};${sfPageId}`)
        return
    }

    if (pathName !== 'collections/all' && /\/collections\/[a-zA-Z0-9-]*/.test(pathName)) {
        sfPageType = 'Collection';
        sfPageHandle = pathName.split('collections/')[1];

        const url = utils.getCollectionSingleUrl(sfPageHandle)
        sfPageObject = await doAjax(url)
        sfPageObject = (sfPageObject && sfPageObject.collections && sfPageObject.collections.length > 0) ? sfPageObject.collections[0] : {id: 0}
        sfPageId = sfPageObject.id
        console.log('Collection page: ', sfPageId)
        // Set cache
        storage.set(cacheKey, `${sfPageType};${sfPageId}`)
    }
}

function addIcon() {
    console.log('Generate icon');
    const rawHtml = `<div id="sf-tool-icon" class="sf-float">
    </div>`
    const html = $.parseHTML(rawHtml);

    $('body').append(html);
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
            let pageTypeButton = document.getElementById('btn_page_type')

            let isNeedInsert = false;
            if (!pageTypeButton) {
                pageTypeButton = document.createElement('button')
                pageTypeButton.id = 'btn_page_type';
                isNeedInsert = true
            }

            pageTypeButton.innerHTML = `${sfPageType}: ${sfPageId}`;
            pageTypeButton.onclick = function () {
                utils.copyToClipboard(`${sfPageId}`)
            };

            if (isNeedInsert) {
                const shopIdButton = document.getElementById('btn_shop_id')
                shopIdButton.parentNode.insertBefore(pageTypeButton, shopIdButton.nextSibling)
            }
        }

        // Reload cart token
        sfCartToken = storage.getOrigin('shop/carts/current-cart-token')
        if (sfCartToken) {
            sfCartToken = sfCartToken.replace('"', '').replace('"', '');
        }
        let cartTokenBtn = document.getElementById('btn_cart_token')
        if (cartTokenBtn) {
            cartTokenBtn.innerText = `Cart token: ${sfCartToken}`
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

    if (sfPlatformDomain && sfPlatformDomain.length) {
        const platformDomainBtn = document.createElement('button')
        platformDomainBtn.innerHTML = `Platform domain: ${sfPlatformDomain}`;
        platformDomainBtn.id = 'btn_platform_domain';
        platformDomainBtn.setAttribute('class', 'bkbtn bkthird')
        platformDomainBtn.onclick = function () {
            utils.copyToClipboard(`${sfPlatformDomain}`)
        };
        debugBar.appendChild(platformDomainBtn)
    }

    if (sfCartToken) {
        const cartTokenBtn = document.createElement('button')
        cartTokenBtn.innerHTML = `Cart token: ${sfCartToken}`;
        cartTokenBtn.id = 'btn_cart_token';
        cartTokenBtn.setAttribute('class', 'bkbtn bkthird')
        cartTokenBtn.onclick = function () {
            utils.copyToClipboard(`${sfCartToken}`)
        };
        debugBar.appendChild(cartTokenBtn)
    }

    if (sfCheckoutToken) {
        const checkoutTokenBtn = document.createElement('button')
        checkoutTokenBtn.innerHTML = `Checkout token: ${sfCheckoutToken}`;
        checkoutTokenBtn.id = 'btn_checkout_token';
        checkoutTokenBtn.setAttribute('class', 'bkbtn bkthird')
        checkoutTokenBtn.onclick = function () {
            utils.copyToClipboard(`${sfCheckoutToken}`)
        };
        debugBar.appendChild(checkoutTokenBtn)
    }

    // Tool bar
    const toolText = document.createElement('p');
    toolText.setAttribute('class', 'text-heading')
    toolText.innerText = 'Tool';
    debugBar.appendChild(toolText);

    const clearCartBtn = document.createElement('button')
    clearCartBtn.innerHTML = `Clear cart`;
    clearCartBtn.id = 'sf_btn_clear_cart';
    clearCartBtn.setAttribute('class', 'bkbtn bkthird')
    clearCartBtn.onclick = function () {
        storage.setOrigin('shop/carts/current-cart-token', null)
        window.location.reload();
    };
    debugBar.appendChild(clearCartBtn)

    // gt metrix page speed
    const gtMetrixForm = document.createElement('form')
    gtMetrixForm.method = 'post'
    gtMetrixForm.action = 'https://gtmetrix.com/analyze.html';
    gtMetrixForm.target = 'TheWindow'
    gtMetrixForm.id = 'sf_gt_metrix_form';

    const urlInput = document.createElement('input');
    urlInput.type = 'hidden';
    urlInput.value = window.location.href;
    urlInput.name = 'url';

    gtMetrixForm.appendChild(urlInput);
    debugBar.appendChild(gtMetrixForm)
    const gtMetrixBtn = document.createElement('button')
    gtMetrixBtn.innerHTML = `GtMetrix page speed`;
    gtMetrixBtn.id = 'sf_btn_gt_metrix';
    gtMetrixBtn.setAttribute('class', 'bkbtn bkthird')
    gtMetrixBtn.onclick = function () {
        window.open('', 'TheWindow');
        gtMetrixForm.submit();
    };
    debugBar.appendChild(gtMetrixBtn)


    // google page speed
    const ggPageSpeedBtn = document.createElement('button')
    ggPageSpeedBtn.innerHTML = `Google page speed`;
    ggPageSpeedBtn.id = 'sf_btn_google_page_speed';
    ggPageSpeedBtn.setAttribute('class', 'bkbtn bkthird')
    ggPageSpeedBtn.onclick = function () {
        const url = window.location.href;
        window.open(`https://developers.google.com/speed/pagespeed/insights/?url=${url}`)
    };
    debugBar.appendChild(ggPageSpeedBtn)


    // Quick url
    const quickUrlText = document.createElement('p');
    quickUrlText.setAttribute('class', 'text-heading')
    quickUrlText.innerText = 'Quick url';
    debugBar.appendChild(quickUrlText);

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
            ok: false,
            platformDomain: ''
        }
    }

    const shopId = parseInt(sfShopId)
    if (shopId > 0) {
        utils.sflog('Cache OK')
        return {
            shop_id: shopId,
            ok: true,
            platformDomain: storage.get('platform_domain')
        }
    }

    return {
        shop_id: 0,
        ok: false,
        platformDomain: ''
    }
}

async function getShopId() {
    let url = utils.getBootstrapUrl();
    let bootstrap = await doAjax(url)
    sfBootstrap = utils.parseBootstrap(bootstrap);

    return {shop_id: sfBootstrap.shop_id, platform_domain: sfBootstrap.platform_domain}
}

function toggleDebugBar() {
    const debugBar = document.getElementById('sbase-debug-sidebar')
    const iconButton = document.getElementById('sf-tool-icon')
    if (isDebugBarOpen) {
        isDebugBarOpen = false
        debugBar.style.height = '0';
        debugBar.style.width = '0';
        iconButton.style.display = 'block';

    } else {
        isDebugBarOpen = true
        debugBar.style.height = '100%';
        debugBar.style.width = '500px';
        iconButton.style.display = 'none';
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
        // addDebugBar();
        isSF = true
    }

    if (!evt) evt = event;
    if (evt.ctrlKey && evt.altKey && evt.keyCode == 88) { //CTRL+ALT+X
        toggleDebugBar()
    }

}
