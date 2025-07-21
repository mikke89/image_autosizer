var color_pattern = /^#([a-f0-9]{6}|[a-f0-9]{3})$/i;
var help_constraints = [[0, 0], [22, 22]];


function load_settings() {
    var bc = document.getElementsByName("background_color");

    document.getElementById('custom_color').addEventListener("change", function () {
        bc[bc.length - 1].checked = true;
    }, false);

    document.getElementById('transparency').addEventListener('mousemove', function (e) {
        if (e.pageX < help_constraints[0][0] || e.pageY < help_constraints[0][1] ||
            e.pageX > help_constraints[1][0] || e.pageY > help_constraints[1][1]) {
            document.getElementById('help_float').style.display = 'none';
            this.style.display = 'none';
        }
    }, false);

    bgc();

    chrome.storage.local.get(null, function(items) {
        // Colors
        var v = items.background_color;
        if (v == 'default') {
            document.getElementById('default').checked = true;
        } else if (v == 'transparent') {
            document.getElementById('transparent').checked = true;
        } else {
            document.getElementById('custom').checked = true;
            document.getElementById('custom_color').value = v;
        }

        // Checkboxes
        var checkbox_names = ['checkerboard_background', 'inertial_panning', 'close_on_long_press', 'cursor_always_pointer', 'show_image_info'];
        for (i = 0; i < checkbox_names.length; i++) {
            document.getElementById(checkbox_names[i]).checked = items[checkbox_names[i]] == 'true';
        }
        document.getElementById('inertial_panning').onchange();
        document.getElementById('show_image_info').onchange();

        // Inertial panning sliders
        var slider_names = { 'inertial_recording_time': 50, 'inertial_deceleration': 1.0, 'inertial_speed': 1.0, 'image_info_duration': 5.0 };
        for (i in slider_names) {
            var e = document.getElementById(i);
            var value = items[i];
            if (isNaN(value)) value = slider_names[i];
            e.value = value;
            e.onchange();
        }

        // View modes
        setRadioValue(document.getElementsByName("mode_def"),
            typeof items['mode_default'] == 'undefined' ? 1 : parseInt(items['mode_default'])
        );
        setRadioValue(document.getElementsByName("mode_def_image_smaller"),
            typeof items['mode_default_image_smaller'] == 'undefined' ? 1 : parseInt(items['mode_default_image_smaller'])
        );
        setRadioValue(document.getElementsByName("mode_dbl"),
            typeof items['mode_doubleclick'] == 'undefined' ? 2 : parseInt(items['mode_doubleclick'])
        );
        var mode = typeof items['mode_enabled'] == 'undefined' ? { 1: true, 2: false, 3: false, 4: false, 5: true } : JSON.parse(items['mode_enabled']);
        for (i in mode) {
            document.getElementById('mode' + i).checked = mode[i];
        }
        mode = typeof items['mode_enabled_image_smaller'] == 'undefined' ? { 1: true, 2: true } : JSON.parse(items['mode_enabled_image_smaller']);
        for (i in mode) {
            document.getElementById('mode_image_smaller' + i).checked = mode[i];
        }
    });
}

function setRadioValue(elements, value) {
    for (i = 0; i < elements.length; i++) {
        if (elements[i].value == value) elements[i].checked = true;
    }
    return false;
}
function getRadioValue(elements) {
    for (i = 0; i < elements.length; i++) {
        if (elements[i].checked) return elements[i].value;
    }
    return false;
}


function save() {
    var c, bc = document.getElementsByName("background_color"), v1, mode = {}, mode_image_smaller = {};
    for (i = 0; i < bc.length; i++) {
        if (bc[i].checked) {
            if (bc[i].value == 'custom') c = document.getElementById('custom_color').value;
            else if (bc[i].value == 'transparent') c = 'transparent';
            else c = 'default';
        }
    }

    for (i = 1; i <= 5; i++) {
        if (document.getElementById('mode' + i).checked) mode[i] = true; else mode[i] = false;
    }
    for (i = 1; i <= 2; i++) {
        if (document.getElementById('mode_image_smaller' + i).checked) mode_image_smaller[i] = true; else mode_image_smaller[i] = false;
    }

    var dataToSave = {
        'mode_default': parseInt(getRadioValue(document.getElementsByName("mode_def"))),
        'mode_default_image_smaller': parseInt(getRadioValue(document.getElementsByName("mode_def_image_smaller"))),
        'mode_doubleclick': parseInt(getRadioValue(document.getElementsByName("mode_dbl"))),
        'mode_enabled': JSON.stringify(mode),
        'mode_enabled_image_smaller': JSON.stringify(mode_image_smaller)
    };

    // Inertial panning sliders
    var slider_names = ['inertial_recording_time', 'inertial_deceleration', 'inertial_speed', 'image_info_duration'];
    for (i = 0; i < slider_names.length; i++) {
        dataToSave[slider_names[i]] = document.getElementById(slider_names[i]).value;
    }

    // Misc.
    var checkbox_names = ['checkerboard_background', 'inertial_panning', 'close_on_long_press', 'cursor_always_pointer', 'show_image_info'];
    for (i = 0; i < checkbox_names.length; i++) {
        dataToSave[checkbox_names[i]] = document.getElementById(checkbox_names[i]).checked.toString();
    }

    if (c == 'default' || c == 'transparent' || color_pattern.test(c)) {
        dataToSave.background_color = c;
        dataToSave.shortcut_fit_to_width = v1;

        chrome.storage.local.set(dataToSave, function() {
            var element = document.getElementById('saved');
            element.style.display = "block";
            setTimeout(function() {
                element.style.display = 'none';
            }, 2500);
        });
    }

    return false;
}


function saveDefault(ask) {

    if (!ask || confirm("This will remove all your settings.\n\nAre you sure you want to continue?")) {

        var items = {
            background_color: '#000000',
            shortcut_fit_to_width: "double_click",
            checkerboard_background: "false",
            inertial_panning: "true",
            close_on_long_press: "false",
            mode_default: "1",
            mode_enabled: '{"1":true,"2":false,"3":false,"4":false,"5":true}',
            mode_doubleclick: "2",
            mode_default_image_smaller: "1",
            mode_enabled_image_smaller: '{"1":true,"2":true}',
            cursor_always_pointer: "false",
            inertial_recording_time: "50",
            inertial_deceleration: "1.0",
            inertial_speed: "1.0",
            show_image_info: "true",
            image_info_duration: "5.0",
        };

        chrome.storage.local.set(items, function() {
            if (ask) {
                var element = document.getElementById('reverted');
                element.style.display = "block";
                setTimeout(function() {
                    element.style.display = 'none';
                }, 2500);
            }
            load_settings();
        });
    }
}





function showHelp() {
    function findPos(obj) {
        var curleft = curtop = 0;
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
        return [curleft, curtop];
    }

    var button = this;

    var help_float = document.getElementById('help_float'),
        transparency = document.getElementById('transparency'),
        button_pos = findPos(button);
    var show_float_beneath = button.className.match(new RegExp('(\\s|^)' + "help_beneath" + '(\\s|$)'));

    help_float.innerHTML = button.innerHTML;
    help_float.style.display = 'block';


    if (show_float_beneath) help_constraints = [[button_pos[0] - 6, button_pos[1] - 6], [button_pos[0] + button.offsetWidth + 6, button_pos[1] + button.offsetHeight + 12]];
    else help_constraints = [[button_pos[0] - 6, button_pos[1] - 12], [button_pos[0] + button.offsetWidth + 6, button_pos[1] + button.offsetHeight + 6]];
    transparency.style.display = 'block';

    help_float.style.left = (button_pos[0] - help_float.offsetWidth + 30) + 'px';

    if (show_float_beneath) {
        help_float.style.top = (button_pos[1] + 24) + 'px';
    } else {
        help_float.style.top = (button_pos[1] - help_float.clientHeight - 12) + 'px';
    }

}
function bgc() {
    var bgc_el = document.getElementById('facey'),
        c = bgc_el.getContext('2d'),
        pi = Math.PI,
        i = 1,
        start_color = [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), 0];

    bgc_el.style.top = Math.floor(Math.random() * (window.innerHeight - 150)) + 'px';
    bgc_el.style.left = Math.floor(Math.random() * (window.innerWidth - 150)) + 'px';



    var t = setInterval(function () {
        c.beginPath();
        c.strokeStyle = 'rgba(' + Math.max(0, start_color[0] - i) + ',' + Math.max(0, start_color[1] - i) + ',' + Math.max(0, start_color[2] - i) + ', ' + Math.min(1.0, (i - start_color[3]) / 256) + ')';
        c.arc(80, 75, 50, 0, pi * 2, true);
        c.moveTo(115, 75);
        c.arc(80, 75, 35, 0, pi, false);
        c.moveTo(73, 60);
        c.arc(65, 60, 8, 0, pi * 2, true);
        c.moveTo(103, 60);
        c.arc(95, 60, 8, 0, pi * 2, true);
        c.clearRect(0, 0, 150, 150);
        c.stroke();
        c.beginPath();
        c.fillStyle = c.strokeStyle;
        c.moveTo(73, 63);
        c.arc(70, 62, 3, 0, pi * 2, true);
        c.moveTo(92, 57);
        c.arc(92, 56, 3, 0, pi * 2, true);
        c.fill();
        if (++i > 256 || faceSpaceTime > 0) {
            clearInterval(t);
        }
    }, 2000);


}

var faceSpace, faceSpaceTime = 0;

function drawFace() {
    //clearInterval(t);
    var facey_el = document.getElementById('facey'),
        c = facey_el.getContext('2d'),
        pi = Math.PI;

    c.beginPath();
    c.strokeStyle = "#000000";
    c.arc(80, 75, 50, 0, pi * 2, true);
    var radius = 15 + 3 * Math.sin(0.79 * faceSpaceTime) + 2 * Math.sin(2.38 * faceSpaceTime) + 1.5 * Math.sin(7 * faceSpaceTime);
    c.moveTo(80 + radius, 95);
    c.arc(80, 95, radius, 0, pi * 2, false);
    c.moveTo(73, 60);
    c.arc(65, 60, 8, 0, pi * 2, true);
    c.moveTo(103, 60);
    c.arc(95, 60, 8, 0, pi * 2, true);
    c.clearRect(0, 0, 150, 150);
    c.stroke();
    c.fillStyle = 'rgba(' + Math.round((Math.sin(1 * faceSpaceTime + 1) / 2 + .5) * 255) + ',' + Math.round((Math.sin(3 * faceSpaceTime + 4) / 2 + .5) * 255) + ',' + Math.round((Math.sin(5 * faceSpaceTime + 1) / 2 + .5) * 255) + ', ' + ((Math.sin(7 * faceSpaceTime + 3) / 2 + .5)) + ')';
    c.fill();
    c.beginPath();
    c.fillStyle = c.strokeStyle;
    c.moveTo(73, 63);
    c.arc(67 + 5 * Math.sin(3 * faceSpaceTime), 59 + 4 * Math.sin(7 * faceSpaceTime), 3, 0, pi * 2, true);
    c.moveTo(92, 57);
    c.arc(95 + 5 * Math.sin(4 * faceSpaceTime), 59 + 3 * Math.sin(5 * faceSpaceTime), 3, 0, pi * 2, true);
    var fill = 'rgba(' + Math.round((Math.sin(4 * faceSpaceTime + 1) / 2 + .5) * 255) + ',' + Math.round((Math.sin(5 * faceSpaceTime + 4) / 2 + .5) * 255) + ',' + Math.round((Math.sin(9 * faceSpaceTime + 1) / 2 + .5) * 255) + ', ' + ((Math.sin(7 * faceSpaceTime + 3) / 2 + .5)) + ')';
    c.fillStyle = '#000000';
    c.fill();
    faceSpaceTime = faceSpaceTime + 0.1;
}


function onContentLoaded() {

    document.getElementById('btn_save').addEventListener('click', save, false);
    document.getElementById('btn_revert').addEventListener('click', saveDefault, false);

    document.getElementById('inertial_recording_time').onchange = function () {
        document.querySelector('label[for="inertial_recording_time"]').innerText = 'Recording time (' + this.value + ' ms)';
    };
    document.getElementById('inertial_deceleration').onchange = function () {
        document.querySelector('label[for="inertial_deceleration"]').innerText = 'Deceleration (' + Number(this.value).toFixed(1) + ')';
    };
    document.getElementById('inertial_speed').onchange = function () {
        document.querySelector('label[for="inertial_speed"]').innerText = 'Speed (' + Number(this.value).toFixed(1) + ')';
    };
    document.getElementById('inertial_panning').onchange = function () {
        if (this.checked) {
            document.getElementById('inertial_speed').disabled = false;
            document.getElementById('inertial_deceleration').disabled = false;
            document.getElementById('inertial_recording_time').disabled = false;
        } else {
            document.getElementById('inertial_speed').disabled = true;
            document.getElementById('inertial_deceleration').disabled = true;
            document.getElementById('inertial_recording_time').disabled = true;
        }
    };
    document.getElementById('image_info_duration').onchange = function () {
        var v = Number(this.value);
        document.querySelector('label[for="image_info_duration"]').innerHTML = 'Duration (' + (v > 15.0 ? 'Always' : v.toFixed(1) + ' s') + ')';
    };
    document.getElementById('show_image_info').onchange = function () {
        document.getElementById('image_info_duration').disabled = !this.checked;
    };

    var helpers = document.querySelectorAll('.help');
    for (var i = 0, max = helpers.length; i < max; i++) {
        helpers[i].addEventListener('mouseover', showHelp, false);
    }


    document.getElementById('facey').addEventListener('click', function () { faceSpace = setInterval(drawFace, 50); }, false);

    if (window.location.hash == '#firsttime') {
        window.location.href = '#';
        chrome.storage.local.set({ "preferences_set": true }, function() {
            saveDefault(false);
        });
    } else {
        load_settings();
    }

}

document.addEventListener('DOMContentLoaded', onContentLoaded);
