import { sampleGallery } from './media';
import type { ChatFlowNode, ConnectorFlowEdge, DataChart, GraphState, NodeElement } from './types';
import { OUT_HANDLE, buttonHandleId, inputBranchHandle } from './types';
import { uid } from './uid';

export type ScenarioId = 'blank' | 'welcome' | 'messy';

export const SCENARIOS: Array<{ id: ScenarioId; label: string; hint: string }> = [
  { id: 'blank', label: 'Create new', hint: 'Name the bot, then start from scratch or a template' },
  { id: 'welcome', label: 'Query flow', hint: 'Elements, nodes, test and AI prompts' },
  { id: 'messy', label: 'Rearrange', hint: 'Tangled layout — use the magic wand to tidy it' },
];

function chatNode(id: string, name: string, x: number, y: number, elements: NodeElement[], index: number): ChatFlowNode {
  return {
    id,
    type: 'chat',
    position: { x, y },
    data: { name, fallbackName: `Node#${index}`, elements, aiEnabled: false },
  };
}

/** Builds the "Whatsapp welcome bot" template with fresh ids so it can be inserted more than once. */
export function welcomeTemplate(offset = { x: 0, y: 0 }, layout: 'tidy' | 'messy' = 'tidy'): GraphState {
  const welcomeId = uid('node');
  const contactId = uid('node');
  const closeId = uid('node');
  const contactBtn = uid('btn');
  const websiteBtn = uid('btn');
  const closeBtn = uid('btn');

  const positions =
    layout === 'tidy'
      ? { welcome: { x: 300, y: 0 }, contact: { x: 100, y: 340 }, close: { x: 500, y: 340 } }
      : { welcome: { x: 300, y: 0 }, contact: { x: 850, y: 480 }, close: { x: 690, y: 270 } };

  const at = (p: { x: number; y: number }) => [p.x + offset.x, p.y + offset.y] as const;

  const nodes: ChatFlowNode[] = [
    chatNode(
      welcomeId,
      'Welcome',
      ...at(positions.welcome),
      [
        { id: uid('el'), type: 'text', text: 'Welcome to lighthouse.lh. How may I help you?' },
        {
          id: uid('el'),
          type: 'buttons',
          buttons: [
            { id: contactBtn, label: 'Contact us', kind: 'node' },
            { id: websiteBtn, label: 'Website', kind: 'link', url: 'www.lighthouse.com' },
            { id: uid('btn'), label: 'Email', kind: 'email', url: 'CC@lighthouse.com' },
            { id: closeBtn, label: 'Close chat', kind: 'node' },
          ],
        },
      ],
      1,
    ),
    chatNode(
      contactId,
      'Contact us',
      ...at(positions.contact),
      [
        {
          id: uid('el'),
          type: 'text',
          text: 'Please call us @ (234) 345-5678',
          html: 'Please call us @ <b><span style="color: rgb(0, 95, 236);">(234) 345-5678</span></b>',
        },
        { id: uid('el'), type: 'media', media: sampleGallery() },
      ],
      2,
    ),
    chatNode(
      closeId,
      'Close chat',
      ...at(positions.close),
      [
        { id: uid('el'), type: 'text', text: 'Thank you. Please share your feedback' },
        { id: uid('el'), type: 'feedback', ratingStyle: 'star', text: 'How was your experience?' },
      ],
      3,
    ),
  ];

  const edges: ConnectorFlowEdge[] = [
    {
      id: uid('edge'),
      type: 'connector',
      source: welcomeId,
      sourceHandle: buttonHandleId(contactBtn),
      target: contactId,
      data: { locked: false },
    },
    {
      id: uid('edge'),
      type: 'connector',
      source: welcomeId,
      sourceHandle: buttonHandleId(closeBtn),
      target: closeId,
      data: { locked: false },
    },
  ];

  return { nodes, edges, prompts: [] };
}

/** The receptionist template shown before the canvas: a welcome message and two options. */
export function receptionistTemplate(): GraphState {
  const welcomeId = uid('node');
  const option1Id = uid('node');
  const option2Id = uid('node');
  const option1Btn = uid('btn');
  const option2Btn = uid('btn');
  const nodes: ChatFlowNode[] = [
    chatNode(
      welcomeId,
      'Welcome',
      300,
      0,
      [
        { id: uid('el'), type: 'text', text: 'Hello, welcome to Nextiva how can we help you today?' },
        { id: uid('el'), type: 'text', text: 'Please help us by selecting an option.' },
        {
          id: uid('el'),
          type: 'buttons',
          buttons: [
            { id: option1Btn, label: 'Option 1', kind: 'node' },
            { id: option2Btn, label: 'Option 2', kind: 'node' },
          ],
        },
      ],
      1,
    ),
    chatNode(option1Id, 'Option 1', 80, 340, [{ id: uid('el'), type: 'text', text: 'Option 1' }], 2),
    chatNode(option2Id, 'Option 2', 520, 340, [{ id: uid('el'), type: 'text', text: 'Option 2' }], 3),
  ];
  const edges: ConnectorFlowEdge[] = [
    {
      id: uid('edge'),
      type: 'connector',
      source: welcomeId,
      sourceHandle: buttonHandleId(option1Btn),
      target: option1Id,
      data: { locked: false },
    },
    {
      id: uid('edge'),
      type: 'connector',
      source: welcomeId,
      sourceHandle: buttonHandleId(option2Btn),
      target: option2Id,
      data: { locked: false },
    },
  ];
  return { nodes, edges, prompts: [] };
}

/** A one-message flow used when an existing bot or a simple template is opened. */
export function messageGraph(name: string, text: string): GraphState {
  return {
    nodes: [chatNode(uid('node'), name, 280, 40, [{ id: uid('el'), type: 'text', text }], 1)],
    edges: [],
    prompts: [],
  };
}

function link(source: string, target: string, sourceHandle: string): ConnectorFlowEdge {
  return { id: uid('edge'), type: 'connector', source, sourceHandle, target, data: { locked: false } };
}

/**
 * Query flow: an indoor office-lighting enquiry drawn as a tree.
 * Each step has one parent, branches only fan out, and every path ends on its own leaf.
 * Positions are the arranged map saved from the canvas.
 */
/** Electric light a desk needs across a workday: daylight covers part of the 500 lux target at midday. */
const OFFICE_LUX_BY_HOUR: DataChart = {
  title: 'Light needed at the desk',
  unit: 'lux',
  target: { label: '500 lux target', value: 500 },
  points: [
    { label: '6 AM', value: 450, tick: true },
    { label: '8 AM', value: 400 },
    { label: '10 AM', value: 260 },
    { label: '12 PM', value: 170, tick: true },
    { label: '2 PM', value: 200 },
    { label: '4 PM', value: 320 },
    { label: '6 PM', value: 470, tick: true },
    { label: '8 PM', value: 500 },
    { label: '10 PM', value: 150 },
    { label: '12 AM', value: 50, tick: true },
  ],
};

export function queryFlow(): GraphState {
  const welcome = uid('node');
  const space = uid('node');
  const area = uid('node');
  const areaHelp = uid('node');
  const size = uid('node');
  const brightness = uid('node');
  const specialist = uid('node');
  const fixtures = uid('node');
  const install = uid('node');
  const email = uid('node');
  const other = uid('node');
  const follow = uid('node');
  const confirm = uid('node');
  const sales = uid('node');

  const lightingBtn = uid('btn');
  const browseBtn = uid('btn');
  const elseBtn = uid('btn');
  const emailBtn = uid('btn');
  const installBtn = uid('btn');
  const rateBtn = uid('btn');
  const areaInput = uid('el');
  const sizeCheck = uid('el');
  const rating = uid('el');
  const photos = sampleGallery().filter((item) => item.kind === 'image').slice(0, 1);

  const nodes: ChatFlowNode[] = [
    chatNode(welcome, 'Welcome', 300, 0, [
      { id: uid('el'), type: 'text', text: 'Welcome to Lighthouse. I can help you plan indoor office lighting and hand a complete brief to sales.' },
      {
        id: uid('el'),
        type: 'buttons',
        buttons: [
          { id: lightingBtn, label: 'Office lighting', kind: 'node' },
          { id: browseBtn, label: 'Browse fixtures', kind: 'node' },
          { id: uid('btn'), label: 'Lighting guide', kind: 'link', url: 'www.lighthouse.com/office-lighting' },
          { id: elseBtn, label: 'Something else', kind: 'node' },
        ],
      },
    ], 1),
    chatNode(space, 'Office space', -40, 421, [
      { id: uid('el'), type: 'text', text: 'Which indoor space are you lighting?' },
      { id: uid('el'), type: 'dropdown', options: ['Open office', 'Meeting room', 'Reception', 'Private office'] },
    ], 2),
    chatNode(area, 'Floor area', -40, 750, [
      { id: uid('el'), type: 'text', text: 'About how many square feet is that space?' },
      {
        id: areaInput,
        type: 'userInput',
        text: 'Square feet',
        inputKind: 'numeric',
        savedName: 'Floor area',
        errorMessage: 'Enter the floor area as a number, like 450.',
        condition: {
          name: 'Valid number',
          rules: [{ id: uid('rule'), join: 'and', operator: 'Is a number', value: '' }],
        },
      },
    ], 3),
    chatNode(areaHelp, 'Area fallback', 331, 1127, [
      { id: uid('el'), type: 'text', text: "That floor area didn't come through. Call the lighting desk at (234) 345-5678 and they'll measure the room with you." },
    ], 4),
    chatNode(size, 'Area size', -283, 1125, [
      {
        id: sizeCheck,
        type: 'userInput',
        text: 'Floor area',
        inputKind: 'numeric',
        source: 'Floor area',
        condition: {
          name: 'Up to 500 sq ft',
          rules: [
            { id: uid('rule'), join: 'and', operator: 'Less than', value: '500' },
            { id: uid('rule'), join: 'or', operator: 'Equals', value: '500' },
          ],
        },
      },
    ], 13),
    chatNode(brightness, 'Brightness', -526, 1500, [
      { id: uid('el'), type: 'text', text: 'Here’s how much light your office needs through the day. Daylight helps at midday, so your lights work hardest in the morning and evening.' },
      { id: uid('el'), type: 'dataDisplay', chart: OFFICE_LUX_BY_HOUR },
    ], 5),
    chatNode(specialist, 'Large office', -40, 1500, [
      { id: uid('el'), type: 'text', text: 'I’ll connect you with a lighting specialist who can plan this space with you.' },
      { id: uid('el'), type: 'transfer', text: 'Lighting specialist' },
    ], 14),
    chatNode(fixtures, 'Fixtures', 978, 425, [
      { id: uid('el'), type: 'text', text: 'Panels cover an open office. Pendants mark a meeting room.' },
      { id: uid('el'), type: 'media', media: photos },
      {
        id: uid('el'),
        type: 'carousel',
        slideDirection: 'horizontal',
        slides: [
          {
            id: uid('slide'),
            text: 'Slim LED panels for open offices',
            media: photos[0],
            buttonLabel: 'View panels',
            buttonUrl: 'www.lighthouse.com/panels',
          },
          {
            id: uid('slide'),
            text: 'Pendants for meeting rooms',
            media: photos[0],
            buttonLabel: 'View pendants',
            buttonUrl: 'www.lighthouse.com/pendants',
          },
        ],
      },
    ], 6),
    chatNode(follow, 'Follow up', 978, 901, [
      { id: uid('el'), type: 'text', text: 'How should sales follow up on this lighting?' },
      {
        id: uid('el'),
        type: 'buttons',
        buttons: [
          { id: emailBtn, label: 'Email the quote', kind: 'node' },
          { id: installBtn, label: 'Book install', kind: 'node' },
          { id: rateBtn, label: 'Rate this plan', kind: 'node' },
        ],
      },
    ], 7),
    chatNode(email, 'Work email', 675, 1245, [
      { id: uid('el'), type: 'text', text: 'Where should sales send the quote?' },
      { id: uid('el'), type: 'email', text: 'Work email', errorMessage: 'Enter a valid email so sales can reply.' },
    ], 8),
    chatNode(install, 'Install date', 984, 1396, [
      { id: uid('el'), type: 'text', text: 'When should the lights be installed?' },
      { id: uid('el'), type: 'calendar', text: 'Pick an install date' },
    ], 9),
    chatNode(confirm, 'Confirm plan', 1281, 1239, [
      { id: rating, type: 'text', text: 'Thanks. A specialist will use this rating when they prepare the next office plan.' },
      { id: uid('el'), type: 'feedback', ratingStyle: 'star', ratingScale: 5, text: 'How well does this plan fit?' },
    ], 10),
    chatNode(other, 'Other request', 494, 580, [
      { id: uid('el'), type: 'text', text: 'Tell us what you need and the office-lighting team will pick it up from here.' },
      { id: uid('el'), type: 'userInput', text: 'What do you need?', inputKind: 'text', errorMessage: 'Add a short note so the team knows where to start.' },
    ], 11),
    chatNode(sales, 'Sales transfer', -526, 1960, [
      { id: uid('el'), type: 'text', text: 'Connecting you to the indoor lighting sales team.' },
      { id: uid('el'), type: 'phone', text: 'Phone number', errorMessage: 'Enter a number the sales team can reach.' },
      { id: uid('el'), type: 'transfer', text: 'Sales team' },
    ], 12),
  ];

  const edges: ConnectorFlowEdge[] = [
    link(welcome, space, buttonHandleId(lightingBtn)),
    link(welcome, fixtures, buttonHandleId(browseBtn)),
    link(welcome, other, buttonHandleId(elseBtn)),
    link(space, area, OUT_HANDLE),
    link(area, size, inputBranchHandle(areaInput, 'true')),
    link(area, areaHelp, inputBranchHandle(areaInput, 'false')),
    link(size, brightness, inputBranchHandle(sizeCheck, 'true')),
    link(size, specialist, inputBranchHandle(sizeCheck, 'false')),
    link(brightness, sales, OUT_HANDLE),
    link(fixtures, follow, OUT_HANDLE),
    link(follow, email, buttonHandleId(emailBtn)),
    link(follow, install, buttonHandleId(installBtn)),
    link(follow, confirm, buttonHandleId(rateBtn)),
  ];

  return { nodes, edges, prompts: [] };
}

/**
 * Rearrange flow: the same kind of office-lighting enquiry as Query flow, drawn as a
 * branching tree with a tangled start so the wand has something to tidy.
 * Every node carries at least two elements, and no path joins back into another.
 */
export function rearrangeFlow(): GraphState {
  const welcome = uid('node');
  const space = uid('node');
  const area = uid('node');
  const brightness = uid('node');
  const sales = uid('node');
  const areaHelp = uid('node');
  const measure = uid('node');
  const desk = uid('node');
  const fixtures = uid('node');
  const follow = uid('node');
  const email = uid('node');
  const install = uid('node');
  const confirm = uid('node');
  const other = uid('node');

  const lightingBtn = uid('btn');
  const browseBtn = uid('btn');
  const elseBtn = uid('btn');
  const measureBtn = uid('btn');
  const deskBtn = uid('btn');
  const emailBtn = uid('btn');
  const installBtn = uid('btn');
  const rateBtn = uid('btn');
  const areaInput = uid('el');
  const photo = sampleGallery().find((item) => item.kind === 'image');

  const nodes: ChatFlowNode[] = [
    chatNode(welcome, 'Welcome', 760, 480, [
      { id: uid('el'), type: 'text', text: 'Welcome to Lighthouse. I can help you plan indoor office lighting.' },
      { id: uid('el'), type: 'text', text: 'Pick a path and we will build a brief the sales team can use.' },
      {
        id: uid('el'),
        type: 'buttons',
        buttons: [
          { id: lightingBtn, label: 'Office lighting', kind: 'node' },
          { id: browseBtn, label: 'Browse fixtures', kind: 'node' },
          { id: elseBtn, label: 'Something else', kind: 'node' },
        ],
      },
    ], 1),
    chatNode(space, 'Office space', 0, 0, [
      { id: uid('el'), type: 'text', text: 'Which indoor space are you lighting?' },
      { id: uid('el'), type: 'dataDisplay' },
      { id: uid('el'), type: 'dropdown', options: ['Open office', 'Meeting room', 'Reception', 'Private office'] },
    ], 2),
    chatNode(area, 'Floor area', 380, 960, [
      { id: uid('el'), type: 'text', text: 'About how many square feet is that space?' },
      { id: uid('el'), type: 'text', text: 'A usable size lets us estimate how many fixtures you need.' },
      {
        id: areaInput,
        type: 'userInput',
        text: 'Square feet',
        inputKind: 'numeric',
        errorMessage: 'Enter a floor area greater than 0.',
        condition: {
          name: 'Usable area',
          rules: [{ id: uid('rule'), join: 'and', operator: 'Greater than', value: '0' }],
        },
      },
    ], 3),
    chatNode(brightness, 'Brightness', 1140, 960, [
      { id: uid('el'), type: 'text', text: 'Open offices usually need 300–500 lux at the desk.' },
      { id: uid('el'), type: 'text', text: 'The chart shows how your area compares.' },
      { id: uid('el'), type: 'dataDisplay' },
    ], 4),
    chatNode(sales, 'Sales transfer', 0, 1440, [
      { id: uid('el'), type: 'text', text: 'Connecting you to the indoor lighting sales team.' },
      { id: uid('el'), type: 'transfer', text: 'Sales team' },
      { id: uid('el'), type: 'phone', text: 'Phone number', errorMessage: 'Enter a number the sales team can reach.' },
    ], 5),
    chatNode(areaHelp, 'Area fallback', 760, 1440, [
      { id: uid('el'), type: 'text', text: "That floor area didn't come through." },
      { id: uid('el'), type: 'text', text: 'Book a measuring visit, or call the lighting desk.' },
      {
        id: uid('el'),
        type: 'buttons',
        buttons: [
          { id: measureBtn, label: 'Book a measure', kind: 'node' },
          { id: deskBtn, label: 'Call the desk', kind: 'node' },
        ],
      },
    ], 6),
    chatNode(measure, 'Measure visit', 1140, 0, [
      { id: uid('el'), type: 'text', text: 'When can someone visit to measure the room?' },
      { id: uid('el'), type: 'text', text: 'We will bring a light meter for the desks and the ceiling.' },
      { id: uid('el'), type: 'calendar', text: 'Pick a visit date' },
    ], 7),
    chatNode(desk, 'Call desk', 1140, 1440, [
      { id: uid('el'), type: 'text', text: 'The lighting desk can measure the room with you.' },
      { id: uid('el'), type: 'text', text: 'Leave the best number to call.' },
      { id: uid('el'), type: 'phone', text: 'Desk number', errorMessage: 'Enter a number the lighting desk can dial.' },
    ], 8),
    chatNode(fixtures, 'Fixtures', 1140, 480, [
      { id: uid('el'), type: 'text', text: 'Panels cover an open office. Pendants mark a meeting room.' },
      { id: uid('el'), type: 'media', media: photo ? [photo] : [] },
      {
        id: uid('el'),
        type: 'carousel',
        slideDirection: 'horizontal',
        slides: [
          { id: uid('slide'), text: 'Slim LED panels for open offices', media: photo, buttonLabel: 'View panels', buttonUrl: 'www.lighthouse.com/panels' },
          { id: uid('slide'), text: 'Pendants for meeting rooms', media: photo, buttonLabel: 'View pendants', buttonUrl: 'www.lighthouse.com/pendants' },
        ],
      },
    ], 9),
    chatNode(follow, 'Follow up', 380, 0, [
      { id: uid('el'), type: 'text', text: 'How should sales follow up on these fixtures?' },
      { id: uid('el'), type: 'text', text: 'Choose one way to continue.' },
      {
        id: uid('el'),
        type: 'buttons',
        buttons: [
          { id: emailBtn, label: 'Email the quote', kind: 'node' },
          { id: installBtn, label: 'Book install', kind: 'node' },
          { id: rateBtn, label: 'Rate this plan', kind: 'node' },
        ],
      },
    ], 10),
    chatNode(email, 'Work email', 0, 480, [
      { id: uid('el'), type: 'text', text: 'Where should sales send the quote?' },
      { id: uid('el'), type: 'text', text: 'Use the address you check during the workday.' },
      { id: uid('el'), type: 'email', text: 'Work email', errorMessage: 'Enter a valid email so sales can reply.' },
    ], 11),
    chatNode(install, 'Install date', 380, 1440, [
      { id: uid('el'), type: 'text', text: 'When should the lights be installed?' },
      { id: uid('el'), type: 'text', text: 'We will hold an install crew for that day.' },
      { id: uid('el'), type: 'calendar', text: 'Pick an install date' },
    ], 12),
    chatNode(confirm, 'Confirm plan', 760, 0, [
      { id: uid('el'), type: 'text', text: 'How well does this fixture plan fit the office?' },
      { id: uid('el'), type: 'text', text: 'A specialist uses this rating on the next plan.' },
      { id: uid('el'), type: 'feedback', ratingStyle: 'star', ratingScale: 5, text: 'How well does this plan fit?' },
    ], 13),
    chatNode(other, 'Other request', 0, 960, [
      { id: uid('el'), type: 'text', text: 'Tell us what you need and the office-lighting team will pick it up.' },
      { id: uid('el'), type: 'text', text: 'A short note is enough to start.' },
      { id: uid('el'), type: 'userInput', text: 'What do you need?', inputKind: 'text', errorMessage: 'Add a short note so the team knows where to start.' },
    ], 14),
  ];

  const edges: ConnectorFlowEdge[] = [
    link(welcome, space, buttonHandleId(lightingBtn)),
    link(welcome, fixtures, buttonHandleId(browseBtn)),
    link(welcome, other, buttonHandleId(elseBtn)),
    link(space, area, OUT_HANDLE),
    link(area, brightness, inputBranchHandle(areaInput, 'true')),
    link(area, areaHelp, inputBranchHandle(areaInput, 'false')),
    link(brightness, sales, OUT_HANDLE),
    link(areaHelp, measure, buttonHandleId(measureBtn)),
    link(areaHelp, desk, buttonHandleId(deskBtn)),
    link(fixtures, follow, OUT_HANDLE),
    link(follow, email, buttonHandleId(emailBtn)),
    link(follow, install, buttonHandleId(installBtn)),
    link(follow, confirm, buttonHandleId(rateBtn)),
  ];

  return { nodes, edges, prompts: [] };
}

/** Query flow's saved arrangement. The wand restores this only after the canvas changes. */
const QUERY_WAND_LAYOUT: Record<string, { x: number; y: number }> = {
  Welcome: { x: 300, y: 0 },
  'Office space': { x: -40, y: 421 },
  'Floor area': { x: -40, y: 750 },
  'Area fallback': { x: 331, y: 1127 },
  'Area size': { x: -283, y: 1125 },
  Brightness: { x: -526, y: 1500 },
  'Large office': { x: -40, y: 1500 },
  Fixtures: { x: 978, y: 425 },
  'Follow up': { x: 978, y: 901 },
  'Work email': { x: 675, y: 1245 },
  'Install date': { x: 984, y: 1396 },
  'Confirm plan': { x: 1281, y: 1239 },
  'Other request': { x: 494, y: 580 },
  'Sales transfer': { x: -526, y: 1960 },
};

const QUERY_WAND_LINKS = [
  'Welcome->Office space',
  'Welcome->Fixtures',
  'Welcome->Other request',
  'Office space->Floor area',
  'Floor area->Area size',
  'Floor area->Area fallback',
  'Area size->Brightness',
  'Area size->Large office',
  'Brightness->Sales transfer',
  'Fixtures->Follow up',
  'Follow up->Work email',
  'Follow up->Install date',
  'Follow up->Confirm plan',
];

/** Positions the magic wand restores for Rearrange. Captured from the arranged office-lighting tree. */
const REARRANGE_WAND_LAYOUT: Record<string, { x: number; y: number }> = {
  Welcome: { x: 760, y: 480 },
  'Office space': { x: 244, y: 982 },
  Fixtures: { x: 760, y: 931 },
  'Other request': { x: 1263, y: 987 },
  'Floor area': { x: 245, y: 1419 },
  'Follow up': { x: 1285, y: 1393 },
  Brightness: { x: -48, y: 1828 },
  'Area fallback': { x: 490, y: 1828 },
  'Work email': { x: 922, y: 1821 },
  'Install date': { x: 1288, y: 1900 },
  'Confirm plan': { x: 1662, y: 1817 },
  'Sales transfer': { x: -48, y: 2263 },
  'Measure visit': { x: 274, y: 2256 },
  'Call desk': { x: 699, y: 2256 },
};

const REARRANGE_WAND_LINKS = [
  'Welcome->Office space',
  'Welcome->Fixtures',
  'Welcome->Other request',
  'Office space->Floor area',
  'Floor area->Brightness',
  'Floor area->Area fallback',
  'Brightness->Sales transfer',
  'Area fallback->Measure visit',
  'Area fallback->Call desk',
  'Fixtures->Follow up',
  'Follow up->Work email',
  'Follow up->Install date',
  'Follow up->Confirm plan',
];

type NamedNode = { id: string; data: { name: string } };
type NamedEdge = { source: string; target: string };

/** Saved arrangement for an untouched scenario graph. Null once a node or connection changes. */
function namedWandTargets(
  nodes: NamedNode[],
  edges: NamedEdge[],
  layout: Record<string, { x: number; y: number }>,
  links: readonly string[],
): Map<string, { x: number; y: number }> | null {
  const seen = new Set<string>();
  for (const node of nodes) {
    if (!layout[node.data.name] || seen.has(node.data.name)) return null;
    seen.add(node.data.name);
  }
  if (seen.size !== Object.keys(layout).length) return null;
  const nameOf = new Map(nodes.map((node) => [node.id, node.data.name]));
  const actual = edges.map((edge) => `${nameOf.get(edge.source)}->${nameOf.get(edge.target)}`).sort();
  const expected = [...links].sort();
  if (actual.length !== expected.length || actual.some((link, index) => link !== expected[index])) return null;
  return new Map(nodes.map((node) => [node.id, layout[node.data.name]]));
}

export function queryWandTargets(nodes: NamedNode[], edges: NamedEdge[]): Map<string, { x: number; y: number }> | null {
  return namedWandTargets(nodes, edges, QUERY_WAND_LAYOUT, QUERY_WAND_LINKS);
}

export function rearrangeWandTargets(nodes: NamedNode[], edges: NamedEdge[]): Map<string, { x: number; y: number }> | null {
  return namedWandTargets(nodes, edges, REARRANGE_WAND_LAYOUT, REARRANGE_WAND_LINKS);
}

export function scenarioGraph(id: ScenarioId): GraphState {
  switch (id) {
    case 'blank':
      return { nodes: [], edges: [], prompts: [] };
    case 'welcome':
      return queryFlow();
    case 'messy':
      return rearrangeFlow();
  }
}
