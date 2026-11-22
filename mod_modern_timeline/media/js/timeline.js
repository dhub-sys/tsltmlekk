/*!
 * Modern Timeline – mod_modern_timeline
 * Vanilla JS, no dependencies. Initialises every [data-mtl] element on the page.
 */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function Timeline(root) {
        this.root = root;
        this.viewport = root.querySelector('.mtl__viewport');
        this.items = Array.prototype.slice.call(root.querySelectorAll('.mtl__item'));
        this.horizontal = root.classList.contains('mtl--horizontal');
        this.opts = {
            step: root.getAttribute('data-step') || 'item',
            start: root.getAttribute('data-start') || 'first',
            autoplay: parseInt(root.getAttribute('data-autoplay'), 10) || 0,
            drag: root.getAttribute('data-drag') !== '0',
            initial: parseInt(root.getAttribute('data-initial'), 10) || 0
        };

        root.classList.add('mtl--js');
        root.__mtl = this;

        this.initReveal();
        this.initMore();

        if (this.horizontal) {
            this.initHorizontal();
        } else {
            this.initLoadMore();
            this.checkClamp();
            this.observeClamp();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Reveal on scroll                                                    */
    /* ------------------------------------------------------------------ */
    Timeline.prototype.initReveal = function () {
        var items = this.items;

        if (!this.root.classList.contains('mtl--animate') || reduceMotion || !('IntersectionObserver' in window)) {
            items.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }

        var batch = 0;
        var timer = null;
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }
                var el = entry.target;
                el.style.setProperty('--mtl-delay', Math.min(batch, 6) * 90 + 'ms');
                batch++;
                el.classList.add('is-visible');
                io.unobserve(el);
            });
            clearTimeout(timer);
            timer = setTimeout(function () { batch = 0; }, 120);
        }, {
            root: this.horizontal ? this.viewport : null,
            rootMargin: this.horizontal ? '0px 40px 0px 40px' : '0px 0px -8% 0px',
            threshold: 0.12
        });

        items.forEach(function (el) { io.observe(el); });

        // Safety net: never leave items invisible (e.g. hidden tabs, print).
        setTimeout(function () {
            items.forEach(function (el) {
                if (!el.classList.contains('is-visible') && el.getBoundingClientRect().width === 0) {
                    el.classList.add('is-visible');
                }
            });
        }, 4000);
    };

    /* ------------------------------------------------------------------ */
    /* Horizontal scroller                                                 */
    /* ------------------------------------------------------------------ */
    Timeline.prototype.initHorizontal = function () {
        var self = this;
        var root = this.root;
        var vp = this.viewport;

        this.nav = root.querySelector('.mtl__nav');
        this.prevBtn = root.querySelector('[data-mtl-prev]');
        this.nextBtn = root.querySelector('[data-mtl-next]');
        this.progress = root.querySelector('[data-mtl-progress]');
        this.current = root.querySelector('[data-mtl-current]');
        this.rtl = getComputedStyle(root).direction === 'rtl';
        this.navAlways = root.classList.contains('mtl--nav-always');

        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', function () { self.stopAutoplay(); self.go(-1); });
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', function () { self.stopAutoplay(); self.go(1); });
        }
        if (this.progress) {
            this.progress.addEventListener('click', function (e) {
                var rect = self.progress.getBoundingClientRect();
                var ratio = (e.clientX - rect.left) / rect.width;
                if (self.rtl) { ratio = 1 - ratio; }
                self.stopAutoplay();
                self.scrollToPos(Math.max(0, Math.min(1, ratio)) * self.maxScroll());
            });
        }

        var raf = null;
        vp.addEventListener('scroll', function () {
            if (raf) { return; }
            raf = requestAnimationFrame(function () { raf = null; self.update(); });
        }, { passive: true });

        this.autoFit = root.getAttribute('data-fit') === 'auto';
        this.track = root.querySelector('.mtl__track');
        this.lastWidth = 0;

        var onResize = function () {
            var w = vp.clientWidth;
            if (w !== self.lastWidth) {
                self.lastWidth = w;
                self.fit();
                self.checkClamp();
            }
            self.update();
        };

        if ('ResizeObserver' in window) {
            new ResizeObserver(onResize).observe(vp);
        } else {
            window.addEventListener('resize', onResize);
        }

        // Keyboard: arrow keys move item by item when the viewport has focus.
        vp.addEventListener('keydown', function (e) {
            var key = e.key;
            if (key === 'ArrowRight' || key === 'ArrowLeft') {
                e.preventDefault();
                var dir = key === 'ArrowRight' ? 1 : -1;
                self.stopAutoplay();
                self.go(self.rtl ? -dir : dir);
            } else if (key === 'Home') {
                e.preventDefault();
                self.scrollToPos(0);
            } else if (key === 'End') {
                e.preventDefault();
                self.scrollToPos(self.maxScroll());
            }
        });

        if (this.opts.drag) {
            root.classList.add('mtl--draggable');
            this.initDrag();
        }

        // Wait for layout (fonts/images) before positioning.
        var refit = function () { self.fit(); self.checkClamp(); self.update(); };
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(refit);
        }

        requestAnimationFrame(function () {
            self.lastWidth = vp.clientWidth;
            self.fit();
            self.checkClamp();
            self.update();
            self.applyStart();
            self.update();
            self.initAutoplay();
        });
        window.addEventListener('load', refit);
    };

    Timeline.prototype.maxScroll = function () {
        return Math.max(0, this.viewport.scrollWidth - this.viewport.clientWidth);
    };

    Timeline.prototype.pos = function () {
        return Math.abs(this.viewport.scrollLeft);
    };

    Timeline.prototype.stepSize = function () {
        var it = this.items;
        if (it.length < 2) {
            return this.viewport.clientWidth;
        }
        var step = Math.abs(it[1].offsetLeft - it[0].offsetLeft) || it[0].offsetWidth;
        if (this.opts.step === 'page') {
            var perPage = Math.max(1, Math.floor((this.viewport.clientWidth + 1) / step));
            return perPage * step;
        }
        return step;
    };

    Timeline.prototype.scrollToPos = function (pos, instant) {
        var left = this.rtl ? -pos : pos;
        if (instant || reduceMotion) {
            var prev = this.viewport.style.scrollBehavior;
            this.viewport.style.scrollBehavior = 'auto';
            this.viewport.scrollLeft = left;
            this.viewport.style.scrollBehavior = prev;
        } else {
            this.viewport.scrollTo({ left: left, behavior: 'smooth' });
        }
    };

    Timeline.prototype.go = function (dir) {
        var step = this.stepSize();
        var target = Math.round(this.pos() / step) * step + dir * step;
        this.scrollToPos(Math.max(0, Math.min(this.maxScroll(), target)));
    };

    Timeline.prototype.currentIndex = function () {
        var max = this.maxScroll();
        if (max > 0 && this.pos() >= max - 2) {
            return this.items.length - 1;
        }
        return Math.min(this.items.length - 1, Math.round(this.pos() / this.stepSize()));
    };

    Timeline.prototype.update = function () {
        var root = this.root;
        var vp = this.viewport;
        var max = this.maxScroll();
        var pos = this.pos();
        var overflow = max > 2;
        var canPrev = overflow && pos > 2;
        var canNext = overflow && pos < max - 2;

        root.classList.toggle('mtl--has-overflow', overflow);
        root.classList.toggle('mtl--can-prev', canPrev);
        root.classList.toggle('mtl--can-next', canNext);

        if (this.nav) {
            this.nav.hidden = !overflow && !this.navAlways;
        }
        if (this.prevBtn) { this.prevBtn.disabled = !canPrev; }
        if (this.nextBtn) { this.nextBtn.disabled = !canNext; }

        if (this.progress) {
            this.progress.style.setProperty('--mtl-progress', overflow ? (pos / max).toFixed(4) : '0');
            this.progress.style.setProperty('--mtl-ratio-v', overflow ? (vp.clientWidth / vp.scrollWidth).toFixed(4) : '1');
        }

        if (this.current) {
            this.current.textContent = pad(this.currentIndex() + 1);
        }

        // Make the viewport focusable only when there is something to scroll.
        if (overflow) {
            vp.setAttribute('tabindex', '0');
        } else {
            vp.removeAttribute('tabindex');
        }
    };

    Timeline.prototype.applyStart = function () {
        var start = this.opts.start;
        if (start === 'last') {
            this.scrollToPos(this.maxScroll(), true);
        } else if (start === 'highlight') {
            var hl = this.root.querySelector('[data-mtl-highlight]');
            if (hl) {
                var offset = Math.abs(hl.offsetLeft - this.items[0].offsetLeft);
                this.scrollToPos(Math.min(offset, this.maxScroll()), true);
            }
        }
    };

    /* ---------- mouse drag (touch uses native scrolling) ---------- */
    Timeline.prototype.initDrag = function () {
        var self = this;
        var vp = this.viewport;
        var root = this.root;
        var startX = 0;
        var startLeft = 0;
        var moved = false;
        var active = false;
        var pointerId = null;

        vp.addEventListener('pointerdown', function (e) {
            if (e.pointerType !== 'mouse' || e.button !== 0 || self.maxScroll() <= 2) {
                return;
            }
            if (e.target.closest('a, button, input, textarea, select, iframe, video')) {
                return;
            }
            active = true;
            moved = false;
            startX = e.clientX;
            startLeft = vp.scrollLeft;
            pointerId = e.pointerId;
        });

        vp.addEventListener('pointermove', function (e) {
            if (!active || e.pointerId !== pointerId) {
                return;
            }
            var dx = e.clientX - startX;
            if (!moved && Math.abs(dx) > 5) {
                moved = true;
                root.classList.add('mtl--dragging');
                self.stopAutoplay();
                try { vp.setPointerCapture(pointerId); } catch (err) { /* ignore */ }
            }
            if (moved) {
                vp.scrollLeft = startLeft - dx;
            }
        });

        function end() {
            if (!active) {
                return;
            }
            active = false;
            if (moved) {
                // Let the browser re-snap smoothly to the nearest item.
                var nearest = Math.round(self.pos() / self.stepSize()) * self.stepSize();
                root.classList.remove('mtl--dragging');
                self.scrollToPos(Math.min(nearest, self.maxScroll()));
            }
            try { vp.releasePointerCapture(pointerId); } catch (err) { /* ignore */ }
        }

        vp.addEventListener('pointerup', end);
        vp.addEventListener('pointercancel', end);
        vp.addEventListener('lostpointercapture', end);

        // Swallow the click that follows a drag.
        vp.addEventListener('click', function (e) {
            if (moved) {
                e.preventDefault();
                e.stopPropagation();
                moved = false;
            }
        }, true);

        vp.addEventListener('dragstart', function (e) { e.preventDefault(); });
    };

    /* ---------- autoplay ---------- */
    Timeline.prototype.initAutoplay = function () {
        var self = this;
        var seconds = this.opts.autoplay;
        if (!seconds || reduceMotion) {
            return;
        }
        this.paused = false;
        this.autoplayTimer = setInterval(function () {
            if (self.paused || document.hidden || self.maxScroll() <= 2) {
                return;
            }
            if (self.pos() >= self.maxScroll() - 2) {
                self.scrollToPos(0);
            } else {
                self.go(1);
            }
        }, seconds * 1000);

        var pause = function () { self.paused = true; };
        var resume = function () { self.paused = false; };
        this.root.addEventListener('mouseenter', pause);
        this.root.addEventListener('mouseleave', resume);
        this.root.addEventListener('focusin', pause);
        this.root.addEventListener('focusout', resume);
        this.viewport.addEventListener('touchstart', function () { self.stopAutoplay(); }, { passive: true });
    };

    Timeline.prototype.stopAutoplay = function () {
        if (this.autoplayTimer) {
            clearInterval(this.autoplayTimer);
            this.autoplayTimer = null;
        }
    };

    /* ---------- automatic number of items per screen ---------- */
    Timeline.prototype.fit = function () {
        if (!this.autoFit) {
            return;
        }
        var root = this.root;
        var track = this.track;
        var cs = getComputedStyle(track);
        var gap = parseFloat(cs.columnGap) || 0;
        var inner = this.viewport.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);

        if (inner <= 0) {
            return;
        }

        var minW = parseInt(root.getAttribute('data-min-w'), 10) || 260;
        var maxW = parseInt(root.getAttribute('data-max-w'), 10) || 520;
        var maxH = parseInt(root.getAttribute('data-max-h'), 10) || Math.max(380, window.innerHeight * 0.8);
        var count = this.items.length;

        // Most columns allowed by the minimum width, fewest allowed by the maximum width.
        var nMax = Math.max(1, Math.min(count, Math.floor((inner + gap) / (minW + gap))));
        var nMin = Math.max(1, Math.min(nMax, Math.ceil((inner + gap) / (maxW + gap))));
        root.classList.add('mtl--fitted');

        // Try from the most items per screen down: keep the first that fits the height.
        var tryFit = function () {
            for (var n = nMax; n >= nMin; n--) {
                root.style.setProperty('--mtl-fit-n', n);
                if (track.offsetHeight <= maxH) {
                    return { n: n, fits: true };
                }
            }
            root.style.setProperty('--mtl-fit-n', nMin);
            return { n: nMin, fits: false };
        };

        root.classList.remove('mtl--alt-off');
        var res = tryFit();

        // Cards alternating above/below the line roughly double the height.
        // If that does not fit the screen, put all cards in one row instead.
        if (!res.fits && root.classList.contains('mtl--alternate')) {
            root.classList.add('mtl--alt-off');
            res = tryFit();
        }

        root.style.setProperty('--mtl-fit-n', res.n);
    };

    /* ------------------------------------------------------------------ */
    /* Long text: "More" button (modal or inline expand)                   */
    /* ------------------------------------------------------------------ */
    Timeline.prototype.initMore = function () {
        var self = this;
        var root = this.root;
        this.moreMode = root.getAttribute('data-more') || 'modal';
        this.expandBtns = Array.prototype.slice.call(root.querySelectorAll('[data-mtl-expand]'));

        if (!this.expandBtns.length) {
            return;
        }

        if (this.moreMode === 'modal' && typeof HTMLDialogElement === 'undefined') {
            this.moreMode = 'expand';
        }

        this.expandBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var item = btn.closest('.mtl__item');
                if (self.moreMode === 'modal') {
                    self.openModal(self.items.indexOf(item));
                    return;
                }
                var text = item.querySelector('.mtl__text');
                var label = btn.querySelector('span');
                var expanded = !text.classList.contains('is-expanded');
                if (!btn.hasAttribute('data-more-label')) {
                    btn.setAttribute('data-more-label', label.textContent);
                }
                text.classList.toggle('is-expanded', expanded);
                text.classList.toggle('is-clamped', !expanded);
                btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                btn.classList.toggle('is-open', expanded);
                label.textContent = expanded ? btn.getAttribute('data-less') : btn.getAttribute('data-more-label');
                if (self.horizontal) {
                    self.update();
                }
            });
        });
    };

    Timeline.prototype.checkClamp = function () {
        (this.expandBtns || []).forEach(function (btn) {
            var text = btn.closest('.mtl__item').querySelector('.mtl__text');
            if (!text || text.classList.contains('is-expanded')) {
                return;
            }
            var cut = text.scrollHeight > text.clientHeight + 2;
            text.classList.toggle('is-clamped', cut);
            btn.hidden = !cut;
        });
    };

    Timeline.prototype.observeClamp = function () {
        var self = this;
        if (!this.expandBtns || !this.expandBtns.length) {
            return;
        }
        var w = 0;
        var cb = function () {
            if (self.root.clientWidth !== w) {
                w = self.root.clientWidth;
                self.checkClamp();
            }
        };
        if ('ResizeObserver' in window) {
            new ResizeObserver(cb).observe(this.root);
        } else {
            window.addEventListener('resize', cb);
        }
        window.addEventListener('load', function () { self.checkClamp(); });
    };

    /* ---------- modal ---------- */
    var ICON_CLOSE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
    var ICON_PREV = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var ICON_NEXT = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    Timeline.prototype.buildModal = function () {
        var self = this;
        var root = this.root;
        var d = document.createElement('dialog');
        var label = function (k) { return (root.getAttribute('data-l-' + k) || k).replace(/"/g, '&quot;'); };

        d.className = 'mtl-modal';
        d.id = root.id + '-modal';
        d.innerHTML =
            '<button type="button" class="mtl-modal__close" aria-label="' + label('close') + '">' + ICON_CLOSE + '</button>' +
            '<div class="mtl-modal__scroll"><div class="mtl-modal__content"></div></div>' +
            '<div class="mtl-modal__footer">' +
                '<button type="button" class="mtl__btn" data-dir="-1" aria-label="' + label('prev') + '">' + ICON_PREV + '</button>' +
                '<span class="mtl__counter mtl-modal__counter"></span>' +
                '<button type="button" class="mtl__btn" data-dir="1" aria-label="' + label('next') + '">' + ICON_NEXT + '</button>' +
            '</div>';
        root.appendChild(d);

        this.modal = d;
        this.modalContent = d.querySelector('.mtl-modal__content');
        this.modalScroll = d.querySelector('.mtl-modal__scroll');
        this.modalCounter = d.querySelector('.mtl-modal__counter');
        this.modalPrev = d.querySelector('[data-dir="-1"]');
        this.modalNext = d.querySelector('[data-dir="1"]');

        d.querySelector('.mtl-modal__close').addEventListener('click', function () { d.close(); });
        this.modalPrev.addEventListener('click', function () { self.showInModal(self.modalIndex - 1); });
        this.modalNext.addEventListener('click', function () { self.showInModal(self.modalIndex + 1); });

        // Click on the backdrop closes.
        d.addEventListener('click', function (e) {
            if (e.target === d) {
                d.close();
            }
        });
        d.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                var dir = e.key === 'ArrowRight' ? 1 : -1;
                if (self.rtl) { dir = -dir; }
                e.preventDefault();
                self.showInModal(self.modalIndex + dir);
            }
        });
        d.addEventListener('close', function () {
            document.documentElement.classList.remove('mtl-modal-open');
            self.revealItem(self.modalIndex);
        });
    };

    Timeline.prototype.openModal = function (index) {
        if (index < 0) {
            return;
        }
        if (!this.modal) {
            this.buildModal();
        }
        this.stopAutoplay();
        this.showInModal(index);
        document.documentElement.classList.add('mtl-modal-open');
        this.modal.showModal();
        this.modal.querySelector('.mtl-modal__close').focus({ preventScroll: true });
    };

    Timeline.prototype.showInModal = function (index) {
        var total = this.items.length;
        if (index < 0 || index >= total) {
            return;
        }
        this.modalIndex = index;

        var item = this.items[index];
        var card = item.querySelector('.mtl__card');
        var media = card.querySelector('.mtl__media');
        var body = card.querySelector('.mtl__body').cloneNode(true);
        var date = item.querySelector('.mtl__date-label');
        var box = document.createElement('div');

        body.querySelectorAll('[data-mtl-expand]').forEach(function (el) { el.remove(); });
        body.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
        body.querySelectorAll('.mtl__text').forEach(function (el) { el.classList.remove('is-clamped', 'is-expanded'); });
        body.className = 'mtl-modal__body';

        if (date) {
            var dateWrap = document.createElement('div');
            dateWrap.className = 'mtl__date';
            dateWrap.appendChild(date.cloneNode(true));
            body.insertBefore(dateWrap, body.firstChild);
        }

        var title = body.querySelector('.mtl__title');
        if (title) {
            title.id = this.modal.id + '-title';
            this.modal.setAttribute('aria-labelledby', title.id);
        } else {
            this.modal.removeAttribute('aria-labelledby');
        }

        if (media) {
            var m = media.cloneNode(true);
            m.querySelectorAll('img').forEach(function (img) { img.loading = 'eager'; });
            box.appendChild(m);
        }
        box.appendChild(body);

        this.modalContent.innerHTML = '';
        this.modalContent.appendChild(box);
        this.modalContent.classList.remove('is-switching');
        void this.modalContent.offsetWidth;
        this.modalContent.classList.add('is-switching');
        this.modalScroll.scrollTop = 0;

        // Per-item colour carries over to the modal.
        this.modal.setAttribute('style', item.getAttribute('style') || '');
        this.modal.classList.toggle('mtl-modal--highlight', item.classList.contains('mtl__item--highlight'));

        this.modalCounter.innerHTML = '<span data-mtl-current>' + pad(index + 1) + '</span><span class="mtl__counter-sep">/</span><span>' + pad(total) + '</span>';
        this.modalPrev.disabled = index === 0;
        this.modalNext.disabled = index === total - 1;
    };

    // After closing the modal, make sure the item that was last viewed is on screen.
    Timeline.prototype.revealItem = function (index) {
        var item = this.items[index];
        if (!item) {
            return;
        }
        if (this.horizontal) {
            var left = Math.abs(item.offsetLeft - this.items[0].offsetLeft);
            var pos = this.pos();
            var w = this.viewport.clientWidth;
            if (left < pos || left + item.offsetWidth > pos + w) {
                this.scrollToPos(Math.min(left, this.maxScroll()));
            }
        } else if (item.classList.contains('mtl__item--collapsed')) {
            return;
        }
        var btn = item.querySelector('[data-mtl-expand]:not([hidden])');
        if (btn) {
            btn.focus({ preventScroll: !this.horizontal ? false : true });
        }
    };

    /* ------------------------------------------------------------------ */
    /* Vertical "load more"                                                */
    /* ------------------------------------------------------------------ */
    Timeline.prototype.initLoadMore = function () {
        var self = this;
        var initial = this.opts.initial;
        var more = this.root.querySelector('.mtl__more');
        var btn = this.root.querySelector('[data-mtl-more]');

        if (!initial || !more || !btn || this.items.length <= initial) {
            return;
        }

        this.shown = initial;
        this.applyVisible();
        more.hidden = false;

        btn.addEventListener('click', function () {
            var firstNew = self.items[self.shown];
            self.shown = Math.min(self.items.length, self.shown + initial);
            self.applyVisible();
            if (self.shown >= self.items.length) {
                more.hidden = true;
            }
            if (firstNew) {
                firstNew.setAttribute('tabindex', '-1');
                firstNew.focus({ preventScroll: true });
            }
        });
    };

    Timeline.prototype.applyVisible = function () {
        var shown = this.shown;
        this.items.forEach(function (el, i) {
            el.classList.toggle('mtl__item--collapsed', i >= shown);
            el.classList.toggle('mtl__item--last-visible', i === shown - 1 && i < this.items.length - 1);
        }, this);
    };

    /* ------------------------------------------------------------------ */
    function init(scope) {
        (scope || document).querySelectorAll('[data-mtl]').forEach(function (el) {
            if (!el.__mtl) {
                new Timeline(el);
            }
        });
    }

    window.ModernTimeline = { init: init };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { init(); });
    } else {
        init();
    }
}());
