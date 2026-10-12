/*
 * Guidance engine for the ROI / ROV / ROT results page.
 *
 * Pure function, no DOM. Turns three lens scores (each 4-20), optional
 * evidence flags, and the individual answers into an interpretation,
 * a tension readout, interventions, tests, evidence prompts, and one
 * recommended next move.
 *
 * The pattern is read from the *relative* shape of the scores first
 * (which lens trails, which lens leads, how big the biggest gap is), and
 * only then from absolute levels. The biggest gap drives the move.
 */
(function (root) {
  'use strict';

  var ORDER = ['roi', 'rov', 'rot'];
  var ABBR = { roi: 'ROI', rov: 'ROV', rot: 'ROT' };
  var HIGH = 15;            // sum of four 1-5 ratings: 15+ reads as high
  var LOW = 10;             // 10 or below reads as low
  var ALIGNED_SPREAD = 3;   // max-min at or under this: lenses read as aligned
  var TENSION_GAP = 6;      // max-min at or over this: significant tension
  var BLOCKER = 7;          // ROT at or under this may block even a pilot
  // When two lenses tie for lowest, look at user value first, then delivery.
  var TIE = { rov: 0, rot: 1, roi: 2 };

  /* ---------- Interpretation ---------- */

  var TITLES = {
    'aligned-high': 'Aligned and strong',
    'aligned-mid': 'Aligned, but unproven',
    'aligned-low': 'Aligned, but weak across the board',
    'rot-trails': 'Valuable, but delivery is the constraint',
    'rov-trails': 'Attractive and feasible, but user value is in doubt',
    'roi-trails': 'Valued and deliverable, but the organizational case is unclear',
    'roi-leads': 'The business case is ahead of users and delivery',
    'rov-leads': 'User value is ahead of the business case and delivery',
    'rot-leads': 'Easy to deliver, but value isn’t yet established'
  };

  function interpretation(id, c) {
    var low = ABBR[c.low];
    var note = c.leadersMin >= 13
      ? 'The other two lenses look solid, so effort can concentrate on ' + low + '.'
      : 'The other two lenses are only moderate, so ' + low + ' may not be the only thing worth verifying.';
    var weakest = ABBR[c.low] + ' (' + c.s[c.low] + ')';
    var strong = c.leadersMin >= 13;

    var text = {
      'aligned-high': [
        'The business case, the user experience, and the technical reality point the same way. That agreement is useful, and it’s also the point where assumptions tend to stop being questioned.',
        'The strategic implication is to move forward while naming what could change the picture: which answers rest on assumption, which indicator would show drift first, and what would trigger reconsideration. ' + weakest + ' is the lowest of the three, so it’s the first place to watch.'
      ],
      'aligned-mid': [
        'The three lenses sit close together in the middle. Agreement at this level usually signals missing evidence more than a balanced, finished case: nothing is clearly failing, and nothing is clearly established.',
        'The strategic implication is that the next step is to test the shakiest assumptions cheaply, rather than committing fully or abandoning the idea. ' + weakest + ' is the lowest, which makes it a sensible place to start.'
      ],
      'aligned-low': [
        'All three lenses are low, and they roughly agree. That isn’t a single weakness to fix. The business case, the user value, and feasibility are all in doubt, which usually points to the problem definition or the chosen solution rather than execution.',
        'The strategic implication is to stop investing in this version of the idea and restate the problem before deciding what, if anything, to build.'
      ],
      'rot-trails': [
        (strong ? 'The idea appears valuable to the organization and to users, with delivery as the main constraint.' : 'The organizational and user cases look plausible but not strong, and delivery is the weakest link.') + ' That moves the strategic question from “is this worth doing?” to “what’s the smallest version that can be delivered well, and where does it break?”',
        note + ' Scaling before the delivery constraint is understood risks losing the value that made the idea attractive.'
      ],
      'rov-trails': [
        (strong ? 'The idea is attractive to the organization and feasible to deliver, but the user experience case is weak or unproven.' : 'The organizational case and delivery are somewhat ahead of the user experience case, which is the weakest of the three.') + ' This pattern is common when results are measured from the institution’s side only.',
        note + ' The strategic risk is scaling something that works for the organization at the user’s expense, which tends to surface later as workarounds, complaints, appeals, or low adoption.'
      ],
      'roi-trails': [
        (strong ? 'Users value this and it can be delivered, but the organizational case is weak or unclear.' : 'The user case and delivery are somewhat ahead of the organizational case, which is the weakest of the three.') + ' The gap is often in the problem statement, the strategic link, or the evidence, not in the idea itself.',
        note + ' The strategic implication is that the idea may be good but not yet justified. Without a case the organization recognizes, it’s unlikely to be resourced, sustained, or defended.'
      ],
      'roi-leads': [
        'The business case is well ahead of both the user experience and the technical reality. Strong ROI alongside weak value and feasibility is a warning pattern: the numbers may be moving for reasons that cost users or the delivery team something that isn’t being counted.',
        'The strategic implication is to test whether the business case still holds once user impact and delivery effort are included.'
      ],
      'rov-leads': [
        'User value is well ahead of both the organizational case and delivery. People may value the idea, but without a recognized business case and a workable delivery path it’s hard to fund or sustain.',
        'The strategic implication is to turn user value into evidence the organization accepts, and to find out what delivery would take.'
      ],
      'rot-leads': [
        'Delivery looks easy relative to value. When feasibility leads, scope tends to be shaped by what’s possible rather than what’s needed.',
        'The strategic implication is to confirm there’s a demonstrated need before investing further. Ease of delivery isn’t a reason to do something.'
      ]
    };
    return text[id];
  }

  /* ---------- Tension ---------- */

  var PAIR_WHY = {
    'roi-rov': 'Business metrics are moving without a matching gain in user experience. That combination can mean the gains are being paid for with user effort, friction, or anxiety, and those costs tend to come back later as complaints, workarounds, or lost trust.',
    'rov-roi': 'People feel the difference, but the organization can’t see it yet. The right measures may not be in place, the value may take longer to show, or the problem may not be framed in terms leadership prioritizes. Without that link, the work is vulnerable to being cut.',
    'roi-rot': 'The results look strong, but they’re being delivered under heavy constraints. If the gains depend on workarounds, manual effort, or exceptions, they may not hold as use grows or as staff change.',
    'rot-roi': 'Delivery is workable, but it isn’t moving the measures the organization cares about. Effort may be aimed at what’s feasible rather than what’s valuable, or the measures may be the wrong ones.',
    'rov-rot': 'The experience users want is clear, but technology limits how much of it can ship. The risk is a watered-down version that loses the value users responded to, or a promise the platform can’t keep at scale.',
    'rot-rov': 'Delivery is going smoothly, but users aren’t feeling the benefit. Feasibility may be shaping the design more than user needs are, and ease of delivery can hide an experience that doesn’t land.'
  };

  /* ---------- Interventions ---------- */

  var STEPS = {
    'pilot-feasibility': [
      ['Define the smallest viable pilot', 'Choose one bounded context (a single team, course, segment, or workflow) and a fixed window of 4–8 weeks, so the idea can be tried without the full infrastructure.'],
      ['Map where the constraint bites', 'List each technical, compliance, staffing, or workflow constraint limiting the idea. Mark which are fixed (law, platform) and which are negotiable (budget, process, sequencing).'],
      ['Measure the load, not just the outcome', 'Track the effort to deliver per unit of work: staff hours, steps, handoffs, manual workarounds. This is the number that scale depends on.'],
      ['Find the breaking point', 'Estimate what happens at 2x and 5x volume. Identify the first thing that fails (staffing, tooling, review queue) and what support it would take to hold.'],
      ['Protect what makes it worth doing', 'Decide which parts of the experience can’t be cut to fit the constraints, so a workaround doesn’t quietly erase the value.']
    ],
    'resolve-feasibility': [
      ['Name the blocking constraint', 'Identify the specific compliance, accessibility, platform, or legacy-system constraint that prevents delivery, and state it as something testable.'],
      ['Get a feasibility answer from its owner', 'Talk to whoever owns the constraint. Ask what a “yes” would require, how long it would take, and what it would cost.'],
      ['Prototype only the riskiest piece', 'Build a spike or proof of concept for the hardest technical question, not a full build. A short, fixed timebox keeps it honest.'],
      ['Compare lower-tech alternatives', 'Try a reduced-scope, manual, or differently sequenced version and check whether it still delivers the core value.'],
      ['Set a decision date', 'If feasibility isn’t established by a set date, revisit the scope or pause, rather than letting the question stay open indefinitely.']
    ],
    'investigate-user': [
      ['Hold scaling until user impact is understood', 'Treat the current version as unproven for users. Limit rollout to the people already involved while the next steps are completed.'],
      ['Talk to 5–8 affected users', 'Run short interviews or observed sessions on the real task. Ask what was confusing, what felt unfair or stressful, and where they needed help. Look for patterns rather than agreement.'],
      ['Locate the friction', 'Walk the end-to-end journey and mark where people hesitate, ask for help, drop off, or work around the design. Compare with the metric gains to see who is paying for them.'],
      ['Check the content at decision points', 'Review the language where people choose or commit. Does it explain what happens next, why, and what the person can do? Rewrite two or three high-friction moments and test them.'],
      ['Add a lightweight feedback signal', 'Add a one-question pulse on clarity, fairness, or confidence at the end of the experience, so user value is measured rather than inferred.']
    ],
    'redesign': [
      ['Redesign the highest-friction moments first', 'Use the lowest-rated user-experience questions to pick two or three moments to rework, rather than redesigning everything.'],
      ['Test the revision side by side', 'Put the revised version next to the current one with a handful of users on the same task and compare friction, errors, and confidence.'],
      ['Check that the metric gains survive', 'Confirm that reducing friction doesn’t erase the gains in the business measures. If it does, the gains may have depended on that friction.'],
      ['Rewrite the content around the user’s questions', 'Rework wording to answer what the person is wondering at each step: what’s happening, what comes next, and what they can do if something goes wrong.'],
      ['Hold scaling until the revision tests better', 'Set a clear threshold for what “better” means before expanding.']
    ],
    'investigate-business': [
      ['Restate the problem and the objective', 'Write the problem this solves in one sentence and the institutional goal it serves. If that can’t be stated plainly, the business case will stay weak.'],
      ['Name who must be convinced and what they count', 'Identify the decision-makers (leadership, finance, compliance, program owners) and which measure each would accept as proof.'],
      ['Capture a baseline', 'Record current numbers for the problem (cost, time, error or appeal rates, workload) so any change can be compared.'],
      ['Compare against the current approach', 'Put the new approach next to the existing one on the same measures: cost, risk, defensibility, workload. Include the cost of not changing.'],
      ['Look for value that isn’t being counted', 'Check whether benefits such as risk avoided, trust, or fewer escalations exist but aren’t being measured, before concluding the case is weak.']
    ],
    'proceed-monitor': [
      ['Choose leading indicators', 'Pick one or two per lens to watch: a business measure for ROI, a user pulse for ROV, and maintenance load or incident volume for ROT.'],
      ['List the untested assumptions', 'Mark which of the twelve answers rest on belief rather than data, and schedule a check for the most consequential one.'],
      ['Write reconsideration triggers in advance', 'Agree on what would prompt a pause, such as stalled adoption, rising support contacts, or a change in policy, platform, or staffing.'],
      ['Stage the rollout', 'Expand in phases with a review at each one, rather than all at once.']
    ],
    'pilot-mid': [
      ['Surface the assumptions', 'For each lens, write the one or two beliefs the score depends on. These are what the pilot should test.'],
      ['Define success before piloting', 'Agree on what result would count as go, adjust, or stop. Without it, a pilot can’t settle anything.'],
      ['Design the cheapest test of the shakiest assumption', 'Choose a limited pilot or comparison that could confirm or refute it within a few weeks.'],
      ['Collect qualitative signal alongside numbers', 'Add a few short conversations or open-text responses, since moderate scores often hide a reason that numbers don’t show.']
    ],
    'pause-reframe': [
      ['Pause further investment', 'Hold additional build, rollout, or spend until the problem has been restated.'],
      ['Restate the problem without the solution', 'Write who has the problem, what it costs them, and how they cope today, without naming the solution.'],
      ['Check that it’s worth solving', 'Ask whether the people affected and the organization each treat this as a priority. If neither does, it may be the wrong problem.'],
      ['Mine what the scores say', 'Review where each lens scored lowest. These are the constraints any next idea will need to respect.'],
      ['Draft two or three alternative framings', 'Re-run this framework on each before committing to one.']
    ]
  };

  // One lead-in step when a single lens runs well ahead of the other two.
  var LEAD_STEP = {
    roi: ['Test the business case against real use', 'The metrics may be moving because users or staff are absorbing a cost. Compare outcomes with a small sample of the people affected before extending the case.'],
    rov: ['Turn user enthusiasm into evidence the organization accepts', 'Find the measure that leadership would take seriously (adoption, retention, error reduction, cost avoided) and start collecting it.'],
    rot: ['Check what was built because it was possible', 'List what was built because it was easy to deliver, and test whether each piece answers a stated need.']
  };

  // Follow-ups for a low-rated question, keyed by lens and question index.
  var QUESTION_STEPS = {
    roi: [
      ['Check that the success metrics are the right ones', 'Confirm each metric is tied to the goal, has a baseline, and has had enough time to move.'],
      ['Compare errors and support volume', 'Pull support tickets, error logs, or rework counts from before and after, and compare both volume and type.'],
      ['Time the task before and after', 'Time the task end to end on a small sample, and check whether faster came with lower quality.'],
      ['Draft the case for a skeptical stakeholder', 'Write the one-page case a finance or executive reader would ask for: cost, expected return, risk, and what’s still unknown.']
    ],
    rov: [
      ['Observe where people struggle', 'Watch three to five people do the core task and log each point of hesitation, backtracking, or help-seeking.'],
      ['Audit for uncertainty', 'At each step, check whether it answers “what happens next?” and “what if this goes wrong?” and add the answer where it’s missing.'],
      ['Test the content with the audience', 'Read it with a member of the audience, flag wording that sounds institutional or irrelevant, then rewrite and retest.'],
      ['Replace assumption with user evidence', 'Schedule a round of interviews or a short survey before making further decisions.']
    ],
    rot: [
      ['Document compliance trade-offs', 'Review requirements with their owner and record where a requirement forced a compromise to the experience.'],
      ['Test accessibility on the real task', 'Run the core task with real assistive technology and log the failures that affect it.'],
      ['List what the constraints removed', 'List what was cut or degraded by platform and tooling limits and rank each by user impact.'],
      ['Estimate the maintenance load', 'Estimate ongoing effort (staff hours, upkeep, dependencies) and identify the first thing that breaks at higher volume.']
    ]
  };

  /* ---------- What to test next ---------- */

  var TESTS = {
    'pilot-feasibility': [
      ['The idea works at pilot scale with real staffing and tools.', 'Run a time-boxed pilot in one bounded context. Log the effort per unit of work and every manual workaround.'],
      ['The constraint is fixed rather than negotiable.', 'Ask the owner of the constraint (platform, compliance, IT) what would have to change and what that would cost, separating hard limits from preferences.'],
      ['The value survives at higher volume.', 'Model or simulate 2x and 5x volume and see which part (staffing, tooling, review time) fails first.'],
      ['A reduced version still delivers what matters.', 'Compare a scaled-down version with the full idea using a few users and stakeholders.']
    ],
    'resolve-feasibility': [
      ['A feasible path exists at all.', 'Prototype the riskiest technical piece within a short, fixed timebox.'],
      ['The blocking constraint is what it appears to be.', 'Confirm it with the constraint’s owner, and get the answer in writing.'],
      ['A lower-tech or manual version could deliver the core value.', 'Try a manual or reduced-scope version on a few real cases.']
    ],
    'investigate-user': [
      ['Users experience this as better, not just the organization.', 'Interview 5–8 users or run moderated sessions on the real task. Ask what felt unclear, unfair, or stressful.'],
      ['The metric gains aren’t coming from hidden user effort.', 'Compare completion, error, and drop-off data with support contacts, retries, and workarounds.'],
      ['Clearer content or process changes the experience.', 'Run a side-by-side test of a rewritten version of the highest-friction moment.'],
      ['Different groups experience it the same way.', 'Compare first-time and experienced users, and people using assistive technology or with lower confidence.']
    ],
    'redesign': [
      ['The revised version reduces friction.', 'Run the same task with a few users on both versions and compare hesitation, errors, and confidence.'],
      ['The business gains survive the redesign.', 'Compare the key metrics for the revised version against the current one in a small pilot.'],
      ['The worst moments have been correctly identified.', 'Check support contacts, drop-off points, and user comments to confirm they match the moments being redesigned.']
    ],
    'investigate-business': [
      ['The problem matters to the people who fund or approve it.', 'Ask three to five decision-makers what they’d need to see to support it, and what they’d stop doing to make room.'],
      ['The benefits exist but aren’t being measured.', 'Define two or three measures, capture a baseline, and compare with the existing approach on the same measures.'],
      ['The current approach is actually costing something.', 'Quantify current cost, risk, or rework (time, appeals, escalations) to see how much room for improvement exists.'],
      ['User-reported value converts to measurable behavior.', 'Check whether the value users report appears in adoption, retention, completion, or fewer escalations.']
    ],
    'proceed-monitor': [
      ['Results hold beyond the early or most engaged users.', 'Compare outcomes for later adopters and less engaged groups.'],
      ['Gains persist after novelty fades.', 'Re-measure at 60–90 days using the same measures.'],
      ['The delivery path stays sustainable as use grows.', 'Track maintenance effort and incident volume per unit of use as the rollout expands.'],
      ['Nothing important is hiding behind the strong scores.', 'Identify which answers rested on assumption and verify the most consequential one.']
    ],
    'pilot-mid': [
      ['The lowest-rated lens is the real bottleneck.', 'Aim a small pilot or comparison at that lens first and see whether the overall picture shifts.'],
      ['The moderate scores reflect real limits, not missing information.', 'Find which scores rest on assumption and gather one data point for each.'],
      ['Users will notice a difference.', 'Collect qualitative feedback from a handful of people who used it.'],
      ['The benefit justifies the effort.', 'Estimate the cost to deliver against the expected gain on the same measure.']
    ],
    'pause-reframe': [
      ['The problem is real and matters to the people affected.', 'Interview a few affected people about how they cope today and what it costs them.'],
      ['The problem matters to the organization.', 'Check whether it appears in current goals, budgets, or complaints.'],
      ['A different framing would change the scores.', 'Draft two alternative problem statements and run this framework on each.']
    ]
  };

  var ASSUMED_TEST = {
    roi: ['The ROI score reflects real numbers, not impressions.', 'Pull the actual figures (completion, errors, time on task, cost) for a before/after or comparison group, then rescore ROI with data.'],
    rov: ['The ROV score reflects real user experience, not assumption.', 'Gather direct user evidence through 5–8 short interviews or a three-question survey on clarity, fairness, and confidence, then rescore ROV.'],
    rot: ['The ROT score reflects verified constraints, not guesses.', 'Check the constraints with their owners (compliance, accessibility, platform, IT) and rescore ROT on what they confirm.']
  };

  var MOVE_FOR_LENS = { rot: 'pilot-feasibility', rov: 'investigate-user', roi: 'investigate-business' };

  /* ---------- What evidence would change my mind ---------- */

  var EVIDENCE = {
    'pilot-feasibility': {
      confirm: ['The pilot runs within a reasonable staff-time budget per unit of work.', 'Pilot users and staff report that the value held up under the constraint.', 'The first failure point at higher volume has a plausible fix.'],
      challenge: ['Effort per unit grows faster than the benefit.', 'Constraint owners say the limit is fixed and the reduced version loses the value.', 'Workarounds start to erase what made the idea worthwhile.']
    },
    'resolve-feasibility': {
      confirm: ['A prototype works within the constraint.', 'The constraint owner confirms a path with acceptable cost and time.'],
      challenge: ['The constraint owner says it can’t be done on the current platform or under current compliance rules.', 'The prototype shows the core value is lost in the compliant version.']
    },
    'investigate-user': {
      confirm: ['Interviews show people find it clearer, fairer, or less stressful.', 'Support contacts and retries are flat or falling.', 'Different groups report similar experiences.'],
      challenge: ['Users describe confusion, anxiety, or workarounds.', 'Gains cluster among people who had little choice.', 'Complaints, appeals, or drop-offs rise as volume grows.']
    },
    'redesign': {
      confirm: ['A revised version shows less friction in side-by-side sessions.', 'The business gains hold in the revised version.'],
      challenge: ['The revised version still shows hesitation at the same steps.', 'The gains shrink when friction is reduced, suggesting they depended on it.']
    },
    'investigate-business': {
      confirm: ['A decision-maker names a measure they’d accept, and the pilot moves it.', 'The baseline shows meaningful current cost or risk.', 'User-reported value shows up in behavior.'],
      challenge: ['No decision-maker can name the problem as a priority.', 'The baseline shows the current approach isn’t costing much.', 'Measures stay flat after enough time to show movement.']
    },
    'proceed-monitor': {
      confirm: ['Leading indicators stay steady as use expands.', 'Later adopters see results similar to early ones.', 'Maintenance load per unit stays flat.'],
      challenge: ['Adoption stalls, or support and error volume rises.', 'Policy, platform, or staffing changes shift a constraint.', 'An assumption flagged as untested turns out to be wrong.']
    },
    'pilot-mid': {
      confirm: ['The pilot moves the lowest-rated lens in a measurable way.', 'Answers flagged as assumed hold up when checked.'],
      challenge: ['The pilot shows no change on any lens.', 'Checking the assumptions lowers a score.']
    },
    'pause-reframe': {
      confirm: ['A reframed problem is one that both affected people and the organization prioritize.', 'Re-running the framework on a reframed version lifts at least two lenses.'],
      challenge: ['The people affected say the original problem was right and the solution was the issue.', 'A specific constraint turns out to be removable.']
    }
  };

  /* ---------- Recommended move ---------- */

  // `why` reads the pattern; `action` is the next best step. Patterns where one
  // lens leads swap in their own `why`, so the two halves are kept separate.
  var MOVES = {
    'proceed-monitor': {
      label: 'Proceed, with monitoring',
      why: 'On the evidence entered so far, all three lenses support moving forward.',
      action: 'The next best step is to proceed in stages while setting up what would show whether the picture is changing: leading indicators for each lens, a plan to verify the answers that rest on assumption, and conditions that would prompt reconsideration.'
    },
    'pilot-mid': {
      label: 'Proceed with a small pilot',
      why: 'On the evidence entered so far, no lens is clearly strong or clearly weak, which usually points to untested assumptions rather than a verdict on the idea.',
      action: 'The next best step is a small, time-boxed pilot that tests the shakiest assumption and settles what \u201cworking\u201d would mean before committing further.'
    },
    'pilot-feasibility': {
      label: 'Proceed with a small pilot',
      why: 'On the evidence entered so far, delivery is the weakest lens and the open question.',
      action: 'The next best step is a limited pilot that tests feasibility in a bounded setting and shows where the model strains, before committing to scale.'
    },
    'resolve-feasibility': {
      label: 'Resolve technical feasibility first',
      why: 'On the evidence entered so far, delivery may block the idea outright, so a pilot could be premature.',
      action: 'The next best step is to identify the specific blocking constraint and get a concrete answer on whether a workable path exists, before investing in anything else.'
    },
    'investigate-user': {
      label: 'Investigate user value',
      why: 'On the evidence entered so far, the user experience case is the weakest or least proven of the three.',
      action: 'The next best step is to learn more about user impact before scaling, since gains for the organization may be coming at the user\u2019s expense.'
    },
    'redesign': {
      label: 'Redesign before scaling',
      why: 'On the evidence entered so far, the user experience looks weak, and the rating is backed by real evidence.',
      action: 'The next best step is to redesign the highest-friction parts and re-test before scaling, rather than gathering more proof that the current version has problems.'
    },
    'investigate-business': {
      label: 'Investigate business/institutional value',
      why: 'On the evidence entered so far, the organizational case is the weakest or least clear of the three.',
      action: 'The next best step is to revisit the problem statement, the strategic objective, and the evidence that this solves a problem the organization cares about, before investing more in delivery.'
    },
    'pause-reframe': {
      label: 'Pause and reframe the problem',
      why: 'On the evidence entered so far, none of the three lenses supports the current direction.',
      action: 'The next best step is to pause further investment and reframe the problem, since low scores across the board put the framing of the problem or solution in question more than the execution.'
    }
  };

  /* ---------- Engine ---------- */

  function levelOf(v) { return v >= HIGH ? 'high' : v <= LOW ? 'low' : 'mid'; }

  function pairLabel(a, b, s) { return ABBR[a] + ' (' + s[a] + ') and ' + ABBR[b] + ' (' + s[b] + ')'; }

  function lowQuestions(lensIds, limit, lenses, answers) {
    var list = [];
    lensIds.forEach(function (id) {
      answers[id].forEach(function (a, i) {
        if (a.rating && a.rating <= 3) list.push({ lens: id, index: i, rating: a.rating, note: a.note || '' });
      });
    });
    list.sort(function (x, y) {
      return x.rating - y.rating || ORDER.indexOf(x.lens) - ORDER.indexOf(y.lens) || x.index - y.index;
    });
    return list.slice(0, limit).map(function (q) {
      var def = QUESTION_STEPS[q.lens][q.index];
      var lens = lenses.filter(function (l) { return l.id === q.lens; })[0];
      return {
        title: def[0], detail: def[1],
        source: ABBR[q.lens] + ' question ' + (q.index + 1) + ' (rated ' + q.rating + '/5): “' + lens.questions[q.index] + '”',
        note: q.note
      };
    });
  }

  function analyze(input) {
    var s = input.scores;
    var ev = input.evidence || {};
    var lenses = input.lenses;
    var answers = input.answers;

    var vals = ORDER.map(function (id) { return s[id]; });
    var max = Math.max.apply(null, vals);
    var min = Math.min.apply(null, vals);
    var mean = (vals[0] + vals[1] + vals[2]) / 3;
    var spread = max - min;

    var sorted = ORDER.slice().sort(function (a, b) { return s[b] - s[a] || TIE[b] - TIE[a]; });
    var top = sorted[0], mid = sorted[1], low = sorted[2];
    var g1 = s[top] - s[mid];
    var g2 = s[mid] - s[low];

    // 1. Read the shape.
    var id, leader = null;
    if (min >= HIGH || (spread <= ALIGNED_SPREAD && mean >= HIGH)) id = 'aligned-high';
    else if (max <= LOW || (spread <= ALIGNED_SPREAD && mean <= LOW)) id = 'aligned-low';
    else if (spread <= ALIGNED_SPREAD) id = 'aligned-mid';
    else if (g1 >= 4 && g1 > g2 && s[mid] < HIGH) { id = top + '-leads'; leader = top; } // one lens runs ahead of two that lag
    else id = low + '-trails';                     // otherwise the lowest lens is the one to look at
    var aligned = id.indexOf('aligned') === 0;
    var focus = low;                               // the biggest gap points at the lowest lens
    var secondary = leader ? mid : null;

    // 2. Pick the move.
    var moveId;
    if (id === 'aligned-high') moveId = 'proceed-monitor';
    else if (id === 'aligned-mid') moveId = 'pilot-mid';
    else if (id === 'aligned-low') moveId = 'pause-reframe';
    else if (focus === 'rot') moveId = s.rot <= BLOCKER ? 'resolve-feasibility' : 'pilot-feasibility';
    else if (focus === 'rov') {
      var evidenceRating = answers.rov[3] ? answers.rov[3].rating : 0;
      moveId = ev.rov === 'measured' && evidenceRating >= 3 ? 'redesign' : 'investigate-user';
    } else moveId = 'investigate-business';

    var size = spread >= TENSION_GAP ? 'significant' : spread > ALIGNED_SPREAD ? 'modest' : 'none';
    var leadersMin = Math.min(s[top], s[mid]);

    // 3. Interpretation.
    var ctx = { s: s, low: low, leadersMin: leadersMin, spread: spread };
    var interp = { id: id, title: TITLES[id], paragraphs: interpretation(id, ctx) };

    // 4. Tension.
    var tension = { size: size, gap: spread, hi: top, lo: low };
    tension.headline = ABBR[top] + ' (' + s[top] + ') vs. ' + ABBR[low] + ' (' + s[low] + '): ' +
      (size === 'none' ? 'no meaningful gap' : spread + '-point gap');
    if (leader) {
      tension.structure = 'One lens is well ahead of the other two: ' + ABBR[leader] + ' (' + s[leader] + ') leads, while ' +
        ABBR[mid] + ' (' + s[mid] + ') and ' + ABBR[low] + ' (' + s[low] + ') both lag.';
    } else if (!aligned) {
      var strong = leadersMin >= HIGH;
      tension.structure = strong
        ? 'Two lenses are strong and one is ' + (s[low] <= LOW ? 'weak' : 'weaker') + ': ' + pairLabel(top, mid, s) + ' are strong, while ' + ABBR[low] + ' (' + s[low] + ') trails.'
        : 'Two lenses are ahead of the third: ' + pairLabel(top, mid, s) + ' lead, while ' + ABBR[low] + ' (' + s[low] + ') trails.';
    }
    if (size === 'none') {
      tension.why = 'When the lenses agree, the more useful question shifts from “where is the conflict?” to “what are all three taking for granted?”';
    } else {
      tension.why = PAIR_WHY[top + '-' + low];
    }
    if (size === 'modest') {
      tension.sizeNote = 'The gap is modest, so it’s better read as a hypothesis to check than as a problem to fix.';
    }
    tension.pairs = [['roi', 'rov'], ['roi', 'rot'], ['rov', 'rot']].map(function (p) {
      var gap = Math.abs(s[p[0]] - s[p[1]]);
      var hi = s[p[0]] >= s[p[1]] ? p[0] : p[1];
      return {
        a: p[0], b: p[1], gap: gap, hi: hi, lo: hi === p[0] ? p[1] : p[0],
        size: gap >= TENSION_GAP ? 'significant' : gap > ALIGNED_SPREAD ? 'modest' : 'none'
      };
    });
    tension.assumed = ORDER.filter(function (l) { return ev[l] === 'assumed'; });

    // 5. Steps: pattern steps first, then follow-ups on the lowest-rated questions.
    var patternSteps = (leader ? [LEAD_STEP[leader]] : []).concat(STEPS[moveId]).map(function (p) {
      return { title: p[0], detail: p[1] };
    });
    var qSteps = lowQuestions(aligned ? ORDER : [focus], 2, lenses, answers);
    var patternCount = Math.min(patternSteps.length, 5 - qSteps.length, 4);
    var steps = patternSteps.slice(0, patternCount).concat(qSteps);

    // 6. Tests.
    var tests = [];
    var assumedFirst = tension.assumed.slice().sort(function (a, b) { return (b === focus) - (a === focus); });
    if (assumedFirst.length) tests.push({ assumption: ASSUMED_TEST[assumedFirst[0]][0], test: ASSUMED_TEST[assumedFirst[0]][1], flag: true });
    var base = TESTS[moveId];
    var pool = base.slice();
    if (secondary) {
      var extra = TESTS[MOVE_FOR_LENS[secondary]][0];
      pool.splice(2, 0, extra);
    }
    pool.forEach(function (t) { if (tests.length < 4) tests.push({ assumption: t[0], test: t[1] }); });

    // 7. Move.
    var why = MOVES[moveId].why;
    if (leader) {
      why = 'On the evidence entered so far, only ' + ABBR[leader] + ' is clearly ahead, while ' + ABBR[secondary] + ' and ' + ABBR[focus] + ' both lag.';
    }
    var move = { id: moveId, label: MOVES[moveId].label, paragraphs: [why + ' ' + MOVES[moveId].action] };
    if (leader) {
      move.paragraphs.push('Starting with ' + ABBR[focus] + ', the lowest, and returning to ' + ABBR[secondary] +
        ' afterward would keep both in view.');
    }
    if (ev[focus] === 'assumed' && !aligned) {
      move.paragraphs.push('The ' + ABBR[focus] + ' score rests mostly on assumption, so confirming it is part of the first step.');
    }
    move.revisit = 'Re-run the framework after this step. If the ratings or the evidence behind them move, the recommendation should move too.';

    return {
      pattern: interp, tension: tension, steps: steps, tests: tests,
      evidence: EVIDENCE[moveId], move: move,
      meta: { focus: focus, leader: leader, secondary: secondary, spread: spread, mean: mean, levels: { roi: levelOf(s.roi), rov: levelOf(s.rov), rot: levelOf(s.rot) } }
    };
  }

  var api = { analyze: analyze, ABBR: ABBR, TENSION_GAP: TENSION_GAP, HIGH: HIGH, LOW: LOW };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Guidance = api;
})(typeof window !== 'undefined' ? window : globalThis);
