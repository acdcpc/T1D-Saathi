import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Shared patient-photo chooser (camera / gallery / remove).
 * Resolves with the picked local URI, null when the photo was removed,
 * or undefined when the user cancelled.
 */
export async function pickPatientPhoto(isNe: boolean, hasPhoto: boolean): Promise<string | null | undefined> {
  return new Promise((resolve) => {
    const takePhoto = async () => {
      try {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { resolve(undefined); return; }
        const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
        resolve(!r.canceled && r.assets?.[0]?.uri ? r.assets[0].uri : undefined);
      } catch { resolve(undefined); }
    };
    const choosePhoto = async () => {
      try {
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, quality: 0.7 });
        resolve(!r.canceled && r.assets?.[0]?.uri ? r.assets[0].uri : undefined);
      } catch { resolve(undefined); }
    };
    Alert.alert(
      isNe ? 'बच्चाको फोटो' : "Child's photo",
      isNe ? 'फोटो कसरी थप्ने?' : 'How would you like to add it?',
      [
        { text: isNe ? 'क्यामेरा' : 'Take photo', onPress: takePhoto },
        { text: isNe ? 'ग्यालरी' : 'Choose from gallery', onPress: choosePhoto },
        ...(hasPhoto ? [{ text: isNe ? 'हटाउनुहोस्' : 'Remove photo', style: 'destructive' as const, onPress: () => resolve(null) }] : []),
        { text: isNe ? 'रद्द गर्नुहोस्' : 'Cancel', style: 'cancel' as const, onPress: () => resolve(undefined) },
      ],
      { cancelable: true, onDismiss: () => resolve(undefined) },
    );
  });
}
