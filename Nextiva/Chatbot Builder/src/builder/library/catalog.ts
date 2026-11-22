import avatar1 from './assets/avatar-1.png';
import avatar2 from './assets/avatar-2.png';
import avatar3 from './assets/avatar-3.png';
import avatar4 from './assets/avatar-4.png';
import avatar5 from './assets/avatar-5.png';
import avatar6 from './assets/avatar-6.png';
import avatar7 from './assets/avatar-7.png';
import avatar8 from './assets/avatar-8.png';
import avatar9 from './assets/avatar-9.png';
import avatar10 from './assets/avatar-10.png';
import tpl1 from './assets/templates/tpl-1.png';
import tpl2 from './assets/templates/tpl-2.png';
import tpl3 from './assets/templates/tpl-3.png';
import tpl4 from './assets/templates/tpl-4.png';
import tpl5 from './assets/templates/tpl-5.png';
import tpl6 from './assets/templates/tpl-6.png';
import tpl7 from './assets/templates/tpl-7.png';
import tpl8 from './assets/templates/tpl-8.png';
import tpl9 from './assets/templates/tpl-9.png';
import tpl10 from './assets/templates/tpl-10.png';
import tpl11 from './assets/templates/tpl-11.png';
import tpl12 from './assets/templates/tpl-12.png';
import { messageGraph, receptionistTemplate } from '../scenarios';
import type { GraphState } from '../types';

export type Industry = 'E-commerce' | 'Financial services' | 'Legal services' | 'General';
export type TemplateChannel = 'Whatsapp' | 'Instagram';

const ORDER_TITLE = 'Order and payment management automation';
const SUPPLY_TITLE = 'Supply management bot for construction company';
const CONTRACT_TITLE = 'Online contract management bot to resolve ambiguities';
const MESSENGER_TITLE = 'Facebook Messenger: Connect with your customers';
const LIVE_TITLE = 'Live chat support to real-time communication';

const ORDER_COPY =
  'E-commerce bot for instagram helps user with managing their orders, delivery, and payment requirements.';
const SUPPLY_COPY =
  'How to change your daily routine as a construction PM and get your team to synchronise faster than an F1 team.';
const MESSENGER_COPY =
  'Receive messages from your Facebook pages right in the LiveChat app. Keep all your communication in one place, to make your team more effective and provide better customer support';
const LIVE_COPY = 'Online communication with customers has always been essential, becoming even more vital these days';
const RECEPTION_COPY =
  'A receptionist bot bridges that gap. It greets every visitor the moment they arrive, answers the questions that come up most often, and routes the ones that need a human to exactly the right person';

export interface BotTemplate {
  id: string;
  title: string;
  description: string;
  industry: Industry;
  channel: TemplateChannel;
  image: string;
  /** First card uses a shifted crop so the wave graphic sits in the frame. */
  shift?: boolean;
  graph: () => GraphState;
}

function template(
  id: string,
  title: string,
  description: string,
  industry: Industry,
  channel: TemplateChannel,
  image: string,
  shift = false,
): BotTemplate {
  return {
    id,
    title,
    description,
    industry,
    channel,
    image,
    shift,
    graph: () => messageGraph(title.split(':')[0], description),
  };
}

export const TEMPLATES: BotTemplate[] = [
  template('orders', ORDER_TITLE, ORDER_COPY, 'E-commerce', 'Whatsapp', tpl1, true),
  template('supply', SUPPLY_TITLE, SUPPLY_COPY, 'Financial services', 'Whatsapp', tpl2),
  template('contracts', CONTRACT_TITLE, SUPPLY_COPY, 'Legal services', 'Whatsapp', tpl3),
  {
    ...template('receptionist', 'Receptionist bot', RECEPTION_COPY, 'General', 'Whatsapp', tpl4),
    graph: receptionistTemplate,
  },
  template('messenger', MESSENGER_TITLE, MESSENGER_COPY, 'E-commerce', 'Whatsapp', tpl5),
  template('livechat', LIVE_TITLE, LIVE_COPY, 'E-commerce', 'Whatsapp', tpl6),
  template('contracts-2', CONTRACT_TITLE, SUPPLY_COPY, 'Legal services', 'Whatsapp', tpl7),
  template('messenger-2', MESSENGER_TITLE, MESSENGER_COPY, 'E-commerce', 'Whatsapp', tpl8),
  template('supply-2', SUPPLY_TITLE, SUPPLY_COPY, 'Financial services', 'Whatsapp', tpl9),
  template('orders-2', ORDER_TITLE, ORDER_COPY, 'E-commerce', 'Whatsapp', tpl10),
  template('livechat-2', LIVE_TITLE, LIVE_COPY, 'E-commerce', 'Whatsapp', tpl11),
  template('contracts-3', CONTRACT_TITLE, SUPPLY_COPY, 'Legal services', 'Whatsapp', tpl3),
  template('supply-3', SUPPLY_TITLE, SUPPLY_COPY, 'Financial services', 'Whatsapp', tpl12),
  template('orders-3', ORDER_TITLE, ORDER_COPY, 'E-commerce', 'Whatsapp', tpl6),
  template('messenger-3', MESSENGER_TITLE, MESSENGER_COPY, 'E-commerce', 'Whatsapp', tpl8),
  template('contracts-4', CONTRACT_TITLE, SUPPLY_COPY, 'Legal services', 'Whatsapp', tpl3),
  template('orders-4', ORDER_TITLE, ORDER_COPY, 'E-commerce', 'Whatsapp', tpl6),
  template('messenger-ig', MESSENGER_TITLE, MESSENGER_COPY, 'E-commerce', 'Instagram', tpl9),
  template('orders-5', ORDER_TITLE, ORDER_COPY, 'E-commerce', 'Whatsapp', tpl6),
  template('messenger-ig-2', MESSENGER_TITLE, MESSENGER_COPY, 'E-commerce', 'Instagram', tpl9),
];

export const INDUSTRIES = ['All industries', 'E-commerce', 'Financial services', 'Legal services', 'General'] as const;

export type SourceKind = 'facebook' | 'whatsapp' | 'instagram' | 'messenger';

export interface ListedBot {
  id: string;
  name: string;
  draft?: boolean;
  source: string;
  sourceKind: SourceKind;
  created: string;
  createdBy: string;
  edited: string;
  editedBy: string;
  activated: boolean;
  /** Opens a saved demo flow. Everything else starts a one-message canvas. */
  scenario?: 'welcome';
}

export const LISTED_BOTS: ListedBot[] = [
  { id: 'us-sales', name: 'US Sales', source: 'Facebook comments', sourceKind: 'facebook', created: 'July 14, 2015', createdBy: avatar1, edited: '12 hours ago', editedBy: avatar7, activated: true },
  { id: 'sales-support', name: 'Sales support', draft: true, source: 'Whatsapp Canada', sourceKind: 'whatsapp', created: 'December 29, 2012', createdBy: avatar2, edited: '2 hours ago', editedBy: avatar8, activated: false },
  { id: 'instagram', name: 'Auto-reply Instagram', source: 'Instagram message', sourceKind: 'instagram', created: 'February 29, 2012', createdBy: avatar3, edited: '2 minutes ago', editedBy: avatar1, activated: false },
  { id: 'messenger', name: 'Meta help messenger', source: 'Messenger', sourceKind: 'messenger', created: 'November 28, 2015', createdBy: avatar4, edited: '10 minutes ago', editedBy: avatar9, activated: true },
  { id: 'promos', name: 'Whatsapp promos', source: 'Whatsapp USA', sourceKind: 'whatsapp', created: 'August 24, 2013', createdBy: avatar5, edited: '22 hours ago', editedBy: avatar1, activated: false },
  { id: 'welcome', name: 'Welcome bot', source: 'Whatsapp', sourceKind: 'whatsapp', created: 'November 7, 2017', createdBy: avatar6, edited: '3 days ago', editedBy: avatar10, activated: false, scenario: 'welcome' },
];
