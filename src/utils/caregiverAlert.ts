import { Linking } from 'react-native';

/** Share an alert with a caregiver: WhatsApp if available, SMS otherwise. */
export async function sendCaregiverAlert(message: string): Promise<boolean> {
  const text = encodeURIComponent(message);
  try {
    const whatsappUrl = `whatsapp://send?text=${text}`;
    if (await Linking.canOpenURL(whatsappUrl)) {
      await Linking.openURL(whatsappUrl);
      return true;
    }
    await Linking.openURL(`sms:?&body=${text}`);
    return true;
  } catch {
    return false;
  }
}
