<?php

/**
 * @package     mod_modern_timeline
 * @license     GNU General Public License version 2 or later
 */

namespace ModernTimeline\Module\ModernTimeline\Site\Helper;

use Joomla\CMS\HTML\HTMLHelper;
use Joomla\Registry\Registry;

\defined('_JEXEC') or die;

class TimelineHelper
{
    /**
     * Normalise the repeatable "items" field into a clean list of objects.
     */
    public function getItems(Registry $params): array
    {
        $raw     = $params->get('items', []);
        $prepare = (bool) $params->get('prepare_content', 0);
        $items   = [];

        foreach ((array) $raw as $row) {
            $row = (object) $row;

            if (isset($row->published) && !(int) $row->published) {
                continue;
            }

            $title    = trim((string) ($row->title ?? ''));
            $date     = trim((string) ($row->date ?? ''));
            $subtitle = trim((string) ($row->subtitle ?? ''));
            $content  = (string) ($row->content ?? '');

            if ($title === '' && $date === '' && trim(strip_tags($content)) === '') {
                continue;
            }

            if ($prepare && $content !== '') {
                $content = HTMLHelper::_('content.prepare', $content, '', 'mod_modern_timeline.content');
            }

            $image = null;

            if (!empty($row->image)) {
                $clean = HTMLHelper::_('cleanImageURL', (string) $row->image);
                $image = (object) [
                    'url'    => $clean->url,
                    'width'  => (int) ($clean->attributes['width'] ?? 0),
                    'height' => (int) ($clean->attributes['height'] ?? 0),
                    'alt'    => trim((string) ($row->image_alt ?? '')),
                ];
            }

            $items[] = (object) [
                'title'     => $title,
                'date'      => $date,
                'subtitle'  => $subtitle,
                'content'   => $content,
                'image'     => $image,
                'icon'      => preg_replace('/[^a-z0-9\-]/i', '', (string) ($row->icon ?? '')),
                'color'     => $this->sanitizeColor((string) ($row->color ?? '')),
                'link'      => trim((string) ($row->link ?? '')),
                'linkText'  => trim((string) ($row->link_text ?? '')),
                'linkBlank' => !empty($row->link_blank),
                'highlight' => !empty($row->highlight),
            ];
        }

        if ($params->get('reverse', 0)) {
            $items = array_reverse($items);
        }

        return $items;
    }

    /**
     * Build the CSS custom properties applied on the wrapper element.
     */
    public function getStyleVars(Registry $params): string
    {
        $vars = [];

        $map = [
            '--mtl-accent'   => 'accent_color',
            '--mtl-accent-2' => 'accent_color_2',
            '--mtl-card-bg'  => 'card_bg',
            '--mtl-text'     => 'text_color',
        ];

        foreach ($map as $var => $param) {
            $color = $this->sanitizeColor((string) $params->get($param, ''));

            if ($color !== '') {
                $vars[] = $var . ':' . $color;
            }
        }

        $vars[] = '--mtl-card-w:' . max(180, min(800, (int) $params->get('card_width', 320))) . 'px';
        $vars[] = '--mtl-gap:' . max(0, min(120, (int) $params->get('gap', 28))) . 'px';
        $vars[] = '--mtl-radius:' . max(0, min(48, (int) $params->get('radius', 18))) . 'px';

        $ratio  = (string) $params->get('image_ratio', '16/9');
        $vars[] = '--mtl-ratio:' . (preg_match('#^\d+/\d+$#', $ratio) ? $ratio : 'auto');

        return implode(';', $vars);
    }

    /**
     * Accept only hex, rgb(a)/hsl(a) colour values.
     */
    public function sanitizeColor(string $value): string
    {
        $value = trim($value);

        if ($value === '' || $value === 'none' || $value === 'transparent') {
            return '';
        }

        if (preg_match('/^#[0-9a-f]{3,8}$/i', $value)) {
            return $value;
        }

        if (preg_match('/^(rgb|rgba|hsl|hsla)\([0-9.,%\s\/]+\)$/i', $value)) {
            return $value;
        }

        return '';
    }
}
