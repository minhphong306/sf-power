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

startApplication();


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
        let response = await doAjax(SF_CONST.QUOTE_URL)
        let rawQuotes = response["files"]["quotes.json"]["content"]
        SF_VAR.quotes = utils.parseJSON(rawQuotes, 'Quote') || ["Chúc bạn ngày mới tốt lành"];
    } catch (e) {
        console.log('error get quotes: ', e)
    }
}

async function getDiscountInfo(orderId) {
    try {
        const orderUrl = `${window.location.origin}/admin/orders/discount-info.json?access_token=${SF_VAR.access_token}&order_id=${orderId}`
        let rawResp = await doAjax(orderUrl)
        return utils.parseJSON(rawResp, 'get discount info');
    } catch (e) {
        utils.sflog('Error get discount info: ', e)
        return {}
    }
}


async function getOrderInfo(orderId) {
    try {
        const orderUrl = `${window.location.origin}/admin/orders/${orderId}.json?access_token=${SF_VAR.access_token}`
        let rawResp = await doAjax(orderUrl)
        return utils.parseJSON(rawResp, 'get discount info');
    } catch (e) {
        utils.sflog('Error get discount info: ', e)
        return {}
    }
}

async function debugDiscount() {
    const pathname = window.location.pathname;
    const regexOrderUrl = /\/admin\/orders\/(\d+)/g;
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
        let rawResp = await doAjax(themeUrl)
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


async function startApplication() {
    // Get from cache
    getFromCache()
    if (SF_VAR.sf === SF_CONST.NOT_SF) {
        return
    }

    // If not ok, request boostrap
    if (!SF_VAR.shop_id) {
        await getBootstrap();
        if (SF_VAR.sf === SF_CONST.NOT_SF) {
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
        sfPageObject = await doAjax(url)
        SF_VAR.page_id = sfPageObject ? sfPageObject.id : 0
        return
    } else if (pathName !== 'collections/all' && /\/collections\/[a-zA-Z0-9-]*/.test(pathName)) {
        SF_VAR.page_type = 'Collection';
        SF_VAR.handle = pathName.split('collections/')[1];

        const url = utils.getCollectionSingleUrl(SF_VAR.handle)
        sfPageObject = await doAjax(url)
        sfPageObject = (sfPageObject && sfPageObject.collections && sfPageObject.collections.length > 0) ? sfPageObject.collections[0] : {id: 0}
        SF_VAR.page_id = sfPageObject.id

    } else if (/\/pages\/[a-zA-Z0-9-]*/.test(pathName)) {
        SF_VAR.page_type = 'Page';
        SF_VAR.handle = pathName.split('pages/')[1];

        const url = utils.getPageSingleUrl(SF_VAR.handle)
        sfPageObject = await doAjax(url)
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

async function getBootstrap() {
    let url = utils.getBootstrapUrl();
    let bootstrap = await doAjax(url)
    sfBootstrap = utils.parseBootstrap(bootstrap);
    SF_VAR.shop_id = sfBootstrap.shop_id;
    SF_VAR.domain = sfBootstrap.platform_domain;

    if (sfBootstrap.shop_id === 0) {

        const domain = window.location.hostname;
        SF_VAR.sf = SF_CONST.NOT_SF
        // Handle error for case create store or store has password
        if (domain.includes('.myshopbase.net') || domain.includes('.onshopbase.com')) {
            return
        }
        storage.set(SF_CONST.KEY_IS_SF, SF_CONST.NOT_SF)
    }
}

function addIcon() {
    utils.sflog('Generate icon');
    const rawHtml = `<div id="sf-tool-icon" style="position:fixed;
    width:60px;
    height:60px;
    bottom:85px;
    right:30px;
    background-image: url('https://gblobscdn.gitbook.com/spaces%2F-LbgZ5I9YLGCL2kxzq2a%2Favatar.png?alt=media&width=100');
    background-size: contain;
    color:#FFF;
    border-radius:50px;
    text-align:center;
    box-shadow: 2px 2px 3px #999;
    z-index: 999999;">
    </div>`
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
        utils.show_notify('Lỗi','Không tìm thấy access token')
        return
    }

    if (!themeId) {
        utils.show_notify('Lỗi', `Theme id không đúng: ${themeId}`, 'error')
        return
    }

    utils.show_notify('Đang build','Đang build lại theme', 'warning', 1000)
    try {
        const themeUrl = `${window.location.origin}/admin/themes/build.json?access_token=${SF_VAR.access_token}&id=${themeId}`
        let rawResp = await doAjax(themeUrl)
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
            utils.copyToClipboard(data);
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
    }
}

function addDebugPanel() {
    utils.sflog('Generate debug panel')


    const rawHTML = `<div id="sf-debug-bar" style="display:none; position:fixed; bottom:60px; right:20px;  width: 600px; height: 68vh; overflow: hidden; z-index: 99999999">
    <button style="position: absolute; right: 0px; background-color: #d4d4d4; color:red">Đóng lại</button>
    <iframe id="${SF_CONST.ID_SF_TOOL_FRAME}" style="width:100%; height: 100%; border: none;">

    </iframe>
</div>`
    const html = $.parseHTML(rawHTML);

    $('body').append(html);

    bindEvent(window, 'message', function (e) {
        const rawMsg = e.data;
        processEvent(rawMsg);
    });


    let script = `
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></s` + `cript>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></s` + `cript>
    <script>
        let import_action = ''; 
        // Send a message to the parent
        var sendMessage = function (name, data) {
            // Make sure you are sending a string, and to stringify JSON
            const msg = {name: name, data: data}
            const sendMsg = JSON.stringify(msg);
            window.parent.postMessage(sendMsg, '*');
        }; 
        
        function parseJSON(raw) {
            try {
                const parsed = JSON.parse(raw);
                return parsed;
            } catch {
                return ""
            }
        }
        
        // Listen message from parent
        // Listen to messages from parent window
        bindEvent(window, 'message', function (e) {
            const rawMsg = e.data;
            if (!rawMsg) {
                return
            }     
            
            const msg = parseJSON(rawMsg);
            if (!msg) {
                return
            }
    
            const name = msg.name;
            const data = msg.data;
            if (!msg.name) {
                return
            }
                
            switch (name) {
                case '${SF_CONST.EVENT_UPDATE_TOKEN}':
                    document.getElementById('cart_token').innerText = data.cart_token;
                    document.getElementById('checkout_token').innerText = data.checkout_token;
                    document.getElementById('access_token').innerText = data.access_token;
                    document.getElementById('user_id').innerText = data.user_id;
                    break;
                case '${SF_CONST.EVENT_UPDATE_PAGE}':
                    document.getElementById('page_type').innerText = data.page_type;
                    document.getElementById('page_id').innerText = data.page_id;
                    break;
                case '${SF_CONST.EVENT_UPDATE_QUOTE}':
                    document.getElementById('quote').innerText = data.quote;
            }
        });
        
        function bindEvent(element, eventName, eventHandler) {
        if (element.addEventListener) {
            element.addEventListener(eventName, eventHandler, false);
        } else if (element.attachEvent) {
            element.attachEvent('on' + eventName, eventHandler);
        }
    }
    
    function changeStatus(status) {
        let textElem = document.getElementById('textStatus')
        if (status === 'like') {
             textElem.innerText= 'I love you 3000 ♥♥';
        } else {
            textElem.innerText = 'Okay 😭';
        }
    }
    
    function sendFeedback() {
        const currentTime = Math.floor(Date.now() / 1000);
        let name = document.getElementById('feedback_name').value;
        let note = document.getElementById('feedback_note').value;
        $.ajax({
            url: "https://hooks.slack.com/services/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   ",
            type: "post",
            data: JSON.stringify({
                "attachments": [
                    {
                        "fallback": "Required plain-text summary of the attachment.",
                        "color": "#36a64f",
                        "pretext": "Đại ca <@UC0CE05JP> ơi, có góp ý này :amaze:",
                        "fields": [
                            {
                                "title": "Tên",
                                "value": name
                            },
                            {
                                "title": "Nội dung góp ý",
                                "value": note
                            }
                        ],
                        "footer": "SF Power extension",
                        "footer_icon": "https://gblobscdn.gitbook.com/spaces%2F-LbgZ5I9YLGCL2kxzq2a%2Favatar.png",
                        "ts": currentTime
                    }
                ]
            }),success: function (response) {
                document.getElementById('feedback_form').style.display = 'none';
                document.getElementById('feedback_response').style.display = 'block';
            }
        });
    }
    
    
    function changeToolHint(toolName) {
        const textElem = document.getElementById('wtf_is_this')
        let htmlText = '';
        switch(toolName) {
            case 'share_cart':
                htmlText = '<p>Sao chép cart của người khác trong 1 nốt nhạc 🎶</p><hr><p><strong>Người gửi</strong>: click vào "chia sẻ cart", cart tự động copy, gửi chongười cần chia sẻ</p><p><strong>Người nhận</strong>: click vào "import cart", nhập nội dung cart, bấm import. Xonggg.</p>';
                break;
            case 'admin_url':
                htmlText = '<p>Sao chép link admin, chia sẻ cho người khác mà ko cần tài khoản, mật khẩu</p><hr><p><strong>Lưu ý</strong>: Không nên dùng với shop khách. Rất nguy hiểm</p>';
                break;
        }

        textElem.innerHTML = htmlText;
    }
    
    function importUrl(){
        const data = document.getElementById('import_url_content').value;
        sendMessage(import_action, data);
    }
    
    </s` + `cript>`


    let rawHTML2 = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>abc</title>
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">
    ${script}

<link href="https://fonts.googleapis.com/css?family=Raleway" rel="stylesheet">
<style>
    
</style>

</head>
<body style="background-color: transparent">
<div class="container">
    <div class="row">
        <div class="col-md-5">
            <div class="panel panel-primary">
                <div class="panel-heading">
                    <i class="fa fa-bug"> </i>
                    <span class="mp-menu-text" onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_CONST.EXTENSION_URL}')">Click vào đây để copy URL extension</span>
                </div>
                <div class="mp-panel-menu panel-body">
                    <div class="bg bg-success" style="padding: 10px; border-style: groove; border-radius: 10px;">
                        <p>
                            <i class="fa fa-info-circle"></i>
                            <span id="quote"></span>
                        </p>
                    </div>

                    <div>
                        <!-- Nav tabs -->
                        <ul class="nav nav-tabs" role="tablist">
                            <li role="presentation" class="active"><a href="#basic" aria-controls="basic" role="tab"
                                                                      data-toggle="tab">Thông tin cơ bản</a></li>
                            <li role="presentation"><a href="#tools" aria-controls="tools" role="tab" data-toggle="tab">Công
                                cụ</a></li>
                            <li role="presentation"><a href="#urls" aria-controls="urls" role="tab" data-toggle="tab">Link
                                nhanh</a></li>
                            <li role="presentation"><a href="#feedback" aria-controls="front" role="tab"
                                                       data-toggle="tab">Góp ý</a></li>
                        </ul>

                        <!-- Tab panes -->
                        <div class="tab-content">
                            <div role="tabpanel" class="tab-pane active" id="basic">
                                <h3 class="text-danger">
                                    <button class="btn">
                                        <i class="fa fa-refresh"></i>
                                    </button>
                                    Click để copy (không cần bôi đen)

                                </h3>

                                <table class="table table-hover">
                                    <thead>
                                    <tr>
                                        <th>Thông tin</th>
                                        <th>Giá trị</th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.shop_id}')">
                                        <td>Platform domain</td>
                                        <td>${SF_VAR.domain}</td>
                                    </tr>
                                    <tr>
                                        <td>Shop id</td>
                                        <td>
                                            <span onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.shop_id}')">${SF_VAR.shop_id}</span>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_URL_LOGIN_AS}', '${SF_VAR.shop_id}')">
                                                <i class="fa fa-external-link-square" aria-hidden="true"></i> Login as
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Active theme</td>
                                        <td>
                                            <span onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.active_theme.id}')">${SF_VAR.active_theme.id}</span>
                                            <button class="btn btn-primary" onclick="sendMessage('${SF_CONST.EVENT_REBUILD_THEME}', '${SF_VAR.active_theme.id}')">
                                                <i class="fa fa-refresh" aria-hidden="true"></i> Rebuild
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>User id</td>
                                        <td onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.user_id}')">
                                            <span id="user_id">${SF_VAR.user_id}</span>
                                        </td>
                                    </tr>
                                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.page_id}')">
                                        <td id="page_type">${SF_VAR.page_type}</td>
                                        <td id="page_id">${SF_VAR.page_id}</td>
                                    </tr>
                                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.cart_token}')">
                                        <td>Cart token</td>
                                        <td id="cart_token">${SF_VAR.cart_token}</td>
                                    </tr>
                                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.checkout_token}')">
                                        <td>Checkout token</td>
                                        <td id="checkout_token">${SF_VAR.checkout_token}</td>
                                    </tr>
                                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.access_token}')">
                                        <td>Access token</td>
                                        <td id="access_token">${SF_VAR.preview_access_token}</td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div role="tabpanel" class="tab-pane" id="tools">
                                <h3 class="text-danger">
                                    <button class="btn">
                                        <i class="fa fa-wrench"></i>
                                    </button>
                                    Công cụ thường dùng
                                </h3>
                                <table class="table table-hover">
                                    <tbody>
                                    <tr>
                                        <td>
                                            Xóa các thứ
                                        </td>
                                        <td>
                                            <button class="btn btn-danger"
                                                    onclick="sendMessage('${SF_CONST.EVENT_CLEAR_CART}', '${SF_VAR.cart_token}')">
                                                <i class="fa fa-cart-arrow-down" aria-hidden="true"></i>
                                                Xóa cart
                                            </button>
                                            <button title="Clear feature switch" class="btn btn-danger"
                                                    onclick="sendMessage('${SF_CONST.EVENT_CLEAR_FS}', '')">
                                                <i class="fa fa-file-text-o" aria-hidden="true"></i>
                                                Xóa feature switch
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Đo page speed</td>
                                        <td>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_PAGE_SPEED_GT}', 'hihi')">
                                                <i class="fa fa-motorcycle" aria-hidden="true"></i>
                                                Gtmetrix
                                            </button>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_PAGE_SPEED_GG}', 'hihi')">
                                                <i class="fa fa-google" aria-hidden="true"></i>
                                                Google
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Params</td>
                                        <td>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_PARAM_DEBUG}', 'hihi')">
                                                <i class="fa fa-bug" aria-hidden="true"></i>
                                                Sbase debug
                                            </button>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_PARAM_CSR}', 'hihi')">
                                                <i class="fa fa-spinner" aria-hidden="true"></i>
                                                Render csr
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Sao chép cart
                                            <a role="button" data-toggle="collapse" data-parent="#accordion"
                                               href="#wtf_is_this" aria-expanded="true"
                                               aria-controls="collapseOne"
                                               onclick="changeToolHint('share_cart')"
                                               class="fa fa-question-circle">
                                            </a>
                                        </td>
                                        <td>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_EXPORT_CART}', 'hihi')">
                                                <i class="fa fa-cloud-upload" aria-hidden="true"></i>
                                                Chia sẻ cart
                                            </button>

                                            <button
                                                    role="button" data-toggle="collapse" data-parent="#accordion"
                                                    href="#import_url" aria-expanded="true"
                                                    aria-controls="collapseOne"
                                                    class="btn btn-primary"
                                                    onclick="import_action='${SF_CONST.EVENT_IMPORT_CART}';">
                                                <i class="fa fa-cloud-download" aria-hidden="true"></i>
                                                Import cart
                                            </button>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td>Admin URL
                                            <a role="button" data-toggle="collapse" data-parent="#accordion"
                                               href="#wtf_is_this" aria-expanded="true"
                                               aria-controls="collapseOne"
                                               onclick="changeToolHint('admin_url')"
                                               class="fa fa-question-circle">
                                            </a>
                                        </td>
                                        <td>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_SHARE_ADMIN_URL}', 'hihi')">
                                                <i class="fa fa-cloud-upload" aria-hidden="true"></i>
                                                Chia sẻ link
                                            </button>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>

                                <div id="import_url" class="panel-collapse collapse" role="tabpanel"
                                     aria-labelledby="headingOne">
                                    <div class="panel-body">
                                         <textarea id="import_url_content" class="form-control" rows="3"
                                                   placeholder="Nhập nội dung cần import"
                                                   style="margin-bottom: 10px;"></textarea>
                                        <button class="btn btn-default" onclick="importUrl()">
                                            <i class="fa fa-cloud-download"></i>
                                            Import ngay
                                        </button>
                                    </div>
                                </div>

                                <div id="wtf_is_this" class="panel-collapse collapse" role="tabpanel"
                                     aria-labelledby="headingOne" style="padding-left: 10px; font-size: 15px;">
                                    <p>Sao chép cart của người khác trong 1 nốt nhạc 🎶</p>
                                    <hr>
                                    <p><strong>Người gửi</strong>: click vào "chia sẻ cart", cart tự động copy, gửi cho
                                        người cần chia sẻ</p>
                                    <p><strong>Người nhận</strong>: click vào "import cart", nhập nội dung cart, bấm
                                        import. Xonggg. </p>
                                </div>
                            </div>

                            <div role="tabpanel" class="tab-pane" id="urls">
                                <h3 class="text-danger">
                                    <button class="btn">
                                        <i class="fa fa-link"></i>
                                    </button>
                                    Link nhanh thường dùng
                                </h3>
                                <table class="table table-hover">
                                    <tbody>
                                    <tr>
                                        <td>
                                            Bootstrap
                                        </td>
                                        <td>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_URL_BOOTSTRAP}', 'hihi')">
                                                <i class="fa fa-info-circle" aria-hidden="true"></i>
                                                Bootstrap
                                            </button>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_URL_CART}', '')">
                                                <i class="fa fa-cart-plus" aria-hidden="true"></i>
                                                Trang cart
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Product</td>
                                        <td>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_URL_PRODUCT_SINGLE}', 'hihi')">
                                                <i class="fa fa-cube" aria-hidden="true"></i>
                                                JSON product single
                                            </button>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_URL_PRODUCT_LIST}', 'hihi')">
                                                <i class="fa fa-cubes" aria-hidden="true"></i>
                                                Trang collections/all
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Collection</td>
                                        <td>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_URL_COLLECTION_SINGLE}', 'hihi')">
                                                <i class="fa fa-object-group" aria-hidden="true"></i>
                                                JSON collection single
                                            </button>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_URL_COLLECTION_LIST}', 'hihi')">
                                                <i class="fa fa-object-group" aria-hidden="true"></i>
                                                Trang Collection list
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Page</td>
                                        <td>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_URL_PAGE_SINGLE}', 'hihi')">
                                                <i class="fa fa-object-group" aria-hidden="true"></i>
                                                JSON page single
                                            </button>
                                        </td>
                                    </tr>

                                    </tbody>
                                </table>
                            </div>

                            <div role="tabpanel" class="tab-pane" id="feedback">
                                <style>
                                    .span4 img {
                                        margin-right: 10px;
                                    }

                                    .span4 .img-left {
                                        float: left;
                                    }

                                </style>
                                <div>
                                    <div class="block" style="padding-bottom: 10px; padding-top:10px;">
                                        <div class="row">
                                            <div class="span4" style=" font-size: 15px;">
                                                <img class="img-left"
                                                     src="https://photo2.tinhte.vn/data/attachment-files/2020/08/5117254_will-find-you-andi-will-say-thank-you-meme-maker-51714148.jpg"
                                                     style="width: 200px; margin-left: 20px;"/>
                                                <p>Cảm ơn bạn đã tin tưởng và sử dụng extension.</p>
                                                <p>Hi vọng, nó giúp bạn làm việc hiệu quả hơn ^^</p>
                                                <p class="text-danger" id="textStatus"></p>
                                                <p>
                                                    <button onclick="changeStatus('like')" class="btn btn-success"><i
                                                            class="fa fa-thumbs-o-up"></i>
                                                    </button>
                                                    <button onclick="changeStatus('dislike')" class="btn btn-danger"><i
                                                            class="fa fa-thumbs-o-down"></i>
                                                    </button>
                                                </p>
                                            </div>
                                        </div>

                                    </div>
                                    <div class="panel-group" id="accordion" role="tablist" aria-multiselectable="true">
                                        <div class="panel panel-primary" style="margin-bottom: 25px;">
                                            <div class="panel-heading" role="tab" id="headingOne">
                                                <h4 class="panel-title text-danger">
                                                    <a role="button" data-toggle="collapse" data-parent="#accordion"
                                                       href="#info" aria-expanded="true"
                                                       aria-controls="collapseOne" class="text-danger">
                                                        Thông tin tác giả (click để hiện)
                                                    </a>
                                                </h4>
                                            </div>
                                            <div id="info" class="panel-collapse collapse" role="tabpanel"
                                                 aria-labelledby="headingOne">
                                                <div class="panel-body">
                                                    <p>
                                                        <i class="fa fa-facebook-square  menu-icon"></i>
                                                        <a href="https://fb.com/dominhphong.18" target="_blank">Do Minh
                                                            Phong</a>
                                                    </p>
                                                    <p>
                                                        <i class="fa fa-wordpress menu-icon"></i>
                                                        <a href="https://minhphong306.wordpress.com" target="_blank">Blog</a>
                                                    </p>
                                                    <p>
                                                        <i class="fa fa-envelope  menu-icon"></i>
                                                        <a href="mailto:dominhphong306@gmail.com" target="_blank">dominhphong306@gmail.com</a>
                                                    </p>
                                                    <p>
                                                        <i class="fa fa-skype  menu-icon"></i>
                                                        <a href="skype:phongsniper25"
                                                           target="_blank">live:phongsniper25</a>
                                                    </p>
                                                    <p>
                                                        <i class="fa fa-github  menu-icon"></i>
                                                        <a href="https://github.com/minhphong306" target="_blank">minhphong306</a>
                                                    </p>
                                                    <p>
                                                        <i class="fa fa-stack-overflow  menu-icon"></i>
                                                        <a href="https://stackoverflow.com/users/7228412/do-minh-phong"
                                                           target="_blank">minhphong306</a>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <hr/>


                                        <div id="feedback_form">
                                            <p style="padding-left: 10px; font-size: 15px;">Bạn có góp ý? Ngại gì không
                                                gửi ngay cho mình
                                                ^^</p>
                                            <input id="feedback_name" type="text" class="form-control"
                                                   placeholder="Tên bạn là gì?"
                                                   style="margin-bottom: 10px;">
                                            <textarea id="feedback_note" class="form-control" rows="3"
                                                      placeholder="Bạn có góp ý gì?"
                                                      style="margin-bottom: 10px;"></textarea>
                                            <button class="btn btn-default" onclick="sendFeedback()">
                                                <i class="fa fa-send"></i>
                                                Gửi ngay
                                            </button>
                                        </div>
                                        <div class="bg bg-success" id="feedback_response"
                                             style="font-size: 16px; border-radius: 10px; padding: 10px; display: none;">
                                            Cảm ơn bạn. Tớ đã nhận được góp ý và sẽ phản hồi lại bạn nếu có thể ^^
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>


        <div id="sf-tool-icon" class="sf-float">

        </div>
    </div>
</body>
</html>
`;
    const doc = document.getElementById(SF_CONST.ID_SF_TOOL_FRAME).contentWindow.document;
    doc.write(rawHTML2);
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