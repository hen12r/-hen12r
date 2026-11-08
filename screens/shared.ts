import { AppStep } from '../types';
import { Translation } from '../i18n/translations';

export interface ScreenProps {
  t: Translation;
  onNavigate: (step: AppStep) => void;
}
