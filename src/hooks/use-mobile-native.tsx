import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useMobileNative = () => {
  useEffect(() => {
    const initializeMobileFeatures = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          // Configuration de la barre de statut
          await StatusBar.setStyle({ style: Style.Default });
          await StatusBar.setBackgroundColor({ color: '#6366f1' });

          // Masquer le splash screen après l'initialisation
          await SplashScreen.hide();

          // Configuration du clavier
          Keyboard.addListener('keyboardWillShow', () => {
            document.body.classList.add('keyboard-open');
          });

          Keyboard.addListener('keyboardWillHide', () => {
            document.body.classList.remove('keyboard-open');
          });

        } catch (error) {
          console.log('Erreur initialisation fonctionnalités natives:', error);
        }
      }
    };

    initializeMobileFeatures();

    return () => {
      if (Capacitor.isNativePlatform()) {
        Keyboard.removeAllListeners();
      }
    };
  }, []);

  const triggerHapticFeedback = async (style: ImpactStyle = ImpactStyle.Light) => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.log('Haptic feedback non disponible');
      }
    }
  };

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  return {
    isNative,
    platform,
    triggerHapticFeedback,
  };
};