import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import St from "gi://St";
import { Slider } from "resource:///org/gnome/shell/ui/slider.js";

import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

/**
 * Popup menu item that binds a per-application stream to a volume slider.
 */
export const AppVolumeSlider = GObject.registerClass(
  class AppVolumeSlider extends PopupMenu.PopupBaseMenuItem {
    /**
     * @param {Gvc.MixerStream} stream - Mixer stream representing an app.
     * @param {Gvc.MixerControl} control - Mixer control for volume normalization.
     */
    _init(stream, control) {
      super._init({
        activate: false,
        hover: false,
      });
      this.track_hover = false;

      this._control = control;
      this._stream = stream;

      const icon = new St.Icon({
        icon_name: stream.get_icon_name?.() ?? "audio-volume-high-symbolic",
        style_class: "popup-menu-icon",
      });
      this._iconButton = new St.Button({
        child: icon,
        can_focus: true,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        style_class: "icon-button",
      });
      this.add_child(this._iconButton);

      const vbox = new St.BoxLayout({
        orientation: Clutter.Orientation.VERTICAL,
        x_expand: true,
      });

      const name = stream.get_name?.() ?? "";
      const description = stream.get_description?.() ?? "";
      const labelText =
        name && description ? `${name}: ${description}` : name || description;
      const label = new St.Label({
        text: labelText,
        x_align: Clutter.ActorAlign.START,
        style: "min-width: 0; max-width: 20em",
      });
      vbox.add_child(label);

      this._slider = new Slider(0);
      this._sliderChangedId = this._slider.connect(
        "notify::value",
        this._onSliderChanged.bind(this),
      );
      vbox.add_child(this._slider);

      this.add_child(vbox);

      this._iconButton.connect("clicked", () => {
        this._stream.change_is_muted(!this._stream.is_muted);
      });

      this._stream.connectObject(
        "notify::is-muted",
        () => this._updateVolume(),
        "notify::volume",
        () => this._updateVolume(),
        this,
      );

      this._updateVolume();
    }

    /**
     * Push slider value to the stream volume and handle auto-mute.
     */
    _onSliderChanged() {
      const volume = this._slider.value * this._control.get_vol_max_norm();
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

    /**
     * Sync UI state with the current stream volume and mute state.
     */
    _updateVolume() {
      const normalized = this._stream.is_muted
        ? 0
        : this._stream.volume / this._control.get_vol_max_norm();
      this._slider.block_signal_handler(this._sliderChangedId);
      this._slider.value = normalized;
      this._slider.unblock_signal_handler(this._sliderChangedId);
      this._iconButton.child.icon_name = this._stream.is_muted
        ? "audio-volume-muted-symbolic"
        : (this._stream.get_icon_name?.() ?? "audio-volume-high-symbolic");
    }

    /**
     * Disconnect stream bindings.
     */
    destroy() {
      this._stream.disconnectObject(this);
      super.destroy();
    }
  },
);
