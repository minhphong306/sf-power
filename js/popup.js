document.getElementById('changeUrl').onclick = function () {
    let inputURL = document.getElementById('url').value;
    if (!inputURL || inputURL.length === 0 || !inputURL.includes('medium.com')) {
        document.getElementById('err_msg').innerText = 'Url có gì đó không đúng :cam_thingkingface:';
        return
    }

    const msg = {name: "change_medium_url", data: inputURL}

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, msg, function (response) {
            console.log(response);
        });
    });
}

document.getElementById('checkA').onclick = function () {
    let inputURL = document.getElementById('dnsUrl').value;
    if (!inputURL || inputURL.length === 0) {
        document.getElementById('err_msg2').innerText = 'Url có gì đó không đúng :cam_thingkingface:';
        return
    }

    if (inputURL.startsWith("http://")) {
        inputURL = inputURL.replace("http://", "")
    }

    if (inputURL.startsWith("https://")) {
        inputURL = inputURL.replace("https://", "")
    }


    let nonWww, www = '';
    if (inputURL.startsWith("www.")) {
        www = inputURL;
        nonWww = inputURL.replace('www.', '')
    } else {
        nonWww = inputURL;
        www = "www." + inputURL
    }

    window.open(`https://dnschecker.org/#A/` + nonWww)
    window.open(`https://dnschecker.org/#CNAME/` + www)
}

document.getElementById('checkCname').onclick = function () {
    let inputURL = document.getElementById('dnsUrl').value;
    if (!inputURL || inputURL.length === 0) {
        document.getElementById('err_msg2').innerText = 'Url có gì đó không đúng :cam_thingkingface:';
        return
    }

    if (inputURL.startsWith("http://")) {
        inputURL = inputURL.replace("http://", "")
    }

    if (inputURL.startsWith("https://")) {
        inputURL = inputURL.replace("https://", "")
    }

    let nonWww, www = '';
    if (inputURL.startsWith("www.")) {
        www = inputURL;
        nonWww = inputURL.replace('www.', '')
    } else {
        nonWww = inputURL;
        www = "www." + inputURL
    }

    window.open(`https://dnschecker.org/#CNAME/` + www)
    window.open(`https://dnschecker.org/#A/` + nonWww)
}