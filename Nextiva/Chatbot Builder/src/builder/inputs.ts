import addressIcon from '../assets/inputs/address.svg';
import bankIcon from '../assets/inputs/bank.svg';
import cardIcon from '../assets/inputs/card.svg';
import checklistIcon from '../assets/inputs/checklist.svg';
import cityIcon from '../assets/inputs/city.svg';
import countryIcon from '../assets/inputs/country.svg';
import dateRangeIcon from '../assets/inputs/date-range.svg';
import dateIcon from '../assets/inputs/date.svg';
import documentIcon from '../assets/inputs/document.svg';
import dropdownIcon from '../assets/inputs/dropdown.svg';
import emailIcon from '../assets/inputs/email.svg';
import mediaIcon from '../assets/inputs/media.svg';
import numericIcon from '../assets/inputs/numeric.svg';
import phoneIcon from '../assets/inputs/phone.svg';
import radioIcon from '../assets/inputs/radio.svg';
import textIcon from '../assets/inputs/text.svg';
import timeIcon from '../assets/inputs/time.svg';
import timeslotIcon from '../assets/inputs/timeslot.svg';
import websiteIcon from '../assets/inputs/website.svg';
import zipIcon from '../assets/inputs/zip.svg';
import type { InputKind } from './types';

export interface InputTypeSpec {
  kind: InputKind;
  /** Row in the type menu. */
  label: string;
  /** Name shown in the Input type field. */
  field: string;
  /** Shown on the save dialog as the variable type. */
  typeName: string;
  icon: string;
  w: number;
  h: number;
  operators: readonly string[];
  /** Date values show a calendar mark in the condition row. */
  dated?: boolean;
}

const TEXT_OPS = ['Contains', 'Equals', 'Is empty'] as const;
const NUMBER_OPS = ['Is a number', 'Equals', 'Greater than', 'Less than'] as const;
const DATE_OPS = ['Before', 'After', 'On'] as const;

export const INPUT_TYPES: Record<InputKind, InputTypeSpec> = {
  text: { kind: 'text', label: 'Text', field: 'Text input', typeName: 'Text', icon: textIcon, w: 12.25, h: 12.25, operators: TEXT_OPS },
  numeric: { kind: 'numeric', label: 'Numeric', field: 'Numeric', typeName: 'Numeric', icon: numericIcon, w: 12.25, h: 12.25, operators: NUMBER_OPS },
  media: { kind: 'media', label: 'Media', field: 'Media', typeName: 'Media', icon: mediaIcon, w: 16, h: 16, operators: TEXT_OPS },
  document: { kind: 'document', label: 'Document', field: 'Document', typeName: 'Document', icon: documentIcon, w: 10.5, h: 14, operators: TEXT_OPS },
  dropdown: { kind: 'dropdown', label: 'Dropdown', field: 'Dropdown', typeName: 'Dropdown', icon: dropdownIcon, w: 13.125, h: 10.5, operators: TEXT_OPS },
  checklist: { kind: 'checklist', label: 'Checklist', field: 'Checklist', typeName: 'Checklist', icon: checklistIcon, w: 14, h: 11.36, operators: TEXT_OPS },
  radio: { kind: 'radio', label: 'Radio buttons', field: 'Radio buttons', typeName: 'Radio buttons', icon: radioIcon, w: 14, h: 14, operators: TEXT_OPS },
  date: { kind: 'date', label: 'Date', field: 'Date', typeName: 'Date', icon: dateIcon, w: 12.25, h: 14, operators: DATE_OPS, dated: true },
  dateRange: { kind: 'dateRange', label: 'Date range', field: 'Date range', typeName: 'Date range', icon: dateRangeIcon, w: 12.25, h: 14, operators: DATE_OPS, dated: true },
  time: { kind: 'time', label: 'Time', field: 'Time', typeName: 'Time', icon: timeIcon, w: 14, h: 14, operators: DATE_OPS, dated: true },
  timeslot: { kind: 'timeslot', label: 'Timeslot', field: 'Timeslot', typeName: 'Timeslot', icon: timeslotIcon, w: 12.25, h: 14, operators: DATE_OPS, dated: true },
  email: { kind: 'email', label: 'Email ID', field: 'Email ID', typeName: 'Email ID', icon: emailIcon, w: 14, h: 10.5, operators: TEXT_OPS },
  phone: { kind: 'phone', label: 'Phone number', field: 'Phone number', typeName: 'Phone number', icon: phoneIcon, w: 14, h: 14, operators: TEXT_OPS },
  website: { kind: 'website', label: 'Website', field: 'Website', typeName: 'Website', icon: websiteIcon, w: 14, h: 14, operators: TEXT_OPS },
  address: { kind: 'address', label: 'Full address', field: 'Full address', typeName: 'Full address', icon: addressIcon, w: 13.125, h: 14, operators: TEXT_OPS },
  country: { kind: 'country', label: 'Country', field: 'Country', typeName: 'Country', icon: countryIcon, w: 12.25, h: 14, operators: TEXT_OPS },
  city: { kind: 'city', label: 'City', field: 'City', typeName: 'City', icon: cityIcon, w: 24, h: 19, operators: TEXT_OPS },
  zip: { kind: 'zip', label: 'ZIP code', field: 'ZIP code', typeName: 'ZIP code', icon: zipIcon, w: 10.5, h: 14, operators: TEXT_OPS },
  card: { kind: 'card', label: 'Credit card', field: 'Credit card', typeName: 'Credit card', icon: cardIcon, w: 15.75, h: 12.25, operators: TEXT_OPS },
  bank: { kind: 'bank', label: 'Bank account', field: 'Bank account', typeName: 'Bank account', icon: bankIcon, w: 14, h: 14, operators: TEXT_OPS },
};

export interface InputGroup {
  id: string;
  label: string;
  kinds: InputKind[];
}

export const INPUT_GROUPS: InputGroup[] = [
  { id: 'variable', label: 'Variable input', kinds: ['text', 'numeric', 'media', 'document'] },
  { id: 'fixed', label: 'Fixed input', kinds: ['dropdown', 'checklist', 'radio'] },
  { id: 'calendar', label: 'Calendar', kinds: ['date', 'dateRange', 'time', 'timeslot'] },
  { id: 'contact', label: 'Contact', kinds: ['email', 'phone', 'website'] },
  { id: 'location', label: 'Location', kinds: ['address', 'country', 'city', 'zip'] },
  { id: 'financial', label: 'Financial', kinds: ['card', 'bank'] },
];

export function inputSpec(kind: InputKind | undefined): InputTypeSpec {
  return INPUT_TYPES[kind ?? 'text'];
}
