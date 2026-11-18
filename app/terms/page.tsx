import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage, Section } from "../../components/Legal";
import { BAWSAQ_MIN_HOLD, BUILDER_FEE_LABEL, MIN_DEPOSIT_USDC } from "../../lib/config";

export const metadata: Metadata = {
  title: "Terms of Service | SaqBot",
  description: "The rules for using SaqBot, including trading risks, fees and your responsibilities.",
};

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <>
          These terms are an agreement between you and SaqBot (&ldquo;SaqBot,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) covering the SaqBot web app at
          saqbot.xyz, the @TradeSaqBot Telegram bot and our alerts (together, the &ldquo;Service&rdquo;). By using the Service you agree to these
          terms and to our <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree, don&apos;t use the Service.
        </>
      }
    >
      <div className="notice notice-error">
        <strong>Risk warning.</strong> Leveraged perpetual futures are high risk. Prices move fast, leverage multiplies losses, and a position can be
        liquidated, losing all the margin on it. Only trade money you can afford to lose. SaqBot&apos;s game-style language (&ldquo;jobs,&rdquo;
        &ldquo;getaway,&rdquo; &ldquo;wanted level&rdquo;) doesn&apos;t make any of this less real.
      </div>

      <Section id="eligibility" title="1. Who can use SaqBot">
        <ul>
          <li>You must be at least 18 years old and able to form a binding contract.</li>
          <li>
            Live trading isn&apos;t available to people who live in, are citizens of, or are located in the United States, or in any country or
            region where trading perpetual futures or using the Service is restricted or prohibited, or that is subject to comprehensive sanctions.
            You must not use a VPN or other tools to get around these restrictions.
          </li>
          <li>You must not be on any government sanctions list or acting for anyone who is.</li>
          <li>You&apos;re responsible for making sure your use of the Service is legal where you are.</li>
        </ul>
      </Section>

      <Section id="service" title="2. What SaqBot is, and isn't">
        <p>
          SaqBot is a non-custodial interface for planning trades on Hyperliquid, a third-party decentralized exchange, plus practice runs and
          market alerts. Trades you confirm are sent from your own wallet straight to Hyperliquid.
        </p>
        <ul>
          <li>SaqBot isn&apos;t an exchange, broker, bank, money transmitter or custodian. We never hold your funds or your wallet&apos;s private keys.</li>
          <li>
            SaqBot doesn&apos;t give financial, investment, tax or legal advice. Suggested leverage, position sizes, stop-loss presets, &ldquo;wanted
            levels,&rdquo; star ratings and alerts are tools to help you plan. They aren&apos;t recommendations to buy or sell, and every trade is your
            own decision.
          </li>
          <li>Practice runs use fake money on real prices. Practice results don&apos;t predict live results, which also involve fees, slippage and funding.</li>
          <li>Hyperliquid&apos;s testnet uses test tokens with no value. Don&apos;t send real funds to a testnet address.</li>
        </ul>
      </Section>

      <Section id="wallets" title="3. Accounts, wallets and keys">
        <ul>
          <li>Sign-in and embedded wallets are provided by Privy under its own terms. Keep your Google account, email and wallet secure; anyone who controls them can control your SaqBot wallet.</li>
          <li>
            Starting a trading session creates a key stored only on your device. It can place and cancel trades for your wallet but can&apos;t
            withdraw funds. Anyone with access to your unlocked device may be able to trade with it, so end the session on shared devices.
          </li>
          <li>We can&apos;t reverse transactions, recover lost keys or wallets, or restore funds sent to the wrong address or network.</li>
          <li>SaqBot will never ask for your seed phrase or private key.</li>
        </ul>
      </Section>

      <Section id="trading" title="4. Trading risks you accept">
        <ul>
          <li><b>Liquidation:</b> if price moves far enough against a position, Hyperliquid closes it and the margin on it is lost. Liquidation prices shown in SaqBot are estimates.</li>
          <li><b>Stop-losses and take-profits</b> are trigger orders on Hyperliquid. They can fill at a worse price than set, or not at all, in fast or thin markets. &ldquo;Full send&rdquo; jobs have no stop-loss at all.</li>
          <li><b>Funding payments</b> are charged or paid every hour while a position is open and can add up.</li>
          <li><b>Prices, balances and alerts</b> can be delayed, inaccurate or missing because of network, exchange or provider problems. Don&apos;t rely on alerts as your only risk control.</li>
          <li><b>Smart-contract, blockchain and exchange risk:</b> Hyperliquid, the Arbitrum bridge, USDC and the networks involved can fail, be hacked, pause, or change their rules. Deposits under $5 sent to Hyperliquid&apos;s bridge are lost, so SaqBot won&apos;t send less than ${MIN_DEPOSIT_USDC}.</li>
          <li><b>Daily loss limits</b> are a convenience feature that pauses new jobs in the app. They don&apos;t close open positions or guarantee a maximum loss.</li>
        </ul>
      </Section>

      <Section id="fees" title="5. Fees">
        <ul>
          <li>SaqBot charges a fee of {BUILDER_FEE_LABEL} of each live trade&apos;s value, collected through Hyperliquid&apos;s builder-fee system, which you approve once when you start a trading session.</li>
          <li>Wallets holding at least {BAWSAQ_MIN_HOLD.toLocaleString("en-US")} BAWSAQ tokens on Robinhood Chain, including linked wallets, pay a 0% SaqBot fee. Eligibility is checked from public blockchain data and may change if your holdings change.</li>
          <li>Hyperliquid&apos;s own trading fees, funding, its $1 withdrawal fee, blockchain network fees, and any card or Apple Pay purchase fees charged by payment providers are separate and set by those parties.</li>
          <li>Practice runs are free. We&apos;ll show any change to SaqBot&apos;s fee in the app before it applies to new trades.</li>
        </ul>
      </Section>

      <Section id="third" title="6. Third-party services">
        <p>
          The Service relies on third parties, including Privy, Hyperliquid, MoonPay, Coinbase, Telegram, and blockchain networks. Their services are
          governed by their own terms and privacy policies, and we aren&apos;t responsible for their availability, actions or failures. Buying USDC
          with a card or Apple Pay is a transaction between you and the payment provider, which may verify your identity.
        </p>
      </Section>

      <Section id="conduct" title="7. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>break any law or sanctions, or use the Service for money laundering, fraud, market manipulation or other illegal activity;</li>
          <li>get around eligibility or location restrictions;</li>
          <li>interfere with, overload, probe or try to break the security of the Service, or access it by automated means other than our published interfaces;</li>
          <li>copy, resell or make derivative works of the Service, or use it to build a competing product;</li>
          <li>use someone else&apos;s account or wallet without permission.</li>
        </ul>
      </Section>

      <Section id="ip" title="8. Intellectual property">
        <p>
          The Service, including the SaqBot name, logo, design and content, belongs to SaqBot and its licensors. We give you a personal, revocable,
          non-transferable licence to use it under these terms. Market data belongs to its respective sources.
        </p>
      </Section>

      <Section id="disclaimers" title="9. Disclaimers">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind, express or implied, including
          merchantability, fitness for a particular purpose, accuracy and non-infringement. We don&apos;t promise the Service will be uninterrupted,
          error-free or secure, or that any trade, stop-loss, alert or calculation will work as expected.
        </p>
      </Section>

      <Section id="liability" title="10. Limitation of liability">
        <p>
          To the fullest extent the law allows, SaqBot and its operators, contributors and service providers aren&apos;t liable for any trading losses,
          liquidations, lost profits, lost data, lost or stolen funds or keys, or any indirect, incidental, special, consequential or punitive damages
          arising from your use of the Service, even if we were told they were possible. Our total liability for any claim relating to the Service is
          limited to the greater of the SaqBot fees you paid in the 3 months before the claim arose, or US$100. Some places don&apos;t allow these
          limits, so they may not all apply to you.
        </p>
      </Section>

      <Section id="indemnity" title="11. Indemnity">
        <p>
          You agree to cover SaqBot&apos;s losses and reasonable costs, including legal fees, from any claim arising out of your breach of these terms,
          your misuse of the Service, or your violation of any law or anyone else&apos;s rights.
        </p>
      </Section>

      <Section id="ending" title="12. Suspension and ending">
        <p>
          You can stop using SaqBot at any time and delete your SaqBot data in the app under Alerts &rarr; Your account. We may suspend or end
          your access, or change or discontinue the Service, at any time, including to comply with law or protect users. Because SaqBot is
          non-custodial, your funds stay in your wallet and on Hyperliquid, where you can always reach them directly.
        </p>
      </Section>

      <Section id="changes" title="13. Changes to these terms">
        <p>
          We may update these terms. We&apos;ll change the date at the top, and for significant changes we&apos;ll tell you in the app before they take
          effect. If you keep using the Service after changes take effect, you accept the new terms.
        </p>
      </Section>

      <Section id="general" title="14. Disputes and general terms">
        <p>
          Before starting any formal dispute, email us at {CONTACT_EMAIL} so we can try to resolve it informally within 30 days. These terms are the
          whole agreement between you and SaqBot about the Service. If any part is found unenforceable, the rest still applies. Our not enforcing
          a term isn&apos;t a waiver. You can&apos;t transfer your rights under these terms; we may transfer ours as part of a merger, sale or
          reorganization.
        </p>
      </Section>

      <Section id="contact" title="15. Contact">
        <p>Questions about these terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </Section>
    </LegalPage>
  );
}
