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

const SF_CONST = {
    NOT_SF: "-99",
    NOT_KNOWN_PAGE: "not_known",

    KEY_SHOP_ID: "shop_id",
    KEY_IS_SF: "is_sf",
    KEY_PLATFORM_DOMAIN: "platform_domain",
    KEY_CART_TOKEN: "shop/carts/current-cart-token",
    KEY_CHECKOUT_TOKEN: "shop/carts/current-checkout-token",

    EVENT_COPY: 'copy',
    EVENT_CLEAR_CART: 'clear_cart',
    EVENT_PAGE_SPEED_GT: 'gtmetrix',
    EVENT_PAGE_SPEED_GG: 'google',
    EVENT_PARAM_DEBUG: 'sbase_debug',
    EVENT_PARAM_CSR: 'render_csr',
    EVENT_URL_BOOTSTRAP: 'bootstrap',
    EVENT_URL_PRODUCT_SINGLE: 'product_single',
    EVENT_URL_PRODUCT_LIST: 'product_list',
    EVENT_URL_COLLECTION_SINGLE: 'collection_single',
    EVENT_URL_COLLECTION_LIST: 'collection_list',

}


utils.sflog('Starting')

startApplication();


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
    if (/\/products\/[a-zA-Z0-9-]*/.test(pathName)) {
        SF_VAR.page_type = 'Product';
        SF_VAR.handle = pathName.split('products/')[1];
        const url = utils.getProductSingleUrl(SF_VAR.handle)
        sfPageObject = await doAjax(url)
        SF_VAR.page_id = sfPageObject ? sfPageObject.id : 0
        console.log('Product page: ', sfPageId)
        return
    } else if (pathName !== 'collections/all' && /\/collections\/[a-zA-Z0-9-]*/.test(pathName)) {
        SF_VAR.page_type = 'Collection';
        SF_VAR.handle = pathName.split('collections/')[1];

        const url = utils.getCollectionSingleUrl(SF_VAR.handle)
        sfPageObject = await doAjax(url)
        sfPageObject = (sfPageObject && sfPageObject.collections && sfPageObject.collections.length > 0) ? sfPageObject.collections[0] : {id: 0}
        SF_VAR.page_id = sfPageObject.id
        utils.sflog('Collection page: ', SF_VAR.page_id)

    } else {
        SF_VAR.page_type = "NOT_KNOWN_PAGE"
        SF_VAR.page_id = "0"
    }


    // Set cache
    storage.set(pathName, `${SF_VAR.page_type};${SF_VAR.page_id}`)

}

function getFromCache() {
    SF_VAR.sf = storage.get(SF_CONST.KEY_IS_SF)
    SF_VAR.shop_id = storage.get(SF_CONST.KEY_SHOP_ID)
    SF_VAR.domain = storage.get(SF_CONST.KEY_PLATFORM_DOMAIN)

    // Get page type
    const pathName = location.pathname;
    const rawData = storage.get(pathName)
    if (rawData && rawData.length && rawData.split(';').length === 2) {
        const data = rawData.split(';')
        SF_VAR.page_type = data[0];
        SF_VAR.page_id = data[1];
        utils.sflog('Cache page OK')
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
}

async function getBootstrap() {
    let url = utils.getBootstrapUrl();
    let bootstrap = await doAjax(url)
    sfBootstrap = utils.parseBootstrap(bootstrap);
    SF_VAR.shop_id = sfBootstrap.shop_id;
    SF_VAR.domain = sfBootstrap.platform_domain;

    if (sfBootstrap.shop_id === 0) {
        storage.set(SF_CONST.KEY_IS_SF, SF_CONST.NOT_SF)
        SF_VAR.sf = SF_CONST.NOT_SF
    }
}

function addIcon() {
    console.log('Generate icon');
    const rawHtml = `<div id="sf-tool-icon" style="position:fixed;
    width:60px;
    height:60px;
    bottom:40px;
    left:40px;
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
    console.log('Generate debug panel')


    const rawHTML = `<div id="sf-debug-bar" style="display:none; position:fixed; bottom:50px; left:50px;  width: 600px; height: 800px; overflow: hidden; z-index: 99999999">
    <button style="position: absolute; right: 0px; background-color: #d4d4d4; color:red">Đóng lại</button>
    <iframe id="myframe" style="width:100%; height: 100%">

    </iframe>
</div>`
    const html = $.parseHTML(rawHTML);

    $('body').append(html);

    bindEvent(window, 'message', function (e) {
        const rawMsg = e.data;
        if (!rawMsg) {
            return
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

        switch (name) {
            case SF_CONST.EVENT_COPY:
                utils.copyToClipboard(data);
                utils.show_notify('Copied to clipboard', 'OK', 'success');
                break;
            case SF_CONST.EVENT_CLEAR_CART:
                storage.set(SF_CONST.KEY_CART_TOKEN, null, false)
                window.location.reload();
                break;
            case SF_CONST.EVENT_PAGE_SPEED_GG:
                break;
            case SF_CONST.EVENT_PARAM_DEBUG:
                break;
            case SF_CONST.EVENT_PARAM_CSR:
                break;
            case SF_CONST.EVENT_URL_BOOTSTRAP:
                break;
            case SF_CONST.EVENT_URL_PRODUCT_SINGLE:
                break;
            case SF_CONST.EVENT_URL_PRODUCT_LIST:
                break;
            case SF_CONST.EVENT_URL_COLLECTION_SINGLE:
                break;
            case SF_CONST.EVENT_URL_COLLECTION_LIST:
                break;
        }
    });

    let script = `
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></s` + `cript>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></s` + `cript>
    <script>
        // Send a message to the parent
        var sendMessage = function (name, data) {
            // Make sure you are sending a string, and to stringify JSON
            const msg = {name: name, data: data}
            const sendMsg = JSON.stringify(msg);
            window.parent.postMessage(sendMsg, '*');
        };
    
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
<body>
<!--Start body-->
    <!--Start static panel-->
    <div class="panel panel-primary">
        <div class="panel-heading">
            <i class="fa fa-bug"> </i>
            <span class="mp-menu-text">Debug theo cách của bạn và fix theo cách của chúng tôi</span>
        </div>
        <div class="mp-panel-menu panel-body">
            <div class="mp-padding-10">
                <h3 class="text-danger">
                    <button class="btn">
                        <i class="fa fa-refresh"></i>
                    </button>
                    Thông tin cơ bản (click để copy)

                </h3>

                <table class="table table-hover">
                    <thead>
                    <tr>
                        <th>Loại thông tin</th>
                        <th>Giá trị</th>
                    </tr>
                    </thead>

                    <tbody>
                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.shop_id}')">
                        <td>Shop id</td>
                        <td>${SF_VAR.shop_id}</td>
                    </tr>
                    <tr  onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.page_id}')">
                        <td>${SF_VAR.page_type}</td>
                        <td>${SF_VAR.page_id}</td>
                    </tr>
                    <tr  onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.cart_token}')">
                        <td>Cart token</td>
                        <td>${SF_VAR.cart_token}</td>
                    </tr>
                    <tr  onclick="sendMessage('${SF_CONST.EVENT_COPY}', '${SF_VAR.checkout_token}')">
                        <td>Checkout token</td>
                        <td>${SF_VAR.checkout_token}</td>
                    </tr>
                    </tbody>
                </table>

                <h3 class="text-danger">
                    <button class="btn">
                        <i class="fa fa-wrench"></i>
                    </button>
                    Tools
                </h3>
                <table class="table table-hover">
                    <tbody>
                    <tr>
                        <td>
                            Clear things
                        </td>
                        <td>
                            <button class="btn btn-danger"  onclick="sendMessage('${SF_CONST.EVENT_CLEAR_CART}', '${SF_VAR.cart_token}')">
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
    <!--End body-->

    <!--Start footer-->
    <div class="row">
    </div>
    <!--End footer-->
</body>
</html>
`;
    const doc = document.getElementById('myframe').contentWindow.document;
    doc.write(rawHTML2);
    doc.close();
}

function sfToggleDebugBar() {
    let sfToolIcon = document.getElementById('sf-tool-icon');
    let sfDebugBar = document.getElementById('sf-debug-bar');

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

function keydown(evt) {
    if (!(evt.ctrlKey && evt.altKey && evt.keyCode === 88)) { //CTRL+ALT+X
        return
    }

    if (!SF_VAR.sf) {
        utils.sflog('Force storefront :nhin_scare:')
        addIcon();
        addDebugPanel();
        SF_VAR.sf = true
    }

    if (!evt) evt = event;
    sfToggleDebugBar()
}

function bindEvent(element, eventName, eventHandler) {
    if (element.addEventListener) {
        element.addEventListener(eventName, eventHandler, false);
    } else if (element.attachEvent) {
        element.attachEvent('on' + eventName, eventHandler);
    }
}