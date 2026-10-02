// Bind rendered Russian copy, including viewer captions added after page load.
// Nonbreaking spaces keep a count together with its noun without changing labels.
(() => {
  const shortWord = /(?<![А-Яа-яЁё])(а|в|во|и|к|ко|на|не|ни|о|об|обо|от|по|с|со|у|за|из|до|для|без|над|под|при|про|но|же|ли|бы|или)[ \t]+(?=[А-Яа-яЁёA-Za-z0-9«„(])/gi;
  const unit = '(?:изображени(?:е|я|й)|формат(?:а|ов)?|баннер(?:а|ов)?|вариант(?:а|ов)?|проект(?:а|ов)?|товар(?:а|ов)?|раздел(?:а|ов)?|слайд(?:а|ов)?|страниц(?:а|ы|у|е)?|макет(?:а|ов)?|карточ(?:ка|ки|ку|ек)|облож(?:ка|ки|ку|ек)|сторис|работ(?:а|ы|у)?|концепци(?:я|и|ю|й)|истори(?:я|и|ю|й)|год(?:а|у|ы|ом)?|лет|месяц(?:а|ев)?|недел(?:я|и|ь)|дн(?:ей|я)|день|час(?:а|ов)?|минут(?:а|ы|у)?|секунд(?:а|ы|у)?|пользовател(?:ь|я|ей)|человек(?:а)?|млн|тыс\\.?|руб\\.?|мм|см|км|кг|м|г|px|MB|GB|%)';
  const adjective = '(?:(?:рекламных|готовых|визуальных|горизонтальных|вертикальных|главное|главных)[ \\t\\u00a0]+)?';
  const count = new RegExp('(?<![А-Яа-яЁёA-Za-z0-9_])\\d+(?:[.,]\\d+)?(?:[–-]\\d+(?:[.,]\\d+)?)?[ \\t]+' + adjective + unit + '(?![А-Яа-яЁёA-Za-z])', 'gi');
  const skip = 'script,style,textarea,pre,code,svg,math,.book-counter,.folio-count';
  const bind = value => value.replace(count, phrase => phrase.replace(/[ \t]+/g, '\u00a0')).replace(shortWord, '$1\u00a0');

  function bindNode(node) {
    if (node.parentElement?.closest(skip)) return;
    const next = bind(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
  function bindLabels(root) {
    // Legacy roll labels are also painted with content: attr(data-label).
    const labels = root.matches('[data-label]') ? [root] : [];
    labels.push(...root.querySelectorAll('[data-label]'));
    labels.forEach(element => {
      if (element.closest(skip)) return;
      const original = element.getAttribute('data-label');
      const next = bind(original);
      if (next !== original) element.setAttribute('data-label', next);
    });
  }
  function apply(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      bindNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest(skip)) return;
    bindLabels(root);
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walk.nextNode())) bindNode(node);
  }
  function ready() {
    apply(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') apply(record.target);
        else if (record.type === 'attributes') bindLabels(record.target);
        else for (const node of record.addedNodes) apply(node);
      }
    });
    observer.observe(document.body, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ['data-label']
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once: true});
  else ready();
})();
