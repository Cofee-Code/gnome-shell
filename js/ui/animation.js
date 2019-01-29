// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Mainloop = imports.mainloop;
const St = imports.gi.St;

const Tweener = imports.ui.tweener;

var ANIMATED_ICON_UPDATE_TIMEOUT = 16;
var SPINNER_ANIMATION_TIME = 0.3;
var SPINNER_ANIMATION_DELAY = 1.0;

var Animation = class {
    constructor(file, width, height, speed) {
        this.actor = new St.Bin();
        this.actor.connect('destroy', this._onDestroy.bind(this));
        this._speed = speed;

        this._isLoaded = false;
        this._isPlaying = false;
        this._timeoutId = 0;
        this._frame = 0;

        let scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        this._animations = St.TextureCache.get_default().load_sliced_image (file, width, height, scaleFactor,
                                                                            this._animationsLoaded.bind(this));
        this.actor.set_child(this._animations);
    }

    play() {
        if (this._isLoaded && this._timeoutId == 0) {
            if (this._frame == 0)
                this._showFrame(0);

            this._timeoutId = GLib.timeout_add(GLib.PRIORITY_LOW, this._speed, this._update.bind(this));
            GLib.Source.set_name_by_id(this._timeoutId, '[gnome-shell] this._update');
        }

        this._isPlaying = true;
    }

    stop() {
        if (this._timeoutId > 0) {
            Mainloop.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        this._isPlaying = false;
    }

    _showFrame(frame) {
        let oldFrameActor = this._animations.get_child_at_index(this._frame);
        if (oldFrameActor)
            oldFrameActor.hide();

        this._frame = (frame % this._animations.get_n_children());

        let newFrameActor = this._animations.get_child_at_index(this._frame);
        if (newFrameActor)
            newFrameActor.show();
    }

    _update() {
        this._showFrame(this._frame + 1);
        return GLib.SOURCE_CONTINUE;
    }

    _animationsLoaded() {
        this._isLoaded = this._animations.get_n_children() > 0;

        if (this._isPlaying)
            this.play();
    }

    _onDestroy() {
        this.stop();
    }
};

var AnimatedIcon = class extends Animation {
    constructor(file, size) {
        super(file, size, size, ANIMATED_ICON_UPDATE_TIMEOUT);
    }
};

var Spinner = class extends AnimatedIcon {
    constructor(size, animate=false) {
        let file = Gio.File.new_for_uri('resource:///org/gnome/shell/theme/process-working.svg');
        super(file, size);

        this.actor.opacity = 0;
        this._animate = animate;
    }

    _onDestroy() {
        this._animate = false;
        super._onDestroy();
    }

    play() {
        Tweener.removeTweens(this.actor);

        if (this._animate) {
            super.play();
            Tweener.addTween(this.actor, {
                opacity: 255,
                delay: SPINNER_ANIMATION_DELAY,
                time: SPINNER_ANIMATION_TIME,
                transition: 'linear'
            });
        } else {
            this.actor.opacity = 255;
            super.play();
        }
    }

    stop() {
        Tweener.removeTweens(this.actor);

        if (this._animate) {
            Tweener.addTween(this.actor, {
                opacity: 0,
                time: SPINNER_ANIMATION_TIME,
                transition: 'linear',
                onComplete: () => {
                    this.stop(false);
                }
            });
        } else {
            this.actor.opacity = 0;
            super.stop();
        }
    }
};
