# Security Council Intervention Models: Veto/Cancel vs Council-Only Execute

## 1. 모델 정의

### Model A: Veto/Cancel (현행 방식)

Security Council이 타임락 기간 중 제안을 **취소(cancel) 또는 거부(veto)** 할 수 있지만, 통과된 제안의 **실행(execute)은 누구나** 할 수 있다. 카운슬은 방어적 안전장치로만 기능하며, 차단만 가능하고 주도적으로 실행할 수 없다.

### Model B: Council-Only Execute (대안)

통과된 제안을 **Security Council만 실행**할 수 있다. 카운슬이 모든 거버넌스 액션의 필수 게이트키퍼 역할을 한다.

---

## 2. Tokamak DAO v2 현행 구조

현재 Tokamak DAO v2는 **Model A (Veto/Cancel)** 를 채택하고 있다.

```
제안 생성 → 투표 (7일) → 타임락 대기 (7일) → 실행 (14일 유예)
                                    ↑
                          Security Council 개입 가능 구간
                          (취소/거부만 가능, 실행 불가)
```

**Security Council 권한 (2-of-3 멀티시그):**

| 개입 유형 | 메커니즘 | 승인 필요 | 속도 |
|-----------|----------|-----------|------|
| 제안 취소 (Guardian) | `DAOGovernor.cancel()` 직접 호출 | 없음 (즉시) | 즉시 |
| 제안 취소 (Emergency) | Emergency Action → cancel | 2/3 승인 | ~2 tx |
| 타임락 거래 취소 | `Timelock.cancelTransaction()` | 없음 | 즉시 |
| 프로토콜 일시정지 | Emergency Action → pause | 2/3 승인 | ~2 tx |

**핵심 특성:**
- 카운슬은 차단만 가능, 제안 생성/실행 불가
- 통과된 제안은 타임락 이후 누구나 실행 가능
- 카운슬 멤버 변경은 DAO 거버넌스를 통해서만 가능

---

## 3. 주요 DAO 사례 비교

### Model A 채택 DAO

| DAO | 메커니즘 | 특이사항 |
|-----|----------|----------|
| **Nouns DAO** | Vetoer 역할 | 재단이 거부권 보유, 성숙 시 포기 예정 |
| **ENS DAO** | 4-of-8 멀티시그, 취소 전용 | 2년 후 자동 만료되어 누구나 취소 권한 비활성화 가능 |
| **Compound** | Guardian 역할 | Proposal 289 사건에서 거부 메커니즘 부족 노출 |
| **Aave** | Guardian 멀티시그 (5-of-10) | 타임락 후 누구나 `executePayload()` 호출 가능 |
| **Uniswap** | Guardian 취소 | 2일 타임락 후 실행은 퍼미션리스 |
| **MakerDAO** | GSM + Emergency Shutdown | 50,000 MKR 예치로 집단적 거부 가능 |
| **Lido** | Dual Governance (동적 타임락) | stETH 홀더가 에스크로에 예치하여 거부권 행사, 고정 카운슬 없음 |

### Model B 채택 DAO

| DAO | 메커니즘 | 특이사항 |
|-----|----------|----------|
| **Optimism** | 2/2 멀티시그 (재단 + 카운슬) | 프로토콜 업그레이드에 카운슬 서명 필수 |
| **Arbitrum** (업그레이드 경로) | Upgrade Executor 접근 제한 | 카운슬 멀티시그 + L1 타임락만 실행 가능, 긴급 시 9-of-12로 타임락 우회 |
| **Taiko** | Optimistic + 카운슬 제안 | 카운슬만 제안 가능, 토큰 홀더가 거부 기간 보유 |

### 하이브리드 접근

| DAO | 구조 |
|-----|------|
| **Arbitrum** | 일반 거버넌스 = Model A (누구나 실행), 프로토콜 업그레이드 = Model B (카운슬만 실행) |
| **Optimism** | 토큰 할당 = 자동 실행, 프로토콜 업그레이드 = Model B |
| **ENS** | Model A + 2년 자동 만료 (시간 제한적 중앙화) |

---

## 4. 장단점 비교 분석

### 4.1 보안 (Attack Resistance)

| 항목 | Model A (Veto/Cancel) | Model B (Council-Only Execute) |
|------|----------------------|-------------------------------|
| 악의적 제안 방어 | 카운슬이 타임락 내 취소 필요. 느린 대응 시 실행될 수 있음 | 카운슬이 실행하지 않으면 절대 실행 불가. **절대적 방어** |
| 플래시론 공격 | 타임락으로 1차 방어, 카운슬 취소로 2차 방어 | 타임락 + 카운슬 실행 거부로 이중 방어 |
| 카운슬 자체 리스크 | 카운슬 키 탈취 시 제안 취소만 가능 (공격적 사용 불가) | 카운슬 키 탈취 시 **악의적 실행 가능** (치명적) |
| 결론 | 거버넌스 공격 방어에 약간 취약 | 거버넌스 공격 방어에 강하지만, 카운슬 자체가 공격 표면 |

### 4.2 검열 저항성 (Censorship Resistance)

| 항목 | Model A | Model B |
|------|---------|---------|
| 정당한 제안 실행 보장 | 카운슬 동의 불필요, 누구나 실행 가능. **검열 불가** | 카운슬이 실행을 거부하면 정당한 제안도 차단. **검열 가능** |
| 카운슬 포획 시 | 정당한 제안은 여전히 실행 가능 | 거버넌스 전체가 정지 가능 |
| 결론 | **우수** | 취약 |

### 4.3 활성도 (Liveness)

| 항목 | Model A | Model B |
|------|---------|---------|
| 카운슬 오프라인 시 | 거버넌스 정상 작동, 안전장치만 부재 | **거버넌스 완전 정지** |
| 카운슬 부담 | 낮음 — 문제 발생 시에만 개입 | 높음 — 모든 제안에 대해 적극적 참여 필요 |
| 키 분실/법적 압력 시 | 시스템 계속 작동 | 시스템 중단 |
| 결론 | **우수** | 취약 (높은 가용성 요구) |

### 4.4 탈중앙화

| 항목 | Model A | Model B |
|------|---------|---------|
| 단일 장애점 (SPOF) | 카운슬은 보안의 SPOF이나 활성도의 SPOF는 아님 | 카운슬이 **보안과 활성도 모두의 SPOF** |
| 신뢰 가정 | 카운슬이 모니터링하고 악의적 제안을 식별/취소할 것 | 위 + 정당한 제안을 검열하지 않고, 항상 운영 가능할 것 |
| L2Beat Stage 2 기준 | Stage 2로의 진전이 용이 (카운슬 권한이 이미 제한적) | Stage 2 달성이 어려움 (카운슬 의존도가 높음) |
| 결론 | 더 탈중앙화됨 | 중앙화 리스크 높음 |

### 4.5 운영

| 항목 | Model A | Model B |
|------|---------|---------|
| 가스 비용 | 카운슬은 거부 시에만 가스 지불 (드문 경우) | 모든 실행에 가스 지불 |
| UX | 제안자가 직접 실행 가능, 셀프서비스 | 카운슬 조율 대기 필요 |
| 운영 복잡도 | 낮음 — 모니터링 후 필요 시 개입 | 높음 — 키 관리, 서명 세레모니, 매 제안 조율 |
| 실패 모드 | 조용함 — 카운슬이 놓치면 악의적 제안 실행 | 가시적 — 카운슬 부재 시 거버넌스 정지 |

---

## 5. 역사적 사례

### Compound Proposal 289 (2024.7) — Model A 실패 사례

"Humpy"로 알려진 고래가 499,000 COMP (~$24M)을 자신이 통제하는 "goldCOMP" 볼트에 할당하는 제안을 통과시켰다. Compound의 Guardian 메커니즘이 이를 충분히 방어하지 못했으며, 최종적으로 오프체인 협상을 통해 해결되었다. **카운슬의 거부 권한이 불충분했던 사례.**

> Model B였다면 카운슬이 단순히 실행을 거부하여 차단 가능했다.

### Beanstalk (2022.4) — 카운슬 부재 사례

플래시론으로 79% 투표권을 획득하여 $181M을 탈취. Security Council 자체가 없었다. **어떤 모델이든 카운슬의 존재 자체가 중요했던 사례.**

### Mango Markets (2022.10) — 자기 거버넌스 공격

공격자가 탈취한 토큰으로 자신의 면책을 위한 제안에 투표. 거부권이 있었다면 차단 가능했다.

### Nouns DAO Fork (2023.9) — 거부권의 한계

거부권으로 악의적 제안은 방어 가능했으나, fork 메커니즘을 통한 경제적 차익 거래($27M 트레저리 유출)는 방어 불가. **거부권은 규칙 내 행동까지 막을 수 없다.**

### Arbitrum Security Council Emergency (2024-2025)

9-of-12 긴급 권한으로 ArbOS 32 업그레이드 등을 신속 실행. 투명성 보고서와 함께 공개. **Model B의 긴급 대응 능력을 보여준 사례.**

---

## 6. 학술/커뮤니티 연구

| 출처 | 핵심 인사이트 |
|------|--------------|
| **a16z** "DAO Governance Attacks" | 개방적 탈중앙화와 거버넌스 보안 사이에 근본적 트레이드오프 존재 |
| **Vitalik Buterin** "Stages Analysis" (2025.5) | L2는 최소 Stage 1에 도달해야 하며, 카운슬 권한은 점진적으로 축소되어야 함 |
| **Aragon** Optimistic Dual Governance | 카운슬 제안 + 커뮤니티 거부권 조합이 UX와 보안 모두 개선 |
| **IEEE** "Security Issues in DAO Governance" (2025) | DAO 거버넌스 프로세스의 보안 취약점 체계적 분류 |
| **Hybrid-DAOs Paper** (2024) | 중앙화/탈중앙화 혼합 거버넌스가 확장성과 규정 준수에 유리 |

---

## 7. 결론 및 제안

### 핵심 트레이드오프 요약

```
           보안 강도 →
     ┌─────────────────────────┐
     │                         │
활   │  Model A (Veto)    Hybrid│
성   │  ■ 높은 활성도      ■     │
도   │  ■ 검열 저항        ■     │
/    │                         │
탈   │              Model B    │
중   │              ■ 낮은 활성도│
앙   │              ■ 검열 위험 │
화   │                         │
 ↓   └─────────────────────────┘
```

### 분석

**Model A (현행 Veto/Cancel)** 는 검열 저항성, 활성도, 탈중앙화 측면에서 우월하다. 그러나 Compound Proposal 289 사례처럼, 카운슬이 대응이 느리거나 거버넌스 공격이 정교한 경우 방어에 실패할 수 있다.

**Model B (Council-Only Execute)** 는 거버넌스 공격에 대해 절대적 방어를 제공하지만, 검열 가능성과 활성도 의존성이라는 심각한 단점을 수반한다. 카운슬 자체가 보안과 활성도 모두의 단일 장애점이 된다.

### 권장 방향: 하이브리드 접근

2024-2025년 DAO 거버넌스의 뚜렷한 추세는 **하이브리드 모델**이다. Arbitrum이 대표적이며, 작업 유형에 따라 다른 모델을 적용한다:

| 작업 유형 | 권장 모델 | 근거 |
|-----------|-----------|------|
| **일반 거버넌스** (파라미터 변경, 트레저리 지출) | Model A (Veto/Cancel) | 검열 저항, 활성도 보장, 낮은 운영 부담 |
| **프로토콜 업그레이드** (컨트랙트 업그레이드, 핵심 파라미터) | Model B 또는 하이브리드 | 고위험 변경에 대한 추가 안전장치 |
| **긴급 대응** (보안 취약점, 익스플로잇) | Model B (카운슬 긴급 실행) | 빠른 대응 필요, 이미 현행 구조에서 지원 |

Tokamak DAO v2의 현행 Model A는 견고한 기반을 제공하며, ENS DAO의 시간 제한적 접근과 Arbitrum의 이중 트랙 모델에서 영감을 얻어 점진적으로 개선할 수 있다.

---

## 참고 자료

- [Arbitrum Security Council Conceptual Overview](https://docs.arbitrum.foundation/concepts/security-council)
- [Arbitrum Governance Overview (GitHub)](https://github.com/ArbitrumFoundation/governance/blob/main/docs/overview.md)
- [ENS DAO Security Council Documentation](https://docs.ens.domains/dao/security-council/)
- [Optimism Security Council Introduction](https://optimism.mirror.xyz/f20gj4Mv3DWdqQEduk5J85VVN254SaQtP0zV_v-8IYs)
- [Compound GovernorBravo (GitHub)](https://github.com/compound-finance/compound-protocol)
- [Aave Governance Documentation](https://aave.com/docs/ecosystem/governance)
- [Lido Dual Governance 101](https://blog.lido.fi/dual-governance-101-explainer/)
- [Taiko Optimistic Governance (Aragon)](https://blog.aragon.org/introducing-taikos-optimistic-onchain-governance/)
- [L2Beat Stages Framework](https://l2beat.com/stages)
- [Vitalik Buterin: Stages Analysis (2025)](https://vitalik.eth.limo/general/2025/05/06/stages.html)
- [a16z: DAO Governance Attacks](https://a16zcrypto.com/posts/article/dao-governance-attacks-and-how-to-avoid-them/)
- [Compound Proposal 289 Incident (CoinDesk)](https://www.coindesk.com/markets/2024/07/29/comp-down-67-after-supposed-governance-attack-on-compound-dao)
- [Nouns DAO Fork (CoinDesk)](https://www.coindesk.com/business/2023/09/21/nouns-daos-27m-revolt-reveals-toxic-mix-of-money-hungry-traders-and-blockchain-idealists)
