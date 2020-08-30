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
    domain: '',
    page_id: 0,
    gtmetrix_index: 0,
    page_type: '',
    handle: '',
    cart_token: '',
    checkout_token: '',
    access_token: '',
    access_token_expire: '',
    preview_access_token: 'dài nên ko hiển thị. Cứ click là copy',
    env: ''
}

const SF_CONST = {
    NOT_SF: "-98",
    NOT_KNOWN_PAGE: "not_known",

    KEY_SHOP_ID: "shop_id",
    KEY_IS_SF: "is_sf",
    KEY_PLATFORM_DOMAIN: "platform_domain",
    KEY_CART_TOKEN: "shop/carts/current-cart-token",
    KEY_FEATURE_SWITCH: "sbase_feature_switch",
    KEY_CHECKOUT_TOKEN: "shop/carts/current-checkout-token",
    KEY_ACCESS_TOKEN: "sbase_shop-access-token",
    KEY_ACCESS_TOKEN_EXPIRE: "sbase_shop-access-token_expire",

    ENV_DEV: 'dev',
    ENV_STAG: 'stag',
    ENV_PROD: 'prod',

    URL_HIVE_DEV: 'https://hive.dev.shopbase.net',
    URL_HIVE_STAG: 'https://hive.stag.shopbase.net',
    URL_HIVE_PROD: 'https://hive.shopbase.com',

    // Receive event
    EVENT_COPY: 'copy',
    EVENT_CLEAR_CART: 'clear_cart',
    EVENT_CLEAR_FS: 'clear_fs',
    EVENT_PAGE_SPEED_GT: 'gtmetrix',
    EVENT_PAGE_SPEED_GG: 'google',
    EVENT_PARAM_DEBUG: 'sbase_debug',
    EVENT_PARAM_CSR: 'render_csr',
    EVENT_URL_BOOTSTRAP: 'bootstrap',
    EVENT_URL_CART: 'cart',
    EVENT_URL_PRODUCT_SINGLE: 'product_single',
    EVENT_URL_PRODUCT_LIST: 'product_list',
    EVENT_URL_COLLECTION_SINGLE: 'collection_single',
    EVENT_URL_PAGE_SINGLE: 'page_single',
    EVENT_URL_COLLECTION_LIST: 'collection_list',
    EVENT_URL_LOGIN_AS: 'login_as',
    EVENT_IMPORT_CART: 'import_cart',
    EVENT_EXPORT_CART: 'export_cart',
    EVENT_EXPORT_ADMIN_URL: 'export_admin_url',
    EVENT_IMPORT_ADMIN_URL: 'import_admin_url',

    ID_SF_TOOL_FRAME: 'sf_tool_iframe',
    // Send event
    EVENT_UPDATE_TOKEN: 'update_token',

    // Chrome sync storage
    KEY_SYNC_ACTION: 'sync_action'
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
        const data = utils.parseJSON(result.sync_action);
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
        debugger
        switch (data.action) {
            case SF_CONST.EVENT_IMPORT_CART:
                storage.set(SF_CONST.KEY_CART_TOKEN, `"${data.data.cart_token}"`, false)
                storage.set(SF_CONST.KEY_CHECKOUT_TOKEN, `"${data.data.checkout_token}"`, false)
                break;
            case SF_CONST.EVENT_IMPORT_ADMIN_URL:
                storage.set(SF_CONST.KEY_ACCESS_TOKEN, `"${data.data.access_token}"`, false)
                storage.set(SF_CONST.KEY_ACCESS_TOKEN_EXPIRE, `"${data.data.access_token_expire}"`, false)
                break;
            default:
                utils.sflog("Invalid action: ", data.action)
                return
        }

        // Remove from sync storage
        chrome.storage.sync.remove(['sync_action'], function () {
            debugger
            utils.sflog('Remove action success');
            window.location.href = data.data.url
        });
    });
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

    // Check has any sync action
    // Get from storage. If has action -> do action, clear sync storage and reload page
    doSyncAction();

    // detect env
    detectEnv()

    if (!SF_VAR.page_type) {
        await getPageInfo();
    }

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
    if (/\/products\/[a-zA-Z0-9-]*/.test(pathName) && !pathName.includes('/admin')) {
        SF_VAR.page_type = 'Product';
        SF_VAR.handle = pathName.split('products/')[1];
        const url = utils.getProductSingleUrl(SF_VAR.handle)
        sfPageObject = await doAjax(url)
        SF_VAR.page_id = sfPageObject ? sfPageObject.id : 0
        console.log('Product page: ', sfPageId)
        return
    } else if (pathName !== 'collections/all' && /\/collections\/[a-zA-Z0-9-]*/.test(pathName) && !pathName.includes('/admin')) {
        SF_VAR.page_type = 'Collection';
        SF_VAR.handle = pathName.split('collections/')[1];

        const url = utils.getCollectionSingleUrl(SF_VAR.handle)
        sfPageObject = await doAjax(url)
        sfPageObject = (sfPageObject && sfPageObject.collections && sfPageObject.collections.length > 0) ? sfPageObject.collections[0] : {id: 0}
        SF_VAR.page_id = sfPageObject.id
        utils.sflog('Collection page: ', SF_VAR.page_id)

    } else if (/\/pages\/[a-zA-Z0-9-]*/.test(pathName)) {
        SF_VAR.page_type = 'Page';
        SF_VAR.handle = pathName.split('pages/')[1];

        const url = utils.getPageSingleUrl(SF_VAR.handle)
        sfPageObject = await doAjax(url)
        sfPageObject = (sfPageObject && sfPageObject.page) ? sfPageObject.page : {id: 0}
        SF_VAR.page_id = sfPageObject.id
        utils.sflog('Page page: ', SF_VAR.page_id)
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
    const regex = /"/gi
    SF_VAR.cart_token = storage.get(SF_CONST.KEY_CART_TOKEN, false);
    if (SF_VAR.cart_token) {
        SF_VAR.cart_token = SF_VAR.cart_token.replace(regex, '')
    }
    SF_VAR.checkout_token = storage.get(SF_CONST.KEY_CART_TOKEN, false);
    if (SF_VAR.checkout_token) {
        SF_VAR.checkout_token = SF_VAR.checkout_token.replace(regex, '');
    }

    SF_VAR.access_token = storage.get(SF_CONST.KEY_ACCESS_TOKEN, false);
    if (SF_VAR.access_token) {
        SF_VAR.access_token = SF_VAR.access_token.replace(regex, '');
    }

    SF_VAR.access_token_expire = storage.get(SF_CONST.KEY_ACCESS_TOKEN_EXPIRE, false);
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
        if (!rawMsg) {
            return
        }
        console.log('receive msg: ', rawMsg)

        // chrome.storage.sync.set({test1: rawMsg}, function () {
        //     console.log('Value is set to ' + rawMsg);
        // });
        //
        // setTimeout(function () {
        //     chrome.storage.sync.get(['test1'], function (result) {
        //         console.log('Value currently is ', result);
        //     });
        // }, 2000)

        const pathName = location.pathname;
        let pageHandle = '';
        if (/\/products\/[a-zA-Z0-9-]*/.test(pathName)) {
            pageHandle = pathName.split('products/')[1];
        } else if (pathName !== 'collections/all' && /\/collections\/[a-zA-Z0-9-]*/.test(pathName)) {
            pageHandle = pathName.split('collections/')[1];
        } else if (/\/pages\/[a-zA-Z0-9-]*/.test(pathName)) {
            pageHandle = pathName.split('pages/')[1];
        }

        const msg = utils.parseJSON(rawMsg);
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
            case SF_CONST.EVENT_EXPORT_ADMIN_URL:
                // Build object export cart
                const exportUrlObj = {
                    "action": SF_CONST.EVENT_IMPORT_ADMIN_URL,
                    "data": {
                        "url": `${window.location.href}`,
                        "access_token": `${SF_VAR.access_token}`,
                        "access_token_expire": `${SF_VAR.access_token_expire}`
                    }
                }
                // Copy to clip board
                utils.copyToClipboard(JSON.stringify(exportUrlObj));
                utils.show_notify('Xong!!!!', 'Đã copy vào clipboard', 'success');
                break;
            case SF_CONST.EVENT_IMPORT_CART:
            case SF_CONST.EVENT_IMPORT_ADMIN_URL:
                const eventObj = utils.parseJSON(data);
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
        }
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
                    break;
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
                    <span class="mp-menu-text">Luôn luôn lắng nghe - lâu lâu mới hiểu</span>
                </div>
                <div class="mp-panel-menu panel-body">
                    <p class="bg bg-success" style="padding: 10px; border-style: groove; border-radius: 10px;">
                        <i class="fa fa-info-circle"></i>
                        Tip: Tính năng chia sẻ cart cực xịn mới ra lò ở tab công cụ</p>
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
                                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.page_id}')">
                                        <td>${SF_VAR.page_type}</td>
                                        <td>${SF_VAR.page_id}</td>
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

                                    <!--                                    <tr>-->
                                    <!--                                        <td>Admin URL-->
                                    <!--                                            <a role="button" data-toggle="collapse" data-parent="#accordion"-->
                                    <!--                                               href="#wtf_is_this" aria-expanded="true"-->
                                    <!--                                               aria-controls="collapseOne"-->
                                    <!--                                               class="fa fa-question-circle">-->
                                    <!--                                            </a>-->
                                    <!--                                        </td>-->
                                    <!--                                        <td>-->
                                    <!--                                            <button class="btn btn-primary"-->
                                    <!--                                                    onclick="sendMessage('${SF_CONST.EVENT_EXPORT_ADMIN_URL}', 'hihi')">-->
                                    <!--                                                <i class="fa fa-cloud-upload" aria-hidden="true"></i>-->
                                    <!--                                                Chia sẻ link-->
                                    <!--                                            </button>-->

                                    <!--                                            <button-->
                                    <!--                                                    role="button" data-toggle="collapse" data-parent="#accordion"-->
                                    <!--                                                    href="#import_url" aria-expanded="true"-->
                                    <!--                                                    aria-controls="collapseOne"-->
                                    <!--                                                    class="btn btn-primary"-->
                                    <!--                                                    onclick="import_action='${SF_CONST.EVENT_IMPORT_ADMIN_URL}';">-->
                                    <!--                                                <i class="fa fa-cloud-download" aria-hidden="true"></i>-->
                                    <!--                                                Import link-->
                                    <!--                                            </button>-->
                                    <!--                                        </td>-->
                                    <!--                                    </tr>-->
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
                                    <p><strong>Người gửi</strong>: click vào "chia sẻ cart", cart tự động copy, gửi cho người cần chia sẻ</p>
                                    <p><strong>Người nhận</strong>: click vào "import cart", nhập nội dung cart, bấm import. Xonggg. </p>
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

    console.log('toggle debug bar now')
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

function sfToggleDebugBar() {
    let sfToolIcon = document.getElementById('sf-tool-icon');
    let sfDebugBar = document.getElementById('sf-debug-bar');
    if (!SF_VAR.cart_token || !SF_VAR.checkout_token || !SF_VAR.access_token) {
        const regex = /"/gi
        SF_VAR.cart_token = storage.get(SF_CONST.KEY_CART_TOKEN, false);
        if (SF_VAR.cart_token) {
            SF_VAR.cart_token = SF_VAR.cart_token.replace(regex, '')
        }
        SF_VAR.checkout_token = storage.get(SF_CONST.KEY_CART_TOKEN, false);
        if (SF_VAR.checkout_token) {
            SF_VAR.checkout_token = SF_VAR.checkout_token.replace(regex, '');
        }

        SF_VAR.access_token = storage.get(SF_CONST.KEY_ACCESS_TOKEN, false);
        if (SF_VAR.access_token) {
            SF_VAR.access_token = SF_VAR.access_token.replace(regex, '');
        }

        sendMessageToChild(SF_CONST.EVENT_UPDATE_TOKEN, {
            cart_token: SF_VAR.cart_token,
            checkout_token: SF_VAR.checkout_token,
            access_token: SF_VAR.access_token,
        })
    }


    console.log('toggle debug bar now')
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

function listenUrlChange(event) {
    var pushState = history.pushState;
    history.pushState = function () {
        pushState.apply(history, arguments);

        // if not page, producct/ collection -> return

        // Get from cache

        // request url

        // Send msg to child
    };
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