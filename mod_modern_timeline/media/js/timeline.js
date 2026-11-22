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

        if (this.horizontal) {
            this.initHorizontal();
        } else {
            this.initLoadMore();
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

        if ('ResizeObserver' in window) {
            new ResizeObserver(function () { self.update(); }).observe(vp);
        } else {
            window.addEventListener('resize', function () { self.update(); });
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
        requestAnimationFrame(function () {
            self.update();
            self.applyStart();
            self.update();
            self.initAutoplay();
        });
        window.addEventListener('load', function () { self.update(); });
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
            this.nav.hidden = !overflow;
        }
        if (this.prevBtn) { this.prevBtn.disabled = !canPrev; }
        if (this.nextBtn) { this.nextBtn.disabled = !canNext; }

        if (this.progress && overflow) {
            this.progress.style.setProperty('--mtl-progress', (pos / max).toFixed(4));
            this.progress.style.setProperty('--mtl-ratio-v', (vp.clientWidth / vp.scrollWidth).toFixed(4));
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
