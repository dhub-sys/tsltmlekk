<?php

/**
 * @package     mod_modern_timeline
 * @license     GNU General Public License version 2 or later
 */

namespace ModernTimeline\Module\ModernTimeline\Site\Dispatcher;

use Joomla\CMS\Dispatcher\AbstractModuleDispatcher;
use Joomla\CMS\Helper\HelperFactoryAwareInterface;
use Joomla\CMS\Helper\HelperFactoryAwareTrait;

\defined('_JEXEC') or die;

class Dispatcher extends AbstractModuleDispatcher implements HelperFactoryAwareInterface
{
    use HelperFactoryAwareTrait;

    protected function getLayoutData(): array
    {
        $data   = parent::getLayoutData();
        $helper = $this->getHelperFactory()->getHelper('TimelineHelper');

        $data['items']     = $helper->getItems($data['params']);
        $data['styleVars'] = $helper->getStyleVars($data['params']);

        return $data;
    }
}
