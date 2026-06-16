"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

interface ContentCheck {
  id: string;
  label: string;
  requirement: string;
}

interface PromptConfig {
  id: string;
  photo_type: string;
  version: number;
  label: string;
  pose_description: string;
  content_checks: ContentCheck[];
  quality_checks: ContentCheck[];
  is_active: boolean;
  created_by: string | null;
  change_notes: string | null;
  created_at: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PromptEditorPage() {
  const params = useParams();
  const photoType = decodeURIComponent(params.photoType as string);

  const [versions, setVersions] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  /* Editable fields */
  const [label, setLabel] = useState("");
  const [poseDescription, setPoseDescription] = useState("");
  const [contentChecks, setContentChecks] = useState<ContentCheck[]>([]);
  const [qualityChecks, setQualityChecks] = useState<ContentCheck[]>([]);
  const [changeNotes, setChangeNotes] = useState("");

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/prompts?photoType=${encodeURIComponent(photoType)}`);
      const data = await res.json();
      const configs = (data.configs ?? []) as PromptConfig[];
      setVersions(configs);

      const active = configs.find((c) => c.is_active) ?? configs[0];
      if (active) {
        loadIntoEditor(active);
        setSelectedVersion(active.id);
      }
    } catch (err) {
      console.error("Failed to load prompt versions:", err);
    } finally {
      setLoading(false);
    }
  }, [photoType]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  function loadIntoEditor(config: PromptConfig) {
    setLabel(config.label);
    setPoseDescription(config.pose_description);
    setContentChecks(config.content_checks.map((c) => ({ ...c })));
    setQualityChecks(
      (config.quality_checks ?? []).map((c) => ({ ...c }))
    );
    setChangeNotes("");
  }

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  /* ── Content check CRUD ── */
  function addContentCheck() {
    const id = `check_${Date.now()}`;
    setContentChecks((prev) => [...prev, { id, label: "", requirement: "" }]);
  }

  function updateContentCheck(index: number, field: "label" | "requirement", value: string) {
    setContentChecks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Auto-generate ID from label if it was auto-generated
      if (field === "label" && next[index].id.startsWith("check_")) {
        next[index].id = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || next[index].id;
      }
      return next;
    });
  }

  function removeContentCheck(index: number) {
    setContentChecks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQualityCheck(index: number, field: "label" | "requirement", value: string) {
    setQualityChecks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  /* ── Save ── */
  async function handleSave() {
    if (!changeNotes.trim()) {
      showToast("Please describe what you changed before saving.", "error");
      return;
    }

    if (!label.trim() || !poseDescription.trim()) {
      showToast("Label and pose description are required.", "error");
      return;
    }

    const validChecks = contentChecks.filter((c) => c.label.trim() && c.requirement.trim());
    if (validChecks.length === 0) {
      showToast("At least one content check is required.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoType,
          label: label.trim(),
          poseDescription: poseDescription.trim(),
          contentChecks: validChecks,
          qualityChecks: qualityChecks.filter((c) => c.label.trim() && c.requirement.trim()),
          changeNotes: changeNotes.trim(),
          createdBy: "Admin", // TODO: pull from auth
        }),
      });

      const data = await res.json();
      if (data.error) {
        showToast(data.error, "error");
      } else {
        showToast(`Saved as version ${data.config.version} — now active.`);
        setChangeNotes("");
        await loadVersions();
      }
    } catch {
      showToast("Failed to save. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ── Restore a previous version ── */
  async function handleRestore(config: PromptConfig) {
    try {
      const res = await fetch("/api/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: config.id, photoType }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, "error");
      } else {
        showToast(`Restored version ${config.version} as active.`);
        loadIntoEditor(config);
        setSelectedVersion(config.id);
        await loadVersions();
      }
    } catch {
      showToast("Failed to restore. Please try again.", "error");
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading prompt editor…</div>;
  }

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "error" ? styles.toastError : styles.toastSuccess}`}>
          {toast.message}
        </div>
      )}

      {/* Back */}
      <Link href="/admin/prompts" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Prompts
      </Link>

      <h1 className={styles.title}>{label || photoType}</h1>
      <p className={styles.subtitle}>Photo type: <code>{photoType}</code></p>

      <div className={styles.columns}>
        {/* Left: Editor */}
        <div className={styles.editorColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Prompt Configuration</div>
            <div className={styles.cardBody}>
              {/* Label */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Display Label</label>
                <input
                  className={styles.input}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., Front View — Teeth Showing"
                />
                <p className={styles.fieldHint}>
                  Shown to patients during the photo capture flow
                </p>
              </div>

              {/* Pose description */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Pose Description</label>
                <textarea
                  className={styles.textarea}
                  value={poseDescription}
                  onChange={(e) => setPoseDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe what the photo should show…"
                />
                <p className={styles.fieldHint}>
                  This tells the AI what to expect in the photo — be specific about angles, positioning, and what&apos;s acceptable
                </p>
              </div>

              {/* Content checks */}
              <div className={styles.field}>
                <div className={styles.fieldLabelRow}>
                  <label className={styles.fieldLabel}>Content Checks</label>
                  <button className={styles.addBtn} onClick={addContentCheck} type="button">
                    + Add Check
                  </button>
                </div>
                <p className={styles.fieldHint}>
                  These validate whether the photo shows the right content (correct angle, teeth visible, etc.)
                </p>

                <div className={styles.checksList}>
                  {contentChecks.map((check, idx) => (
                    <div key={check.id} className={styles.checkEditor}>
                      <div className={styles.checkEditorHeader}>
                        <input
                          className={styles.checkLabelInput}
                          value={check.label}
                          onChange={(e) => updateContentCheck(idx, "label", e.target.value)}
                          placeholder="Check name (e.g., Teeth showing)"
                        />
                        <button
                          className={styles.removeBtn}
                          onClick={() => removeContentCheck(idx)}
                          title="Remove check"
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                      <textarea
                        className={styles.checkReqInput}
                        value={check.requirement}
                        onChange={(e) => updateContentCheck(idx, "requirement", e.target.value)}
                        placeholder="Describe what the AI should check for and when to pass/fail…"
                        rows={3}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quality checks */}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Quality Checks</label>
                <p className={styles.fieldHint}>
                  Standard photo quality checks (blur, lighting, framing, glare). These are shared across all photo types but can be customized per type.
                </p>

                <div className={styles.checksList}>
                  {qualityChecks.map((check, idx) => (
                    <div key={check.id} className={styles.checkEditor}>
                      <div className={styles.checkEditorHeader}>
                        <span className={styles.checkLabelFixed}>{check.label}</span>
                      </div>
                      <textarea
                        className={styles.checkReqInput}
                        value={check.requirement}
                        onChange={(e) => updateQualityCheck(idx, "requirement", e.target.value)}
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Change notes + save */}
              <div className={styles.saveSection}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Change Notes *</label>
                  <textarea
                    className={styles.textarea}
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    rows={2}
                    placeholder="Describe what you changed and why…"
                  />
                </div>
                <button
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Saving…" : "Save as New Version"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Version History */}
        <div className={styles.historyColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Version History</div>
            <div className={styles.historyList}>
              {versions.map((v) => (
                <button
                  key={v.id}
                  className={`${styles.historyItem} ${selectedVersion === v.id ? styles.historyItemSelected : ""}`}
                  onClick={() => {
                    loadIntoEditor(v);
                    setSelectedVersion(v.id);
                  }}
                  type="button"
                >
                  <div className={styles.historyItemHeader}>
                    <span className={styles.historyVersion}>
                      v{v.version}
                      {v.is_active && (
                        <span className={styles.activeBadge}>Active</span>
                      )}
                    </span>
                    <span className={styles.historyDate}>{formatDate(v.created_at)}</span>
                  </div>
                  {v.change_notes && (
                    <p className={styles.historyNotes}>{v.change_notes}</p>
                  )}
                  {v.created_by && (
                    <span className={styles.historyAuthor}>by {v.created_by}</span>
                  )}
                  {!v.is_active && selectedVersion === v.id && (
                    <button
                      className={styles.restoreBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(v);
                      }}
                      type="button"
                    >
                      Restore This Version
                    </button>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
