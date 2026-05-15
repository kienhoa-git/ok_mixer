import GObject from "gi://GObject";
import Gvc from "gi://Gvc";

import * as Volume from "resource:///org/gnome/shell/ui/status/volume.js";
import { QuickMenuToggle } from "resource:///org/gnome/shell/ui/quickSettings.js";

import { AppVolumeSlider } from "./appVolumeSlider.js";

/**
 * Quick settings toggle that displays per-application volume sliders.
 */
export const MixerToggle = GObject.registerClass(
  class MixerToggle extends QuickMenuToggle {
    /**
     * Create the toggle and register stream listeners.
     */
    _init() {
      super._init({
        title: "Mixer",
        iconName: "audio-volume-high-symbolic",
      });

      const contents = this._box.get_first_child();
      contents.track_hover = false;

      this.menu.setHeader("audio-volume-high-symbolic", "Volume Mixer");

      this._sliderItems = {};
      this._control = Volume.getMixerControl();

      this._streamAddedId = this._control.connect(
        "stream-added",
        this._streamAdded.bind(this),
      );
      this._streamRemovedId = this._control.connect(
        "stream-removed",
        this._streamRemoved.bind(this),
      );

      for (const stream of this._control.get_streams())
        this._streamAdded(this._control, stream.get_id());
    }

    /**
     * Add a slider for the matching sink input stream.
     *
     * @param {Gvc.MixerControl} control - Mixer control emitting the signal.
     * @param {number} id - Stream id to inspect.
     */
    _streamAdded(control, id) {
      if (id in this._sliderItems) return;

      const stream = control.lookup_stream_id(id);
      if (stream.is_event_stream || !(stream instanceof Gvc.MixerSinkInput))
        return;

      const item = new AppVolumeSlider(stream, this._control);
      this._sliderItems[id] = item;
      this.menu.addMenuItem(item, 2);
    }

    /**
     * Remove the slider for a stream that disappeared.
     *
     * @param {Gvc.MixerControl} _control - Mixer control emitting the signal.
     * @param {number} id - Stream id to remove.
     */
    _streamRemoved(_control, id) {
      if (!(id in this._sliderItems)) return;
      this._sliderItems[id].destroy();
      delete this._sliderItems[id];
    }

    /**
     * Disconnect control listeners and clean up sliders.
     */
    destroy() {
      this._control.disconnect(this._streamAddedId);
      this._control.disconnect(this._streamRemovedId);
      for (const id in this._sliderItems) this._sliderItems[id].destroy();
      this._sliderItems = {};
      super.destroy();
    }
  },
);
