"use client";

/* Screen 5 — complete the required steps. Every issue they picked appears on
   one page, stacked in the spec's order, each with its own heading and steps.
   Photos and the description are always last. The submit button stays locked
   until everything's done, with a count of what's left. */

import { useMemo, useState } from "react";
import type {
  AdjustmentAnswers,
  AdjustmentIssueId,
  AdjustmentPhotos,
  NewAdjustmentRequest,
  Submission,
} from "@/lib/api";
import {
  type AdjustmentProduct,
  BITE,
  CRACKED,
  FIT,
  GUM_SHADE,
  HOT_WATER,
  ISSUE_LABELS,
  ISSUE_ORDER,
  LAST_SECTION,
  LOOSE,
  SORE_SPOTS,
  TOOTH_SHADE,
  fitHasDescribeQuestion,
  fitHasHotWaterReset,
  photoNeedsDaylight,
  photoRequirements,
  soreSpotsHasHotWater,
} from "../../context/adjustmentConfig";
import { HowToModal } from "../HowToModal";
import { PhotoUpload } from "../PhotoUpload";
import { CheckIcon } from "../icons";
import styles from "../adjust.module.css";

interface StepsScreenProps {
  order: Submission;
  product: AdjustmentProduct;
  issues: AdjustmentIssueId[];
  answers: AdjustmentAnswers;
  photos: AdjustmentPhotos;
  description: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (payload: Omit<NewAdjustmentRequest, "submissionId">) => void;
  onCloseOut: () => void;
}

/* Colours and names mirror the intake shade selector (step4) so the tooth/gum
   picker is the same reference the patient saw on the order form. */
const TOOTH_COLORS: Record<string, string> = {
  A1: "#f2ede3",
  A2: "#eae0ce",
  A3: "#ddcdb2",
  A4: "#c9b392",
};
const TOOTH_NAMES: Record<string, string> = {
  A1: "Very Light",
  A2: "Light",
  A3: "Medium",
  A4: "Dark",
};
const GUM_COLORS: Record<string, string> = {
  G1: "#8f5350",
  G2: "#e39c9c",
  G3: "transparent",
};
const GUM_NAMES: Record<string, string> = {
  G1: "Dark",
  G2: "Pink",
  G3: "Clear",
};

export function StepsScreen(props: StepsScreenProps) {
  const { order, product, submitting, error, onSubmit, onCloseOut } = props;

  const [active, setActive] = useState<AdjustmentIssueId[]>(props.issues);
  const [answers, setAnswers] = useState<AdjustmentAnswers>(props.answers);
  const [photos, setPhotos] = useState<AdjustmentPhotos>(props.photos);
  const [description, setDescription] = useState(props.description);
  const [howTo, setHowTo] = useState(false);

  const has = (issue: AdjustmentIssueId) => active.includes(issue);
  const patchAnswers = (patch: Partial<AdjustmentAnswers>) =>
    setAnswers((prev) => ({ ...prev, ...patch }));
  const patchPhoto = (key: keyof AdjustmentPhotos, url: string | undefined) =>
    setPhotos((prev) => ({ ...prev, [key]: url }));

  function removeIssue(issue: AdjustmentIssueId) {
    if (active.length <= 1) return; // at least one has to stay
    setActive((prev) => prev.filter((i) => i !== issue));
  }

  function answerFitReset(fixed: boolean) {
    // "Yes, it fits now" with fit as the only issue closes the whole request out.
    if (fixed && active.length === 1) {
      onCloseOut();
      return;
    }
    patchAnswers({ fitResolvedByHotWater: fixed });
  }

  const daylight = photoNeedsDaylight(active);
  const photoReqs = photoRequirements(active);

  /* The required checklist, recomputed from current answers — its length is the
     total, and how many are truthy is the progress. Order doesn't matter; only
     the count does. */
  const { total, done } = useMemo(() => {
    const reqs: boolean[] = [];

    if (has("sore-spots")) {
      reqs.push(!!answers.woreForFiveDays);
      if (soreSpotsHasHotWater(product)) reqs.push(!!answers.completedHotWaterActivation);
      reqs.push(!!photos.markedModels);
    }
    if (has("loose")) reqs.push(!!answers.looseSnug);
    if (has("fit")) {
      if (fitHasHotWaterReset(product)) reqs.push(answers.fitResolvedByHotWater !== undefined);
      else if (fitHasDescribeQuestion(product)) reqs.push(!!answers.fitDescription);
    }
    if (has("cracked")) {
      reqs.push(!!photos.damage);
      reqs.push(answers.crackedHasAllPieces !== undefined);
    }
    if (has("tooth-shade")) reqs.push(!!answers.newToothShade);
    if (has("gum-shade")) reqs.push(!!answers.newGumShade);

    for (const p of photoReqs) {
      if (!p.required) continue;
      const key = p.id === "in-mouth" ? "inMouth" : p.id === "on-models" ? "onModels" : "biteStrip";
      reqs.push(!!photos[key]);
    }
    reqs.push(description.trim().length > 0);

    return { total: reqs.length, done: reqs.filter(Boolean).length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, answers, photos, description, product]);

  const remaining = total - done;

  function submit() {
    if (remaining > 0 || submitting) return;
    onSubmit({
      product: product.slug,
      issues: active,
      answers,
      photos,
      description: description.trim(),
    });
  }

  /* ── Reusable bits ── */
  function Heading({ issue }: { issue: AdjustmentIssueId }) {
    return (
      <div className={styles.stepHeading}>
        <span>{ISSUE_LABELS[issue]}</span>
        {active.length > 1 && (
          <button type="button" className={styles.removeBtn} onClick={() => removeIssue(issue)}>
            Remove
          </button>
        )}
      </div>
    );
  }

  function CheckRow({
    on,
    label,
    onToggle,
  }: {
    on: boolean;
    label: string;
    onToggle: () => void;
  }) {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={on}
        className={`${styles.checkRow} ${on ? styles.checkRowOn : ""}`}
        onClick={onToggle}
      >
        <span className={styles.checkBox}>{on && <CheckIcon />}</span>
        <span className={styles.checkLabel}>{label}</span>
      </button>
    );
  }

  function Choice({
    options,
    value,
    onPick,
    name,
  }: {
    options: readonly string[];
    value: string | undefined;
    onPick: (v: string) => void;
    name: string;
  }) {
    return (
      <div className={styles.optionList} role="radiogroup" aria-label={name}>
        {options.map((opt) => {
          const activeOpt = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={activeOpt}
              className={`${styles.option} ${activeOpt ? styles.optionSelected : ""}`}
              onClick={() => onPick(opt)}
            >
              <span className={styles.indicator}>{activeOpt && <CheckIcon />}</span>
              <span className={styles.optionBody}>
                <span className={styles.optionTitle}>{opt}</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  function ShadeRow({
    options,
    colors,
    names,
    value,
    onPick,
  }: {
    options: readonly string[];
    colors: Record<string, string>;
    names: Record<string, string>;
    value: string | undefined;
    onPick: (v: string) => void;
  }) {
    return (
      <div className={styles.shadeRow} role="radiogroup" aria-label="Shade">
        {options.map((opt) => {
          const activeOpt = value === opt;
          const clear = colors[opt] === "transparent";
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={activeOpt}
              className={`${styles.shadeCard} ${activeOpt ? styles.shadeCardActive : ""}`}
              onClick={() => onPick(opt)}
            >
              <span
                className={`${styles.shadeChip} ${clear ? styles.shadeChipClear : ""}`}
                style={clear ? undefined : { background: colors[opt] }}
              />
              <span className={styles.shadeCode}>{opt}</span>
              <span className={styles.shadeName}>{names[opt]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className={styles.card}>
        <h1 className={styles.title}>Complete these steps</h1>
        <p className={styles.subtitle}>
          A few things for the lab, then a couple of photos. We&apos;ll unlock submit once
          everything&apos;s done.
        </p>

        {ISSUE_ORDER.filter(has).map((issue) => (
          <div key={issue} className={styles.stepBlock}>
            <Heading issue={issue} />

            {issue === "sore-spots" && (
              <>
                <CheckRow
                  on={!!answers.woreForFiveDays}
                  label={SORE_SPOTS.wearCheckbox}
                  onToggle={() => patchAnswers({ woreForFiveDays: !answers.woreForFiveDays })}
                />
                {soreSpotsHasHotWater(product) && (
                  <>
                    <p className={styles.stepSubheading}>{SORE_SPOTS.hotWaterHeading}</p>
                    <p className={styles.helpText}>{SORE_SPOTS.hotWaterIntro}</p>
                    <p className={styles.helpText}>{HOT_WATER.instructions}</p>
                    <button type="button" className={styles.linkBtn} onClick={() => setHowTo(true)}>
                      {HOT_WATER.helpLink}
                    </button>
                    <CheckRow
                      on={!!answers.completedHotWaterActivation}
                      label={SORE_SPOTS.hotWaterCheckbox}
                      onToggle={() =>
                        patchAnswers({
                          completedHotWaterActivation: !answers.completedHotWaterActivation,
                        })
                      }
                    />
                  </>
                )}
                <p className={styles.stepSubheading}>{SORE_SPOTS.markHeading}</p>
                <p className={styles.helpText}>{SORE_SPOTS.markInstructions}</p>
                <p className={styles.emphasis}>{SORE_SPOTS.markReminder}</p>
                <div className={styles.photoGrid}>
                  <PhotoUpload
                    label={SORE_SPOTS.markUpload}
                    value={photos.markedModels}
                    onChange={(url) => patchPhoto("markedModels", url)}
                  />
                </div>
              </>
            )}

            {issue === "bite" && (
              <>
                <p className={styles.stepSubheading}>{BITE.heading}</p>
                <p className={styles.helpText}>{BITE.instructions}</p>
                <p className={styles.emphasis}>{BITE.leaveMarks}</p>
                <p className={styles.helpText}>{BITE.noStrip}</p>
              </>
            )}

            {issue === "loose" && (
              <>
                <p className={styles.stepSubheading}>{LOOSE.question}</p>
                <Choice
                  options={LOOSE.options}
                  value={answers.looseSnug}
                  onPick={(v) => patchAnswers({ looseSnug: v })}
                  name={LOOSE.question}
                />
              </>
            )}

            {issue === "fit" && (
              <>
                {fitHasHotWaterReset(product) ? (
                  <>
                    <p className={styles.helpText}>{FIT.resetInstructions}</p>
                    <button type="button" className={styles.linkBtn} onClick={() => setHowTo(true)}>
                      {HOT_WATER.helpLink}
                    </button>
                    <p className={styles.stepSubheading}>{FIT.resetQuestion}</p>
                    <Choice
                      options={[FIT.resetYes, FIT.resetNo]}
                      value={
                        answers.fitResolvedByHotWater === undefined
                          ? undefined
                          : answers.fitResolvedByHotWater
                            ? FIT.resetYes
                            : FIT.resetNo
                      }
                      onPick={(v) => answerFitReset(v === FIT.resetYes)}
                      name={FIT.resetQuestion}
                    />
                    {answers.fitResolvedByHotWater === true && (
                      <p className={styles.emphasis}>{FIT.resetResolved}</p>
                    )}
                  </>
                ) : fitHasDescribeQuestion(product) ? (
                  <>
                    <p className={styles.stepSubheading}>{FIT.describeQuestion}</p>
                    <Choice
                      options={FIT.describeOptions}
                      value={answers.fitDescription}
                      onPick={(v) => patchAnswers({ fitDescription: v })}
                      name={FIT.describeQuestion}
                    />
                  </>
                ) : (
                  <p className={styles.helpText}>
                    We&apos;ll take a look at the fit. Add your photos and a description below.
                  </p>
                )}
              </>
            )}

            {issue === "cracked" && (
              <>
                <div className={styles.photoGrid}>
                  <PhotoUpload
                    label={CRACKED.upload}
                    value={photos.damage}
                    onChange={(url) => patchPhoto("damage", url)}
                  />
                </div>
                <p className={styles.stepSubheading}>{CRACKED.question}</p>
                <Choice
                  options={CRACKED.options}
                  value={
                    answers.crackedHasAllPieces === undefined
                      ? undefined
                      : answers.crackedHasAllPieces
                        ? "Yes"
                        : "No"
                  }
                  onPick={(v) => patchAnswers({ crackedHasAllPieces: v === "Yes" })}
                  name={CRACKED.question}
                />
              </>
            )}

            {issue === "aesthetics" && (
              <p className={styles.helpText}>
                Tell us what you&apos;d like to change in the description below. Please add your
                photos in natural daylight so we can read the shade.
              </p>
            )}

            {issue === "tooth-shade" && (
              <>
                <p className={styles.shadeCurrent}>
                  {TOOTH_SHADE.currentLabel} {order.whiteShade ?? "—"}
                </p>
                <p className={styles.stepSubheading}>{TOOTH_SHADE.question}</p>
                <ShadeRow
                  options={TOOTH_SHADE.options}
                  colors={TOOTH_COLORS}
                  names={TOOTH_NAMES}
                  value={answers.newToothShade}
                  onPick={(v) => patchAnswers({ newToothShade: v })}
                />
                <a className={styles.linkBtn} href="/my-order">
                  View your order form
                </a>
              </>
            )}

            {issue === "gum-shade" && (
              <>
                <p className={styles.shadeCurrent}>
                  {GUM_SHADE.currentLabel} {order.gumShade ?? "—"}
                </p>
                <p className={styles.stepSubheading}>{GUM_SHADE.question}</p>
                <ShadeRow
                  options={GUM_SHADE.options}
                  colors={GUM_COLORS}
                  names={GUM_NAMES}
                  value={answers.newGumShade}
                  onPick={(v) => patchAnswers({ newGumShade: v })}
                />
              </>
            )}
          </div>
        ))}

        {/* ── Last section: photos and description ── */}
        <div className={styles.stepBlock}>
          <p className={styles.sectionHeading}>{LAST_SECTION.heading}</p>
          {daylight && <p className={styles.emphasis}>{LAST_SECTION.daylightNote}</p>}

          <div className={styles.photoGrid}>
            {photoReqs.map((req) => {
              const key =
                req.id === "in-mouth" ? "inMouth" : req.id === "on-models" ? "onModels" : "biteStrip";
              return (
                <PhotoUpload
                  key={req.id}
                  label={req.label}
                  value={photos[key]}
                  optional={!req.required}
                  note={req.note}
                  onChange={(url) => patchPhoto(key, url)}
                />
              );
            })}
          </div>

          <div className={styles.blockDivider} />

          <p className={styles.fieldHeading}>{LAST_SECTION.descriptionLabel}</p>
          <p className={styles.helpText}>{LAST_SECTION.descriptionHelp}</p>
          <textarea
            className={styles.textarea}
            rows={4}
            placeholder="Tell us what's wrong…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {error && <p className={styles.errorBanner}>{error}</p>}
      </div>

      <div className={styles.ctaWrap}>
        <button
          type="button"
          className={styles.cta}
          disabled={remaining > 0 || submitting}
          onClick={submit}
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
        {remaining > 0 && (
          <span className={styles.ctaCount}>
            {remaining} {remaining === 1 ? "step" : "steps"} left
          </span>
        )}
      </div>

      <HowToModal open={howTo} onClose={() => setHowTo(false)} />
    </>
  );
}
