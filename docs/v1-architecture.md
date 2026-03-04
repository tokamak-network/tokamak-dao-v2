# Tokamak DAO V1 Contract Architecture

## 1. 전체 시스템 구조

```mermaid
graph TB
    subgraph Users["사용자"]
        EOA["EOA (일반 사용자)"]
        L2OP["L2 Operator"]
    end

    subgraph Proxy["진입점"]
        DCP["DAOCommitteeProxy<br/><code>0xDD9f...C26</code><br/>━━━━━━━━━━━━━━<br/>모든 호출의 단일 진입점<br/>Storage 보유 (delegatecall)"]
    end

    subgraph Implementation["구현체 (Logic)"]
        DC["DAOCommittee<br/><code>0xd1A3...b8e6</code><br/>(base impl)"]
        DCV1["DAOCommittee_V1<br/><code>0xdF2e...815</code><br/>(최신 impl)"]
    end

    subgraph Core["핵심 모듈"]
        DAM["DAOAgendaManager<br/><code>0xcD44...484</code><br/>━━━━━━━━━━━━━━<br/>안건 저장/관리<br/>투표 기록<br/>실행 정보"]
        DV["DAOVault<br/><code>0x2520...303</code><br/>━━━━━━━━━━━━━━<br/>TON/WTON 트레저리<br/>활동 보상 지급<br/>TON↔WTON 자동 교환"]
    end

    subgraph Candidate_System["후보자 시스템"]
        CF["CandidateFactory<br/><code>0xc5eb...3ffb</code><br/>━━━━━━━━━━━━━━<br/>Candidate 컨트랙트 배포"]
        C1["Candidate #1<br/>(per operator)"]
        C2["Candidate #2<br/>(per operator)"]
        CN["Candidate #N<br/>(per operator)"]
    end

    subgraph Staking["스테이킹 인프라"]
        SM["SeigManager<br/><code>0x7109...909</code><br/>━━━━━━━━━━━━━━<br/>시뇨리지 분배<br/>Coinage 토큰 관리<br/>스테이킹 잔액 조회"]
        L2R["Layer2Registry<br/><code>0x0b3E...63e</code><br/>━━━━━━━━━━━━━━<br/>L2 체인 등록소"]
        DM["DepositManager<br/>━━━━━━━━━━━━━━<br/>WTON 예치/출금"]
    end

    subgraph Admin["관리자"]
        DCO["DAOCommitteeOwner<br/><code>0xe070...f44</code><br/>━━━━━━━━━━━━━━<br/>거버넌스 없이 직접 설정<br/>(sudo 컨트랙트)"]
    end

    subgraph Tokens["토큰"]
        TON["TON<br/><code>0x2be5...3C5</code>"]
        WTON["WTON<br/><code>0xc4A1...bff2</code>"]
    end

    EOA -->|"createCandidate()"| DCP
    L2OP -->|"registerLayer2Candidate()"| DCP
    EOA -->|"TON.approveAndCall()"| DCP
    DCP -.->|"delegatecall"| DCV1
    DC -.->|"upgraded to"| DCV1
    DCV1 -->|"newAgenda()"| DAM
    DCV1 -->|"claimTON()"| DV
    DCV1 -->|"deploy()"| CF
    CF -->|"new"| C1
    CF -->|"new"| C2
    CF -->|"new"| CN
    C1 -->|"castVote()<br/>changeMember()"| DCP
    C2 -->|"castVote()<br/>changeMember()"| DCP
    DCV1 -->|"registerAndDeployCoinage()"| L2R
    SM -->|"coinages(layer2)"| C1
    DM -->|"onDeposit()"| SM
    DCO -->|"직접 설정 변경"| DCP
    DV -->|"보상 지급"| TON
    EOA -->|"deposit(WTON)"| DM
    TON -->|"수수료 소각"| DCP

    style DCP fill:#4A90D9,stroke:#2C5F8A,color:#fff
    style DCV1 fill:#7B68EE,stroke:#5B48CE,color:#fff
    style DAM fill:#E8A838,stroke:#C88818,color:#fff
    style DV fill:#50C878,stroke:#30A858,color:#fff
    style CF fill:#FF6B6B,stroke:#DD4B4B,color:#fff
    style SM fill:#DDA0DD,stroke:#BB80BB,color:#333
    style DCO fill:#FF4444,stroke:#CC2222,color:#fff
```

## 2. 상속 구조

```mermaid
graph BT
    SSC["StorageStateCommittee<br/>━━━━━━━━━━━━━━<br/>ton, daoVault, agendaManager<br/>candidateFactory, seigManager<br/>layer2Registry<br/>candidates[], members[]<br/>maxMember, quorum<br/>_candidateInfos mapping<br/>activityRewardPerSecond"]

    ISSC["IStorageStateCommittee<br/>━━━━━━━━━━━━━━<br/>CandidateInfo struct"]

    AC["AccessControl<br/>(OpenZeppelin)"]

    DCP["DAOCommitteeProxy<br/>━━━━━━━━━━━━━━<br/>_implementation<br/>pauseProxy<br/>fallback() → delegatecall"]

    DC["DAOCommittee<br/>━━━━━━━━━━━━━━<br/>거버넌스 로직 전체"]

    DCV1["DAOCommittee_V1<br/>━━━━━━━━━━━━━━<br/>+ _oldCandidateInfos<br/>+ createCandidate(memo, operator)<br/>+ setBurntAmountAtDAO"]

    SSC -->|"inherits"| ISSC
    DCP -->|"inherits"| SSC
    DCP -->|"inherits"| AC
    DC -->|"inherits"| SSC
    DC -->|"inherits"| AC
    DCV1 -->|"extends"| DC

    style SSC fill:#FFD700,stroke:#DAA520,color:#333
    style DCP fill:#4A90D9,stroke:#2C5F8A,color:#fff
    style DC fill:#9370DB,stroke:#7350BB,color:#fff
    style DCV1 fill:#7B68EE,stroke:#5B48CE,color:#fff
```

## 3. 안건(Agenda) 라이프사이클

```mermaid
stateDiagram-v2
    [*] --> NOTICE : approveAndCall() - 100 TON 소각

    NOTICE --> VOTING : castVote() 호출 (공지 16일 후)

    VOTING --> WAITING_EXEC : YES ≥ quorum (ACCEPT)
    VOTING --> ENDED_REJECT : NO ≥ maxMember-quorum+1 (REJECT)
    VOTING --> ENDED_DISMISS : 투표 기간 만료 (DISMISS)

    WAITING_EXEC --> EXECUTED : executeAgenda() (7일 이내)
    WAITING_EXEC --> ENDED_EXPIRED : 실행 기한 초과

    state ENDED_REJECT {
        [*] --> Rejected
    }
    state ENDED_DISMISS {
        [*] --> Dismissed
    }
    state ENDED_EXPIRED {
        [*] --> Expired
    }
```

## 4. 스테이킹 → 거버넌스 연결

```mermaid
flowchart LR
    subgraph Staking["스테이킹 레이어"]
        A["사용자 WTON 예치"] --> B["DepositManager"]
        B -->|"onDeposit()"| C["SeigManager"]
        C -->|"mint"| D["Coinage Token<br/>(per Layer2)"]
        D -->|"factor 자동 증가<br/>(시뇨리지 복리)"| D
    end

    subgraph Governance["거버넌스 레이어"]
        E["Candidate Contract"]
        F["changeMember(slot)"]
        G["Committee Member<br/>(1인 1표)"]
        H["castVote()"]
    end

    D -->|"totalStaked() =<br/>coinage.totalSupply()"| E
    E -->|"totalStaked > 현 멤버"| F
    F -->|"성공 시"| G
    G --> H

    style A fill:#87CEEB,stroke:#5BA3CF,color:#333
    style D fill:#DDA0DD,stroke:#BB80BB,color:#333
    style G fill:#50C878,stroke:#30A858,color:#fff
```

## 5. 안건 생성 상세 흐름

```mermaid
sequenceDiagram
    participant User as 사용자
    participant TON as TON Token
    participant DCP as DAOCommitteeProxy
    participant DC as DAOCommittee_V1
    participant DAM as DAOAgendaManager

    User->>TON: approveAndCall(proxy, 100 TON, data)
    TON->>DCP: onApprove(owner, spender, 100 TON, data)
    DCP->>DC: delegatecall → onApprove()

    Note over DC: data 디코딩:<br/>(targets[], noticePeriod,<br/>votingPeriod, atomicExecute,<br/>functionBytecodes[])

    Note over DC: 보안 필터:<br/>claimTON/claimWTON/claimERC20<br/>셀렉터 차단

    DC->>DC: payCreatingAgendaFee()<br/>100 TON → address(1) 소각
    DC->>DAM: newAgenda(targets, notice, voting, atomic, bytecodes)
    DAM-->>DC: agendaID 반환

    Note over DAM: 안건 생성됨<br/>status: NOTICE<br/>result: PENDING
```

## 6. 투표 → 실행 상세 흐름

```mermaid
sequenceDiagram
    participant OP as Operator (EOA)
    participant CAND as Candidate Contract
    participant DCP as DAOCommitteeProxy
    participant DC as DAOCommittee_V1
    participant DAM as DAOAgendaManager
    participant TARGET as Target Contract

    OP->>CAND: castVote(agendaID, YES, "comment")
    CAND->>DCP: castVote(agendaID, YES, "comment")
    DCP->>DC: delegatecall

    Note over DC: 검증: msg.sender가<br/>후보자의 Candidate 컨트랙트인지

    DC->>DAM: castVote(agendaID, member, YES)

    Note over DAM: 첫 투표 시:<br/>NOTICE → VOTING 전환<br/>현재 members[] 스냅샷

    DAM-->>DC: 투표 기록 완료

    Note over DC: quorum 체크:<br/>YES >= quorum?<br/>→ ACCEPT + WAITING_EXEC

    Note right of DC: 실행 단계 (통과 후)

    OP->>DCP: executeAgenda(agendaID)
    DCP->>DC: delegatecall
    DC->>DAM: canExecuteAgenda(agendaID)?
    DAM-->>DC: true

    loop 각 target에 대해
        DC->>TARGET: target.call(functionBytecode)
        TARGET-->>DC: success
    end

    DC->>DAM: setExecutedAgenda(agendaID)
```

## 7. 핵심 데이터 구조

```mermaid
classDiagram
    class CandidateInfo {
        address candidateContract
        uint256 indexMembers
        uint128 memberJoinedTime
        uint128 rewardPeriod
        uint128 claimedTimestamp
    }

    class Agenda {
        uint256 createdTimestamp
        uint256 noticeEndTimestamp
        uint256 votingPeriodInSeconds
        uint256 votingStartedTimestamp
        uint256 votingEndTimestamp
        uint256 executableLimitTimestamp
        uint256 executedTimestamp
        uint256 countingYes
        uint256 countingNo
        uint256 countingAbstain
        AgendaStatus status
        AgendaResult result
        address[] voters
        bool executed
    }

    class AgendaExecutionInfo {
        address[] targets
        bytes[] functionBytecodes
        bool atomicExecute
        uint256 executeStartFrom
    }

    class Voter {
        bool isVoter
        bool hasVoted
        uint256 vote
    }

    class AgendaStatus {
        <<enumeration>>
        NONE
        NOTICE
        VOTING
        WAITING_EXEC
        EXECUTED
        ENDED
    }

    class AgendaResult {
        <<enumeration>>
        PENDING
        ACCEPT
        REJECT
        DISMISS
    }

    Agenda --> AgendaStatus
    Agenda --> AgendaResult
    Agenda --> Voter : voters mapping
    Agenda --> AgendaExecutionInfo : execution data
```

## 8. 메인넷 배포 주소 요약

| 컨트랙트 | 주소 | 역할 |
|---------|------|------|
| **DAOCommitteeProxy** | `0xDD9f0cCc044B0781289Ee318e5971b0139602C26` | 프록시 (진입점) |
| **DAOCommittee** | `0xd1A3fDDCCD09ceBcFCc7845dDba666B7B8e6D1fb` | 기본 구현체 |
| **DAOCommittee_V1** | `0xdF2eCda32970DB7dB3428FC12Bc1697098418815` | 최신 구현체 |
| **DAOAgendaManager** | `0xcD4421d082752f363E1687544a09d5112cD4f484` | 안건 관리 |
| **DAOVault** | `0x2520CD65BAa2cEEe9E6Ad6EBD3F45490C42dd303` | 트레저리 |
| **CandidateFactory** | `0xc5eb1c5ce7196bdb49ea7500ca18a1b9f1fa3ffb` | 후보자 배포 |
| **CandidateFactoryProxy** | `0x9fc7100a16407ee24a79c834a56e6eca555a5d7c` | 팩토리 프록시 |
| **DAOCommitteeOwner** | `0xe070fFD0E25801392108076ed5291fA9524c3f44` | 관리자 (sudo) |
| **Candidate** (impl) | `0x1a8f59017e0434efc27e89640ac4b7d7d194c0a3` | 후보자 구현체 |
| **SeigManager** | `0x710936500aC59e8551331871Cbad3D33d5e0D909` | 시뇨리지 |
| **Layer2Registry** | `0x0b3E174A2170083e770D5d4Cf56774D221b7063e` | L2 등록소 |
| **TON** | `0x2be5e8c109e2197D077D13A82dAead6a9b3433C5` | 네이티브 토큰 |
| **WTON** | `0xc4A11aaf6ea915Ed7Ac194161d2fC9384F15bff2` | Wrapped TON |
