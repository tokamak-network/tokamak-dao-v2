import type { TraitKey, AgentTraits } from "@/types/agent-profile";
import { callClaude } from "./agent-llm";
import {
  onboardingExtractionPrompt,
  onboardingConversationPrompt,
} from "./agent-prompts";
import { sendTelegramMessage } from "./telegram";
import { agentSupabase } from "./agent-supabase";

interface OnboardingQuestion {
  step: number;
  traitKey: TraitKey;
  question: string;
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    step: 1,
    traitKey: "treasury_philosophy",
    question:
      "DAO 트레저리에 현재 17.5M TON이 있습니다. L2 프로젝트 지원을 위해 5M TON(약 28%)을 사용하자는 안건이 올라왔습니다. 이에 대해 어떻게 생각하시나요?",
  },
  {
    step: 2,
    traitKey: "inflation_tolerance",
    question:
      "네트워크 오퍼레이터를 더 많이 유치하기 위해 시뇨리지율(인플레이션)을 인상하자는 안건이 있습니다. 단기적으로 토큰 가치가 희석될 수 있지만, 네트워크 보안은 강화됩니다. 어떻게 생각하시나요?",
  },
  {
    step: 3,
    traitKey: "governance_accessibility",
    question:
      "현재 안건 생성 비용은 10 TON이고, 제안 문턱은 전체 공급량의 0.25%입니다. 이를 대폭 낮춰서 더 많은 사람이 안건을 제안할 수 있게 하자는 의견이 있습니다. 진입장벽을 낮추는 것에 대해 어떻게 생각하시나요?",
  },
  {
    step: 4,
    traitKey: "security_priority",
    question:
      "보안위원회에 긴급 상황 시 트레저리 동결, 컨트랙트 일시정지 등의 권한을 부여하자는 안건이 있습니다. 보안 강화와 중앙화 리스크 사이에서 어떤 입장이신가요?",
  },
  {
    step: 5,
    traitKey: "expansion_stance",
    question:
      "L2 체인 등록 요건을 대폭 완화해서 더 많은 프로젝트가 빠르게 참여할 수 있게 하자는 안건입니다. 빠른 확장과 품질 관리 사이에서 어떤 방향을 선호하시나요?",
  },
  {
    step: 6,
    traitKey: "skin_in_game",
    question:
      "투표 시 vTON 소각률(burnRate)을 설정하여, 투표에 참여할 때 일정량의 토큰이 소각되게 하자는 의견이 있습니다. 투표의 진정성을 높이지만 참여 비용도 높아집니다. 어떻게 생각하시나요?",
  },
  {
    step: 7,
    traitKey: "delegation_style",
    question:
      "마지막 질문입니다. 에이전트가 당신을 대신해 투표할 때, 어느 정도의 자율성을 부여하고 싶으신가요? (예: 매번 확인 / 가이드라인 내 자율 / 완전 자율)",
  },
];

const TOTAL_STEPS = ONBOARDING_QUESTIONS.length; // 7

/**
 * Send the next onboarding question to the user via Telegram.
 */
export async function sendNextQuestion(
  botToken: string,
  chatId: number,
  step: number
): Promise<void> {
  const question = ONBOARDING_QUESTIONS.find((q) => q.step === step);
  if (!question) return;

  const text = `<b>질문 ${step}/${TOTAL_STEPS}</b>\n\n${question.question}`;
  await sendTelegramMessage(botToken, { chatId, text });
}

/**
 * Handle a user's response during onboarding.
 * Extracts trait score, updates profile, and sends next question or completion summary.
 */
export async function handleOnboardingResponse(
  agentId: number,
  botToken: string,
  chatId: number,
  userMessage: string,
  currentStep: number
): Promise<void> {
  const question = ONBOARDING_QUESTIONS.find((q) => q.step === currentStep);
  if (!question) return;

  // 1. Extract trait score from the response
  let score = 0.5;
  try {
    const extraction = await callClaude({
      system: onboardingExtractionPrompt(question.traitKey),
      messages: [
        { role: "user", content: `질문: ${question.question}\n\n답변: ${userMessage}` },
      ],
      maxTokens: 256,
    });

    const jsonMatch = extraction.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.score === "number") {
        score = Math.max(0, Math.min(1, parsed.score));
      }
    }
  } catch {
    // Use default 0.5 on extraction failure
  }

  // 2. Update the trait in agent_profiles
  const { data: profile } = await agentSupabase
    .from("agent_profiles")
    .select("traits")
    .eq("agent_id", agentId)
    .single();

  const currentTraits: AgentTraits = profile?.traits || {};
  const updatedTraits = { ...currentTraits, [question.traitKey]: score };

  const nextStep = currentStep + 1;
  const isComplete = nextStep > TOTAL_STEPS;

  await agentSupabase
    .from("agent_profiles")
    .update({
      traits: updatedTraits,
      onboarding_step: isComplete ? TOTAL_STEPS + 1 : nextStep,
      ...(isComplete ? { onboarding_completed_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("agent_id", agentId);

  // 3. Save conversation record
  await agentSupabase.from("agent_conversations").insert({
    agent_id: agentId,
    context_type: "onboarding",
    context_id: String(currentStep),
    messages: [
      { role: "assistant", content: question.question },
      { role: "user", content: userMessage },
    ],
    trait_deltas: { [question.traitKey]: score },
  });

  // 4. Send acknowledgment and next question or completion
  if (isComplete) {
    // Generate profile summary
    let summary: string;
    try {
      summary = await callClaude({
        system: onboardingConversationPrompt(),
        messages: [
          {
            role: "user",
            content: `사용자의 거버넌스 프로필이 완성되었습니다. 다음 프로필 점수를 바탕으로 간단한 요약을 작성해주세요:\n${JSON.stringify(updatedTraits, null, 2)}`,
          },
        ],
        maxTokens: 512,
      });
    } catch {
      summary = "프로필이 완성되었습니다!";
    }

    await sendTelegramMessage(botToken, {
      chatId,
      text: `<b>프로파일링 완료!</b>\n\n${summary}\n\n새로운 안건이 올라오면 이 프로필을 바탕으로 맞춤형 분석을 제공해 드리겠습니다.`,
    });
  } else {
    // Send brief acknowledgment + next question
    try {
      const ack = await callClaude({
        system: onboardingConversationPrompt(),
        messages: [
          { role: "user", content: userMessage },
        ],
        maxTokens: 128,
      });
      await sendTelegramMessage(botToken, { chatId, text: ack });
    } catch {
      // Skip acknowledgment on failure
    }

    await sendNextQuestion(botToken, chatId, nextStep);
  }
}
