import type { Team, Prediction, PickType } from "@/types";

function formScore(form?: string): number {
  if (!form) return 0;
  const chars = form.replace(/[,\s]/g, "").toUpperCase().split("").slice(-5);
  const weights = [0.1, 0.15, 0.2, 0.25, 0.3];
  let s = 0;
  chars.forEach((c, i) => {
    const w = weights[i] ?? 0.2;
    if (c === "W") s += w;
    else if (c === "L") s -= w;
  });
  return Math.max(-1, Math.min(1, s * 2));
}

function attackRating(gf: number, played: number) {
  if (played === 0) return 0.5;
  return Math.min(1, (gf / played) / 2.5);
}

function defenceRating(ga: number, played: number) {
  if (played === 0) return 0.5;
  return Math.min(1, (ga / played) / 2.5);
}

function softmax(vals: number[]) {
  const max = Math.max(...vals);
  const exps = vals.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

export function buildPrediction(home: Team, away: Team): Prediction {
  const hForm = formScore(home.form);
  const aForm = formScore(away.form);

  const hPlayed = home.played ?? 0;
  const aPlayed = away.played ?? 0;
  const hGF = home.goalsFor ?? 0;
  const hGA = home.goalsAgainst ?? 0;
  const aGF = away.goalsFor ?? 0;
  const aGA = away.goalsAgainst ?? 0;

  const hAttack  = attackRating(hGF, hPlayed);
  const aAttack  = attackRating(aGF, aPlayed);
  const hDefWeak = defenceRating(hGA, hPlayed);
  const aDefWeak = defenceRating(aGA, aPlayed);

  const posDiff = (home.position && away.position)
    ? Math.max(-1, Math.min(1, (away.position - home.position) / 10))
    : 0;

  let ppgDiff = 0;
  if (hPlayed > 0 && aPlayed > 0 && home.points !== undefined && away.points !== undefined) {
    ppgDiff = Math.max(-1, Math.min(1, (home.points / hPlayed - away.points / aPlayed) / 2));
  }

  const goalDiff = (hAttack - aDefWeak * 0.5) - (aAttack - hDefWeak * 0.5);

  const composite =
    (hForm - aForm) * 0.28 +
    posDiff         * 0.22 +
    goalDiff        * 0.25 +
    ppgDiff         * 0.15 +
    0.05            * 0.10;   // home advantage (5% boost)

  // Win probabilities via softmax
  const [pH, pD, pA] = softmax([
    0.46 + composite * 0.45,
    0.27 - Math.abs(composite) * 0.08,
    0.27 - composite * 0.35,
  ]);

  const homeWinPct = Math.round(pH * 100);
  const drawPct    = Math.round(pD * 100);
  const awayWinPct = 100 - homeWinPct - drawPct;

  // BTTS: both teams need to attack and both defences are shaky
  const hScoreProb = Math.min(0.92, hAttack * 0.7 + (1 - aDefWeak) * 0.3 + 0.3);
  const aScoreProb = Math.min(0.92, aAttack * 0.7 + (1 - hDefWeak) * 0.3 + 0.25);
  const bttsYesPct = Math.round(hScoreProb * aScoreProb * 100);

  // Over 2.5 goals
  const avgGoals = hPlayed > 0 && aPlayed > 0
    ? ((hGF + hGA) / hPlayed + (aGF + aGA) / aPlayed) / 2
    : 2.6;
  const over25Pct = Math.round(Math.min(88, Math.max(25, (avgGoals / 4) * 100)));

  // Over 1.5 goals
  const over15Pct = Math.round(Math.min(94, Math.max(45, over25Pct + 18)));

  // Pick selection: prefer outcome > BTTS > Over2.5 > Over1.5
  // Only use if confidence >= 65%
  let pick: PickType = "HOME";
  let confidence = homeWinPct;

  if (homeWinPct >= awayWinPct && homeWinPct >= drawPct) {
    pick = "HOME"; confidence = homeWinPct;
  } else if (awayWinPct > homeWinPct && awayWinPct >= drawPct) {
    pick = "AWAY"; confidence = awayWinPct;
  } else {
    pick = "DRAW"; confidence = drawPct;
  }

  // If no outcome >= 65%, try BTTS
  if (confidence < 65 && bttsYesPct >= 65) {
    pick = "BTTS_YES"; confidence = bttsYesPct;
  }
  // Then Over 2.5
  if (confidence < 65 && over25Pct >= 65) {
    pick = "OVER25"; confidence = over25Pct;
  }
  // Last resort: Over 1.5 (only if nothing else qualifies)
  if (confidence < 65 && over15Pct >= 65) {
    pick = "OVER15"; confidence = over15Pct;
  }

  // Reasoning
  const reasoning: string[] = [];
  const hF = hForm.toFixed(2);
  const aF = aForm.toFixed(2);

  if (Math.abs(hForm - aForm) > 0.15) {
    reasoning.push(
      `${hForm > aForm ? home.name : away.name} in clearly better recent form (${home.form ?? "—"} vs ${away.form ?? "—"})`
    );
  }

  if (home.position && away.position) {
    const gap = away.position - home.position;
    if (Math.abs(gap) >= 3) {
      reasoning.push(gap > 0
        ? `${home.name} sit ${gap} places higher (${home.position}th vs ${away.position}th)`
        : `${away.name} sit ${Math.abs(gap)} places higher (${away.position}th vs ${home.position}th)`
      );
    } else {
      reasoning.push(`Teams closely matched in standings (${home.position}th vs ${away.position}th)`);
    }
  }

  if (hPlayed >= 5 && aPlayed >= 5) {
    const hAvg = (hGF / hPlayed).toFixed(1);
    const aAvg = (aGF / aPlayed).toFixed(1);
    const hCon = (hGA / hPlayed).toFixed(1);
    const aCon = (aGA / aPlayed).toFixed(1);
    reasoning.push(
      `${home.name}: ${hAvg} goals scored, ${hCon} conceded per game`
    );
    reasoning.push(
      `${away.name}: ${aAvg} goals scored, ${aCon} conceded per game`
    );
  }

  reasoning.push("Home ground advantage (+5% base boost) applied");

  return {
    homeWinPct,
    drawPct,
    awayWinPct,
    bttsYesPct,
    over25Pct,
    over15Pct,
    pick,
    confidence,
    reasoning,
    isTopPick: confidence >= 80,
  };
}

// ── Blend engine prediction with market odds ──────────────────────────────────
// Called after odds are fetched — updates the prediction in place
export function blendWithOdds(
  pred: Prediction,
  oddsHome: number,   // raw decimal odds e.g. 1.85
  oddsDraw: number,
  oddsAway: number
): Prediction {
  // Step 1: Convert decimal odds to implied probabilities
  const rawHome = 1 / oddsHome;
  const rawDraw = 1 / oddsDraw;
  const rawAway = 1 / oddsAway;

  // Step 2: Remove bookmaker vig (margin) so they sum to 100%
  const total = rawHome + rawDraw + rawAway;
  const mktHome = Math.round((rawHome / total) * 100);
  const mktDraw = Math.round((rawDraw / total) * 100);
  const mktAway = 100 - mktHome - mktDraw;

  // Step 3: Weighted blend — engine 65%, market 35%
  const ENGINE_WEIGHT = 0.65;
  const MARKET_WEIGHT = 0.35;

  const blendedHome = Math.round(pred.homeWinPct * ENGINE_WEIGHT + mktHome * MARKET_WEIGHT);
  const blendedDraw = Math.round(pred.drawPct    * ENGINE_WEIGHT + mktDraw * MARKET_WEIGHT);
  const blendedAway = 100 - blendedHome - blendedDraw;

  // Step 4: Determine new pick from blended probabilities
  let newPick: PickType = pred.pick;
  let newConfidence: number;

  if (blendedHome >= blendedAway && blendedHome >= blendedDraw) {
    newPick = "HOME"; newConfidence = blendedHome;
  } else if (blendedAway > blendedHome && blendedAway >= blendedDraw) {
    newPick = "AWAY"; newConfidence = blendedAway;
  } else {
    newPick = "DRAW"; newConfidence = blendedDraw;
  }

  // Step 5: Agreement score — how much engine and market agree on direction
  // High agreement = more reliable prediction
  const engineTopPct = pred.homeWinPct >= pred.awayWinPct && pred.homeWinPct >= pred.drawPct
    ? pred.homeWinPct
    : pred.awayWinPct >= pred.drawPct ? pred.awayWinPct : pred.drawPct;

  const mktTopPct = mktHome >= mktAway && mktHome >= mktDraw
    ? mktHome
    : mktAway >= mktDraw ? mktAway : mktDraw;

  const engineWinner = pred.homeWinPct >= pred.awayWinPct && pred.homeWinPct >= pred.drawPct
    ? "HOME" : pred.awayWinPct >= pred.drawPct ? "AWAY" : "DRAW";

  const mktWinner = mktHome >= mktAway && mktHome >= mktDraw
    ? "HOME" : mktAway >= mktDraw ? "AWAY" : "DRAW";

  // Both agree on winner = full agreement score
  // They disagree = penalise by the probability gap
  const sameWinner = engineWinner === mktWinner;
  const pctGap = Math.abs(engineTopPct - mktTopPct);
  const agreement = sameWinner
    ? Math.round(100 - pctGap * 0.5)   // same winner, small penalty for magnitude diff
    : Math.round(100 - pctGap * 1.5);  // different winner, larger penalty

  // Step 6: Adjust confidence using agreement
  // High agreement: slight boost. Low agreement: significant reduction.
  const agreementFactor = Math.max(0.5, agreement / 100);
  newConfidence = Math.round(newConfidence * agreementFactor);

  // Step 7: Add odds reasoning
  const oddsReasoning = [...pred.reasoning];
  if (sameWinner) {
    oddsReasoning.push(
      `Market odds confirm prediction — bookmakers also favour ${newPick === "HOME" ? "home" : newPick === "AWAY" ? "away" : "draw"} (${mktHome}% / ${mktDraw}% / ${mktAway}%)`
    );
  } else {
    oddsReasoning.push(
      `Market odds diverge from model — bookmakers show ${mktHome}% / ${mktDraw}% / ${mktAway}% vs our ${pred.homeWinPct}% / ${pred.drawPct}% / ${pred.awayWinPct}% — confidence reduced`
    );
  }

  return {
    ...pred,
    homeWinPct:      blendedHome,
    drawPct:         blendedDraw,
    awayWinPct:      blendedAway,
    pick:            newPick,
    confidence:      newConfidence,
    isTopPick:       newConfidence >= 80,
    reasoning:       oddsReasoning,
    oddsHome,
    oddsDraw,
    oddsAway,
    oddsHomePct:     mktHome,
    oddsDrawPct:     mktDraw,
    oddsAwayPct:     mktAway,
    marketAgreement: agreement,
  };
}










/*import type { Team, Prediction, PickType } from "@/types";

function formScore(form?: string): number {
  if (!form) return 0;
  const chars = form.replace(/[,\s]/g, "").toUpperCase().split("").slice(-5);
  const weights = [0.1, 0.15, 0.2, 0.25, 0.3];
  let s = 0;
  chars.forEach((c, i) => {
    const w = weights[i] ?? 0.2;
    if (c === "W") s += w;
    else if (c === "L") s -= w;
  });
  return Math.max(-1, Math.min(1, s * 2));
}

function attackRating(gf: number, played: number) {
  if (played === 0) return 0.5;
  return Math.min(1, (gf / played) / 2.5);
}

function defenceRating(ga: number, played: number) {
  if (played === 0) return 0.5;
  return Math.min(1, (ga / played) / 2.5);
}

function softmax(vals: number[]) {
  const max = Math.max(...vals);
  const exps = vals.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

export function buildPrediction(home: Team, away: Team): Prediction {
  const hForm = formScore(home.form);
  const aForm = formScore(away.form);

  const hPlayed = home.played ?? 0;
  const aPlayed = away.played ?? 0;
  const hGF = home.goalsFor ?? 0;
  const hGA = home.goalsAgainst ?? 0;
  const aGF = away.goalsFor ?? 0;
  const aGA = away.goalsAgainst ?? 0;

  const hAttack  = attackRating(hGF, hPlayed);
  const aAttack  = attackRating(aGF, aPlayed);
  const hDefWeak = defenceRating(hGA, hPlayed);
  const aDefWeak = defenceRating(aGA, aPlayed);

  const posDiff = (home.position && away.position)
    ? Math.max(-1, Math.min(1, (away.position - home.position) / 10))
    : 0;

  let ppgDiff = 0;
  if (hPlayed > 0 && aPlayed > 0 && home.points !== undefined && away.points !== undefined) {
    ppgDiff = Math.max(-1, Math.min(1, (home.points / hPlayed - away.points / aPlayed) / 2));
  }

  const goalDiff = (hAttack - aDefWeak * 0.5) - (aAttack - hDefWeak * 0.5);

  const composite =
    (hForm - aForm) * 0.28 +
    posDiff         * 0.22 +
    goalDiff        * 0.25 +
    ppgDiff         * 0.15 +
    0.15            * 0.10;   // home advantage

  // Win probabilities via softmax
  const [pH, pD, pA] = softmax([
    0.46 + composite * 0.45,
    0.27 - Math.abs(composite) * 0.08,
    0.27 - composite * 0.35,
  ]);

  const homeWinPct = Math.round(pH * 100);
  const drawPct    = Math.round(pD * 100);
  const awayWinPct = 100 - homeWinPct - drawPct;

  // BTTS: both teams need to attack and both defences are shaky
  const hScoreProb = Math.min(0.92, hAttack * 0.7 + (1 - aDefWeak) * 0.3 + 0.3);
  const aScoreProb = Math.min(0.92, aAttack * 0.7 + (1 - hDefWeak) * 0.3 + 0.25);
  const bttsYesPct = Math.round(hScoreProb * aScoreProb * 100);

  // Over 2.5 goals
  const avgGoals = hPlayed > 0 && aPlayed > 0
    ? ((hGF + hGA) / hPlayed + (aGF + aGA) / aPlayed) / 2
    : 2.6;
  const over25Pct = Math.round(Math.min(88, Math.max(25, (avgGoals / 4) * 100)));

  // Over 1.5 goals
  const over15Pct = Math.round(Math.min(94, Math.max(45, over25Pct + 18)));

  // Pick selection: prefer outcome > BTTS > Over2.5 > Over1.5
  // Only use if confidence >= 65%
  let pick: PickType = "HOME";
  let confidence = homeWinPct;

  if (homeWinPct >= awayWinPct && homeWinPct >= drawPct) {
    pick = "HOME"; confidence = homeWinPct;
  } else if (awayWinPct > homeWinPct && awayWinPct >= drawPct) {
    pick = "AWAY"; confidence = awayWinPct;
  } else {
    pick = "DRAW"; confidence = drawPct;
  }

  // If no outcome >= 65%, try BTTS
  if (confidence < 65 && bttsYesPct >= 65) {
    pick = "BTTS_YES"; confidence = bttsYesPct;
  }
  // Then Over 2.5
  if (confidence < 65 && over25Pct >= 65) {
    pick = "OVER25"; confidence = over25Pct;
  }
  // Last resort: Over 1.5 (only if nothing else qualifies)
  if (confidence < 65 && over15Pct >= 65) {
    pick = "OVER15"; confidence = over15Pct;
  }

  // Reasoning
  const reasoning: string[] = [];
  const hF = hForm.toFixed(2);
  const aF = aForm.toFixed(2);

  if (Math.abs(hForm - aForm) > 0.15) {
    reasoning.push(
      `${hForm > aForm ? home.name : away.name} in clearly better recent form (${home.form ?? "—"} vs ${away.form ?? "—"})`
    );
  }

  if (home.position && away.position) {
    const gap = away.position - home.position;
    if (Math.abs(gap) >= 3) {
      reasoning.push(gap > 0
        ? `${home.name} sit ${gap} places higher (${home.position}th vs ${away.position}th)`
        : `${away.name} sit ${Math.abs(gap)} places higher (${away.position}th vs ${home.position}th)`
      );
    } else {
      reasoning.push(`Teams closely matched in standings (${home.position}th vs ${away.position}th)`);
    }
  }

  if (hPlayed >= 5 && aPlayed >= 5) {
    const hAvg = (hGF / hPlayed).toFixed(1);
    const aAvg = (aGF / aPlayed).toFixed(1);
    const hCon = (hGA / hPlayed).toFixed(1);
    const aCon = (aGA / aPlayed).toFixed(1);
    reasoning.push(
      `${home.name}: ${hAvg} goals scored, ${hCon} conceded per game`
    );
    reasoning.push(
      `${away.name}: ${aAvg} goals scored, ${aCon} conceded per game`
    );
  }

  reasoning.push("Home ground advantage (+15% base boost) applied");

  return {
    homeWinPct,
    drawPct,
    awayWinPct,
    bttsYesPct,
    over25Pct,
    over15Pct,
    pick,
    confidence,
    reasoning,
    isTopPick: confidence >= 80,
  };
}

// ── Blend engine prediction with market odds ──────────────────────────────────
// Called after odds are fetched — updates the prediction in place
export function blendWithOdds(
  pred: Prediction,
  oddsHome: number,   // raw decimal odds e.g. 1.85
  oddsDraw: number,
  oddsAway: number
): Prediction {
  // Step 1: Convert decimal odds to implied probabilities
  const rawHome = 1 / oddsHome;
  const rawDraw = 1 / oddsDraw;
  const rawAway = 1 / oddsAway;

  // Step 2: Remove bookmaker vig (margin) so they sum to 100%
  const total = rawHome + rawDraw + rawAway;
  const mktHome = Math.round((rawHome / total) * 100);
  const mktDraw = Math.round((rawDraw / total) * 100);
  const mktAway = 100 - mktHome - mktDraw;

  // Step 3: Weighted blend — engine 65%, market 35%
  const ENGINE_WEIGHT = 0.65;
  const MARKET_WEIGHT = 0.35;

  const blendedHome = Math.round(pred.homeWinPct * ENGINE_WEIGHT + mktHome * MARKET_WEIGHT);
  const blendedDraw = Math.round(pred.drawPct    * ENGINE_WEIGHT + mktDraw * MARKET_WEIGHT);
  const blendedAway = 100 - blendedHome - blendedDraw;

  // Step 4: Determine new pick from blended probabilities
  let newPick: PickType = pred.pick;
  let newConfidence: number;

  if (blendedHome >= blendedAway && blendedHome >= blendedDraw) {
    newPick = "HOME"; newConfidence = blendedHome;
  } else if (blendedAway > blendedHome && blendedAway >= blendedDraw) {
    newPick = "AWAY"; newConfidence = blendedAway;
  } else {
    newPick = "DRAW"; newConfidence = blendedDraw;
  }

  // Step 5: Agreement score — how much engine and market agree on direction
  // High agreement = more reliable prediction
  const engineTopPct = pred.homeWinPct >= pred.awayWinPct && pred.homeWinPct >= pred.drawPct
    ? pred.homeWinPct
    : pred.awayWinPct >= pred.drawPct ? pred.awayWinPct : pred.drawPct;

  const mktTopPct = mktHome >= mktAway && mktHome >= mktDraw
    ? mktHome
    : mktAway >= mktDraw ? mktAway : mktDraw;

  const engineWinner = pred.homeWinPct >= pred.awayWinPct && pred.homeWinPct >= pred.drawPct
    ? "HOME" : pred.awayWinPct >= pred.drawPct ? "AWAY" : "DRAW";

  const mktWinner = mktHome >= mktAway && mktHome >= mktDraw
    ? "HOME" : mktAway >= mktDraw ? "AWAY" : "DRAW";

  // Both agree on winner = full agreement score
  // They disagree = penalise by the probability gap
  const sameWinner = engineWinner === mktWinner;
  const pctGap = Math.abs(engineTopPct - mktTopPct);
  const agreement = sameWinner
    ? Math.round(100 - pctGap * 0.5)   // same winner, small penalty for magnitude diff
    : Math.round(100 - pctGap * 1.5);  // different winner, larger penalty

  // Step 6: Adjust confidence using agreement
  // High agreement: slight boost. Low agreement: significant reduction.
  const agreementFactor = Math.max(0.5, agreement / 100);
  newConfidence = Math.round(newConfidence * agreementFactor);

  // Step 7: Add odds reasoning
  const oddsReasoning = [...pred.reasoning];
  if (sameWinner) {
    oddsReasoning.push(
      `Market odds confirm prediction — bookmakers also favour ${newPick === "HOME" ? "home" : newPick === "AWAY" ? "away" : "draw"} (${mktHome}% / ${mktDraw}% / ${mktAway}%)`
    );
  } else {
    oddsReasoning.push(
      `Market odds diverge from model — bookmakers show ${mktHome}% / ${mktDraw}% / ${mktAway}% vs our ${pred.homeWinPct}% / ${pred.drawPct}% / ${pred.awayWinPct}% — confidence reduced`
    );
  }

  return {
    ...pred,
    homeWinPct:      blendedHome,
    drawPct:         blendedDraw,
    awayWinPct:      blendedAway,
    pick:            newPick,
    confidence:      newConfidence,
    isTopPick:       newConfidence >= 80,
    reasoning:       oddsReasoning,
    oddsHome,
    oddsDraw,
    oddsAway,
    oddsHomePct:     mktHome,
    oddsDrawPct:     mktDraw,
    oddsAwayPct:     mktAway,
    marketAgreement: agreement,
  };
}
*/
