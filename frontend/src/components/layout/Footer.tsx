import { Facebook, Instagram, Linkedin, Mail, MapPin, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import Logo from '../ui/Logo';

const socialLinks = [
  { label: 'QAVLIO on Facebook', Icon: Facebook },
  { label: 'QAVLIO on Instagram', Icon: Instagram },
  { label: 'QAVLIO on X', Icon: Twitter },
  { label: 'QAVLIO on LinkedIn', Icon: Linkedin },
];

export default function Footer() {
  const { t } = useTranslation();
  const footerLinks: Record<string, Array<[string, string]>> = {
    QAVLIO: [
      [t('footer.about'), '/about'],
      [t('footer.careers'), '/about#careers'],
      [t('footer.contact'), '/contact'],
    ],
    Marketplace: [
      [t('footer.browse'), '/marketplace'],
      [t('nav.categories'), '/categories'],
      [t('footer.popular'), '/marketplace?sort=popular'],
      [t('footer.sell'), '/sell'],
    ],
    Support: [
      [t('footer.helpCenter'), '/help'],
      [t('footer.askQavlio'), '/ai-assistant'],
      [t('footer.safety'), '/safety'],
      [t('footer.support'), '/contact'],
    ],
    Legal: [
      [t('footer.terms'), '/terms'],
      [t('footer.privacy'), '/privacy'],
      [t('footer.cookies'), '/privacy#cookies'],
      [t('footer.community'), '/safety#guidelines'],
    ],
  };

  return (
    <footer className="mt-16 bg-ink-950 pb-24 pt-14 text-white lg:pb-8">
      <div className="container-shell">
        <div className="grid gap-10 border-b border-white/10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_repeat(4,1fr)]">
          <div>
            <Logo inverse />
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/60">{t('footer.tagline')}</p>
            <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-white/45">
              <MapPin size={14} /> {t('footer.builtFor')}
            </p>
          </div>
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h2 className="text-sm font-extrabold">{heading}</h2>
              <ul className="mt-4 space-y-3">
                {links.map(([label, to]) => (
                  <li key={to + label}>
                    <Link to={to} className="text-xs font-medium text-white/55 transition hover:text-gold-300">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-5 pt-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs text-white/45">{t('footer.copyright')}</p>
            <a href="mailto:hello@qavlio.pk" className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/45 hover:text-white">
              <Mail size={13} /> hello@qavlio.pk
            </a>
          </div>
          <div id="connect">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-white/35">{t('footer.connect')}</p>
            <div className="flex gap-2">
              {socialLinks.map(({ label, Icon }) => (
                <a
                  key={label}
                  href="#connect"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-control bg-white/10 text-white/70 transition hover:-translate-y-0.5 hover:bg-violet-600 hover:text-white"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
