// Inject CSS and background color first
(function () {
    if (document.contentType.indexOf('image/') === 0) {
        chrome.runtime.sendMessage({ loadCSS: true });
    }
})();


document.addEventListener('DOMContentLoaded', function () {

    var gImgFileSize = '--';

    if (document.body.querySelector('html:root>body>img:only-child')) {

        // Remove and add image to disable built-in browser scripts
        var oldImage = document.getElementsByTagName('img')[0];
        var newImage = document.createElement("img");
        gImgFileSrc = oldImage.src;
        newImage.src = oldImage.src;
        document.body.removeChild(oldImage);
        document.body.appendChild(newImage);

        // // Append CSS style
        // var styleURL = chrome.extension.getURL("contentstyle.css");
        // var head = document.createElement('head');
        // var style = document.createElement('link');
        // style.setAttribute('rel', 'stylesheet');
        // style.setAttribute('type', 'text/css');
        // style.setAttribute('href', styleURL);
        // head.appendChild(style);
        // document.getElementsByTagName('html')[0].appendChild(head);

        // Add status text div
        var divStatusText = document.createElement("div");
        divStatusText.className = 'statusText';
        divStatusText.style.display = 'none';
        document.body.appendChild(divStatusText);

        // Get file size
        var xhr = new XMLHttpRequest();
        xhr.open('HEAD', gImgFileSrc, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 && xhr.status == 200) gImgFileSize = humanFileSize(xhr.getResponseHeader('Content-Length'));
        };
        xhr.send(null);

        // Preferences
        var prefs = {};

        function paint_background_color(color) {
            if (!color) {
                if (prefs['bg_color'] == 'transparent' && document.getElementsByTagName('html')[0].style.backgroundImage != '') return 'transparent';
                return document.getElementsByTagName('html')[0].style.backgroundColor;
            }
            if (color == "checkerboard") {
                document.getElementsByTagName('html')[0].className = 'checkerboard';
                //document.getElementsByTagName('body')[0].style.backgroundColor = 'transparent';
            } else if (color == "transparent") {
                document.getElementsByTagName('html')[0].style.backgroundImage = '-o-skin("Pagebar Transparent Skin") !important';
                //document.getElementsByTagName('body')[0].style.backgroundColor = 'transparent';
            } else {
                document.getElementsByTagName('html')[0].className = '';
                document.getElementsByTagName('html')[0].style.backgroundColor = color;
                //document.getElementsByTagName('body')[0].style.backgroundColor = color;
            }
        }

        function getPreferences(response) {
            function numberLimit(num, min, max, def) {
                num = Number(num);
                if (isNaN(num)) return def;
                if (num < min) return def;
                if (num > max) return def;
                return num;
            }

            var bg_color = response['background_color'];
            var bg_pattern = /^#([a-f0-9]{6}|[a-f0-9]{3})$/i;
            if (bg_color == 'transparent') {
                prefs['bg_color'] = 'transparent';
            } else if (bg_pattern.test(bg_color)) {
                prefs['bg_color'] = bg_color;
            } else {
                prefs['bg_color'] = '#ffffff';
            }
            paint_background_color(prefs['bg_color']);
            prefs['checkerboard_background'] = typeof response['checkerboard_background'] == 'undefined' ? false : (response['checkerboard_background'] == 'true');
            if (prefs['checkerboard_background']) document.getElementsByTagName('img')[0].className = 'checkerboard';
            prefs['inertial_panning'] = typeof response['inertial_panning'] == 'undefined' ? true : (response['inertial_panning'] == 'true');
            prefs['inertial_recording_time'] = numberLimit(response['inertial_recording_time'], 10, 250, 50);
            prefs['inertial_deceleration'] = numberLimit(response['inertial_deceleration'], 0.1, 3.0, 1.0);
            prefs['inertial_speed'] = numberLimit(response['inertial_speed'], 0.1, 3.0, 1.0);
            prefs['mode_default'] = numberLimit(response['mode_default'], 1, 5, 1);
            prefs['mode_default_image_smaller'] = numberLimit(response['mode_default_image_smaller'], 1, 2, 1);
            prefs['mode_doubleclick'] = numberLimit(response['mode_doubleclick'], 0, 5, 2);
            prefs['mode_enabled'] = typeof response['mode_enabled'] == 'undefined' ? false : (JSON.parse(response['mode_enabled']));
            prefs['mode_enabled_image_smaller'] = typeof response['mode_enabled_image_smaller'] == 'undefined' ? false : (JSON.parse(response['mode_enabled_image_smaller']));
            count = 0;
            for (i in prefs['mode_enabled']) count++;
            if (count != 5) prefs['mode_enabled'] = {
                1: true,
                2: false,
                3: false,
                4: false,
                5: true
            };
            count = 0;
            for (i in prefs['mode_enabled_image_smaller']) count++;
            if (count != 2) prefs['mode_enabled_image_smaller'] = {
                1: true,
                2: true
            };
            prefs['all_image_smaller_modes_enabled'] = true;
            for (i in prefs['mode_enabled_image_smaller']) if (!prefs['mode_enabled_image_smaller'][i]) prefs['all_image_smaller_modes_enabled'] = false;
            prefs['cursor_always_pointer'] = typeof response['cursor_always_pointer'] == 'undefined' ? false : (response['cursor_always_pointer'] == 'true');
            prefs['show_image_info'] = typeof response['show_image_info'] == 'undefined' ? true : (response['show_image_info'] == 'true');
            prefs['image_info_duration'] = numberLimit(response['image_info_duration'], 0.5, 15.5, 5.0);
            prefs['close_on_long_press'] = typeof response['close_on_long_press'] == 'undefined' ? false : (response['close_on_long_press'] == 'true');

            main();
        };

        chrome.runtime.sendMessage({ "getPreferences": true }, getPreferences);


        /* ------------------------------------- */
        /* --------- The Main Script ----------- */
        /* ------------------------------------- */

        function main() {
            var body = document.getElementsByTagName('body')[0];
            var img = document.getElementsByTagName('img')[0];
            var divStatus = document.getElementsByTagName('div')[0];
            var mode = prefs['mode_default'];
            var pan = false;
            var inertial_lastX;
            var inertial_lastY;
            var inertial_speedX;
            var inertial_speedY;
            var inertial_timer;
            var inertial_last_times;
            var inertial_pos = {
                X: 0,
                Y: 0
            };
            var startX;
            var startY;
            var scrollReady = true;
            var closePageTimer = false;
            var cancel_click = false;
            var state = 'gt';

            var ViewModes = {
                FIT_TO_WINDOW: 1,
                FILL_WINDOW: 2,
                FIT_TO_WIDTH: 3,
                FIT_TO_HEIGHT: 4,
                ORIGINAL: 5
            };

            var SmallImageModes = {
                ORIGINAL: 1,
                MAXIMIZE: 2
            };

            var modes = {
                gt: {
                    [ViewModes.FIT_TO_WINDOW]: {
                        title: 'Fit to window',
                        body_class: 'contain',
                        cursor: 'zoom-in',
                        pan: false
                    },
                    [ViewModes.FILL_WINDOW]: {
                        title: 'Fill window',
                        body_class: 'fill auto',
                        cursor: 'zoom-in',
                        pan: true
                    },
                    [ViewModes.FIT_TO_WIDTH]: {
                        title: 'Fit to width',
                        body_class: 'fill width',
                        cursor: 'pointer',
                        pan: true
                    },
                    [ViewModes.FIT_TO_HEIGHT]: {
                        title: 'Fit to height',
                        body_class: 'fill height',
                        cursor: 'pointer',
                        pan: true
                    },
                    [ViewModes.ORIGINAL]: {
                        title: 'Original',
                        body_class: 'zoom',
                        cursor: 'zoom-out',
                        pan: true
                    }
                },
                st: {
                    [SmallImageModes.ORIGINAL]: {
                        title: 'Original',
                        body_class: '',
                        cursor: (prefs['all_image_smaller_modes_enabled'] ? 'zoom-in' : 'default'),
                        pan: false
                    },
                    [SmallImageModes.MAXIMIZE]: {
                        title: 'Maximize',
                        body_class: 'maximize',
                        cursor: (prefs['all_image_smaller_modes_enabled'] ? 'zoom-out' : 'default'),
                        pan: false
                    }
                }
            };
            var cursor = (prefs['cursor_always_pointer'] ? 'pointer' : modes[state][prefs['mode_default']].cursor);
            var init_timer;
            var initializor_count = 0;
            function initializor() {
                if (image_gt_window() == (state == 'st')) {
                    state = (state == 'gt' ? 'st' : 'gt');
                    mode = (state == 'gt' ? prefs['mode_default'] : prefs['mode_default_image_smaller']);
                    if (prefs['cursor_always_pointer']) {
                        cursor = 'pointer';
                    } else {
                        cursor = modes[state][mode].cursor;
                    }
                    apply_styles();
                }
                if (initializor_count++ > 10) init_timer = false;
                if (init_timer !== false) init_timer = setTimeout(initializor, 100);
            }
            window.addEventListener('load', function (ev) {
                if (init_timer) {
                    clearTimeout(init_timer);
                    init_timer = false;
                    initializor();
                }
            }, false);
            initializor();
            apply_styles();
            var statusTextTimeout;
            function change_status_text() {
                if (!prefs['show_image_info']) return;
                var ratio = Math.round((img.offsetWidth) / (img.naturalWidth) * 100);
                divStatus.innerHTML = "Resolution (" + img.naturalWidth + "x" + img.naturalHeight + ") &emsp; Size (" + gImgFileSize + ") &emsp; Zoom (" + ratio + "%) &emsp;  " + modes[state][mode].title;
                divStatus.style.display = 'block';
                if (prefs['image_info_duration'] <= 15.0) {
                    clearTimeout(statusTextTimeout);
                    statusTextTimeout = setTimeout(function () { divStatus.style.display = 'none'; }, prefs['image_info_duration'] * 1000);
                }
            }
            window.addEventListener('focus', change_status_text, false);

            function image_aspect_ratio() {
                return img.naturalWidth / img.naturalHeight;
            }
            function aspect_ratio_window_gt_image() {
                return window.innerWidth / window.innerHeight > img.naturalWidth / img.naturalHeight;
            }
            function image_gt_window() {
                return window.innerHeight < img.naturalHeight || window.innerWidth < img.naturalWidth;
            }
            function image_as_displayed_gt_window() {
                return window.innerHeight >= img.offsetHeight && window.innerWidth >= img.offsetWidth;
            }
            function image_gt_window_both_axes() {
                return window.innerHeight < img.naturalHeight && window.innerWidth < img.naturalWidth;
            }
            function apply_styles() {
                if (!init_timer) state = (image_gt_window() ? 'gt' : 'st');
                body.className = modes[state][mode].body_class + (aspect_ratio_window_gt_image() ? ' taller' : ' wider') + (image_gt_window_both_axes() ? ' bothsides' : ' oneside');
                body.style.cursor = cursor;
                img.style.marginTop = '0';

                if (state == 'gt' && mode == ViewModes.FIT_TO_WINDOW && !aspect_ratio_window_gt_image()) {
                    img.style.marginTop = Math.floor(body.clientHeight / 2 - window.innerWidth / image_aspect_ratio() / 2) + 'px';
                }
                change_status_text();
            }
            function go_to_mode(old_mode, pageX, pageY) {
                if (!prefs['cursor_always_pointer']) {
                    cursor = modes[state][mode].cursor;
                }
                if (state == 'gt' && (old_mode != mode && mode >= 2)) {
                    var relative_x = (pageX - img.offsetLeft) / img.offsetWidth;
                    var relative_y = (pageY - img.offsetTop) / img.offsetHeight;
                    var scrollX = window.pageXOffset, scrollY = window.pageYOffset;
                    clearTimeout(inertial_timer);
                    apply_styles();
                    window.scrollBy(relative_x * img.offsetWidth - scrollX - window.innerWidth / 2, relative_y * img.offsetHeight - scrollY - window.innerHeight / 2);
                } else {
                    apply_styles();
                }
            }
            window.addEventListener('resize', function (ev) {
                if (typeof this.aspect == 'undefined') {
                    this.aspect = aspect_ratio_window_gt_image();
                    this.larger = image_gt_window_both_axes();
                }
                var prev_aspect = this.aspect;
                var prev_larger = this.larger;
                var prev_state = state;
                //if ((this.aspect = aspect_ratio_window_gt_image()) != prev_aspect || (this.larger = image_gt_window_both_axes()) != prev_larger || (state = image_gt_window() ? 'gt' : 'st') != prev_state) {
                //apply_styles();
                //}
                if ((state = image_gt_window_both_axes() ? 'gt' : 'st') != prev_state) {
                    mode = getNextEnabledMode();
                }
                apply_styles();
            }, false);
            window.addEventListener('keydown', function (ev) {
                if (ev.keyCode == 67 && !ev.shiftKey && !ev.ctrlKey && !ev.altKey) {
                    var current_color = paint_background_color();
                    if (current_color.compareColor("#000000")) {
                        paint_background_color('#ffffff');
                    } else if (current_color.compareColor('#ffffff') && !(prefs['bg_color'].compareColor('#ffffff') || prefs['bg_color'].compareColor('#000000'))) {
                        paint_background_color(prefs['bg_color']);
                    } else {
                        paint_background_color('#000000');
                    }
                } else if (ev.keyCode == 67 && ev.shiftKey && !ev.ctrlKey && !ev.altKey) {
                    paint_background_color('checkerboard');
                }
            }, false);
            function getNextEnabledMode() {
                if (state == 'st') {
                    for (i = 1; i < 2; i++) {
                        if (prefs['mode_enabled_image_smaller'][(mode + i - 1) % 2 + 1]) {
                            return (mode + i - 1) % 2 + 1;
                        }
                    }
                    return mode;
                }
                for (i = 1; i < 5; i++) {
                    if (prefs['mode_enabled'][(mode + i - 1) % 5 + 1]) {
                        return (mode + i - 1) % 5 + 1;
                    }
                }
                return mode;
            }
            function inertial_pan() {
                window.scrollTo(inertial_pos.X, inertial_pos.Y);
                var decelerate_factor = 1.0 + 0.05 * prefs['inertial_deceleration'];
                inertial_speedX = inertial_speedX / decelerate_factor;
                inertial_speedY = inertial_speedY / decelerate_factor;
                inertial_pos.X -= inertial_speedX;
                inertial_pos.Y -= inertial_speedY;
                if (Math.abs(inertial_speedX) < 0.5 && Math.abs(inertial_speedY) < 0.5) {
                    clearTimeout(inertial_timer);
                }
            }
            body.addEventListener('click', function (ev) {
                if (!cancel_click) {
                    var old_mode = mode;
                    if (init_timer) {
                        clearTimeout(init_timer);
                        init_timer = false;
                    }
                    mode = getNextEnabledMode();
                    go_to_mode(old_mode, ev.pageX, ev.pageY);
                }
            }, false);
            body.addEventListener('dblclick', function (ev) {
                if (prefs['mode_doubleclick'] > 0 && state == 'gt') {
                    var old_mode = mode;
                    mode = prefs['mode_doubleclick'];
                    go_to_mode(old_mode, ev.pageX, ev.pageY);
                }
            }, false);
            body.addEventListener('mousedown', function (ev) {
                if (modes[state][mode].pan && ev.which == 1) {
                    pan = true;
                    clearTimeout(inertial_timer);
                    startX = ev.screenX;
                    startY = ev.screenY;
                    startScrollX = window.scrollX;
                    startScrollY = window.scrollY;
                    inertial_lastX = [startX];
                    inertial_lastY = [startY];
                    var date = new Date();
                    var t = date.getTime();
                    inertial_last_times = [t];
                }
                if (prefs['close_on_long_press'] && ev.which == 1) {
                    closePageTimer = setTimeout(function () { chrome.runtime.sendMessage({ closeTab: true }); }, 1000);
                }
                cancel_click = false;
            }, false);
            body.addEventListener('mousemove', function (ev) {
                if (pan && scrollReady) {
                    body.style.cursor = "move";
                    if (prefs['inertial_panning']) {
                        var date = new Date();
                        inertial_last_times.unshift(date.getTime());
                        inertial_lastX.unshift(ev.screenX);
                        inertial_lastY.unshift(ev.screenY);
                    }
                    window.scrollTo(startX + startScrollX - ev.screenX, startY + startScrollY - ev.screenY);
                } else if (pan) {

                }
                cancel_click = true;
            }, false);
            body.addEventListener('mouseup', function (ev) {
                if (pan) {
                    if (prefs['inertial_panning']) {
                        var date = new Date();

                        inertial_last_times.unshift(date.getTime());
                        inertial_lastX.unshift(ev.screenX);
                        inertial_lastY.unshift(ev.screenY);
                        var index = findElementGT(inertial_last_times, prefs['inertial_recording_time']);
                        var dT = Math.max(10, inertial_last_times[0] - inertial_last_times[index]);
                        var dX = inertial_lastX[0] - inertial_lastX[index];
                        var dY = inertial_lastY[0] - inertial_lastY[index];
                        /*console.log('index: ' + index + ' dT: ' + dT + ' dX: ' + dX + ' dY: ' + dY);
                        console.log(inertial_last_times);
                        console.log(inertial_lastX);
                        console.log(inertial_lastY);*/
                        inertial_speedX = dX * 8 / dT * prefs['inertial_speed'];
                        inertial_speedY = dY * 8 / dT * prefs['inertial_speed'];
                        inertial_pos.X = window.scrollX;
                        inertial_pos.Y = window.scrollY;

                        inertial_timer = setInterval(inertial_pan, 10);
                    }
                    body.style.cursor = cursor;
                    pan = false;
                }
                if (closePageTimer) {
                    clearTimeout(closePageTimer);
                }
            }, false);
            function findElementGT(arr, value) {
                if (arr.length <= 0) return 0;
                for (var i = 1, n = arr.length; i < n; i++) {
                    if (arr[0] - arr[i] > value) return i - 1;
                }
                return arr.length - 1;
            }

            body.addEventListener('mouseout', function (ev) {
                if (pan) {
                    pan = false;
                    body.style.cursor = cursor;
                }
            }, false);
            window.ondragstart = function (e) {
                if (state == 'gt' && mode != 1) e.preventDefault();
            };
            String.prototype.compareColor = function () {
                if (this == 'transparent' || arguments[0] == 'transparent') return false;
                if (this == 'checkerboard' || arguments[0] == 'checkerboard') return false;
                if ((this.indexOf("#") != -1 && arguments[0].indexOf("#") != -1) || (this.indexOf("rgb") != -1 && arguments[0].indexOf("rgb") != -1)) {
                    return this.toLowerCase() == arguments[0].toLowerCase();
                } else {
                    xCol_1 = this;
                    xCol_2 = arguments[0];
                    if (xCol_1.indexOf("#") != -1) xCol_1 = xCol_1.toRGBcolor();
                    if (xCol_2.indexOf("#") != -1) xCol_2 = xCol_2.toRGBcolor();
                    return xCol_1.toLowerCase() == xCol_2.toLowerCase();
                }
            };
            String.prototype.toRGBcolor = function () {
                varR = parseInt(this.substring(1, 3), 16);
                varG = parseInt(this.substring(3, 5), 16);
                varB = parseInt(this.substring(5, 7), 16);
                return "rgb(" + varR + ", " + varG + ", " + varB + ")";
            };

        }
    }
    // Helper functions
    function humanFileSize(bytes) {
        function sigFigs(n, sig) {
            var mult = Math.pow(10, sig - Math.floor(Math.log(n) / Math.LN10) - 1);
            return Math.round(n * mult) / mult;
        }
        var thresh = 1024;
        if (bytes < thresh) return bytes + ' B';
        var units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        var u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while (bytes >= thresh);
        return sigFigs(bytes, 3) + ' ' + units[u];
    }
});
