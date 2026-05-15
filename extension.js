import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { MixerIndicator } from "./src/mixerIndicator.js";

/**
 * GNOME Shell extension entrypoint.
 */
export default class MixerExtension extends Extension {
  /**
   * Enable the indicator in quick settings.
   */
  enable() {
    this._indicator = new MixerIndicator();
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  /**
   * Remove the indicator and release resources.
   */
  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}
