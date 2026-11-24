import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** True while the software keyboard is up, so forms and chat keep the space the bar would take. */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(Keyboard.isVisible());
  useEffect(() => {
    // iOS reports the keyboard before it animates in; Android only after.
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}
