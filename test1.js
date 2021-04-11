// javascript: !function () {
//     function getAuth(){
//         let rawBase64 = localStorage.getItem('sbase_auth');
//         if (!rawBase64) {
//             return;
//         }
//
//         const regex = /"/gi;
//         rawBase64 = rawBase64.replace(regex, '');
//
//         return JSON.parse(decodeURI(atob(rawBase64)));
//     }
//
//     function copyToClipboard(str){
//         const el = document.createElement('textarea');
//         el.value = str;
//         el.setAttribute('readonly', '');
//         el.style.position = 'absolute';
//         el.style.left = '-9999px';
//         document.body.appendChild(el);
//         el.select();
//         document.execCommand('copy');
//         document.body.removeChild(el);
//         console.log('Copied to clipboard');
//     }
//
//     copyToClipboard(getAuth().accessToken);
//
// }()