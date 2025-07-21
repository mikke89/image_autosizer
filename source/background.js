chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.loadCSS) {
        chrome.storage.local.get(['background_color'], function(result) {
            var css_code = "html { background-color: " + result.background_color + "; }"
            chrome.scripting.insertCSS({
                target: { tabId: sender.tab.id },
                css: css_code
            });
            chrome.scripting.insertCSS({
                target: { tabId: sender.tab.id },
                files: ['contentstyle.css']
            });
        });
    }
    if (request.closeTab) {
        chrome.tabs.remove(sender.tab.id);
    }
    if (request.getPreferences) {
        chrome.storage.local.get([
            'background_color',
            'shortcut_fit_to_width',
            'checkerboard_background',
            'inertial_panning',
            'close_on_long_press',
            'mode_default',
            'mode_default_image_smaller',
            'mode_doubleclick',
            'mode_enabled',
            'mode_enabled_image_smaller',
            'cursor_always_pointer',
            'inertial_recording_time',
            'inertial_deceleration',
            'inertial_speed',
            'show_image_info',
            'image_info_duration'
        ], function(result) {
            var prefs = {
                topic: 'Preferences',
                ...result
            };
            sendResponse(prefs);
        });
        return true;
    }
});

chrome.storage.local.get(['preferences_set'], function(result) {
    if (!result.preferences_set) {
        chrome.tabs.create({ 'url': chrome.runtime.getURL("options.html#firsttime") });
    }
});
