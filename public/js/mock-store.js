/**
 * In-memory mock backend for Libertrade Analytics Demo.
 */
(function (global) {
  const INSTRUMENTS = ['MNQ', 'NQ', 'MES', 'ES', 'MGC', 'GC'];
  const SETUPS = ['Opening Drive', 'Pullback', 'Reversal', 'Breakout', null];
  const GATES = ['GREEN', 'AMBER', 'RED'];
  const PHASES = ['Pre-Market', 'Open', 'Midday', 'Close'];
  const SESSION_OPEN = ['GREEN', 'AMBER', 'RED'];

  let idSeq = 1000;
  const nextId = () => String(++idSeq);

  function limaDateStr(d) {
    return new Date(d.getTime() - 5 * 3600000).toISOString().split('T')[0];
  }

  function addDays(d, n) {
    return new Date(d.getTime() + n * 86400000);
  }

  function isWeekday(dateStr) {
    const dow = new Date(dateStr + 'T12:00:00Z').getUTCDay();
    return dow >= 1 && dow <= 5;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** DST correction used by session analytics chart (matches index.html renderBaskets). */
  function dstOff(dayDate) {
    const month = parseInt(dayDate.split('-')[1], 10);
    return month >= 3 && month <= 11 ? 1 : 0;
  }

  /** Random entry between 9:30 AM and 11:59 AM NY (stored rTrader-style for basket chart). */
  function randomMorningSessionTimes(dayDate) {
    const startMins = 9 * 60 + 30;
    const endMins = 12 * 60 - 1;
    const sessionMin = Math.floor(rand(startMins, endMins));
    const nyH = Math.floor(sessionMin / 60);
    const nyM = sessionMin % 60;
    const off = dstOff(dayDate);
    const utcH = nyH - off;
    const entry = new Date(
      `${dayDate}T${String(utcH).padStart(2, '0')}:${String(nyM).padStart(2, '0')}:00.000Z`
    );
    const exit = new Date(entry.getTime() + Math.floor(rand(4, 28)) * 60000);
    return { entry_time: entry.toISOString(), exit_time: exit.toISOString() };
  }

  function fridayOnOrBefore(dateStr) {
    const d = new Date(dateStr + 'T12:00:00Z');
    const dow = d.getUTCDay();
    const diff = dow >= 5 ? dow - 5 : dow + 2;
    d.setUTCDate(d.getUTCDate() - diff);
    return d.toISOString().split('T')[0];
  }

  function recentFridays(count, fromDate) {
    const out = [];
    const d = new Date(fromDate);
    while (out.length < count) {
      if (d.getUTCDay() === 5) out.unshift(d.toISOString().split('T')[0]);
      d.setUTCDate(d.getUTCDate() - 1);
    }
    return out;
  }

  /** Demo week endings (Fridays) — includes May 18–22 week (ends 2026-05-22). */
  function demoAgentWeeks() {
    return [
      '2026-04-18',
      '2026-04-25',
      '2026-05-01',
      '2026-05-08',
      '2026-05-15',
      '2026-05-22',
    ];
  }

  /** Sample weekly agent reports — Performance + Psychology only (demo). */
  function seedAgentReports(agentReports, now) {
    const weeks = demoAgentWeeks();
    const fmt = (d) =>
      new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const samples = [
      {
        focus: [
          'Cap re-entries to one add-back per setup when volume drops below opening levels.',
          'No new risk after 11:45 ET unless a fresh A+ imbalance break prints.',
        ],
        summaryPerf: 'Morning edge is real in the data — tighten hold quality and keep afternoons light.',
        summaryPsych: 'Awareness is ahead of execution — use emotion tags as a pause trigger.',
        themes: ['Hold A+ winners toward 1.5R', 'Two attempts max per setup after a loss'],
        psych: `PSYCHOLOGY\n\nMENTAL & READINESS\nReadiness and results mostly aligned this week. Sleep averaged 79% (range 74–84%) with recovery 61–68% on trading days — all sessions logged GREEN gate in notes. Calm or Cautious journal tags on Mon, Thu, and Fri matched your three best P&L days (+$186 combined). Tue opened at 76% sleep / 64% recovery; you still held rules until midday — useful proof that structure can carry an average readiness day.\n\nEMOTIONAL PATTERN\nFrustrated and Impatient appeared after the first morning loss on two days — both times you named it in the journal before trade three. That is real progress versus prior months. The one slip: Wed afternoon added Impatient after a −0.8R scratch; trade count jumped from 4 to 7 in nineteen minutes. A two-minute reset before click five would have saved roughly 1.2R.\n\nWHAT IS WORKING\nPre-market templates with level, invalidation, and max attempts were used four of five days. Thursday’s Calm + Cautious sequence (two trades, +$142 net) is the model week — boring execution, full targets on the second trade. Keep that template even when the week starts red.`,
        perf: `PERFORMANCE\n\nTwenty-eight trades, net +$318, average R +0.38. Win rate 54% ex-scratches; profit factor 1.38. Gross wins $892 vs gross losses $574. Average win 1.15R vs average loss 0.62R — losers are controlled; winner capture is the lever. Expectancy R +0.31 after commissions.\n\nEDGE QUALITY\nFive playbook sequences; three profitable (60% sequence win rate). Sequence 4 on Thursday (Pullback → add at value) netted +2.8R on two attempts. High-attempt sequences (4+ trades on one idea) went 1-for-3 and cost −1.9R combined. Trades tagged Entry Model Followed were +$264 net; improvised midday clicks were −$48. Hold-quality tags: ran_1r exits left an estimated +0.7R on the table across four winners.\n\nSESSION DISTRIBUTION\n71% of net P&L landed 9:30–11:30. The 10:00–10:30 bucket was +$148; 11:00–11:30 +$96. After 11:45 the book was −$26 on nine scratches — edge absent, commissions present. MNQ carried 82% of gross wins; ES flat on five trades.\n\nIMPROVEMENT FOCUS\nTag A+ trades and log exit type (plan vs fear). On trend days, partial at 1R with runner to 1.5R — three early exits this week below 1.5R account for the largest single improvement available (+0.15–0.2 to weekly expectancy).`,
      },
      {
        focus: [
          'Keep the 11:30 hard stop; document one sentence before any discretionary override.',
          'Track whether BE trades are intentional risk cuts vs fear exits — tag them explicitly.',
        ],
        summaryPerf: 'Green week on process — expectancy positive; widen targets on best trades.',
        summaryPsych: 'Calm dominated the journal — keep Friday discipline as strong as mid-week.',
        themes: ['Recovery 55–65% → half size written pre-market', 'Five intentional trades per day unless A+ reason'],
        psych: `PSYCHOLOGY\n\nMENTAL & READINESS\nFour of five sessions logged Calm in the journal — strongest emotional consistency this quarter. Sleep 82–88% on Mon/Wed/Fri; recovery 58–72% with no sub-50% days. You intuitively halved size on Tue (recovery 59%, gate still GREEN in plan) and finished that day +$44 — exactly the behavior to codify. Whoop and execution aligned on the days that mattered.\n\nEMOTIONAL PATTERN\nA single Impatient tag after Wednesday’s second winner — trade count rose from 3 to 5, but stayed inside playbook rules. No Revenge or FOMO tags all week. Friday could have been a “push” day after mid-week green; instead you logged Cautious and took only two trades. That choice preserved +$118 on the week.\n\nWHAT IS WORKING\nDLL respected on the hardest day (Tue chop, −$22 max before stop). After-Hours reviews referenced specific levels and emotions, not generic frustration. Focused tag on the Opening Drive winner correlated with +1.9R — link focus to size, not frequency.`,
        perf: `PERFORMANCE\n\nTwenty-four trades, net +$412, average R +0.44. Win rate 51%; profit factor 1.52. Average win 1.08R vs loss 0.57R. Two scratch-heavy afternoons still finished green because morning sequences carried +3.1R combined.\n\nEDGE QUALITY\nSix sequences; four green. Opening Drive → Pullback stack on Wednesday (+2.4R, two attempts) was the week’s anchor. B-setup fades after 11:00 were net −$62 on eight trades — downgrade those to observation-only unless volume confirms. Playbook-only compliance ~78% by day count (4 clean days of 5).\n\nSESSION DISTRIBUTION\n88% of net P&L before 11:30. Eleven o’clock hour +$164; post-12:00 −$18 on low-quality attempts. Protect the 9:45–11:15 window — it is where your model repeatedly pays.\n\nIMPROVEMENT FOCUS\nSlightly fewer, larger morning trades: five intentional entries per day with a written reason for #6+. Raising average win R from 1.08 to 1.25 on A+ only requires holding three runners that tagged ran_2r+ this week.`,
      },
      {
        focus: [
          'Hard circuit breaker: three losses or −3R → platform closed until next session.',
          'Pre-define max six trades per day; treat #7 as automatic process failure.',
        ],
        summaryPerf: 'Red on P&L, green on learning — playbook fine; cut afternoon improvisation.',
        summaryPsych: 'Hard Wednesday, strong Friday reset — awareness is the asset.',
        themes: ['Gate → size table before 9:25', 'Five-minute pause when Frustrated or Revenge logged'],
        psych: `PSYCHOLOGY\n\nMENTAL & READINESS\nMixed readiness told an honest story. Mon/Tue sleep 81–86%, recovery 62–70% — aligned with calm execution. Wednesday: 84% sleep, 49% recovery, gate logged GREEN — body and plan disagreed. That day produced 14 trades and four rule breaks; the data supports a written gate→size table (GREEN full, AMBER half, RED observe only). Thu recovery bounced to 68%; Fri you logged Cautious twice and followed both plans — the reset worked.\n\nEMOTIONAL PATTERN\nFrustrated and Revenge tags preceded the Wednesday loss cluster (trades 7–11). Journal captured it live — next step is mechanical: when Revenge is typed, five-minute break, no keyboard. Impatient on Tue added two marginal re-entries (−0.9R). No emotional tag on Friday — process win regardless of P&L.\n\nWHAT IS WORKING\nFriday’s two-trade Cautious session is your recovery protocol — use it intraday, not only after damage. Mon and Tue mornings were nearly breakeven with rules intact; the playbook did not fail early — improvisation failed late.`,
        perf: `PERFORMANCE\n\nThirty-six trades, net −$186, average R −0.14. Win rate 41%; profit factor 0.82. Playbook trades roughly breakeven (−$22); non-playbook afternoon trades −$164. One strong morning sequence (Pullback +1.8R) shows edge still exists when timed.\n\nEDGE QUALITY\nSeven sequences; two profitable (29%). Sequence 5 Wednesday (HVE fade attempts) took 6 trades for −2.6R net — classic high-attempt forcing. Before 10:45, book was −$48; after 11:30, −$138. Improvised tags dominated losing expectancy.\n\nSESSION DISTRIBUTION\nMorning 9:30–11:00: −$52 (salvageable). Midday 11:30–13:00: −$134 (reactive). Best single trade +1.8R at 10:08 — proves selective morning risk still works.\n\nIMPROVEMENT FOCUS\nTwo morning trades with full plan; if both red by 10:45, walk. Friday demonstrated you can execute that rule — make it default on amber recovery days too.`,
      },
      {
        focus: [
          'Scale out at 1.5R minimum on A+ trades before moving stops.',
          'If up on the week by Thursday, Friday default size = 50%.',
        ],
        summaryPerf: 'Best R week in a month — one step from a breakout on hold quality.',
        summaryPsych: 'Cautious is working as quality control, not hesitation.',
        themes: ['1.5R minimum plan on A+ winners', 'Protect mode after weekly target — size down Thu/Fri'],
        psych: `PSYCHOLOGY\n\nMENTAL & READINESS\nSleep 83–89% three days; recovery 61–74%. Gate GREEN four of five sessions. Cautious journal tag appeared on pullbacks that won — correlation, not coincidence: you waited for 5m acceptance and sized appropriately. Tue recovery 61% with Calm tag still produced a disciplined +$88 day.\n\nEMOTIONAL PATTERN\nConfidence rose after Mon/Tue greens; Wed added one Impatient tag after trade four — count went 4→6 but P&L impact was only −$34 (contained). No spiral. Thu/Fri Calm returned; Fri Impatient absent despite temptation to “finish strong.”\n\nWHAT IS WORKING\nPre-market plans listed invalidation and max adds — used all five days. In The Zone + Disciplined tags on the 10:52 winner (+2.1R) — note what preceded it (sleep >85%, recovery >68%, one-setup rule).`,
        perf: `PERFORMANCE\n\nTwenty-six trades, net +$528, average R +0.51. Win rate 57%; profit factor 1.61. Average win 1.28R vs loss 0.58R — best loss control in six weeks. Gross wins $1,040 vs losses $512.\n\nEDGE QUALITY\nPullback setups +$398 net (15 trades). Opening Drive without volume confirmation −$72 (6 trades). MNQ +$461; ES −$33 on four attempts. Best trade +2.1R at 10:52 (Imbalance pullback, tags: Entry Model Followed, ran_2r+).\n\nSESSION DISTRIBUTION\nMorning map clean: 10:00–10:30 +$198, 11:00–11:30 +$142. Afternoon −$44 on five low-conviction trades — acceptable if attempt cap holds.\n\nIMPROVEMENT FOCUS\nThree winners exited before 1.5R on trend days — tagging exit reason would recover +0.15–0.2 weekly expectancy. Protect mode after hitting +$400 on Thu: Fri size at 50% would have saved −$28 give-back.`,
      },
      {
        focus: [
          'Document gate → size on the check-in card before 9:25 every session.',
          'When recovery <55%, first trade is half size — no exceptions.',
        ],
        summaryPerf: 'Steady green week — sequences worked when attempts stayed low.',
        summaryPsych: 'Journal and Whoop are starting to tell the same story — act on the gap.',
        themes: ['Max three attempts per sequence', 'Pause after Impatient tag before next click'],
        psych: `PSYCHOLOGY\n\nMENTAL & READINESS\nSleep averaged 80% (77–87%); recovery 60–71% with one 54% day (Thu). GREEN gate four sessions; Thu AMBER in notes but sized as full — worth tightening. Calm/Focused tags on 62% of journal entries. Anxious only on Mon open (first trade loss) — converted to Cautious by trade two after a five-minute break.\n\nEMOTIONAL PATTERN\nImpatient twice mid-week, both after +1R winners — classic confidence creep. Trade count stayed ≤8 per day except Thu (11). Fri emotions clean; two trades, both tagged Cautious, +$96 net.\n\nWHAT IS WORKING\nMon anxiety acknowledged in journal without rule breaks. Tue DLL + Focused tags on a rotational day — small green, high process value. Whoop recovery and trade count inverse correlation is visible — use it for size, not guilt.`,
        perf: `PERFORMANCE\n\nTwenty-nine trades, net +$284, average R +0.35. Win rate 52%; profit factor 1.41. Expectancy +0.29R after fees. Scratches 7 trades (−$84 commissions) — still net green.\n\nEDGE QUALITY\nFive sequences; three winners. Low attempt (≤3) sequences: +4.2R combined. High attempt (5+) on Thu: −2.3R. ran_2r+ tag on 5 trades = 71% of gross wins.\n\nSESSION DISTRIBUTION\n9:30–10:00 +$112; 10:30–11:00 +$98; post-12:00 −$54 on six trades. Eleven-thirty checkpoint would have saved ~$40.\n\nIMPROVEMENT FOCUS\nHard cap three attempts per sequence ID in the journal. Thu is the template for what happens when the cap slips.`,
      },
      {
        focus: [
          'Max three attempts per A-setup — write it beside each level pre-market.',
          'After +$300 week-to-date by Thu, Friday size 50% unless fresh trend day.',
        ],
        summaryPerf: 'Strong May 18–22 week — morning edge clear; protect gains after 11:45.',
        summaryPsych: 'Calm execution on the days that mattered — keep the pause rule after first loss.',
        themes: ['11:45 ET risk-off unless imbalance day', 'Runner to 1.5R on MNQ pullbacks'],
        psych: `PSYCHOLOGY\n\nMENTAL & READINESS\nWeek of May 18–22: sleep 78–88% (Fri 87%), recovery 58–69% (Wed low 58%, Fri 62%). Gate GREEN all five sessions in check-in data. Mon Anxious → Calm after first loss (journal at 9:48). Wed recovery 58% — you traded full size; consider half on sub-60% days. Thu/Fri Calm + Cautious dominated — matched +$268 combined P&L.\n\nEMOTIONAL PATTERN\nFrustrated once Tue after midday chop (3 trades in 14 min, −$52) — named in journal, stopped at trade six. No Revenge tags. Fri opened with 87% sleep / 62% recovery — Cautious on both entries, +$118 net. Emotional awareness is ahead of automatic pauses; add the two-minute rule before trade three on any Frustrated log.\n\nWHAT IS WORKING\nPre-market notes listed ES/NQ levels and max attempts four of five days. Best psychology day: Thu Calm, two trades, +$142. Worst: Tue afternoon Impatient — contained to −$48 because you did not return after 12:00.`,
        perf: `PERFORMANCE\n\nThirty-one trades Mon May 18 – Fri May 22, net +$412, average R +0.41. Win rate 52% ex-scratches; profit factor 1.47. Gross wins $1,284 vs losses $872. Average win 1.22R vs loss 0.59R.\n\nEDGE QUALITY\nSix sequences; four profitable (67% sequence win rate). Tue Opening Drive → Pullback +3.4R (two attempts). Wed high-attempt fade sequence −2.1R (9 trades) — the week’s only structural leak. Entry Model Followed +$318 net; post-11:45 improvised −$26 on six scratches. ran_2r+ runners = 44% of gross wins.\n\nSESSION DISTRIBUTION\n9:30–10:00 +$186 (45% of net); 10:00–10:30 +$124; 11:00–11:30 +$98. After 11:45 −$26 — commissions without edge. May 22 (Fri) morning +$118 on two trades validates the light-footprint close.\n\nIMPROVEMENT FOCUS\nThree MNQ pullbacks exited before 1.5R on trend days — partial 1R + runner is the highest-leverage tweak. Risk-off at 11:45 unless written imbalance exception saves ~$40/week at current commission rate.`,
      },
    ];

    weeks.forEach((weekEnding, i) => {
      const s = samples[i % samples.length];
      const generated = addDays(new Date(weekEnding + 'T17:00:00Z'), 1).toISOString();
      const weekLabel = fmt(fridayOnOrBefore(weekEnding));

      agentReports.push({
        id: nextId(),
        week_ending: weekEnding,
        report_type: 'agent2',
        generated_at: generated,
        content: s.perf,
        summary:
          s.summaryPerf ||
          `Week of ${weekLabel}: Morning edge is showing up — focus on hold quality and session timing.`,
        themes: s.themes || [],
        focus: s.focus || [],
      });
      agentReports.push({
        id: nextId(),
        week_ending: weekEnding,
        report_type: 'agent1',
        generated_at: generated,
        content: s.psych,
        summary:
          s.summaryPsych ||
          `Week of ${weekLabel}: Emotional awareness is improving — act on journal tags before the next click.`,
        themes: s.themes || [],
      });
    });

    return weeks;
  }

  /** Curated journal + lessons for demo dashboard (original copy, not from user data). */
  function seedJournalAndLessons(tradingDays, journal, now) {
    const weekdays = tradingDays
      .map((d) => d.date)
      .filter(isWeekday)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 14);

    const journalSamples = [
      {
        et_time: '09:42:00 ET',
        session_phase: 'Open',
        dictated_text:
          'Pre-open felt tight in the chest — slept poorly and kept refreshing the DOM before the bell. Committed to one A-setup only and no adds until the first trade either hits +1R or stops out. If I feel the urge to chase, I walk away for five minutes.',
        emotions: ['Anxious', 'Cautious'],
      },
      {
        et_time: '11:18:00 ET',
        session_phase: 'Midday',
        dictated_text:
          'Took two clean playbook fades in the morning, then gave half back trying to force a third when volume dried up. I knew midday was rotational and still clicked in. Need to respect the no-trade window after 11:30 when the tape goes flat.',
        emotions: ['Frustrated', 'Impatient'],
      },
      {
        et_time: '14:05:00 ET',
        session_phase: 'Midday',
        dictated_text:
          'Stayed patient through a slow balance day. Passed on three marginal breaks that did not have volume behind them. Only executed when price accepted back inside value — felt boring but that is the point.',
        emotions: ['Calm', 'Cautious'],
      },
      {
        et_time: '15:52:00 ET',
        session_phase: 'Close',
        dictated_text:
          'Last hour temptation was real: prior session was red and I wanted to “get it back” before the close. Sized down, passed on the first rip, and only took the retest with a defined invalidation. Still small green — process win.',
        emotions: ['Calm'],
      },
      {
        et_time: '18:22:00 ET',
        session_phase: 'After-Hours',
        dictated_text:
          'Reviewing the session I can see the spiral: loss on trade two → immediate re-entry without a new setup → larger stop. I was trading my P&L, not the chart. Tomorrow: hard stop after two consecutive losses, no exceptions.',
        emotions: ['Frustrated', 'Revenge'],
      },
      {
        et_time: '10:08:00 ET',
        session_phase: 'Open',
        dictated_text:
          'Energy was good (sleep in the low 80s). Mapped the opening drive and imbalance levels before 9:30. First trade was a partial — banked at 1R and did not regret leaving runner risk on a choppy open.',
        emotions: ['Calm', 'Focused'],
      },
      {
        et_time: '16:40:00 ET',
        session_phase: 'After-Hours',
        dictated_text:
          'Frustrated with how I managed the winner on trade four — moved stop too early when price was still holding structure. The entry was fine; the exit was fear. Tagging this as execution drift, not a bad idea.',
        emotions: ['Frustrated', 'Cautious'],
      },
    ];

    const lessonSamples = [
      {
        et_time: '16:12:00 ET',
        session_phase: 'Close',
        lesson_text:
          'When price is consolidating, draw the box on the 5-minute chart and wait for a decisive break with volume before committing size. Inside the range, my job is to observe — not to invent trades. If the break fails back inside, assume chop until the next session segment.',
      },
      {
        et_time: '15:33:00 ET',
        session_phase: 'Midday',
        lesson_text:
          'Be cautious when price punches through the EMA and immediately snaps back for a retest. The first touch after a violent extension is often a trap; I want to see acceptance (hold above/below) or a clear failure wick before entry. Fading the first tag without confirmation has been my most expensive habit.',
      },
      {
        et_time: '11:55:00 ET',
        session_phase: 'Midday',
        lesson_text:
          'Low-volume nodes from the prior session still act as magnets. If we are grinding into a node into lunch, expect two-sided trade and smaller targets. Reduce size or stand down — do not apply opening-drive rules to a midday balance profile.',
      },
      {
        et_time: '18:05:00 ET',
        session_phase: 'After-Hours',
        lesson_text:
          'Re-entry rule for next week: only one add-back per idea, and only if the original thesis is still valid (level held, tape not rotational). If the second attempt stops, the idea is dead for the day — no third attempt on “hope.” Confirmation means a closed 5m candle in my direction, not a tick through the level.',
      },
      {
        et_time: '09:15:00 ET',
        session_phase: 'Pre-Market',
        lesson_text:
          'Pre-market plan: mark prior day high/low, overnight high/low, and the first 15-minute balance. Bullish bias only if we hold above the overnight mid with supportive breadth; otherwise default neutral and let the open declare the day. No trades in the first two minutes unless it is a clear gap-and-go with volume.',
      },
      {
        et_time: '17:48:00 ET',
        session_phase: 'After-Hours',
        lesson_text:
          'Daily profile note: when we build a P-shaped day, afternoon shorts into value tend to get paid — but only if the morning excess was accepted lower. If price reclaims the POC late, stop fighting and switch to “close the book” mode. Protecting mental capital matters as much as dollars.',
      },
      {
        et_time: '14:28:00 ET',
        session_phase: 'Midday',
        lesson_text:
          'Imbalance pullbacks work best when the impulse leg leaves a clean single-print or LVN behind. If the pullback retraces more than 50% of the impulse on rising delta against me, pass. Wait for the retest to hold and for micro structure to shift — same idea as “wait for confirmation before re-entry,” but with clearer measurable gates.',
      },
    ];

    const jDays = weekdays.slice(0, journalSamples.length);
    journalSamples.forEach((sample, i) => {
      const day = jDays[i] || weekdays[0];
      if (!day) return;
      journal.push({
        id: nextId(),
        trading_day: day,
        et_time: sample.et_time,
        session_phase: sample.session_phase,
        dictated_text: sample.dictated_text,
        emotions: sample.emotions,
        lesson_text: null,
      });
    });

    const lDays = weekdays.slice(0, lessonSamples.length);
    lessonSamples.forEach((sample, i) => {
      const day = lDays[i] || weekdays[Math.min(i, weekdays.length - 1)];
      if (!day) return;
      journal.push({
        id: nextId(),
        trading_day: day,
        et_time: sample.et_time,
        session_phase: sample.session_phase,
        dictated_text: null,
        emotions: null,
        lesson_text: sample.lesson_text,
      });
    });
  }

  function generateMockData() {
    const now = new Date();
    const trades = [];
    const tradingDays = [];
    const journal = [];
    const tags = [
      { id: '1', name: 'Balance', category: 'Conditions', sentiment: 'neutral' },
      { id: '2', name: 'Imbalance', category: 'Conditions', sentiment: 'neutral' },
      { id: '3', name: 'Entry Model Followed', category: 'Execution', sentiment: 'positive' },
      { id: '4', name: 'Impulsive', category: 'Execution', sentiment: 'negative' },
      { id: '5', name: 'Schema Activated', category: 'Psychology', sentiment: 'negative' },
      { id: '6', name: 'Revenge Trade', category: 'Psychology', sentiment: 'negative' },
      { id: '7', name: 'FOMO', category: 'Psychology', sentiment: 'negative' },
      { id: '8', name: 'Disciplined', category: 'Psychology', sentiment: 'positive' },
      { id: '9', name: 'In The Zone', category: 'Psychology', sentiment: 'positive' },
    ];
    const tagLinks = [];
    const tradeNotes = {};
    const appData = {};
    const agentReports = [];

    for (let i = 55; i >= 0; i--) {
      const dayDate = limaDateStr(addDays(now, -i));
      if (!isWeekday(dayDate)) continue;

      const gate = pick(GATES);
      const dayId = nextId();
      const rules = {};
      [
        'rules_trend', 'rules_market_cond', 'rules_plays', 'rules_execution',
        'rules_focus', 'rules_consol', 'rules_dll',
      ].forEach((k) => {
        rules[k] = Math.random() > 0.25 ? pick(['Followed', 'Broke']) : null;
      });

      tradingDays.push({
        id: dayId,
        date: dayDate,
        gate,
        whoop_sleep: Math.round(rand(62, 92)),
        whoop_recovery: Math.round(rand(55, 95)),
        synced_at: i < 3 ? new Date().toISOString() : null,
        ...rules,
      });

      const numTrades = Math.floor(rand(2, 9));
      for (let t = 0; t < numTrades; t++) {
        const sym = pick(INSTRUMENTS);
        const qty = Math.random() > 0.7 ? 2 : 1;
        const direction = Math.random() > 0.5 ? 'long' : 'short';
        const slPts = pick([8, 10, 12, 15, 20]);
        const gross = Math.round(rand(-180, 220) * 100) / 100;
        const commission = Math.round(qty * rand(0.5, 2) * 2 * 100) / 100;
        const net = Math.round((gross - commission) * 100) / 100;
        const times = randomMorningSessionTimes(dayDate);
        const tid = nextId();

        trades.push({
          id: tid,
          broker_trade_id: `demo_${dayDate}_${t}`,
          entry_time: times.entry_time,
          exit_time: times.exit_time,
          date: dayDate,
          instrument: sym,
          direction,
          quantity: qty,
          entry_price: Math.round(rand(18000, 22000) * 100) / 100,
          exit_price: Math.round(rand(18000, 22000) * 100) / 100,
          gross_pnl: gross,
          commission,
          net_pnl: net,
          platform: 'demo',
          account_name: '50K Eval',
          account_type: Math.random() > 0.35 ? 'eval' : 'funded',
          stop_loss_points: slPts,
          setup: pick(SETUPS),
          management: pick(['Full', 'Partial', 'BE', null]),
          sequence_id: t + 1,
          post_exit_outcome: pick(['Continued', 'Reversed', null]),
          gate_at_session_open: pick(SESSION_OPEN),
        });

        if (Math.random() > 0.6) tagLinks.push({ trade_id: tid, tag_id: pick(tags).id });
        if (Math.random() > 0.75) tradeNotes[tid] = 'Demo note: reviewed execution and risk.';
      }

    }

    seedJournalAndLessons(tradingDays, journal, now);
    const agentWeeks = seedAgentReports(agentReports, now);

    const limaToday = limaDateStr(now);
    const utcToday = now.toISOString().split('T')[0];
    const todayDates = [...new Set([limaToday, utcToday].filter(isWeekday))];

    todayDates.forEach((today) => {
      let day = tradingDays.find((d) => d.date === today);
      if (!day) {
        day = {
          id: nextId(),
          date: today,
          gate: 'GREEN',
          whoop_sleep: 87,
          whoop_recovery: 62,
          rules_trend: 'Followed',
          rules_market_cond: 'Followed',
          rules_plays: 'Followed',
          rules_execution: 'Followed',
          rules_focus: 'Followed',
          rules_consol: 'Followed',
          rules_dll: 'Followed',
        };
        tradingDays.push(day);
      } else {
        day.gate = 'GREEN';
        day.whoop_sleep = 87;
        day.whoop_recovery = 62;
      }

      const existingToday = trades.filter((t) => t.date === today);
      existingToday.forEach((t) => {
        const idx = trades.indexOf(t);
        if (idx >= 0) trades.splice(idx, 1);
      });

      const morningPnls = [124.5, 68.0, -22.25, 76.25];
      morningPnls.forEach((net, i) => {
        const times = randomMorningSessionTimes(today);
        const gross = Math.round((net + 1.2) * 100) / 100;
        trades.push({
          id: nextId(),
          date: today,
          broker_trade_id: `demo_today_${i}`,
          entry_time: times.entry_time,
          exit_time: times.exit_time,
          instrument: pick(['MNQ', 'MES']),
          direction: i % 2 === 0 ? 'long' : 'short',
          quantity: 1,
          gross_pnl: gross,
          commission: 1.2,
          net_pnl: net,
          account_type: 'eval',
          stop_loss_points: 10,
          gate_at_session_open: 'GREEN',
          sequence_id: i + 1,
          setup: pick(SETUPS),
        });
      });
    });

    return {
      trades,
      tradingDays,
      journal,
      tags,
      tagLinks,
      tradeNotes,
      appData,
      agentReports,
      agentWeeks,
    };
  }

  const store = generateMockData();

  function parseQuery(url) {
    const q = url.split('?')[1] || '';
    const params = {};
    q.split('&').filter(Boolean).forEach((pair) => {
      const eq = pair.indexOf('=');
      const k = decodeURIComponent(pair.slice(0, eq));
      const v = decodeURIComponent(pair.slice(eq + 1));
      if (!params[k]) params[k] = [];
      params[k].push(v);
    });
    return params;
  }

  function getTable(url) {
    const m = url.match(/\/rest\/v1\/([^?]+)/);
    return m ? m[1] : null;
  }

  function applyFilters(rows, params) {
    let out = [...rows];
    Object.entries(params).forEach(([key, vals]) => {
      vals.forEach((v) => {
        if (['select', 'order', 'limit', 'offset'].includes(key)) return;
        if (v.startsWith('eq.')) out = out.filter((r) => String(r[key]) === v.slice(3));
        else if (v.startsWith('gte.')) out = out.filter((r) => r[key] >= v.slice(4));
        else if (v.startsWith('lte.')) out = out.filter((r) => r[key] <= v.slice(4));
        else if (v.startsWith('in.(')) {
          const list = v.slice(4, -1).split(',');
          out = out.filter((r) => list.includes(String(r[key])));
        } else if (v === 'not.is.null') out = out.filter((r) => r[key] != null && r[key] !== '');
      });
    });
    const order = params.order?.[0];
    if (order) {
      const [col, dir] = order.split('.');
      out.sort((a, b) => {
        if (a[col] < b[col]) return dir === 'desc' ? 1 : -1;
        if (a[col] > b[col]) return dir === 'desc' ? -1 : 1;
        return 0;
      });
    }
    if (params.limit?.[0]) out = out.slice(0, parseInt(params.limit[0], 10));
    return out;
  }

  function selectCols(rows, params) {
    const sel = params.select?.[0];
    if (!sel || sel === '*') return rows;
    const cols = sel.split(',').map((c) => c.trim());
    return rows.map((r) => {
      const o = {};
      cols.forEach((c) => { if (r[c] !== undefined) o[c] = r[c]; });
      return o;
    });
  }

  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  function handleGet(table, params) {
    if (table === 'trades') return selectCols(applyFilters(store.trades, params), params);
    if (table === 'trading_days') return selectCols(applyFilters(store.tradingDays, params), params);
    if (table === 'intraday_journal') return selectCols(applyFilters(store.journal, params), params);
    if (table === 'trade_tags') return selectCols(applyFilters(store.tags, params), params);
    if (table === 'trade_tag_links') return selectCols(applyFilters(store.tagLinks, params), params);
    if (table === 'trade_notes') {
      const tradeId = params.trade_id?.find((v) => v.startsWith('eq.'))?.slice(3);
      return tradeId && store.tradeNotes[tradeId]
        ? [{ trade_id: tradeId, notes: store.tradeNotes[tradeId] }]
        : [];
    }
    if (table === 'app_data') {
      const keyEq = params.key?.find((v) => v.startsWith('eq.'));
      if (keyEq) {
        const key = keyEq.slice(3);
        return store.appData[key] ? [{ key, value: store.appData[key] }] : [];
      }
      return Object.entries(store.appData).map(([key, value]) => ({ key, value }));
    }
    if (table === 'agent_reports') return selectCols(applyFilters(store.agentReports, params), params);
    if (table === 'rule_compliance') return [];
    return [];
  }

  async function handleRequest(url, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();

    if (url.includes('/functions/v1/')) {
      return jsonResponse({
        summary: 'Demo report — sample insights for this period.',
        highlights: ['Process discipline improved mid-week.'],
        focus_areas: ['Reduce size after consecutive losses.'],
      });
    }

    const table = getTable(url);
    if (!table) return jsonResponse({ error: 'unknown' }, 404);

    const params = parseQuery(url);
    let body = null;
    if (opts.body) {
      try { body = JSON.parse(opts.body); } catch (e) { body = null; }
    }

    if (method === 'GET') return jsonResponse(handleGet(table, params));
    if (method === 'POST' || method === 'PATCH') {
      return new Response(null, { status: method === 'POST' ? 201 : 204 });
    }
    if (method === 'DELETE') return new Response(null, { status: 204 });
    return jsonResponse([]);
  }

  global.MockStore = { handleRequest, store };
})(typeof window !== 'undefined' ? window : globalThis);
