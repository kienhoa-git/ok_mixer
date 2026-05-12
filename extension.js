import Clutter from "gi://Clutter";
import GObject from "gi://GObject";
import Gvc from "gi://Gvc";
import St from "gi://St";
import { Slider } from "resource:///org/gnome/shell/ui/slider.js";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Volume from "resource:///org/gnome/shell/ui/status/volume.js";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import {
  QuickMenuToggle,
  SystemIndicator,
} from "resource:///org/gnome/shell/ui/quickSettings.js";

const AppVolumeSlider = GObject.registerClass(
  class AppVolumeSlider extends PopupMenu.PopupBaseMenuItem {
    _init(stream, control) {
      super._init({
        activate: false,
        hover: false,
        style_class: "quick-slider",
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
      this._iconButton.connect("clicked", () => {
        this._stream.change_is_muted(!this._stream.is_muted);
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

      this._stream.connectObject(
        "notify::is-muted",
        () => this._updateVolume(),
        "notify::volume",
        () => this._updateVolume(),
        this,
      );

      this._updateVolume();
    }

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

    destroy() {
      this._stream.disconnectObject(this);
      super.destroy();
    }
  },
);

const MixerToggle = GObject.registerClass(
  class MixerToggle extends QuickMenuToggle {
    _init() {
      super._init({
        title: "Volume Mixer",
        iconName: "audio-volume-high-symbolic",
      });

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

    _streamAdded(control, id) {
      if (id in this._sliderItems) return;

      const stream = control.lookup_stream_id(id);
      if (stream.is_event_stream || !(stream instanceof Gvc.MixerSinkInput))
        return;

      const item = new AppVolumeSlider(stream, this._control);
      this._sliderItems[id] = item;
      this.menu.addMenuItem(item, 2);
    }

    _streamRemoved(_control, id) {
      if (!(id in this._sliderItems)) return;
      this._sliderItems[id].destroy();
      delete this._sliderItems[id];
    }

    destroy() {
      this._control.disconnect(this._streamAddedId);
      this._control.disconnect(this._streamRemovedId);
      for (const id in this._sliderItems) this._sliderItems[id].destroy();
      this._sliderItems = {};
      super.destroy();
    }
  },
);

const MixerIndicator = GObject.registerClass(
  class MixerIndicator extends SystemIndicator {
    _init() {
      super._init();
      this._toggle = new MixerToggle();
      this.quickSettingsItems.push(this._toggle);
    }

    destroy() {
      this._toggle.destroy();
      super.destroy();
    }
  },
);

export default class MixerExtension extends Extension {
  enable() {
    this._indicator = new MixerIndicator();
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}
