// Idea: Tách file template ra 1 file chứa các function build -> giảm thời gian scroll ở file main
// data.script
// data.variable

// Lưu ý: cần cho file constants chạy trước file này

const SF_TEMPLATE = {
    getMainIFrameHTML: () => {
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
        return `<!DOCTYPE html>
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
                    <span class="mp-menu-text" onclick="sendMessage('${SF_CONST.EVENT_COPY}', 'EXTENSION_URL')">Click vào đây để copy URL extension</span>
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
                                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', 'platform_domain')">
                                        <td>Platform domain</td>
                                        <td>${SF_VAR.domain}</td>
                                    </tr>
                                    <tr>
                                        <td>Shop id</td>
                                        <td>
                                            <span onclick="sendMessage('${SF_CONST.EVENT_COPY}', 'shop_id')">${SF_VAR.shop_id}</span>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_URL_LOGIN_AS}', '${SF_VAR.shop_id}')">
                                                <i class="fa fa-external-link-square" aria-hidden="true"></i> Login as
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Active theme</td>
                                        <td>
                                            <span onclick="sendMessage('${SF_CONST.EVENT_COPY}', 'active_theme_id')">${SF_VAR.active_theme.id}</span>
                                            <button class="btn btn-primary"
                                                    onclick="sendMessage('${SF_CONST.EVENT_REBUILD_THEME}', 'active_theme_id')">
                                                <i class="fa fa-refresh" aria-hidden="true"></i> Rebuild
                                            </button>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>User id</td>
                                        <td onclick="sendMessage('${SF_CONST.EVENT_COPY}', 'user_id')">
                                            <span id="user_id">${SF_VAR.user_id}</span>
                                        </td>
                                    </tr>
                                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', 'page_id')">
                                        <td id="page_type">${SF_VAR.page_type}</td>
                                        <td id="page_id">${SF_VAR.page_id}</td>
                                    </tr>
                                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', 'cart_token')">
                                        <td>Cart token</td>
                                        <td id="cart_token">${SF_VAR.cart_token}</td>
                                    </tr>
                                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', 'checkout_token}')">
                                        <td>Checkout token</td>
                                        <td id="checkout_token">${SF_VAR.checkout_token}</td>
                                    </tr>
                                    <tr onclick="sendMessage('${SF_CONST.EVENT_COPY}', 'access_token')">
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
                                                    onclick="sendMessage('${SF_CONST.EVENT_CLEAR_CART}', 'cart_token')">
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
                                            <button class="btn btn-primary"
                                                    title="Link cart json"
                                                    onclick="sendMessage('${SF_CONST.EVENT_URL_CART_JSON}', '')">
                                                <i class="fa fa-cart-plus" aria-hidden="true"></i>
                                            </button>
                                            <button class="btn btn-primary"
                                                    title="Link discount json có debug hihi"
                                                    onclick="sendMessage('${SF_CONST.EVENT_URL_DISCOUNT_JSON}', '')">
                                                <i class="fa fa-money" aria-hidden="true"></i>
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
`
    },
    getIconHTML: () => {
        return `<div id="sf-tool-icon" style="position:fixed;
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


    },
    getWrapMainFrameHTML: () => {
        return `<div id="sf-debug-bar" style="display:none; position:fixed; bottom:60px; right:20px;  width: 600px; height: 68vh; overflow: hidden; z-index: 99999999">
    <button style="position: absolute; right: 0px; background-color: #d4d4d4; color:red">Đóng lại</button>
    <iframe id="${SF_CONST.ID_SF_TOOL_FRAME}" style="width:100%; height: 100%; border: none;">

    </iframe>
</div>`
    }
}