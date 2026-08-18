export const SAFETY_PAGES = Object.freeze([
  {
    slug: 'buying',
    title: 'Buying Safely',
    eyebrow: 'QAVLIO Safety Center',
    intro: 'Use QAVLIO to discover items, compare details, and keep conversations on the platform.',
    sections: [
      { title: 'Inspect before you pay', text: 'Check the item and any documents in person when the category requires it. Do not rely on urgency, screenshots, or promises alone.' },
      { title: 'Meet thoughtfully', text: 'Choose a public place, tell someone your plan, and avoid carrying more cash than you need.' },
      { title: 'Keep chat on QAVLIO', text: 'Use Contact seller so the conversation stays connected to the listing. Off-platform chats are harder to review if something goes wrong.' },
    ],
  },
  {
    slug: 'selling',
    title: 'Selling Safely',
    eyebrow: 'QAVLIO Safety Center',
    intro: 'Describe items honestly and never ask buyers for passwords, OTPs, or payment outside supported flows.',
    sections: [
      { title: 'Be accurate', text: 'Titles, photos, prices, and condition should match the item. Misleading listings can be reported and removed.' },
      { title: 'Use supported payments', text: 'Listing fees and promotions are quoted in PKR inside QAVLIO. Never ask a buyer to send a password or OTP.' },
      { title: 'Respond clearly', text: 'Answer buyer questions from Seller Centre. Response information is only shown when enough real chat data exists.' },
    ],
  },
  {
    slug: 'scams',
    title: 'Avoiding Scams',
    eyebrow: 'QAVLIO Safety Center',
    intro: 'Treat unusual pressure, off-platform payment requests, and requests for secrets as warning signs — not proof by themselves.',
    sections: [
      { title: 'Common warning signs', text: 'A price far below similar QAVLIO listings, a request to pay immediately outside QAVLIO, or a request for OTPs or card details.' },
      { title: 'What to do', text: 'Pause the conversation, do not send money or secrets, and submit a report. QAVLIO will review it.' },
      { title: 'Neutral language', text: 'A report or safety notice means something needs review. It does not automatically mean a person is a scammer.' },
    ],
  },
  {
    slug: 'payments',
    title: 'Payments',
    eyebrow: 'QAVLIO Safety Center',
    intro: 'Never send payment outside QAVLIO’s supported payment flow for listing fees and promotions.',
    sections: [
      { title: 'Supported flow', text: 'Listing fees and promotions are quoted before checkout. QAVLIO never asks for card details inside chat.' },
      { title: 'Do not share secrets', text: 'Do not share passwords, OTPs, or banking passwords. Support will never ask for them.' },
      { title: 'No legal guarantee', text: 'QAVLIO provides discovery and communication tools. It does not guarantee an off-platform exchange.' },
    ],
  },
  {
    slug: 'chat',
    title: 'Chat Safety',
    eyebrow: 'QAVLIO Safety Center',
    intro: 'Keep marketplace conversations on QAVLIO so you can block, report, and stay connected to the listing.',
    sections: [
      { title: 'Message sellers', text: 'Open a listing and use Contact seller. Conversations stay on QAVLIO.' },
      { title: 'Block', text: 'Open the conversation, then use Block. You will stop receiving new messages from that person.' },
      { title: 'Report', text: 'Use Report on a listing, seller, review, or conversation. Include what happened. Do not send passwords.' },
    ],
  },
  {
    slug: 'meetings',
    title: 'Safe Meetings',
    eyebrow: 'QAVLIO Safety Center',
    intro: 'Plan in-person exchanges in a public, well-lit place and keep someone you trust informed.',
    sections: [
      { title: 'Choose a public place', text: 'Use a busy location during open hours. Avoid isolated locations and do not share your exact home address unnecessarily.' },
      { title: 'Tell someone', text: 'Share your meeting plan with someone you trust and keep your phone available.' },
      { title: 'Leave if pressured', text: 'End the meeting if details change unexpectedly or you feel pressured. You can report concerning marketplace behavior.' },
    ],
  },
  {
    slug: 'reporting',
    title: 'Reporting',
    eyebrow: 'QAVLIO Safety Center',
    intro: 'Reports help QAVLIO review listings, sellers, reviews, and conversations. You will receive a confirmation ID.',
    sections: [
      { title: 'What you can report', text: 'Listings, sellers, reviews, conversations, and advertisements when they appear on QAVLIO.' },
      { title: 'After you report', text: 'Thanks. QAVLIO will review this report. Internal notes and risk scores stay private.' },
      { title: 'Follow-up', text: 'You cannot spam the same open report, but you can report a different issue later if needed.' },
    ],
  },
  {
    slug: 'account',
    title: 'Account Security',
    eyebrow: 'QAVLIO Safety Center',
    intro: 'Protect your QAVLIO account the same way you protect any financial login.',
    sections: [
      { title: 'Passwords and OTP', text: 'Use Forgot password from the Login page. QAVLIO will never ask you to send a password in chat.' },
      { title: 'Sessions', text: 'Review active devices from Account → Security and sign out devices you do not recognize.' },
      { title: 'Verification', text: 'A Verified Seller badge appears only after QAVLIO records a verified seller status.' },
    ],
  },
]);

export const SAFETY_OVERVIEW = Object.freeze({
  slug: 'overview',
  title: 'Trade with confidence.',
  eyebrow: 'QAVLIO Safety Center',
  intro: 'Use clear profile signals, keep communication on-platform, inspect items carefully, and report anything that needs review.',
  sections: SAFETY_PAGES.map((page) => ({ title: page.title, text: page.intro, slug: page.slug })),
});

export const OFF_PLATFORM_PAYMENT = Object.freeze([
  'jazzcash', 'easy paisa', 'easypaisa', 'bank transfer only', 'send money to this account',
  'whatsapp payment', 'pay outside qavlio', 'western union', 'payoneer first',
]);

export const PROHIBITED_CATEGORIES = Object.freeze([
  { key: 'illegal', label: 'Illegal goods' },
  { key: 'fraud', label: 'Fraud / scams' },
  { key: 'explicit', label: 'Explicit content' },
  { key: 'dangerous', label: 'Dangerous goods' },
  { key: 'stolen', label: 'Stolen goods' },
  { key: 'other', label: 'Other prohibited marketplace content' },
]);
