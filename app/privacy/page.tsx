import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage, Section } from "../../components/Legal";

export const metadata: Metadata = {
  title: "Privacy Policy | SaqBot",
  description: "What SaqBot collects, why, who it's shared with, and how to delete it.",
};

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <>
          SaqBot (&ldquo;SaqBot,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) runs the SaqBot web app at saqbot.xyz, the @TradeSaqBot Telegram bot and
          the alert service behind them. This policy explains what we collect, why, who it&apos;s shared with, and the choices you have. We
          keep as little as we can: SaqBot never holds your funds or your wallet keys.
        </>
      }
    >
      <Section id="summary" title="The short version">
        <ul>
          <li>We store your Privy account ID, your trading wallet address, your experience level and your alert settings, so we can send the alerts you ask for.</li>
          <li>Your sign-in (Google, email or wallet) and your embedded wallet are run by our login provider, Privy. We never see your wallet&apos;s private key.</li>
          <li>We don&apos;t sell your data, show ads, or use advertising or analytics trackers.</li>
          <li>You can delete your SaqBot data at any time in the app, under Alerts &rarr; Your account.</li>
        </ul>
      </Section>

      <Section id="collect" title="1. Information we collect">
        <h3>Account and sign-in information</h3>
        <p>
          When you sign in, our authentication provider Privy (privy.io) verifies you and creates or connects a wallet. Depending on how you
          sign in, Privy receives your email address, your Google account&apos;s basic profile (name, email address and profile picture), or your
          external wallet address. SaqBot&apos;s servers receive a Privy account ID that identifies you, plus your wallet address. We don&apos;t
          store your email address, name or profile picture in our database.
        </p>
        <h3>Information stored on our servers</h3>
        <ul>
          <li><b>Privy account ID</b> and the date your SaqBot account was created.</li>
          <li><b>Trading wallet address</b>, used to check your open positions on Hyperliquid so we can warn you about liquidation and stop-loss risk.</li>
          <li><b>Experience level</b> (&ldquo;rep&rdquo;) and <b>alert settings</b>, including your watchlist of markets.</li>
          <li><b>Telegram chat ID</b>, only if you link Telegram, so the bot can message you. We also keep a one-time link code for up to 15 minutes while you link.</li>
          <li><b>Push notification subscription</b>, only if you turn on app notifications. This is an address issued by your browser&apos;s push service (such as Apple, Google or Mozilla) that lets us send notifications to your device.</li>
          <li><b>Alert history keys</b>, short records that stop us sending the same alert twice. They contain the alert type and the market or wallet involved, and are deleted after 14 days.</li>
        </ul>
        <h3>Information kept only on your device</h3>
        <p>
          Some data stays in your browser&apos;s local storage and is never sent to us: your app preferences, your daily loss limit, your
          practice-run account and history, and your trading-session key. The trading-session key can place and cancel trades on Hyperliquid for
          your wallet but can never withdraw funds. Ending the session or signing out removes it from that device.
        </p>
        <h3>Public blockchain data</h3>
        <p>
          Trades, deposits and withdrawals happen on public blockchains and on Hyperliquid, where anyone can see them by wallet address. We read
          this public data (for example your positions, balances and BAWSAQ holdings) to run the app. We can&apos;t change or delete it.
        </p>
        <h3>Technical information</h3>
        <p>
          Our hosting providers automatically process standard request data such as IP address, browser type and the pages requested, to deliver
          the service, keep it secure and troubleshoot errors. If your browser reports a security-policy violation, we log the blocked address and
          the page it happened on. SaqBot sets no advertising or analytics cookies.
        </p>
      </Section>

      <Section id="google" title="2. Google user data">
        <p>
          If you sign in with Google, Privy requests only your basic profile and email address (the &ldquo;openid,&rdquo; &ldquo;email&rdquo; and
          &ldquo;profile&rdquo; scopes). This information is used only to sign you in and identify your account. We don&apos;t request access to
          your Gmail, Drive, Contacts or any other Google data.
        </p>
        <p>
          SaqBot&apos;s use and transfer of information received from Google APIs follows the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener noreferrer">Google API Services User Data Policy</a>,
          including the Limited Use requirements. We don&apos;t sell Google user data, use it for advertising, use it to train AI or machine-learning
          models, or let people read it except where you ask us to, for security purposes, or where the law requires it.
        </p>
      </Section>

      <Section id="use" title="3. How we use information">
        <ul>
          <li>To sign you in and keep your account secure.</li>
          <li>To show your stash, positions and trading plans, and to send the trades you confirm to Hyperliquid.</li>
          <li>To send the alerts you turn on: liquidation and stop-loss warnings, big moves, crowded trades and 5-star events, by app notification or Telegram.</li>
          <li>To check whether your linked wallets hold enough BAWSAQ for the 0% fee tier.</li>
          <li>To keep the service working, prevent abuse, fix problems and meet legal obligations.</li>
        </ul>
        <p>We don&apos;t use your information for advertising, and we don&apos;t sell or rent it to anyone.</p>
      </Section>

      <Section id="share" title="4. Who we share it with">
        <p>We share information only with the service providers needed to run SaqBot, and only for that purpose:</p>
        <ul>
          <li><b>Privy</b>: sign-in, embedded wallets and card funding checkout.</li>
          <li><b>Hyperliquid</b>: the exchange where your trades are placed. Your wallet address and orders are sent to it.</li>
          <li><b>Payment providers (MoonPay, Coinbase)</b>: only if you buy USDC with Apple Pay or a card. They collect payment and identity details directly under their own privacy policies; we don&apos;t receive your card details.</li>
          <li><b>Telegram</b>: only if you link it, to deliver alerts to your chat.</li>
          <li><b>Browser push services</b> (Apple, Google, Mozilla): only if you turn on notifications, to deliver them.</li>
          <li><b>Hosting and database providers</b> (such as Vercel, Neon and our alert-worker host): to run the app, store the data listed above and keep logs.</li>
          <li><b>Blockchain network providers</b> (Arbitrum and Robinhood Chain): to read balances and send the deposits you approve.</li>
        </ul>
        <p>
          We may also disclose information if the law requires it, to protect the rights and safety of our users or the public, or as part of a
          merger or sale of the service, in which case this policy will continue to apply to your information.
        </p>
      </Section>

      <Section id="retention" title="5. How long we keep it">
        <p>
          We keep the data on our servers until you delete your SaqBot data or ask us to. Alert history keys are deleted after 14 days, and
          Telegram link codes expire after 15 minutes. Hosting logs are kept for the provider&apos;s standard period, usually no more than 30 days.
        </p>
      </Section>

      <Section id="choices" title="6. Your choices and rights">
        <ul>
          <li><b>Delete your SaqBot data:</b> go to Alerts &rarr; Your account &rarr; &ldquo;Delete my SaqBot data.&rdquo; This permanently removes your account record, wallet address, alert settings, Telegram link and notification subscriptions from our servers, and clears SaqBot data on that device.</li>
          <li><b>Delete your login and embedded wallet:</b> these are held by Privy. Email us and we&apos;ll arrange deletion. Withdraw your funds first; a deleted wallet can&apos;t be recovered.</li>
          <li><b>Turn off alerts</b> at any time in Alerts, unlink Telegram by sending /stop to @TradeSaqBot, or revoke Google access at myaccount.google.com/permissions.</li>
          <li>Depending on where you live, you may have the right to access, correct, delete or export your personal data, to object to or restrict how it&apos;s used, and to complain to your local data protection authority. Email {CONTACT_EMAIL} and we&apos;ll respond within 30 days.</li>
        </ul>
      </Section>

      <Section id="security" title="7. Security">
        <p>
          All traffic is encrypted in transit (HTTPS). SaqBot&apos;s servers never receive or store wallet private keys. The trading-session key
          stays on your device and can&apos;t withdraw funds. The app uses a strict Content Security Policy and other browser security headers to
          limit which code and sites the app can load. No system is perfectly secure, so please protect your Google, email and wallet accounts and
          turn on multi-factor sign-in where it&apos;s offered.
        </p>
      </Section>

      <Section id="children" title="8. Children">
        <p>SaqBot is for adults 18 and older. We don&apos;t knowingly collect information from anyone under 18. If you think a minor has used SaqBot, email us and we&apos;ll delete their data.</p>
      </Section>

      <Section id="international" title="9. International transfers">
        <p>Our service providers may process information in the United States and other countries. Where required, we rely on appropriate safeguards for these transfers, such as standard contractual clauses.</p>
      </Section>

      <Section id="changes" title="10. Changes to this policy">
        <p>If we change this policy, we&apos;ll update the date at the top. If a change is significant, we&apos;ll also tell you in the app before it takes effect.</p>
      </Section>

      <Section id="contact" title="11. Contact">
        <p>
          Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also our <Link href="/terms">Terms of Service</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
