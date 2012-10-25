// ==UserScript==
// @name        gist logs
// @namsgpace   https://www.hatena.ne.jp/noromanba/
// @description Show commit logs on Gist for Greasemonkey
// @include     https://gist.github.com/*
// @grant       GM_xmlhttpRequest
// @version     2012.10.12.2
// @license     WTFPL http://sam.zoy.org/wtfpl/ (Do What The Fuck You Want To Public License)
// @contributor satyr           https://gist.github.com/107780
// @contributor saitamanodoruji https://gist.github.com/2653937
// @contributor syoichi         https://gist.github.com/3121904
// @author      noromanba (https://www.hatena.ne.jp/noromanba/)
// @homepage    https://gist.github.com/2669793
// @icon        https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Talk_icon.svg/32px-Talk_icon.svg.png
// @icon64      https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Talk_icon.svg/64px-Talk_icon.svg.png
// ==/UserScript==

// Icon (Public Domain by Jonathan)
// https://commons.wikimedia.org/wiki/File:Talk_icon.svg

// c.f. http://d.hatena.ne.jp/murky-satyr/20090508/gist_logs
(function () {
    if (!(/^https:\/\/gist\.github\.com\/\w+/.test(location.href))) return;

    var addStyle  = (function () {
        var parent = document.head || document.body;

        var style = document.createElement('style');
        style.type = 'text/css';
        parent.appendChild(style);

        return function (css) {
            style.appendChild(document.createTextNode(css + '\n'));
        };
    })();

    var indicator = (function () {
        var board;
        if (!(board = document.querySelector('#revisions h3'))) return;

        var spinner = document.createElement('img');
        spinner.src = 'https://assets.github.com/images/spinners/octocat-spinner-32.gif';
        var style = spinner.style;
        style.display = 'inline-block';
        style.marginLeft = '5px';
        style.height = '16px';

        board.appendChild(spinner);

        var timer, threshold = 1500;
        return {
            keep: function () { // debounce
                clearTimeout(timer);
                timer = setTimeout(function () {
                    style.display = 'none';
                }, threshold);
            }
        };
    })();

    // 'white-space' for word-wrap of inline element in Firefox
    // http://www.w3.org/TR/css3-text/#white-space
    addStyle('.gist-message { word-break: break-all; white-space: pre-wrap; }');

    var timer, queue = [], interval = 1000;
    Array.prototype.forEach.call(document.querySelectorAll('#revisions .id'), function (rev, idx) {
        // XXX too much XHR requests!
        //     therefore Github block a response: (D)DoS filtering or API constraints => 505 error
        //     better to be a XHR once only. but Gist API v3 not provide bulk log information
        timer = setTimeout(function () {
            indicator.keep();
            queue.shift();
            try {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://raw.github.com/gist' + rev.pathname + '/meta',
                    onload: function (res) {
                        var msg = (/\n{2}([\s\S]*)\n$/m.exec(res.responseText) || [])[1];
                        if (!msg) return;

                        var container = document.createElement('pre');
                        container.textContent = msg;
                        container.className = 'gist-message';
                        rev.parentNode.appendChild(container);
                    }
                });
            } catch (e) {
                queue.forEach(function (job) {
                    clearTimeout(job);
                });
                if (console && console.warn) {
                    console.warn('*error caught by gist logs =>', e);
                }
            }
        }, interval * idx);
        queue.push(timer);
    });
})();
