// ==UserScript==
// @name        Select text to make github line(-range) permalink
// @namespace   http://github.com/johan/
// @match       https://github.com/*
// @exampleURL  https://github.com/johan/user.js/blob/master/github.com/line-permalinks.user.js
// @description If you select text in a permalinkable file at github, the url updates automagically
// ==/UserScript==

if (typeof window.getSelection === 'function' &&
    typeof history.replaceState === 'function')
  $('body').on('mouseup', permalink);

function permalink() {
  function hash(h) {
    h = location.href.replace(/(#.*)?$/, h);
    history.replaceState(history.state, document.title, h);
  }

  function line(node) {
    var id = '[id^="LC"]'
      , $0 = $(node)
      , $l = $0.is(id) ? $0 : $0.parents(id).first()
      , no = /^LC(\d+)$/.exec($l.attr('id') || '');
    return no && +no[1];
  }

  var s = window.getSelection()
    , a = line(s.anchorNode)
    , b = line(s.focusNode)
    , end = 'focusOffset';

  if (a && b && s.type === 'Range') {
    if (a > b) {
      end = a; a = b; b = end;
      end = 'anchorOffset';
    }
    if (!s[end])
      b -= 1; // it's a whole-line selection, e g: triple-clicked in Chrome
    hash('#L'+ a + (a !== b ? '-'+b : ''));
    $('*[id^=LC][style^="background-color:"]').css('background-color', '');
    while (a <= b)
      $('#LC'+ a++).css('background-color', 'rgb(255, 255, 204)');
  }
}
