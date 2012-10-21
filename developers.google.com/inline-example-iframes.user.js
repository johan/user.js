// ==UserScript==
// @name          Shows all examples as inline iframes without clicking links
// @namespace     https://github.com/johan/user.js
// @require       https://raw.github.com/gist/3886769/2bda951e516c93bd9625ed2d1b168a0a7d98a078/on.js
// @description   Shows linked documentation examples inline, so you don't have to mess around with tabs to see stuff. Click the "View example" link to toggle.
// @include       https://developers.google.com/*
// @include       http://developers.google.com/*
// ==/UserScript==

on({ dom: { example_links: 'xpath* //a[@href and contains(.,"View example")]' }
   , ready: init
   });

function init(dom) {
  dom.example_links.forEach(inline);
}

function inline(a) {
  var parent = a.parentNode
    , colon  = document.createTextNode(':')
    , iframe = document.createElement('iframe');
  iframe.src = a.href;
  iframe.style.width = '100%';
  iframe.style.height = Math.min(window.innerHeight * 0.8, 748) + 'px';
  iframe.style.outline = '1px solid rgba(0,0,0,0.25)';
  parent.insertBefore(iframe, a.nextSibling);
  parent.insertBefore(colon,  a.nextSibling);
  a.addEventListener('click', toggle.bind(iframe), false);
}

function toggle(e) {
  this.style.display = this.style.display ? '' : 'none';
  e.preventDefault();
}
