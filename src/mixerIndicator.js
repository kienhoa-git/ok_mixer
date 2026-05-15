import GObject from "gi://GObject";

import { SystemIndicator } from "resource:///org/gnome/shell/ui/quickSettings.js";

import { MixerToggle } from "./mixerToggle.js";

/**
 * System indicator wrapper for the mixer toggle.
 */
export const MixerIndicator = GObject.registerClass(
  class MixerIndicator extends SystemIndicator {
    /**
     * Create the indicator and attach it to quick settings.
     */
    _init() {
      super._init();
      this._toggle = new MixerToggle();
      this.quickSettingsItems.push(this._toggle);
    }

    /**
     * Destroy the toggle before releasing the indicator.
     */
    destroy() {
      this._toggle.destroy();
      super.destroy();
    }
  },
);
