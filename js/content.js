'use strict'

let sfBootstrap;
let sfPageType = '';
let sfPageId = 0;
let sfPageObject = {};

let SF_VAR = {
    debug_open: false,
    icon_display: true,
    sf: false,
    dragging: false,
    user_id: 0,
    shop_id: 0,
    themes: [],
    active_theme: {},
    domain: '',
    page_id: 0,
    gtmetrix_index: 0,
    page_type: '',
    handle: '',
    cart_token: '',
    checkout_token: '',
    access_token: '',
    access_token_expire: '',
    quotes: ['Chúc bạn một ngày tốt lành ^^'],
    preview_access_token: 'dài nên ko hiển thị. Cứ click là copy',
    env: '',
    current_pathname: '',
    current_quote: '',
}


utils.sflog('Starting')

injectScript();

startApplication();

function injectScript() {
    const element = document.getElementById(SF_CONST.KEY_INLINE_SCRIPT);
    if (element) {
        element.parentNode.removeChild(element);
    }

    const actualCode =
        "(" +
        function () {
            const app = document.getElementById("app");
            if (!app || !app.__vue__ || !app.__vue__.$store || !app.__vue__.$store.state) {
                return
            }

            const state = app.__vue__.$store.state;
            const location = window.location.href;

            let savedObject = {
                "id": 0,
                "user_id": 0,
                "shop_token": "",
                "user_token": "",
                "domain": ""
            }

            const key = 'sfpower-shopinfo';
            const raw = localStorage.getItem(key)
            if (raw && raw.length > 0) {
                savedObject = JSON.parse(raw);
            }


            if (location.includes('/admin') && state.shop && state.shop.shop) {
                const shop = state.shop.shop;

                let token = localStorage.getItem('sbase_shop-access-token');
                if (token && token.length > 0) {
                    const regex = /"/gi
                    token = token.replace(regex, '')

                    savedObject.shop_token = token;
                }
                savedObject.id = shop.id;
                savedObject.domain = shop.domain;
                savedObject.user_id = shop.user_id;
            } else {
                const bootstrap = state.bootstrap;

                savedObject.id = bootstrap.shopId;
                savedObject.domain = bootstrap.platformDomain;
            }

            // Set to local storage
            localStorage.setItem(key, JSON.stringify(savedObject))

            // if url = /admin ->
        } +
        ")();";
    const script = document.createElement("script");
    script.id = SF_CONST.KEY_INLINE_SCRIPT;
    script.type = "text/javascript";
    script.textContent = actualCode;
    document.getElementsByTagName("head")[0].appendChild(script);
}

async function startApplication() {
    bindEvent(window, 'message', function (e) {
        const rawMsg = e.data;
        processEvent(rawMsg);
    });

    // Get from cache
    //getFromCache()
    // if (SF_VAR.sf === SF_CONST.NOT_SF) {
    //     return
    // }

    // If not ok, request boostrap
    if (!SF_VAR.shop_id) {
        await getShopInfo();
        if (!SF_VAR.shop_id) {
            return
        }
    }

    // Get quotes
    getQuotes();

    // Check has any sync action
    // Get from storage. If has action -> do action, clear sync storage and reload page
    doSyncAction();

    // detect env
    detectEnv()

    getUserId();

    if (!SF_VAR.page_type) {
        await getPageInfo();
    }

    // Get themes
    await getThemes();

    // Build debug panel
    addIcon();
    addDebugPanel();


    // Bind events
    let sfToolIcon = document.getElementById('sf-tool-icon');
    let sfDebugBar = document.getElementById('sf-debug-bar');

    sfToolIcon.onclick = function () {
        sfToggleDebugBar();
    };
    sfDebugBar.onclick = function () {
        sfToggleDebugBar();
    };

    document.onkeydown = keydown;

}

function isObject(obj) {
    debugger;
    if (obj) {
        return true
    }

    return false
}

function detectEnv() {
    const host = window.location.host;
    if (host.includes("stag.myshopbase.net") || host.includes(".sbasestag.tk")) {
        SF_VAR.env = SF_CONST.ENV_STAG
        return
    }

    if (host.includes(".myshopbase.net") || host.includes(".sbasedev.tk")) {
        SF_VAR.env = SF_CONST.ENV_DEV
        return
    }

    SF_VAR.env = SF_CONST.ENV_PROD
}

function doSyncAction() {
    chrome.storage.sync.get([`${SF_CONST.KEY_SYNC_ACTION}`], function (result) {
        if (!result || !result.sync_action) {
            return
        }

        const data = utils.parseJSON(result.sync_action, 'sync_action');
        if (!data) {
            utils.sflog('Cannot parse sync action')
            return
        }

        // if url not from action -> return
        if (!data.data.url.includes(window.location.host)) {
            utils.sflog('Sync action not for this url. Return now')
            return
        }

        // Switch action to do (set to local storage)
        switch (data.action) {
            case SF_CONST.EVENT_IMPORT_CART:
                storage.set(SF_CONST.KEY_CART_TOKEN, `"${data.data.cart_token}"`, false)
                storage.set(SF_CONST.KEY_CHECKOUT_TOKEN, `"${data.data.checkout_token}"`, false)
                break;
            default:
                utils.sflog("Invalid action: ", data.action)
                return
        }

        // Remove from sync storage
        chrome.storage.sync.remove(['sync_action'], function () {
            utils.sflog('Remove action success');
            window.location.href = data.data.url
        });
    });
}

function getUserId() {
    try {
        let rawShop = localStorage.getItem('sbase_shop');
        if (!rawShop || rawShop.length === 0) {
            return
        }

        // Replace redundant double quote
        rawShop = rawShop.substring(1, rawShop.length - 1);
        const decodedBase64 = atob(rawShop);
        const rawObj = decodeURI(decodedBase64);
        const obj = JSON.parse(rawObj);
        SF_VAR.user_id = obj.user_id;
    } catch (e) {
        utils.sflog('Error when get user id: ', e)
    }
}

async function getQuotes() {
    try {
        let response = await callJQAjax(SF_CONST.QUOTE_URL)
        let rawQuotes = response["files"]["quotes.json"]["content"]
        SF_VAR.quotes = utils.parseJSON(rawQuotes, 'Quote') || ["Chúc bạn ngày mới tốt lành"];
    } catch (e) {
        console.log('error get quotes: ', e)
    }
}

async function getDiscountInfo(orderId) {
    try {
        const orderUrl = `${window.location.origin}/admin/orders/discount-info.json?access_token=${SF_VAR.access_token}&order_id=${orderId}`
        let rawResp = await callJQAjax(orderUrl)
        return utils.parseJSON(rawResp, 'get discount info');
    } catch (e) {
        utils.sflog('Error get discount info: ', e)
        return {}
    }
}


async function getOrderInfo(orderId) {
    try {
        const orderUrl = `${window.location.origin}/admin/orders/${orderId}.json?access_token=${SF_VAR.access_token}`
        let rawResp = await callJQAjax(orderUrl)
        return utils.parseJSON(rawResp, 'get discount info');
    } catch (e) {
        utils.sflog('Error get discount info: ', e)
        return {}
    }
}

async function debugDiscount() {
    const pathname = window.location.pathname;
    const regexOrderUrl = /\/orders\/(\d+)/g;
    const match = regexOrderUrl.exec(pathname);
    if (!match) {
        utils.show_notify('Không debug được', 'Đây không phải trang chi tiết order. Chỉ debug được trang order thôi bạn ơiiii.', '', 5000)
        return
    }

    const orderId = match[1];
    if (!orderId) {
        utils.show_notify('Không debug được', 'Có gì đó không đúng. Không tìm được order id', '', 5000)
        return
    }

    if (!SF_VAR.access_token || SF_VAR.access_token.length === 0) {
        utils.show_notify('Không debug được', 'Không tìm thấy access token. F5 thử đi bạn ơiii', '', 5000)
        return
    }

    // Get discount info
    const discountInfo = await getDiscountInfo(orderId)
    if (!discountInfo) {
        utils.show_notify('Có lỗi xảy ra', 'Ping @phongdo để nó phích bug', 'error', 5000)
        return
    }

    if (!discountInfo.is_supported) {
        utils.show_notify('Không debug được', 'Order này không phải discount usell nên chưa support :wedontdothatthere:', '', 5000)
        return
    }

    // Get order info
    const orderInfo = await getOrderInfo(orderId)
    if (!orderInfo) {
        utils.sflog('Can\'t get order info')
        return
    }

    const elem = document.getElementsByClassName('order-layout__item')[1];
    const debugHtml = getDebugInfoHtml(discountInfo, orderInfo)
    elem.innerHTML = elem.innerHTML + debugHtml;
}

function getDebugInfoHtml(discount, order) {
    let offerName, offerType, offerId, offerUrl;
    let discountCode, discountData;
    let totalDiscount, productDiscountHtml = '';
    let isDiscountDataChangedText = 'Discount data chưa bị thay đổi ✅✅'
    if (discount && discount.offer) {
        if (discount.offer) {
            offerName = discount.offer.offer_name;
            offerId = discount.offer.id;
            offerType = discount.offer.offer_type;
        }

        if (discount.discount_cart) {
            discountCode = discount.discount_cart.discount_code;
            discountData = discount.discount_cart.discounted_data;
        }

        if (discount.offer.discount_data !== discountData) {
            isDiscountDataChangedText = 'Discount data đã bị thay đổi 🔥🔥'
        }
    }

    if (order && order.order) {
        order = order.order;
        totalDiscount = order.total_discounts;

        for (let i = 0; i < order.line_items.length; i++) {
            const item = order.line_items[i]
            productDiscountHtml += `<tr>
                    <td style="width: 30%!important;">${item.title}</td>
                    <td><span>${item.total_discount}</span></td>
                </tr>`;
        }
    }

    switch (offerType) {
        case 'pre-purchase':
            offerUrl = `${window.location.origin}/admin/apps/boost-upsell/up-sell/offer/${offerId}`
            break;
        case 'quantity':
            offerUrl = `${window.location.origin}/admin/apps/boost-upsell/cross-sell/quantity-offer/${offerId}`
            break;
        case 'bundle':
            offerUrl = `${window.location.origin}/admin/apps/boost-upsell/cross-sell/bundle-offer/${offerId}`
            break;
        case 'accessory':
            offerUrl = `${window.location.origin}/admin/apps/boost-upsell/cross-sell/accessories/${offerId}`
            break;
    }

    let html = `<div class="order-layout__item" id="sf-power-debug-order">
    <section class="card" style="background-color: #ffe6ee;">
        <div class="card__header hide-when-printing">
            <div class="s-flex s-flex--wrap s-flex--align-center">
                <div class="s-flex-item s-image is-32x32"><img
                            src="https://admin-cdn-dev.myshopbase.net/dc6e3f56077/img/s-icon-fulfilled.ec7a7364.svg"
                            alt="Debug hihi"></div>
                <div class="s-flex-item s-flex-item--fill s-ml8"><h2 class="stack-item__title">Debug discount</h2></div>
            </div>
        </div>
        <div class="card__section">


            <table role="table" class="order-details-summary-table" style="text-align: left;">
                <tbody>
                <tr>
                    <td style="width: 30%!important;">Loại offer</td>
                    <td><span>${offerType}</span></td>
                </tr>
                <tr>
                    <td style="width: 30%!important;">Tên offer</td>
                    <td><span> <a href="${offerUrl}" target="_blank">${offerName} ↗</a></span></td>
                </tr>
                <tr>
                    <td style="width: 30%!important;">---</td>
                    <td><span>${isDiscountDataChangedText}</td>
                </tr>
                <tr>
                    <td style="width: 30%!important;">Discount code</td>
                    <td><span>${discountCode}</span></td>
                </tr>
                <tr>
                    <td style="width: 30%!important;">Discount data</td>
                    <td><span>${discountData}</span></td>
                </tr>
                <tr>
                    <td style="width: 30%!important;">Tổng giá trị</td>
                    <td><span>${totalDiscount}</span></td>
                </tr>
                ${productDiscountHtml}
                </tbody>
            </table>
        </div>
    </section>
</div>`

    return html
}

async function getThemes() {
    if (!SF_VAR.access_token || SF_VAR.access_token.length === 0) {
        utils.sflog('Không tìm thấy access token')
        return
    }

    try {
        const themeUrl = `${window.location.origin}/admin/themes.json?order_by=updated_at&order_direction=desc&access_token=${SF_VAR.access_token}`
        let rawResp = await callJQAjax(themeUrl)
        const parsedTheme = utils.parseJSON(rawResp, 'get theme list');

        if (parsedTheme && parsedTheme.shop_themes && parsedTheme.shop_themes.length > 0) {
            SF_VAR.active_theme = parsedTheme.shop_themes[0];
            SF_VAR.themes = parsedTheme;
        }

    } catch (e) {
        utils.sflog('Error get theme list: ', e)
        return {}
    }
}


async function getPageInfo() {
    const pathName = location.pathname;
    SF_VAR.current_pathname = pathName;
    if (pathName.includes('/admin') || pathName.includes('.json')) {
        SF_VAR.page_type = "NOT_KNOWN_PAGE"
        SF_VAR.page_id = "0"
        return
    }

    if (/\/products\/[a-zA-Z0-9-]*/.test(pathName)) {
        SF_VAR.page_type = 'Product';
        SF_VAR.handle = pathName.split('products/')[1];
        const url = utils.getProductSingleUrl(SF_VAR.handle)
        sfPageObject = await callJQAjax(url)
        SF_VAR.page_id = sfPageObject ? sfPageObject.id : 0
        return
    } else if (pathName !== 'collections/all' && /\/collections\/[a-zA-Z0-9-]*/.test(pathName)) {
        SF_VAR.page_type = 'Collection';
        SF_VAR.handle = pathName.split('collections/')[1];

        const url = utils.getCollectionSingleUrl(SF_VAR.handle)
        sfPageObject = await callJQAjax(url)
        sfPageObject = (sfPageObject && sfPageObject.collections && sfPageObject.collections.length > 0) ? sfPageObject.collections[0] : {id: 0}
        SF_VAR.page_id = sfPageObject.id

    } else if (/\/pages\/[a-zA-Z0-9-]*/.test(pathName)) {
        SF_VAR.page_type = 'Page';
        SF_VAR.handle = pathName.split('pages/')[1];

        const url = utils.getPageSingleUrl(SF_VAR.handle)
        sfPageObject = await callJQAjax(url)
        sfPageObject = (sfPageObject && sfPageObject.page) ? sfPageObject.page : {id: 0}
        SF_VAR.page_id = sfPageObject.id
    } else {
        SF_VAR.page_type = "NOT_KNOWN_PAGE"
        SF_VAR.page_id = "0"
    }


    // Set cache
    storage.set(pathName, `${SF_VAR.page_type};${SF_VAR.page_id};${SF_VAR.handle}`)
}

function getFromCache() {
    SF_VAR.sf = storage.get(SF_CONST.KEY_IS_SF)
    SF_VAR.shop_id = storage.get(SF_CONST.KEY_SHOP_ID)
    SF_VAR.domain = storage.get(SF_CONST.KEY_PLATFORM_DOMAIN)

    // Get page type
    const pathName = location.pathname;
    const rawData = storage.get(pathName)
    if (rawData && rawData.length) {
        const data = rawData.split(';')
        if (data.length === 2) {
            // old data -> clear
            storage.remove(pathName)
        } else {
            SF_VAR.page_type = data[0];
            SF_VAR.page_id = data[1];
            SF_VAR.handle = data[2];
            utils.sflog('Cache page OK')
        }

    }

    // Get tokens
    SF_VAR.cart_token = storage.get(SF_CONST.KEY_CART_TOKEN, false);
    if (SF_VAR.cart_token) {
        SF_VAR.cart_token = utils.removeDoubleQuote(SF_VAR.cart_token)
    }
    SF_VAR.checkout_token = storage.get(SF_CONST.KEY_CHECKOUT_TOKEN, false);
    if (SF_VAR.checkout_token) {
        SF_VAR.checkout_token = utils.removeDoubleQuote(SF_VAR.checkout_token);
    }

    SF_VAR.access_token = storage.get(SF_CONST.KEY_ACCESS_TOKEN, false);
    if (SF_VAR.access_token) {
        SF_VAR.access_token = utils.removeDoubleQuote(SF_VAR.access_token);
    }
}

async function getShopInfo() {
    // Read from vue state
    const raw = localStorage.getItem('sfpower-shopinfo');
    if (raw && raw.length > 0) {
        const obj = JSON.parse(raw)

        SF_VAR.shop_id = obj.id;
        SF_VAR.domain = obj.domain;
    }

    // let url = utils.getBootstrapUrl();
    // let bootstrap = await callJQAjax(url)
    // sfBootstrap = utils.parseBootstrap(bootstrap);
    // SF_VAR.shop_id = sfBootstrap.shop_id;
    // SF_VAR.domain = sfBootstrap.platform_domain;
    //
    // if (sfBootstrap.shop_id === 0) {
    //     const domain = window.location.hostname;
    //     SF_VAR.sf = SF_CONST.NOT_SF
    //     // Handle error for case create store or store has password
    //     if (domain.includes('.myshopbase.net') || domain.includes('.onshopbase.com')) {
    //         return
    //     }
    //     storage.set(SF_CONST.KEY_IS_SF, SF_CONST.NOT_SF)
    // }
}

function addIcon() {
    utils.sflog('Generate icon');
    const rawHtml = SF_TEMPLATE.getIconHTML();
    const html = $.parseHTML(rawHtml);

    $('body').append(html);
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        processEvent(request);

        // Neu khong send response lai thi gap loi "The message port closed before a response was received."
        sendResponse({farewell: "goodbye"});

        // console.log(sender.tab ?
        //     "from a content script:" + sender.tab.url :
        //     "from the extension");
        // if (request.greeting == "hello")
        // sendResponse({farewell: "goodbye"});
    });

async function rebuildTheme(themeId) {
    if (!SF_VAR.access_token || SF_VAR.access_token.length === 0) {
        utils.show_notify('Lỗi', 'Không tìm thấy access token')
        return
    }

    if (!themeId) {
        utils.show_notify('Lỗi', `Theme id không đúng: ${themeId}`, 'error')
        return
    }

    utils.show_notify('Đang build', 'Đang build lại theme', 'warning', 1000)
    try {
        const themeUrl = `${window.location.origin}/admin/themes/build.json?access_token=${SF_VAR.access_token}&id=${themeId}`
        let rawResp = await callJQAjax(themeUrl)
        const response = utils.parseJSON(rawResp, 'build theme');

        if (response && response.success) {
            utils.show_notify('Xongg', 'Đã build xong shop theme', 'success')
            return
        }

        utils.show_notify('Lỗi', 'Có lỗi gì đó, xem ở console đi', 'error');
        utils.sflog(response)

    } catch (e) {
        utils.sflog('Error build theme: ', e)
        return {}
    }
}

function processEvent(rawMsg) {
    if (!rawMsg) {
        return
    }

    const pathName = location.pathname;
    let pageHandle = '';
    if (/\/products\/[a-zA-Z0-9-]*/.test(pathName)) {
        pageHandle = pathName.split('products/')[1];
    } else if (pathName !== 'collections/all' && /\/collections\/[a-zA-Z0-9-]*/.test(pathName)) {
        pageHandle = pathName.split('collections/')[1];
    } else if (/\/pages\/[a-zA-Z0-9-]*/.test(pathName)) {
        pageHandle = pathName.split('pages/')[1];
    }

    const msg = utils.parseJSON(rawMsg, 'processEvent');
    if (!msg) {
        return
    }

    const name = msg.name;
    const data = msg.data;
    if (!msg.name) {
        return
    }

    const url = window.location.href;
    const urlObj = new URL(window.location.href);

    switch (name) {
        case SF_CONST.EVENT_COPY:
            let copyData = getCopyData(data)
            utils.copyToClipboard(copyData);
            utils.show_notify('Xong!!!!', 'Đã copy vào clipboard', 'success');
            break;
        case SF_CONST.EVENT_CLEAR_CART:
            storage.set(SF_CONST.KEY_CART_TOKEN, null, false)
            window.location.reload();
            break;
        case SF_CONST.EVENT_CLEAR_FS:
            storage.remove(`${SF_CONST.KEY_FEATURE_SWITCH}_${SF_VAR.shop_id}`, false)
            storage.remove(`${SF_CONST.KEY_FEATURE_SWITCH}_${SF_VAR.shop_id}_expire`, false)
            window.location.reload();
            break;
        case SF_CONST.EVENT_PAGE_SPEED_GT:
            openGtmetrixPs();
            break;
        case SF_CONST.EVENT_PAGE_SPEED_GG:
            window.open(`https://developers.google.com/speed/pagespeed/insights/?url=${url}`)
            break;
        case SF_CONST.EVENT_PARAM_DEBUG:
            urlObj.searchParams.append('sbase_debug', 1);
            window.location.href = urlObj.href;
            break;
        case SF_CONST.EVENT_PARAM_CSR:
            urlObj.searchParams.append('render_csr', 1);
            window.location.href = urlObj.href;
            break;
        case SF_CONST.EVENT_URL_BOOTSTRAP:
            window.open(utils.getBootstrapUrl());
            break;
        case SF_CONST.EVENT_URL_PRODUCT_SINGLE:
            if (!pageHandle) {
                utils.show_notify('Không mở được', 'Đứng ở trang product detail thì mới mở được JSON chứ pa =.=', 'warning')
                return
            }
            window.open(`${window.location.origin}/api/catalog/product.json?handle=${pageHandle}`);
            break;
        case SF_CONST.EVENT_URL_CART:
            window.location.href = `${window.location.origin}/cart`;
            break;
        case SF_CONST.EVENT_URL_CART_JSON:
            window.open(`${window.location.origin}/api/checkout/cart.json?cart_token=${SF_VAR.cart_token}`);
            break;
        case SF_CONST.EVENT_URL_DISCOUNT_JSON:
            window.open(`${window.location.origin}/api/offers/discount.json?cart_token=${SF_VAR.cart_token}&debug=true`);
            break;
        case SF_CONST.EVENT_URL_PRODUCT_LIST:
            window.location.href = `${window.location.origin}/collections/all`;
            break;
        case SF_CONST.EVENT_URL_COLLECTION_SINGLE:
            if (!pageHandle) {
                utils.show_notify('Không mở được', 'Đứng ở trang collection detail thì mới mở được JSON chứ pa =.=', 'warning')
                return
            }
            window.open(`${window.location.origin}/api/catalog/collections_v2.json?handles=${pageHandle}`);
            break;
        case SF_CONST.EVENT_URL_PAGE_SINGLE:
            if (!pageHandle) {
                utils.show_notify('Không mở được', 'Đứng ở trang page detail thì mới mở được JSON chứ pa =.=', 'warning')
                return
            }
            window.open(`${window.location.origin}/api/pages.json?handles=${pageHandle}`);
            break;
        case SF_CONST.EVENT_URL_COLLECTION_LIST:
            window.location.href = `${window.location.origin}/collections`;
            break;
        case SF_CONST.EVENT_URL_LOGIN_AS:
            let hiveUrl = '';
            switch (SF_VAR.env) {
                case SF_CONST.ENV_DEV:
                    hiveUrl = SF_CONST.URL_HIVE_DEV;
                    break;
                case SF_CONST.ENV_STAG:
                    hiveUrl = SF_CONST.URL_HIVE_STAG;
                    break;
                case SF_CONST.ENV_PROD:
                    hiveUrl = SF_CONST.URL_HIVE_PROD;
                    break;
                default:
                    utils.show_notify('Can\'t detect env', 'Can\'t open login as page', 'warning')
                    return
            }

            hiveUrl = `${hiveUrl}/admin/app/shop/list?filter[id][value]=${data}`
            window.open(hiveUrl);
            break;
        case SF_CONST.EVENT_EXPORT_CART:
            // Build object export cart
            const exportCartObj = {
                "action": SF_CONST.EVENT_IMPORT_CART,
                "data": {
                    "url": `${window.location.origin}/cart`,
                    "cart_token": `${SF_VAR.cart_token}`,
                    "checkout_token": `${SF_VAR.checkout_token}`
                }
            }
            // Copy to clip board
            utils.copyToClipboard(JSON.stringify(exportCartObj));
            utils.show_notify('Xong!!!!', 'Đã copy vào clipboard', 'success');
            break;
        case SF_CONST.EVENT_SHARE_ADMIN_URL:
            if (!window.location.href.includes('/admin/')) {
                utils.show_notify('Không copy', 'Bạn ơi, chỉ copy khi bạn đang ở dashboard thui.', 'warning');
                return
            }

            if (!SF_VAR.access_token) {
                utils.show_notify('Không copy', 'Mình không tìm thấy access_token để cóp bi', 'warning');
                return
            }

            let adminUrl = utils.getAppendedUrl('access_token', SF_VAR.access_token)
            // Copy to clip board
            utils.copyToClipboard(adminUrl);
            utils.show_notify('Xong!!!!', 'Đã copy vào clipboard', 'success');
            break;
        case SF_CONST.EVENT_IMPORT_CART:
            const eventObj = utils.parseJSON(data, 'Import cart');
            if (!eventObj || !eventObj.data || eventObj.url) {
                utils.show_notify('Có gì đó éo đúng', 'Hình như data sai rồi pa =.=', 'danger');
                return
            }

            // Set sync action
            const obj = {
                'sync_action': data
            }
            chrome.storage.sync.set(obj, function () {
                utils.sflog('Set to sync storage ' + rawMsg);
            });

            // Go to url
            window.location.href = eventObj.data.url
            break;
        case SF_CONST.EVENT_DEBUG_DISCOUNT:
            debugDiscount();
            break;
        case SF_CONST.EVENT_REBUILD_THEME:
            rebuildTheme(SF_VAR.active_theme.id);
            break;
        case SF_CONST.EVENT_CHANGE_MEDIUM_URL:
            // open new tab
            window.open(data.replace('medium.com', 'medium0.com'))
            break;
    }
}

function getCopyData(dataName) {
    switch (dataName) {
        case 'EXTENSION_URL':
            return SF_CONST.EXTENSION_URL;
        case 'platform_domain':
            return SF_VAR.domain;
        case 'shop_id':
            return SF_VAR.shop_id;
        case 'active_theme_id':
            return SF_VAR.active_theme.id;
        case 'user_id':
            return SF_VAR.user_id;
        case 'page_id':
            return SF_VAR.page_id;
        case 'cart_token':
            return SF_VAR.cart_token;
        case 'checkout_token':
            return SF_VAR.checkout_token;
        case 'access_token':
            return SF_VAR.access_token;
    }

    return ":ehh_boy: no match event"
}

function addDebugPanel() {
    utils.sflog('Generate debug panel')

    const wrapMainFrameHTML = SF_TEMPLATE.getWrapMainFrameHTML();
    const html = $.parseHTML(wrapMainFrameHTML);
    $('body').append(html);

    let iframeContent = SF_TEMPLATE.getMainIFrameHTML()
    const doc = document.getElementById(SF_CONST.ID_SF_TOOL_FRAME).contentWindow.document;
    doc.write(iframeContent);
    doc.close();
}


function sendMessageToChild(name, data) {
    const iframeEl = document.getElementById(SF_CONST.ID_SF_TOOL_FRAME);
    const msg = {name: name, data: data}
    const sendMsg = JSON.stringify(msg);
    iframeEl.contentWindow.postMessage(sendMsg, '*');
}


function openGtmetrixPs() {
    const gtMetrixForm = document.createElement('form')
    gtMetrixForm.method = 'post'
    gtMetrixForm.action = 'https://gtmetrix.com/analyze.html';
    gtMetrixForm.target = `TheWindow${SF_VAR.gtmetrix_index}`
    gtMetrixForm.id = `sf_gt_metrix_form${SF_VAR.gtmetrix_index}`;

    const urlInput = document.createElement('input');
    urlInput.type = 'hidden';
    urlInput.value = window.location.href;
    urlInput.name = 'url';
    gtMetrixForm.appendChild(urlInput);
    document.body.appendChild(gtMetrixForm);

    window.open('', `TheWindow${SF_VAR.gtmetrix_index}`);
    gtMetrixForm.submit();

    SF_VAR.gtmetrix_index++;
}

function sfToggleDebugIcon() {
    let sfToolIcon = document.getElementById('sf-tool-icon');

    if (SF_VAR.icon_display) {
        SF_VAR.icon_display = false;

        sfToolIcon.style.width = '60px';
        sfToolIcon.style.height = '60px';
    } else {
        SF_VAR.icon_display = true;
        sfToolIcon.style.width = '0px';
        sfToolIcon.style.height = '0px';
    }

    // save state

}

async function sfToggleDebugBar() {
    let sfToolIcon = document.getElementById('sf-tool-icon');
    let sfDebugBar = document.getElementById('sf-debug-bar');
    if (!SF_VAR.cart_token || !SF_VAR.checkout_token || !SF_VAR.access_token || SF_VAR.user_id === 0) {
        SF_VAR.cart_token = storage.get(SF_CONST.KEY_CART_TOKEN, false);
        if (SF_VAR.cart_token) {
            SF_VAR.cart_token = utils.removeDoubleQuote(SF_VAR.cart_token)
        }
        SF_VAR.checkout_token = storage.get(SF_CONST.KEY_CHECKOUT_TOKEN, false);
        if (SF_VAR.checkout_token) {
            SF_VAR.checkout_token = utils.removeDoubleQuote(SF_VAR.checkout_token);
        }

        SF_VAR.access_token = storage.get(SF_CONST.KEY_ACCESS_TOKEN, false);
        if (SF_VAR.access_token) {
            SF_VAR.access_token = utils.removeDoubleQuote(SF_VAR.access_token);
        }

        getUserId()

        sendMessageToChild(SF_CONST.EVENT_UPDATE_TOKEN, {
            cart_token: SF_VAR.cart_token,
            checkout_token: SF_VAR.checkout_token,
            access_token: SF_VAR.access_token,
            user_id: SF_VAR.user_id,
        })
    }

    // Update page id
    const currentPath = window.location.pathname;
    if (currentPath !== SF_VAR.current_pathname) {
        SF_VAR.current_pathname = currentPath;
        await getPageInfo();
        sendMessageToChild(SF_CONST.EVENT_UPDATE_PAGE, {
            page_id: SF_VAR.page_id,
            page_type: SF_VAR.page_type,
        });
    }

    // Update quotes
    const randomQuote = SF_VAR.quotes[Math.floor(Math.random() * SF_VAR.quotes.length)];
    sendMessageToChild(SF_CONST.EVENT_UPDATE_QUOTE, {
        quote: randomQuote
    });


    if (SF_VAR.debug_open) {
        SF_VAR.debug_open = false;

        sfDebugBar.style.display = 'none';
        sfToolIcon.style.width = '60px';
        sfToolIcon.style.height = '60px';
    } else {
        SF_VAR.debug_open = true;
        sfDebugBar.style.display = 'block';
        sfToolIcon.style.width = '0px';
        sfToolIcon.style.height = '0px';
    }
}

function keydown(evt) {
    if (!(evt.ctrlKey && evt.altKey && evt.keyCode === 88)) { //CTRL+ALT+X
        return
    }

    let sfToolIcon = document.getElementById('sf-tool-icon');
    let sfDebugBar = document.getElementById('sf-debug-bar');

    if (!sfToolIcon) {
        addIcon();
    }

    if (!sfDebugBar) {
        addDebugPanel();
    }

    if (!SF_VAR.sf) {
        SF_VAR.sf = true
    }

    if (!evt) evt = event;
    sfToggleDebugIcon()
}

function bindEvent(element, eventName, eventHandler) {
    if (element.addEventListener) {
        element.addEventListener(eventName, eventHandler, false);
    } else if (element.attachEvent) {
        element.attachEvent('on' + eventName, eventHandler);
    }
}