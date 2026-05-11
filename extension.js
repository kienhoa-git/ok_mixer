import GObject from "gi://GObject";
import Gvc from "gi://Gvc";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Volume from "resource:///org/gnome/shell/ui/status/volume.js";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import {
  QuickSlider,
  SystemIndicator,
} from "resource:///org/gnome/shell/ui/quickSettings.js";

// ── Per-app slider — same pattern as OutputStreamSlider in volume.js ──────────

const AppStreamSlider = GObject.registerClass(
  class AppStreamSlider extends QuickSlider {
    _init(stream, control) {
      super._init({
        iconName: "audio-volume-high-symbolic",
      });

      this._control = control;
      this._stream = null;

      // Label shown on the slider
      this.title = stream.get_name?.() ?? "App";

      this._sliderChangedId = this.slider.connect(
        "notify::value",
        this._onSliderChanged.bind(this),
      );

      this.connect("icon-clicked", () => {
        if (this._stream) this._stream.change_is_muted(!this._stream.is_muted);
      });

      this.stream = stream;
    }

    get stream() {
      return this._stream;
    }

    set stream(stream) {
      this._stream?.disconnectObject(this);
      this._stream = stream;
      if (this._stream) {
        this._stream.connectObject(
          "notify::is-muted",
          this._updateVolume.bind(this),
          "notify::volume",
          this._updateVolume.bind(this),
          this,
        );
        this._updateVolume();
      }
    }

    _onSliderChanged() {
      if (!this._stream) return;
      const volume = this.slider.value * this._control.get_vol_max_norm();
      const wasMuted = this._stream.is_muted;
      if (volume < 1) {
        this._stream.volume = 0;
        if (!wasMuted) this._stream.change_is_muted(true);
      } else {
        this._stream.volume = volume;
        if (wasMuted) this._stream.change_is_muted(false);
      }
      this._stream.push_volume();
    }

    _updateVolume() {
      if (!this._stream) return;
      const normalized = this._stream.is_muted
        ? 0
        : this._stream.volume / this._control.get_vol_max_norm();
      this.slider.block_signal_handler(this._sliderChangedId);
      this.slider.value = normalized;
      this.slider.unblock_signal_handler(this._sliderChangedId);
      this.iconName = this._stream.is_muted
        ? "audio-volume-muted-symbolic"
        : "audio-volume-high-symbolic";
    }
  },
);

// ── SystemIndicator ───────────────────────────────────────────────────────────

const MixerIndicator = GObject.registerClass(
  class MixerIndicator extends SystemIndicator {
    _init() {
      super._init();

      this._applicationStreams = {};
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

    _streamAdded(control, id) {
      if (id in this._applicationStreams) return;

      const stream = control.lookup_stream_id(id);
      if (!stream) return;
      if (stream.is_event_stream || !(stream instanceof Gvc.MixerSinkInput))
        return;

      console.log(`[Mixer] ✓ adding "${stream.get_name?.()}"`);

      const slider = new AppStreamSlider(stream, this._control);
      this._applicationStreams[id] = slider;

      // Push directly into quickSettingsItems — same as volume.js does
      this.quickSettingsItems.push(slider);

      // Re-register so the new item appears in the panel
      const qs = Main.panel.statusArea.quickSettings;
      qs.addExternalIndicator(this);
    }

    _streamRemoved(_control, id) {
      if (!(id in this._applicationStreams)) return;
      const slider = this._applicationStreams[id];
      // Remove from quickSettingsItems
      const idx = this.quickSettingsItems.indexOf(slider);
      if (idx !== -1) this.quickSettingsItems.splice(idx, 1);
      slider.destroy();
      delete this._applicationStreams[id];
    }

    destroy() {
      this._control.disconnect(this._streamAddedId);
      this._control.disconnect(this._streamRemovedId);
      for (const id in this._applicationStreams)
        this._applicationStreams[id].destroy();
      this._applicationStreams = {};
      super.destroy();
    }
  },
);

// ── Extension ─────────────────────────────────────────────────────────────────

export default class MixerExtension extends Extension {
  enable() {
    this._indicator = new MixerIndicator();
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  disable() {
    this._indicator.quickSettingsItems.forEach((item) => item.destroy());
    this._indicator.destroy();
    this._indicator = null;
  }
}
