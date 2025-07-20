chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.loadCSS) {
        var background_color = localStorage["background_color"];
        var css_code = "html { background-color: " + background_color + "; }"
        chrome.tabs.insertCSS(sender.tab.id, {
            code: css_code,
            runAt: 'document_start'
        });
        chrome.tabs.insertCSS(sender.tab.id, {
            file: 'contentstyle.css',
            runAt: 'document_start'
        });
    }
    if (request.closeTab) {
        chrome.tabs.remove(sender.tab.id);
    }
    if (request.getPreferences) {
        var prefs = {
            topic: 'Preferences',
            background_color: localStorage["background_color"],
            shortcut_fit_to_width: localStorage["shortcut_fit_to_width"],
            checkerboard_background: localStorage["checkerboard_background"],
            inertial_panning: localStorage["inertial_panning"],
            close_on_long_press: localStorage["close_on_long_press"],
            mode_default: localStorage["mode_default"],
            mode_default_image_smaller: localStorage["mode_default_image_smaller"],
            mode_doubleclick: localStorage["mode_doubleclick"],
            mode_enabled: localStorage["mode_enabled"],
            mode_enabled_image_smaller: localStorage["mode_enabled_image_smaller"],
            cursor_always_pointer: localStorage["cursor_always_pointer"],
            inertial_recording_time: localStorage["inertial_recording_time"],
            inertial_deceleration: localStorage["inertial_deceleration"],
            inertial_speed: localStorage["inertial_speed"],
            show_image_info: localStorage["show_image_info"],
            image_info_duration: localStorage["image_info_duration"],
        };
        sendResponse(prefs);
    }
});

if (!localStorage["preferences_set"]) {
    chrome.tabs.create({ 'url': chrome.extension.getURL("options.html#firsttime") });
}
