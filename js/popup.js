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