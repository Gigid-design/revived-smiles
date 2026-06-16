"use client";

import styles from "./page.module.css";
import { PromptAdvisorChat } from "../components/PromptAdvisorChat";

export default function AdvisorPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>AI Prompt Advisor</h1>
        <p className={styles.subtitle}>
          Chat with the AI to analyze failure patterns, get optimization suggestions, and apply prompt improvements — all in plain language.
        </p>
      </div>
      <div className={styles.chatContainer}>
        <PromptAdvisorChat />
      </div>
    </div>
  );
}
