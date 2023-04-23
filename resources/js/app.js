import './bootstrap';

(() => {
    const e = document.getElementById("js-element");
    e.innerHTML = "--js-test--";
    setInterval(() => e.innerHTML = e.innerHTML.slice(1) + e.innerHTML.slice(0, 1), 250);
})();
