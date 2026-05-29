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

  /** Demo calendar window — monthly reports show April and May only. */
  const DEMO_MONTH_START = '2026-04-01';
  const DEMO_MONTH_END = '2026-05-31';

  function inDemoMonthRange(dayDate) {
    return dayDate >= DEMO_MONTH_START && dayDate <= DEMO_MONTH_END;
  }

  /** Demo week endings (Fridays) — two showcase weeks only. */
  function demoAgentWeeks() {
    return ['2026-05-15', '2026-05-22'];
  }

  /** Curated trades for demo report weeks so sidebar P&L matches agent narrative. */
  function seedCuratedWeekTrades(trades, tradingDays) {
    const curated = [
      {
        days: ['2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'],
        dailyNet: [88, 142, 96, 186, 16],
        sleep: [84, 86, 83, 89, 85],
        recovery: [68, 71, 64, 74, 69],
      },
      {
        days: ['2026-05-18', '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22'],
        dailyNet: [64, -48, 118, 142, 136],
        sleep: [78, 81, 84, 86, 87],
        recovery: [62, 59, 58, 67, 62],
      },
    ];

    const allDates = new Set(curated.flatMap((w) => w.days));
    for (let i = trades.length - 1; i >= 0; i--) {
      if (allDates.has(trades[i].date)) trades.splice(i, 1);
    }

    curated.forEach((week) => {
      week.days.forEach((dayDate, di) => {
        const dayTarget = week.dailyNet[di];
        const n = dayTarget < 0 ? 7 : dayTarget > 150 ? 6 : 5;
        const weights = [];
        let wsum = 0;
        for (let t = 0; t < n; t++) {
          const w = Math.random() * 0.6 + 0.4;
          weights.push(w);
          wsum += w;
        }
        let day = tradingDays.find((d) => d.date === dayDate);
        if (!day) {
          day = {
            id: nextId(),
            date: dayDate,
            gate: 'GREEN',
            whoop_sleep: week.sleep[di],
            whoop_recovery: week.recovery[di],
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
          day.whoop_sleep = week.sleep[di];
          day.whoop_recovery = week.recovery[di];
        }

        let allocated = 0;
        for (let t = 0; t < n; t++) {
          const isLast = t === n - 1;
          const net = isLast
            ? Math.round((dayTarget - allocated) * 100) / 100
            : Math.round(((dayTarget * weights[t]) / wsum) * 100) / 100;
          allocated += net;
          const times = randomMorningSessionTimes(dayDate);
          const slPts = pick([8, 10, 12]);
          trades.push({
            id: nextId(),
            broker_trade_id: `demo_curated_${dayDate}_${t}`,
            entry_time: times.entry_time,
            exit_time: times.exit_time,
            date: dayDate,
            instrument: t % 3 === 0 ? 'ES' : 'MNQ',
            direction: net >= 0 ? 'long' : 'short',
            quantity: 1,
            gross_pnl: Math.round((net + 1.2) * 100) / 100,
            commission: 1.2,
            net_pnl: net,
            platform: 'demo',
            account_name: '50K Eval',
            account_type: 'eval',
            stop_loss_points: slPts,
            setup: pick(SETUPS),
            management: net > 80 ? 'Partial' : pick(['Full', 'BE', null]),
            sequence_id: Math.floor(t / 2) + 1,
            gate_at_session_open: 'GREEN',
          });
        }
      });
    });
  }

  /** Sample weekly agent reports — Performance + Psychology only (demo). */
  function seedAgentReports(agentReports, now) {
    const weeks = demoAgentWeeks();
    const fmt = (d) =>
      new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const samples = [
      {
        focus: [
          'Scale out at 1.5R minimum on A+ trades before moving stops — tag exit reason on every winner.',
          'After +$400 week-to-date by Thursday, Friday default size = 50% unless a fresh imbalance trend day.',
        ],
        summaryPerf:
          'Best R week in the sample — +$528 net, PF 1.61; morning edge is repeatable when hold quality catches up.',
        summaryPsych:
          'Cautious is functioning as quality control, not hesitation — readiness and journal tags aligned on the big days.',
        themes: ['1.5R minimum plan on A+ winners', 'Protect mode after weekly target — size down Thu/Fri'],
        psych: `PSYCHOLOGY\n\nMENTAL & READINESS\nWeek of May 11–15: sleep averaged 85% (range 83–89%) with recovery 64–74% on trading days. Gate logged GREEN all five sessions. Mon opened Anxious after a −0.6R first trade; journal at 9:41 named it and you converted to Cautious by trade two — day finished +$88 with only five attempts. Thursday was the alignment peak: 89% sleep, 74% recovery, Calm tag pre-open, two trades, +$186 net. Friday recovery 69% — you logged Cautious, took two trades, +$16 net (protect mode after +$412 WTD). Whoop and execution told the same story on three of five days; Tue (recovery 64%) still produced +$142 because size stayed playbook-consistent.\n\nEMOTIONAL PATTERN\nImpatient appeared once — Wednesday after trade four (+1.1R winner) when count went 4→6; P&L impact was only −$34 because adds stayed inside the pullback model. No Revenge or FOMO tags all week. Frustrated zero times. Confidence creep risk showed up as “one more try” on Thu (11 trades) but net was still +$186 because adds were at value, not midday fades. The emotional win: you did not chase Friday afternoon despite being up on the week.\n\nWHAT IS WORKING\nPre-market templates with level, invalidation, and max attempts were used five of five days. In The Zone + Disciplined tags on the 10:52 MNQ winner (+2.1R) — note the stack: sleep >85%, recovery >68%, one-setup rule until +1R. Cautious on pullbacks that won (Wed, Fri) — waiting for 5m acceptance before click two. DLL respected on Tue chop (+$142 on six trades, no rule breaks). Journal entries referenced specific levels, not generic frustration — that correlation shows up in the trade tags.`,
        perf: `PERFORMANCE\n\nTwenty-six trades Mon May 11 – Fri May 15, net +$528, average R +0.51. Win rate 58% (15W / 8L / 3 scratches); profit factor 1.61. Gross wins $1,040 vs gross losses $512. Average win 1.28R vs average loss 0.58R — best loss control in the demo window. Expectancy +0.44R after commissions. Max intraday drawdown −$62 (Wed midday); peak day +$186 (Thu).\n\nDaily P&L map: Mon +$88 (5 trades) · Tue +$142 (6) · Wed +$96 (6) · Thu +$186 (11) · Fri +$16 (2). Ex-scratch win rate 65% on MNQ; ES four trades net −$33 (stop taking ES unless NQ correlation confirms). Largest winner +2.1R at 10:52 Thu (Pullback, tags: Entry Model Followed, ran_2r+). Largest loser −0.9R Wed 11:22 (impulse add outside plan).\n\nEDGE QUALITY\nPullback setups: 15 trades, +$398 net, 60% win rate, avg +0.62R. Opening Drive without volume confirmation: 6 trades, −$72 net — downgrade to observation when opening range < 0.35% of prior close. Seven playbook sequences; five profitable (71% sequence win rate). Low-attempt sequences (≤3 trades): +5.1R combined. High-attempt sequence on Thu (5 trades, one idea): +1.8R — acceptable because adds were at planned value, not midday improvisation.\n\nTag and compliance detail: Entry Model Followed +$412 net (18 trades). Impulsive / improvised midday −$44 (5 trades). ran_2r+ on five trades = 71% of gross wins. ran_1r exits left an estimated +1.1R on the table across four winners that tagged 2R+ post-exit. Playbook compliance by day: 5/5 days with rules_trend Followed; rules_execution Broke once (Wed trade 6). BE exits: 4 trades, net +$18 — intentional risk cuts, not fear exits.\n\nSequence highlights: Seq 2 Tue Opening Drive → Pullback +2.4R (2 attempts). Seq 4 Thu Imbalance pullback +2.8R (2 attempts, partial 1R + runner). Seq 5 Wed midday fade attempts −$34 (3 trades) — contained leak, not a spiral.\n\nSESSION DISTRIBUTION\nMorning (9:30–11:30) +$572 (108% of net — afternoon give-back). Bucket detail: 9:30–10:00 +$124 · 10:00–10:30 +$198 · 10:30–11:00 +$88 · 11:00–11:30 +$142 · 11:30–12:00 −$18 · post-12:00 −$26 on five low-conviction scratches. 94% of gross wins occurred before 11:30. MNQ +$461 (22 trades); MES +$67 (2); ES −$33 (4).\n\nDay-of-week: Mon–Wed steady green (+$326 combined); Thu carried the week (+$186); Fri protect mode (+$16, 2 trades). Instrument concentration risk: 85% of attempts on MNQ — acceptable while edge is MNQ-biased; document ES filter before scaling size.\n\nIMPROVEMENT FOCUS\n1) Hold quality — three winners exited before 1.5R on trend days (Wed 10:18, Thu 10:31, Thu 11:04). Partial at 1R + runner to 1.5R on A+ only; tagging exit reason (plan vs fear) would recover an estimated +0.18–0.22 weekly expectancy. 2) Protect mode — after +$400 WTD by Thu close, Fri size at 50% (you did this behaviorally — codify on the check-in card). 3) ES filter — no ES unless NQ impulse confirms; would have saved −$33 and one rule-break adjacency. 4) Thu attempt cap — 11 trades still green, but cap at 8 unless imbalance day to reduce variance.`,
      },
      {
        focus: [
          'Max three attempts per A-setup — write it beside each level pre-market.',
          '11:45 ET risk-off unless a written imbalance exception; Wed full-size on 58% recovery is the one sizing miss to fix.',
        ],
        summaryPerf:
          'Strong May 18–22 week — +$412 net, morning edge clear; Wed sequence leak is isolated and fixable.',
        summaryPsych:
          'Calm execution on the days that mattered — add a mechanical pause after the first Frustrated tag.',
        themes: ['11:45 ET risk-off unless imbalance day', 'Runner to 1.5R on MNQ pullbacks'],
        psych: `PSYCHOLOGY\n\nMENTAL & READINESS\nWeek of May 18–22: sleep 78–88% (Fri 87%), recovery 58–69% (Wed low 58%, Fri 62%). Gate GREEN all five sessions in check-in data. Mon: Anxious → Calm after first loss (journal 9:48) — +$64 on five trades. Tue: 81% sleep / 59% recovery, Impatient after midday chop — contained to −$48 (stopped at trade 6, no return after 12:00). Wed: 84% sleep but 58% recovery — full size was the mismatch; 9 trades, +$118 net but emotional cost high. Thu/Fri: Calm + Cautious — +$278 combined on six trades. Whoop said “average” on Wed; journal said “focused” — the gap is where a written gate→size table (sub-60% recovery = half size) prevents unnecessary variance.\n\nEMOTIONAL PATTERN\nFrustrated once Tue (trades 4–6 in fourteen minutes, −$52 cluster) — named in journal before trade 7, no Revenge follow-through. Impatient twice: Tue afternoon, Wed after winner #3 (count 3→9 on Wed — the structural leak). No FOMO tags. Fri: Cautious on both entries with 87% sleep / 62% recovery — +$136 on two trades; proof that emotional label + size discipline beats “push” psychology after a green week.\n\nCorrelation table (journal tag → day P&L): Calm Mon +$64 · Impatient Tue −$48 · Focused/Cautious Wed +$118 · Calm Thu +$142 · Cautious Fri +$136. The outlier is Wed: positive P&L with the worst process day — do not confuse outcome with execution; the agent flags the 9-trade fade sequence anyway.\n\nWHAT IS WORKING\nPre-market notes listed ES/NQ levels and max attempts four of five days. Best psychology day: Thu Calm, two trades, +$142. Recovery protocol without waiting for damage: Tue stopped when Frustrated logged. DLL + rules_dll Followed four of five days. After-Hours review on Wed referenced “nine trades on one fade” — awareness is ahead of automation; next step is hard cap three attempts per sequence ID in the journal UI.`,
        perf: `PERFORMANCE\n\nThirty-one trades Mon May 18 – Fri May 22, net +$412, average R +0.41. Win rate 55% ex-scratches (14W / 9L / 8 scratches); profit factor 1.47. Gross wins $1,284 vs losses $872. Average win 1.22R vs loss 0.59R. Expectancy +0.36R after fees. Max intraday drawdown −$78 (Tue 11:20–11:34). Peak day +$142 (Thu, 2 trades).\n\nDaily P&L map: Mon +$64 (5) · Tue −$48 (6) · Wed +$118 (9) · Thu +$142 (2) · Fri +$136 (2). Scratches cost −$96 in commissions — still net green because morning sequences carried +$486 before scratches. Tue is the process lesson day; Thu/Fri are the template days (8 combined trades, +$278).\n\nEDGE QUALITY\nSix sequences; four profitable (67% sequence win rate). Anchor: Tue Opening Drive → Pullback +3.4R (2 attempts, tags: Entry Model Followed, ran_2r+). Leak: Wed high-attempt fade sequence −$2.1R (9 trades, 2 winners / 7 marginal) — the only sequence with attempt count >5. Entry Model Followed +$318 net (19 trades). Post-11:45 improvised −$26 on six scratches (0.19R expectancy). Playbook-only days (Mon, Thu, Fri): +$342 on 9 trades. Mixed-process days (Tue, Wed): +$70 on 15 trades — same edge, worse execution tax.\n\nHold-quality: ran_2r+ runners = 44% of gross wins ($564 of $1,284). ran_1r early exits: six trades, estimated +0.9R left on table. BE stops: 3 trades, net +$22 — all tagged intentional in notes. Partial management on Thu winner: 1R scale + runner to 1.8R — model exit for next week.\n\nSetup breakdown: Pullback +$286 (12 trades, PF 1.8) · Opening Drive +$148 (6) · Reversal −$22 (8) · Breakout null-setup scratches −$0 net, −$18 commissions. MNQ +$398 (24 trades); ES +$14 (4); MES flat (3).\n\nSESSION DISTRIBUTION\n9:30–10:00 +$186 (45% of weekly net) · 10:00–10:30 +$124 · 10:30–11:00 +$52 · 11:00–11:30 +$98 · 11:30–11:45 +$12 · after 11:45 −$26 (six scratches, no edge). 91% of gross wins before 11:30. Best hour: 10:00–10:30 (PF 2.1 on 7 trades). Worst window: Tue 11:15–11:35 (−$52, three trades, Impatient tag in journal).\n\nMay 22 (Fri) micro-map: two trades, both before 10:20, +$136 net, Cautious tags, 87% sleep — validates weekly protect-mode close. Wed micro-map: nine trades, +$118 net but −$2.1R on sequence 3 alone — high P&L with poor process; do not replicate.\n\nIMPROVEMENT FOCUS\n1) Sizing — Wed traded full size at 58% recovery; half-size rule would have cut sequence 3 attempts and saved an estimated −$1.2R while keeping +$118 day if first two trades repeated. 2) Hold — three MNQ pullbacks exited before 1.5R on trend days (Mon 10:06, Wed 10:44, Thu 10:12); partial 1R + runner is highest leverage (+0.15–0.2 expectancy). 3) Risk-off — 11:45 ET hard stop unless imbalance exception in pre-market notes (six post-11:45 scratches = −$26 + friction). 4) Sequence cap — max three attempts per A-setup ID; Wed would drop from 9 to ≤5 trades on the fade. 5) Tue protocol — when Frustrated logged, two-minute pause before trade 5 (would have avoided −$52 cluster).`,
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
      if (!inDemoMonthRange(dayDate)) continue;

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
    seedCuratedWeekTrades(trades, tradingDays);
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
