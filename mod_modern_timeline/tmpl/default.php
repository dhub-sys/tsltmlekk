<?php

/**
 * @package     mod_modern_timeline
 * @license     GNU General Public License version 2 or later
 *
 * Override in: templates/<your-template>/html/mod_modern_timeline/default.php
 *
 * @var \Joomla\Registry\Registry                  $params
 * @var \Joomla\CMS\Application\SiteApplication    $app
 * @var object                                     $module
 * @var array                                      $items
 * @var string                                     $styleVars
 */

\defined('_JEXEC') or die;

use Joomla\CMS\Language\Text;

if (empty($items)) {
    return;
}

$wa = $app->getDocument()->getWebAssetManager();
$wa->getRegistry()->addExtensionRegistryFile('mod_modern_timeline');
$wa->useStyle('mod_modern_timeline')->useScript('mod_modern_timeline');

$e = static fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');

$mode       = $params->get('layout_mode', 'horizontal') === 'vertical' ? 'vertical' : 'horizontal';
$horizontal = $mode === 'horizontal';
$marker     = $params->get('marker_style', 'icon');
$headingTag = in_array($params->get('heading_tag', 'h3'), ['h2', 'h3', 'h4', 'h5', 'h6', 'div'], true)
    ? $params->get('heading_tag', 'h3') : 'h3';
$navPos     = $params->get('nav_position', 'bottom') === 'sides' ? 'sides' : 'bottom';
$widthMode  = in_array($params->get('width_mode', 'auto'), ['auto', 'perview', 'fixed'], true) ? $params->get('width_mode', 'auto') : 'auto';
$clamp      = (int) $params->get('text_lines', 0) > 0;
$moreMode   = $params->get('more_mode', 'modal') === 'expand' ? 'expand' : 'modal';
$cardMore   = $params->get('more_trigger', 'button') === 'card' && ($clamp || $moreMode === 'modal');
$titleOnImg = (bool) $params->get('title_on_image', 1);
$id         = 'mtl-' . (int) $module->id;
$total      = count($items);

$classes = [
    'mtl',
    'mtl--' . $mode,
    'mtl--card-' . preg_replace('/[^a-z]/', '', $params->get('card_style', 'glass')),
    'mtl--date-' . preg_replace('/[^a-z]/', '', $params->get('date_style', 'pill')),
    'mtl--marker-' . preg_replace('/[^a-z]/', '', $marker),
    'mtl--theme-' . preg_replace('/[^a-z]/', '', $params->get('theme', 'auto')),
    'mtl--nav-' . $navPos,
];

if ($horizontal) {
    $classes[] = 'mtl--w-' . $widthMode;
}
if ($clamp) {
    $classes[] = 'mtl--clamp';
}
// Card position (modules saved before 1.4 only have the yes/no "alternate" switch).
$cardPos = $params->get('card_position', $params->get('alternate', 1) ? 'alternate' : 'below');
if ($cardPos === 'alternate') {
    $classes[] = 'mtl--alternate';
    if ($horizontal && $params->get('compact_alternate', 1)) {
        $classes[] = 'mtl--compact';
    }
} elseif ($cardPos === 'above' && $horizontal) {
    $classes[] = 'mtl--cards-above';
}

$activeMode = in_array($params->get('highlight_mode', 'manual'), ['manual', 'first', 'center', 'hover'], true)
    ? $params->get('highlight_mode', 'manual') : 'manual';
// Animation style (modules saved before 1.3 only have the yes/no "animate" switch).
$animation = $params->get('animation', $params->get('animate', 1) ? 'scale' : 'none');
if (in_array($animation, ['scale', 'fade'], true)) {
    $classes[] = 'mtl--animate';
    $classes[] = 'mtl--anim-' . $animation;
}
if ($horizontal && $params->get('nav_always', 1)) {
    $classes[] = 'mtl--nav-always';
}
if ($horizontal && $params->get('edge_fade', 1)) {
    $classes[] = 'mtl--fade';
}
if ($sfx = trim((string) $params->get('moduleclass_sfx', ''))) {
    $classes[] = $sfx;
}

$dataAttrs = [
    'data-mtl'          => '',
    'data-step'         => $params->get('scroll_step', 'item') === 'page' ? 'page' : 'item',
    'data-start'        => in_array($params->get('start_at', 'first'), ['first', 'last', 'highlight'], true) ? $params->get('start_at', 'first') : 'first',
    'data-autoplay'     => max(0, (int) $params->get('autoplay', 0)),
    'data-drag'         => (int) $params->get('drag', 1),
    'data-initial'      => $horizontal ? 0 : max(0, (int) $params->get('initial_items', 0)),
    'data-active'       => $activeMode,
];

if ($clamp || $cardMore) {
    $dataAttrs['data-more']         = $moreMode;
    $dataAttrs['data-more-trigger'] = $cardMore ? 'card' : 'button';
    $dataAttrs['data-l-more']       = Text::_('MOD_MODERN_TIMELINE_SHOW_MORE_TEXT');
    $dataAttrs['data-l-close'] = Text::_('MOD_MODERN_TIMELINE_CLOSE');
    $dataAttrs['data-l-prev']  = Text::_('MOD_MODERN_TIMELINE_PREV');
    $dataAttrs['data-l-next']  = Text::_('MOD_MODERN_TIMELINE_NEXT');
}

if ($horizontal && $widthMode === 'auto') {
    $dataAttrs['data-fit']   = 'auto';
    $dataAttrs['data-max-w'] = max(200, (int) $params->get('auto_max_width', 520));
    $dataAttrs['data-max-h'] = max(0, (int) $params->get('auto_max_height', 0));
}

$attr = '';
foreach ($dataAttrs as $k => $v) {
    $attr .= ' ' . $k . ($v === '' ? '' : '="' . $e($v) . '"');
}

$chevron = static fn (string $dir) => '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="'
    . ($dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6')
    . '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
?>
<div id="<?php echo $id; ?>" class="<?php echo $e(implode(' ', $classes)); ?>" style="<?php echo $e($styleVars . ';--mtl-count:' . $total); ?>"<?php echo $attr; ?>>
    <div class="mtl__viewport"<?php if ($horizontal) : ?> tabindex="0" role="region" aria-label="<?php echo $e($module->title ?: Text::_('MOD_MODERN_TIMELINE_ARIA_TIMELINE')); ?>"<?php endif; ?>>
        <ol class="mtl__track">
            <?php foreach ($items as $i => $item) :
                $onImage = $titleOnImg && $item->image && $item->title !== '';
                $liClass = 'mtl__item' . ($onImage ? ' mtl__item--title-on-image' : '') . ($item->highlight && $activeMode === 'manual' ? ' mtl__item--highlight' : '') . ($item->image ? ' mtl__item--has-image' : '');
                $liStyle = $item->color !== '' ? ' style="--mtl-accent:' . $e($item->color) . ';--mtl-accent-2:' . $e($item->color) . '"' : '';
                ?>
                <li class="<?php echo $liClass; ?>"<?php echo $liStyle; ?><?php echo $item->highlight ? ' data-mtl-highlight' : ''; ?>>
                    <div class="mtl__date"<?php echo $item->date === '' ? ' aria-hidden="true"' : ''; ?>>
                        <?php if ($item->date !== '') : ?>
                            <span class="mtl__date-label"><?php echo $e($item->date); ?></span>
                        <?php endif; ?>
                    </div>

                    <div class="mtl__marker" aria-hidden="true">
                        <span class="mtl__dot">
                            <?php if ($marker === 'number') : ?>
                                <span class="mtl__num"><?php echo str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT); ?></span>
                            <?php elseif ($marker === 'icon' && $item->icon !== '') : ?>
                                <span class="mtl__icon" uk-icon="icon: <?php echo $e($item->icon); ?>; ratio: 0.9"></span>
                            <?php endif; ?>
                        </span>
                    </div>

                    <article class="mtl__card">
                        <?php if ($item->image) : ?>
                            <figure class="mtl__media">
                                <img src="<?php echo $e($item->image->url); ?>"
                                     alt="<?php echo $e($item->image->alt); ?>"
                                     loading="lazy" decoding="async"
                                     <?php if ($item->image->width && $item->image->height) : ?>width="<?php echo $item->image->width; ?>" height="<?php echo $item->image->height; ?>"<?php endif; ?>>
                                <?php if ($onImage) : ?>
                                    <figcaption class="mtl__media-caption">
                                        <<?php echo $headingTag; ?> class="mtl__title"><?php echo $e($item->title); ?></<?php echo $headingTag; ?>>
                                        <?php if ($item->subtitle !== '') : ?>
                                            <p class="mtl__subtitle"><?php echo $e($item->subtitle); ?></p>
                                        <?php endif; ?>
                                    </figcaption>
                                <?php endif; ?>
                            </figure>
                        <?php endif; ?>

                        <div class="mtl__body">
                            <?php if ($item->title !== '' && !$onImage) : ?>
                                <<?php echo $headingTag; ?> class="mtl__title"><?php echo $e($item->title); ?></<?php echo $headingTag; ?>>
                            <?php endif; ?>

                            <?php if ($item->subtitle !== '' && !$onImage) : ?>
                                <p class="mtl__subtitle"><?php echo $e($item->subtitle); ?></p>
                            <?php endif; ?>

                            <?php if (trim(strip_tags($item->content, '<img><iframe><video>')) !== '') : ?>
                                <div class="mtl__text"<?php echo $clamp ? ' id="' . $id . '-t' . $i . '"' : ''; ?>><?php echo $item->content; ?></div>
                                <?php if ($clamp && !$cardMore) : ?>
                                    <button type="button" class="mtl__expand" data-mtl-expand aria-expanded="false" aria-controls="<?php echo $id . '-t' . $i; ?>" data-less="<?php echo $e(Text::_('MOD_MODERN_TIMELINE_SHOW_LESS')); ?>" hidden><span><?php echo $e(Text::_('MOD_MODERN_TIMELINE_SHOW_MORE_TEXT')); ?></span><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
                                <?php endif; ?>
                            <?php endif; ?>

                            <?php if ($item->link !== '') : ?>
                                <a class="mtl__link" href="<?php echo $e($item->link); ?>"<?php echo $item->linkBlank ? ' target="_blank" rel="noopener"' : ''; ?>>
                                    <span><?php echo $e($item->linkText !== '' ? $item->linkText : Text::_('MOD_MODERN_TIMELINE_READ_MORE')); ?></span>
                                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                </a>
                            <?php endif; ?>
                        </div>
                    </article>
                </li>
            <?php endforeach; ?>
        </ol>
    </div>

    <?php if ($horizontal) : ?>
        <div class="mtl__nav" hidden>
            <button type="button" class="mtl__btn mtl__btn--prev" data-mtl-prev aria-controls="<?php echo $id; ?>" aria-label="<?php echo $e(Text::_('MOD_MODERN_TIMELINE_PREV')); ?>"><?php echo $chevron('prev'); ?></button>

            <?php if ($params->get('show_progress', 1)) : ?>
                <div class="mtl__progress" data-mtl-progress aria-hidden="true"><span class="mtl__progress-bar"></span></div>
            <?php else : ?>
                <div class="mtl__spacer"></div>
            <?php endif; ?>

            <?php if ($params->get('show_counter', 1)) : ?>
                <span class="mtl__counter" data-mtl-counter aria-live="polite">
                    <span data-mtl-current>01</span><span class="mtl__counter-sep">/</span><span><?php echo str_pad((string) $total, 2, '0', STR_PAD_LEFT); ?></span>
                </span>
            <?php endif; ?>

            <button type="button" class="mtl__btn mtl__btn--next" data-mtl-next aria-controls="<?php echo $id; ?>" aria-label="<?php echo $e(Text::_('MOD_MODERN_TIMELINE_NEXT')); ?>"><?php echo $chevron('next'); ?></button>
        </div>
    <?php else : ?>
        <div class="mtl__more" hidden>
            <button type="button" class="mtl__more-btn" data-mtl-more><?php echo $e(Text::_('MOD_MODERN_TIMELINE_LOAD_MORE')); ?></button>
        </div>
    <?php endif; ?>
</div>
