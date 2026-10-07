"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export interface FAQItem {
    question: string;
    answer: string;
}

interface FaqSectionsProps {
    faqs?: FAQItem[];
    eyebrow?: string;
    title?: string;
    description?: string;
}

const defaultFaqs: FAQItem[] = [
    {
        question: "What is PromptShield?",
        answer: "PromptShield is an AI security gateway that analyzes prompts before they reach an LLM, detects suspicious behavior, explains risk, and enforces allow, warn, sanitize, or block decisions.",
    },
    {
        question: "What is prompt injection?",
        answer: "Prompt injection is an attack where malicious instructions are inserted into a prompt to manipulate an AI system into ignoring its intended rules, revealing sensitive information, or performing unintended actions.",
    },
    {
        question: "How does PromptShield detect attacks?",
        answer: "PromptShield analyzes prompts for malicious intent, suspicious patterns, policy violations, and known attack techniques before allowing them to reach the target AI model.",
    },
    {
        question: "What happens when a prompt is blocked?",
        answer: "PromptShield prevents the unsafe request from reaching the LLM and records an explainable security decision so the application can understand why the request was blocked.",
    },
    {
        question: "Can PromptShield sanitize prompts?",
        answer: "Yes. PromptShield can sanitize potentially unsafe content when appropriate instead of completely blocking the request, allowing safer input to continue through the AI pipeline.",
    },
    {
        question: "What does the risk score represent?",
        answer: "The risk score represents the estimated security risk associated with a prompt based on detected threats, suspicious behavior, and policy violations.",
    },
    {
        question: "Can PromptShield work with different LLM providers?",
        answer: "Yes. PromptShield is designed as an AI security gateway and can sit between applications and different LLM providers without requiring the application to be tied to a single model provider.",
    },
    {
        question: "Does PromptShield store prompts?",
        answer: "PromptShield should follow the application's configured privacy and logging policies. Prompt content should only be retained when required by the configured security, debugging, or analytics workflow.",
    },
    {
        question: "Can PromptShield be integrated into an existing AI application?",
        answer: "Yes. PromptShield is designed to integrate between an existing application and its AI/LLM provider, allowing security analysis and policy enforcement without rebuilding the application's core AI functionality.",
    },
];

export default function FaqSections({
    faqs,
    eyebrow = "FAQS",
    title = "Everything you need to know about PromptShield",
    description = "Can't find what you're looking for? Reach out to our security team for assistance. →",
}: FaqSectionsProps) {
    const [openIndex, setOpenIndex] = useState<number>(0);
    const data = faqs ?? defaultFaqs;

    return (
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] lg:gap-8 xl:gap-10 lg:px-8">
            <div className="overflow-hidden rounded-[28px] border border-border bg-surface">
                <div className="p-6 sm:p-7 lg:p-8">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
                    <h2 className="mt-3 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[30px] lg:text-[32px]">
                        {title}
                    </h2>
                    <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
                        {description.split("security team")[0]}
                        <span className="font-semibold text-foreground">security team</span>
                        {description.includes("security team") ? description.split("security team")[1] : ""}
                    </p>
                </div>
                <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                    <div className="overflow-hidden rounded-2xl border border-border bg-surface-subtle">
                        <img
                            src="/faq-workspace.svg"
                            alt="Minimal workspace preview"
                            width={640}
                            height={420}
                            className="h-auto w-full object-cover"
                            loading="lazy"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {data.map((faq, index) => {
                    const isOpen = openIndex === index;
                    return (
                        <div
                            key={faq.question}
                            className="overflow-hidden rounded-2xl border border-border bg-surface text-left"
                        >
                            <button
                                type="button"
                                aria-expanded={isOpen}
                                onClick={() => setOpenIndex(isOpen ? -1 : index)}
                                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                            >
                                <span className="min-w-0 flex-1 text-[15px] font-medium leading-6 text-foreground sm:text-base">
                                    {faq.question}
                                </span>
                                <span
                                    aria-hidden="true"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle text-muted-foreground"
                                >
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
                                    />
                                </span>
                            </button>
                            <div
                                className={`grid transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                            >
                                <div className="overflow-hidden">
                                    <p className="px-5 pb-5 pt-0 text-sm leading-7 text-muted-foreground sm:px-6">{faq.answer}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
