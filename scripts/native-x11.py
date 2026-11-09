"""Native keystrokes for this isolated X11 test browser; no browser-page injection."""
import ctypes as C
import json
import re
import subprocess
import sys
import time

x = C.CDLL('libX11.so.6')
xt = C.CDLL('libXtst.so.6')
x.XOpenDisplay.argtypes = [C.c_char_p]
x.XOpenDisplay.restype = C.c_void_p
x.XKeysymToKeycode.argtypes = [C.c_void_p, C.c_ulong]
x.XKeysymToKeycode.restype = C.c_uint
x.XKeycodeToKeysym.argtypes = [C.c_void_p, C.c_uint, C.c_int]
x.XKeycodeToKeysym.restype = C.c_ulong
x.XStringToKeysym.argtypes = [C.c_char_p]
x.XStringToKeysym.restype = C.c_ulong
x.XSetInputFocus.argtypes = [C.c_void_p, C.c_ulong, C.c_int, C.c_ulong]
x.XRaiseWindow.argtypes = [C.c_void_p, C.c_ulong]
x.XSync.argtypes = [C.c_void_p, C.c_int]
xt.XTestFakeKeyEvent.argtypes = [C.c_void_p, C.c_uint, C.c_int, C.c_ulong]
xt.XTestFakeMotionEvent.argtypes = [C.c_void_p, C.c_int, C.c_int, C.c_int, C.c_ulong]
xt.XTestFakeButtonEvent.argtypes = [C.c_void_p, C.c_uint, C.c_int, C.c_ulong]
d = x.XOpenDisplay(None)
if not d:
    raise RuntimeError('No X11 display')
request = json.loads(sys.argv[1])
if request.get('focus', True):
    tree = subprocess.check_output(['xwininfo', '-root', '-tree'], text=True)
    windows = re.findall(r'(0x[0-9a-f]+) "[^\n]* - (?:Chromium|(?:Google )?Chrome(?: for Testing)?)"', tree)
    if not windows:
        raise RuntimeError('Chromium native window not found')
    window = int(request.get('window', windows[0]), 16)
    x.XRaiseWindow(d, window)
    x.XSetInputFocus(d, window, 2, 0)
    x.XSync(d, 0)

def keycode(key):
    return x.XKeysymToKeycode(d, x.XStringToKeysym(key.encode()))

def event(code, down):
    if not code:
        raise RuntimeError('Unknown keycode')
    xt.XTestFakeKeyEvent(d, code, int(down), 0)

for action in request['actions']:
    if 'keys' in action:
        codes = [keycode(key) for key in action['keys']]
        for code in codes:
            event(code, True)
        for code in reversed(codes):
            event(code, False)
    elif 'text' in action:
        for char in action['text']:
            symbol = ord(char)
            code = x.XKeysymToKeycode(d, symbol)
            shifted = x.XKeycodeToKeysym(d, code, 0) != symbol
            if shifted:
                event(keycode('Shift_L'), True)
            event(code, True)
            event(code, False)
            if shifted:
                event(keycode('Shift_L'), False)
    elif 'click' in action:
        left, top = action['click']
        xt.XTestFakeMotionEvent(d, -1, left, top, 0)
        xt.XTestFakeButtonEvent(d, 1, 1, 0)
        xt.XTestFakeButtonEvent(d, 1, 0, 0)
    x.XSync(d, 0)
    time.sleep(action.get('wait', 0.08))
print('Native input sent')
