import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

const ROOT_PATHS = ['/dashboard', '/login', '/welcome'];

// Android-only helper: back button, status bar, splash. Renders nothing.
export default function NativeBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let handle;
    let gone = false;
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#171923' }).catch(() => {});
    SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (document.querySelector('.modal-backdrop')) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      } else if (ROOT_PATHS.includes(window.location.pathname) || !canGoBack) {
        CapApp.exitApp();
      } else {
        navigate(-1);
      }
    }).then((h) => (gone ? h.remove() : (handle = h)));
    return () => {
      gone = true;
      handle?.remove();
    };
  }, [navigate]);
  return null;
}
